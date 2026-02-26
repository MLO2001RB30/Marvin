import type {
  AssistantAnswer,
  AssistantAttachment,
  AssistantChatMessage,
  DailyContextSnapshot,
  ExternalItem,
  OutstandingItem,
  RecommendedAction,
  StructuredAssistantResponse,
  WorkflowRun
} from "@pia/shared";


import { env } from "../config/env";
import { loadCoreIdentityPrompt, loadModePrompt } from "../ai/loadPrompts";
import { buildContextEnvelope } from "../ai/context/buildContextEnvelope";
import { callLLM } from "../ai/llm/client";
import { createToolExecutor, getAssistantTools } from "../ai/tools/registry";
import { getUserTimezone } from "./userProfileService";
import { listUserMemories, buildMemoryPromptSection, extractMemoriesFromConversation } from "./userMemoryService";

function isValidTimezone(tz: string): boolean {
  if (tz === "UTC" || tz === "GMT") return true;
  if (/^[A-Za-z]+\/[A-Za-z_]+$/.test(tz)) return true;
  if (tz.startsWith("Etc/")) return true;
  return false;
}

function buildTemplateAnswer(
  question: string,
  snapshot: DailyContextSnapshot | null,
  recentRuns: WorkflowRun[],
  attachments: AssistantAttachment[],
  audioTranscript?: string
): AssistantAnswer {
  if (!snapshot) {
    return {
      question,
      answer:
        "I don't have your daily context yet. Connect Slack (or other integrations) in Manage, then pull down to refresh on the Brief screen. I'll sync your data and you can ask again.",
      citedItems: [],
      contextReferences: [],
      attachmentsUsed: attachments,
      audioTranscript,
      generatedAtIso: new Date().toISOString()
    };
  }

  const topItems = snapshot.outstandingItems.slice(0, 3);
  const relatedRun = recentRuns.find((run) =>
    (run.artifactRefs ?? []).some((ref) =>
      snapshot.workflowArtifactRefs.some((snapshotRef) => snapshotRef.artifactId === ref.artifactId)
    )
  );
  const answer =
    topItems.length === 0
      ? "No urgent outstanding items right now."
      : `Based on today's stored context, your top priorities are: ${topItems.map((item) => item.title).join("; ")}.`;
  const attachmentSummary =
    attachments.length > 0
      ? ` I also received ${attachments.length} attachment${attachments.length > 1 ? "s" : ""}.`
      : "";
  const transcriptSummary = audioTranscript ? ` Audio transcript: ${audioTranscript}` : "";

  return {
    question,
    answer: `${answer}${attachmentSummary}${transcriptSummary}`.trim(),
    citedItems: topItems.map((item) => ({
      itemId: item.itemId,
      provider: item.provider,
      reason: item.explainWhy
    })),
    contextReferences: [
      {
        snapshotId: snapshot.id,
        workflowRunId: relatedRun?.id,
        itemId: topItems[0]?.itemId
      }
    ],
    attachmentsUsed: attachments,
    audioTranscript,
    generatedAtIso: new Date().toISOString()
  };
}

function buildPreviousTurnItemsContext(chatHistory: AssistantChatMessage[]): string | null {
  const assistantMessages = chatHistory.filter((m) => m.role === "assistant" && m.structured);
  if (assistantMessages.length === 0) return null;

  const lastStructured = assistantMessages[assistantMessages.length - 1].structured;
  if (!lastStructured?.items || lastStructured.items.length === 0) return null;

  const lines = ["PREVIOUS RESPONSE ITEMS (for resolving references like 'the first one', 'John's message', etc.):"];
  lastStructured.items.forEach((item, idx) => {
    const parts = [`#${idx + 1}: "${item.header}"`];
    parts.push(`provider=${item.provider}`);
    if (item.sender) parts.push(`from=${item.sender}`);
    if (item.channel) parts.push(`channel=${item.channel}`);
    if (item.item_id) parts.push(`item_id=${item.item_id}`);
    lines.push(parts.join(", "));
  });
  return lines.join("\n");
}

