import type {
  AssistantAnswer,
  AssistantAttachment,
  AssistantChatMessage,
  DailyContextSnapshot,
  ExternalItem,
  OutstandingItem,
  RecommendedAction,
  WorkflowRun
} from "@pia/shared";


import { env } from "../config/env";
import { loadCoreIdentityPrompt, loadModePrompt } from "../ai/loadPrompts";
import { buildContextEnvelope } from "../ai/context/buildContextEnvelope";
import { callLLM } from "../ai/llm/client";
import { createToolExecutor, getAssistantTools } from "../ai/tools/registry";
import { getUserTimezone } from "./userProfileService";

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

  if (!env.OPENAI_API_KEY) {
    console.warn("[assistant] OPENAI_API_KEY not set in .env – using template answer. Add OPENAI_API_KEY to apps/api/.env");
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

  const systemPrompts = [
    loadCoreIdentityPrompt(),
    loadModePrompt("ASSISTANT_QA_GROUNDED_v1"),
    `Date context: Today is ${today} (${todayDay}). User timezone: ${userTimezone}. Each Slack message includes [sent YYYY-MM-DD] so you know when it was written.`
  ];

  let userContent = `User question: ${question}`;
  if (audioTranscript) {
    userContent += `\n\nUser also said (audio): ${audioTranscript}`;
  }
  if (attachments.length > 0) {
    userContent += `\n\nUser attached ${attachments.length} file(s).`;
  }

  let answerText: string;
  let recommendedActions: RecommendedAction[] = [];

  try {
    const result = await callLLM({
      systemPrompts,
      contextEnvelopeJson: envelopeJson,
      userContent,
      chatHistory: chatHistory.map((m) => ({ role: m.role, content: m.text })),
      tools: getAssistantTools(userTimezone),
      executeTool: createToolExecutor(userId, userTimezone),
      mode: "ASSISTANT_QA_GROUNDED",
      responseFormat: "json_object",
      userId
    });

    const raw = result.content.trim();
    try {
      const parsed = JSON.parse(raw) as { answer?: string; recommended_actions?: RecommendedAction[] };
      if (typeof parsed.answer === "string") {
        answerText = parsed.answer;
        recommendedActions = Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions : [];
      } else {
        answerText = raw;
      }
    } catch {
      answerText = raw;
    }

    if (!answerText) {
      console.warn("[assistant] OpenAI returned empty content");
      return buildTemplateAnswer(question, snapshot, recentRuns, attachments, audioTranscript);
    }

    const relatedRun = snapshot
      ? recentRuns.find((run) =>
          (run.artifactRefs ?? []).some((ref) =>
            snapshot.workflowArtifactRefs.some((snapshotRef) => snapshotRef.artifactId === ref.artifactId)
          )
        )
      : undefined;

    return {
      question,
      answer: answerText,
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
    console.warn("[assistant] OpenAI request failed:", err);
    return buildTemplateAnswer(question, snapshot, recentRuns, attachments, audioTranscript);
  }
}