export async function answerAssistantQuestion(
  userId: string,
  question: string,
  snapshot: DailyContextSnapshot | null,
  recentRuns: WorkflowRun[],
  attachments: AssistantAttachment[] = [],
  audioTranscript?: string,
  externalItems: ExternalItem[] = [],
  slackUserNames: Map<string, string> = new Map(),
  chatHistory: AssistantChatMessage[] = [],
  /** Override timezone (e.g. from device). Falls back to user_profiles, then UTC */
  timezoneOverride?: string
): Promise<AssistantAnswer> {
  const topItems = snapshot ? snapshot.outstandingItems.slice(0, 5) : [];

  const llmApiKey = env.CLAUDE_SONNET_4_5_API_KEY || env.OPENAI_API_KEY;
  if (!llmApiKey) {
    console.warn("[assistant] No LLM API key set – using template answer. Add CLAUDE_SONNET_4_5_API_KEY or OPENAI_API_KEY to env");
    return buildTemplateAnswer(question, snapshot, recentRuns, attachments, audioTranscript);
  }

  const userTimezone = timezoneOverride && isValidTimezone(timezoneOverride)
    ? timezoneOverride
    : await getUserTimezone(userId);
  const today = new Date().toISOString().slice(0, 10);
  const todayDay = new Date().toLocaleDateString("en-US", { weekday: "long" });

  let envelopeJson: string;
  try {
    const envelope = await buildContextEnvelope(userId, "assistant", {
      externalItems,
      snapshot,
      runs: recentRuns.map((r) => ({ id: r.id, workflowId: r.workflowId, status: r.status })),
      timezone: userTimezone
    });
    envelopeJson = JSON.stringify(envelope);
  } catch (err) {
    console.warn("[assistant] Failed to build context envelope:", err);
    envelopeJson = JSON.stringify({
      metadata: { user_id: userId, timezone: userTimezone, locale: "en", now_iso: new Date().toISOString() },
      integrations: [],
      outstanding_items: [],
      calendar_today: [],
      email_threads: [],
      slack_messages: [],
      workflow_runs_recent: []
    });
  }

  const memories = await listUserMemories(userId);
  const memorySection = buildMemoryPromptSection(memories);

  const systemPrompts = [
    loadCoreIdentityPrompt(),
    loadModePrompt("ASSISTANT_QA_GROUNDED_v1"),
    `Date context: Today is ${today} (${todayDay}). User timezone: ${userTimezone}. Each Slack message includes [sent YYYY-MM-DD] so you know when it was written.`,
    ...(memorySection ? [memorySection] : [])
  ];

  let userContent = `User question: ${question}`;
  if (audioTranscript) {
    userContent += `\n\nUser also said (audio): ${audioTranscript}`;
  }
  if (attachments.length > 0) {
    userContent += `\n\nUser attached ${attachments.length} file(s).`;
  }

  const previousItemsContext = buildPreviousTurnItemsContext(chatHistory);
  if (previousItemsContext) {
    userContent += `\n\n${previousItemsContext}`;
  }

  let answerText: string;
  let structured: StructuredAssistantResponse | undefined;
  let recommendedActions: RecommendedAction[] = [];

  try {
    const result = await callLLM({
      systemPrompts,
      contextEnvelopeJson: envelopeJson,
      userContent,
      chatHistory: chatHistory.map((m) => ({
        role: m.role,
        content: m.structured && m.role === "assistant"
          ? JSON.stringify({ display_type: m.structured.display_type, summary: m.structured.summary, items: m.structured.items?.map((it) => ({ header: it.header, provider: it.provider, sender: it.sender, item_id: it.item_id })) })
          : m.text
      })),
      tools: getAssistantTools(userTimezone),
      executeTool: createToolExecutor(userId, userTimezone),
      mode: "ASSISTANT_QA_GROUNDED",
      responseFormat: "json_object",
      userId
    });

    let raw = result.content.trim();
    const fenceMatch = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (fenceMatch) raw = fenceMatch[1].trim();

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;

      if (typeof parsed.display_type === "string" && typeof parsed.summary === "string") {
        const rawItems = Array.isArray(parsed.items) ? parsed.items as Array<Record<string, unknown>> : undefined;
        const cleanedItems = rawItems?.map((item) => ({
          ...item,
          channel: typeof item.channel === "string" && item.channel
            ? item.channel.replace(/^#/, "") === "Email" || item.provider !== "slack" ? undefined : item.channel.replace(/^#/, "")
            : undefined
        }));
        structured = {
          display_type: parsed.display_type as StructuredAssistantResponse["display_type"],
          summary: parsed.summary,
          items: cleanedItems as StructuredAssistantResponse["items"],
          events: Array.isArray(parsed.events) ? parsed.events : undefined,
          action_status: parsed.action_status as "success" | "failed" | undefined,
          action_description: typeof parsed.action_description === "string" ? parsed.action_description : undefined,
          recommended_actions: Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions : undefined
        };
        answerText = parsed.summary as string;
        recommendedActions = structured.recommended_actions ?? [];
      } else if (typeof parsed.answer === "string") {
        answerText = parsed.answer;
        recommendedActions = Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions : [];
      } else {
        answerText = raw;
      }
    } catch {
      answerText = raw;
    }

    if (!answerText) {
      console.warn("[assistant] LLM returned empty content");
      return buildTemplateAnswer(question, snapshot, recentRuns, attachments, audioTranscript);
    }

    const relatedRun = snapshot
      ? recentRuns.find((run) =>
          (run.artifactRefs ?? []).some((ref) =>
            snapshot.workflowArtifactRefs.some((snapshotRef) => snapshotRef.artifactId === ref.artifactId)
          )
        )
      : undefined;

    void extractMemoriesFromConversation(userId, question, answerText);

    return {
      question,
      answer: answerText,
      structured,
      citedItems: topItems.map((item) => ({
        itemId: item.itemId,
        provider: item.provider,
        reason: item.explainWhy
      })),
      contextReferences: snapshot
        ? [
            {
              snapshotId: snapshot.id,
              workflowRunId: relatedRun?.id,
              itemId: topItems[0]?.itemId
            }
          ]
        : [],
      recommendedActions: recommendedActions.length > 0 ? recommendedActions : undefined,
      attachmentsUsed: attachments,
      audioTranscript,
      generatedAtIso: new Date().toISOString()
    };
  } catch (err) {
    console.warn("[assistant] LLM request failed:", err);
    return buildTemplateAnswer(question, snapshot, recentRuns, attachments, audioTranscript);
  }
}
