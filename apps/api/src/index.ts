import express from "express";
import {
  type AssistantQueryRequest,
  type IntegrationProvider,
  type UpsertConsentRequest,
  type UpsertWorkflowRequest
} from "@pia/shared";

import { env } from "./config/env";
import {
  listConsents,
  upsertConsent,
  logAssistantAudit,
  logPipelineTrace
} from "./services/auditService";
import { answerAssistantQuestion } from "./services/assistantService";
import { buildOutstandingDigest } from "./services/digestService";
import {
  completeIntegrationOAuth,
  disconnectIntegration,
  listExternalItems,
  listIntegrationAccounts,
  startIntegrationOAuth
} from "./services/integrationService";
import { syncGmailForUser } from "./services/gmailSyncService";
import { syncGoogleCalendarForUser } from "./services/googleCalendarSyncService";
import { syncGoogleDriveForUser } from "./services/googleDriveSyncService";
import { resolveSlackUserNames, sendSlackReply, syncSlackForUser } from "./services/slackSyncService";
import { sendGmailReply } from "./services/gmailSyncService";
import { executeWorkflow } from "./services/orchestrationService";
import {
  addWorkflowRun,
  getWorkflowById,
  getWorkflowRunById,
  listWorkflowRuns,
  listWorkflows,
  upsertWorkflow
} from "./services/workflowService";
import { computeProductMetrics } from "./services/metricsService";
import { getLatestDailyContext, upsertDailyContext } from "./services/contextSnapshotService";
import { runDailyContextPipeline } from "./services/pipelineService";
import { getLatestDailyBrief } from "./services/dailyBriefService";
import { runDailyBriefForUser } from "./jobs/dailyBriefJob";
import { startScheduler } from "./services/schedulerService";
import { getSupabaseClient } from "./services/supabaseClient";
import { transcribeAudioAttachment } from "./services/transcriptionService";
import { getUserTimezone, upsertUserTimezone } from "./services/userProfileService";
import {
  appendAssistantChatMessage,
  createAssistantChat,
  listAssistantChatMessages,
  listAssistantChats
} from "./services/assistantChatService";

const app = express();
app.use(express.json({ limit: "20mb" }));

app.use((req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    const ms = (performance.now() - start).toFixed(1);
    const status = res.statusCode;
    const tag = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "OK";
    console.log(`[${tag}] ${req.method} ${req.originalUrl} ${status} ${ms}ms`);
  });
  next();
});

app.use("/v1", async (req, res, next) => {
  if (req.path.startsWith("/integrations/") && req.path.endsWith("/callback")) {
    next();
    return;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const client = getSupabaseClient();
  if (!client) {
    res.status(500).json({ error: "Supabase API auth is not configured" });
    return;
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid bearer token" });
    return;
  }

  const body = req.body as { userId?: unknown } | undefined;
  const segments = req.path.split("/").filter(Boolean);
  let routeUserId: string | null = null;
  if (
    [
      "context",
      "brief",
      "integrations",
      "items",
      "workflows",
      "history",
      "metrics",
      "digest",
      "assistant",
      "profile"
    ].includes(segments[0] ?? "")
  ) {
    routeUserId = segments[1] ?? null;
  } else if (segments[0] === "privacy" && segments[1] === "consent") {
    routeUserId = segments[2] ?? null;
  }
  if (!routeUserId && typeof body?.userId === "string") {
    routeUserId = body.userId;
  }

  if (routeUserId && routeUserId !== data.user.id) {
    res.status(403).json({ error: "Token user does not match route user" });
    return;
  }

  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pia-api" });
});

// Google OAuth callback at root (Google requires redirect URI to end in .com)
app.get("/", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const error = typeof req.query.error === "string" ? req.query.error : undefined;
  if (!code && !error) {
    res.status(200).send("Marvin API");
    return;
  }
  try {
    const result = await completeIntegrationOAuth({
      provider: "gmail",
      state: state ?? "",
      code,
      error
    });
    if (result.appRedirectUrl) {
      res.redirect(result.appRedirectUrl);
      return;
    }
    res.json({ ok: result.ok, provider: result.provider, userId: result.userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth callback failed";
    res.status(400).send(`OAuth failed: ${message}`);
  }
});

app.get("/v1/context/:userId", async (req, res) => {
  const snapshot = await getLatestDailyContext(req.params.userId);
  if (!snapshot) {
    res.json({ result: null });
    return;
  }
  res.json({ result: { snapshot } });
});

app.get("/v1/context/:userId/latest", async (req, res) => {
  const snapshot = await getLatestDailyContext(req.params.userId);
  res.json({ snapshot });
});

app.post("/v1/context/:userId/pipeline/run", async (req, res) => {
  const { snapshot, traces } = await runDailyContextPipeline(req.params.userId);
  void logPipelineTrace(req.params.userId, traces, snapshot.id);

  let dailyBrief = null;
  try {
    dailyBrief = await runDailyBriefForUser(req.params.userId);
  } catch (err) {
    console.warn("[pipeline] Daily brief generation failed:", err);
  }

  res.json({ snapshot, traces, dailyBrief });
});

app.get("/v1/brief/:userId/daily", async (req, res) => {
  const result = await getLatestDailyBrief(req.params.userId);
  if (!result) {
    res.json({ dailyBrief: null });
    return;
  }
  res.json({
    dailyBrief: result.brief,
    date: result.date,
    modelVersion: result.modelVersion,
    createdAt: result.createdAt
  });
});

app.get("/v1/brief/:userId", async (req, res) => {
  const snapshot = await getLatestDailyContext(req.params.userId);
  const items = await listExternalItems(req.params.userId);
  const digest = buildOutstandingDigest(items);
  res.json({
    brief: {
      unansweredCount: items.filter((i) => i.requiresReply).length,
      meetingsToday: items.filter((i) => i.provider === "google_calendar").length,
      readiness: "Ready",
      topPriorities: digest.items.slice(0, 3).map((i) => i.title),
      summary: snapshot?.summary ?? digest.summary
    }
  });
});

app.post("/v1/privacy/consent", async (req, res) => {
  const payload = req.body as UpsertConsentRequest;
  await upsertConsent(payload.userId, payload.consent);
  res.json({ success: true });
});

app.get("/v1/privacy/consent/:userId", async (req, res) => {
  const consents = await listConsents(req.params.userId);
  res.json({ consents });
});

app.get("/v1/integrations/:userId", async (req, res) => {
  const integrations = await listIntegrationAccounts(req.params.userId);
  res.json({ integrations });
});

app.post("/v1/integrations/:userId/:provider/start", async (req, res) => {
  try {
    const userId = req.params.userId;
    const provider = req.params.provider as IntegrationProvider;
    const start = await startIntegrationOAuth(userId, provider);
    res.json(start);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start OAuth";
    res.status(400).json({ error: message });
  }
});

app.get("/v1/integrations/:provider/callback", async (req, res) => {
  try {
    const provider = req.params.provider;
    const state = String(req.query.state ?? "");
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const oauthError = typeof req.query.error === "string" ? req.query.error : undefined;
    const result = await completeIntegrationOAuth({
      provider,
      state,
      code,
      error: oauthError
    });
    if (result.appRedirectUrl) {
      res.redirect(result.appRedirectUrl);
      return;
    }
    res.json({ ok: result.ok, provider: result.provider, userId: result.userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth callback failed";
    res.status(400).json({ error: message });
  }
});

app.post("/v1/integrations/:userId/:provider/disconnect", async (req, res) => {
  try {
    const userId = req.params.userId;
    const provider = req.params.provider as IntegrationProvider;
    const integrations = await disconnectIntegration(userId, provider);
    res.json({ integrations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect integration";
    res.status(400).json({ error: message });
  }
});

app.post("/v1/integrations/:userId/slack/sync", async (req, res) => {
  try {
    const synced = await syncSlackForUser(req.params.userId);
    res.json({ synced });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Slack sync failed";
    res.status(400).json({ error: message });
  }
});

app.post("/v1/integrations/:userId/gmail/sync", async (req, res) => {
  try {
    const synced = await syncGmailForUser(req.params.userId);
    res.json({ synced });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail sync failed";
    res.status(400).json({ error: message });
  }
});

app.post("/v1/integrations/:userId/google_drive/sync", async (req, res) => {
  try {
    const synced = await syncGoogleDriveForUser(req.params.userId);
    res.json({ synced });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Drive sync failed";
    res.status(400).json({ error: message });
  }
});

app.post("/v1/integrations/:userId/google_calendar/sync", async (req, res) => {
  try {
    const synced = await syncGoogleCalendarForUser(req.params.userId);
    res.json({ synced });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar sync failed";
    res.status(400).json({ error: message });
  }
});

const SLACK_ID_REGEX = /^[UW][A-Z0-9]{8,}$/i;
const SLACK_MENTION_REGEX = /<@([UW][A-Z0-9]{8,})>|@([UW][A-Z0-9]{8,})\b/gi;

function replaceSlackIdsInText(text: string, nameMap: Map<string, string>): string {
  if (!text || nameMap.size === 0) return text;
  let result = text;
  for (const [id, name] of nameMap) {
    result = result
      .replace(new RegExp(`<@${id}>`, "g"), `@${name}`)
      .replace(new RegExp(`@${id}\\b`, "g"), `@${name}`);
  }
  return result;
}

app.get("/v1/items/:userId", async (req, res) => {
  const items = await listExternalItems(req.params.userId);
  const slackIds = new Set<string>();
  for (const item of items) {
    if (item.provider === "slack" && item.sender && SLACK_ID_REGEX.test(item.sender)) {
      slackIds.add(item.sender);
    }
    const text = `${item.title} ${item.summary}`;
    const matches = text.matchAll(SLACK_MENTION_REGEX);
    for (const m of matches) {
      const id = m[1] || m[2];
      if (id) slackIds.add(id);
    }
  }
  const nameMap =
    slackIds.size > 0 ? await resolveSlackUserNames(req.params.userId, [...slackIds]) : new Map();
  const enriched = items.map((item) => {
    if (item.provider !== "slack") return item;
    const senderResolved =
      item.sender && nameMap.has(item.sender) ? nameMap.get(item.sender) : item.sender;
    const titleResolved = replaceSlackIdsInText(item.title, nameMap);
    const summaryResolved = replaceSlackIdsInText(item.summary, nameMap);
    return { ...item, sender: senderResolved, title: titleResolved, summary: summaryResolved };
  });
  res.json({ items: enriched });
});

app.get("/v1/workflows/:userId", async (req, res) => {
  const workflows = await listWorkflows(req.params.userId);
  res.json({ workflows });
});

app.post("/v1/workflows/:userId", async (req, res) => {
  const payload = req.body as UpsertWorkflowRequest;
  const workflow = await upsertWorkflow(req.params.userId, payload.workflow);
  res.json({ workflow });
});

app.post("/v1/workflows/:userId/:workflowId/run", async (req, res) => {
  const { userId, workflowId } = req.params;
  const workflow = await getWorkflowById(userId, workflowId);
  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }
  const run = await executeWorkflow(userId, workflow);
  const snapshot = await getLatestDailyContext(userId);
  if (snapshot) {
    run.contextSnapshotId = snapshot.id;
  }
  await addWorkflowRun(userId, run);
  if (snapshot && run.artifactRefs) {
    await upsertDailyContext({
      ...snapshot,
      generatedAtIso: new Date().toISOString(),
      workflowArtifactRefs: [...snapshot.workflowArtifactRefs, ...run.artifactRefs]
    });
  }
  res.json({ run });
});

app.get("/v1/history/:userId", async (req, res) => {
  const runs = await listWorkflowRuns(req.params.userId);
  res.json({ runs });
});

app.get("/v1/history/:userId/:runId", async (req, res) => {
  const run = await getWorkflowRunById(req.params.userId, req.params.runId);
  res.json({ run });
});

app.get("/v1/metrics/:userId", async (req, res) => {
  const [runs, snapshot] = await Promise.all([
    listWorkflowRuns(req.params.userId),
    getLatestDailyContext(req.params.userId)
  ]);
  const metrics = computeProductMetrics(runs, snapshot);
  res.json({ metrics });
});

app.get("/v1/digest/:userId", async (req, res) => {
  const items = await listExternalItems(req.params.userId);
  const digest = buildOutstandingDigest(items);
  res.json({ digest });
});

app.post("/v1/assistant/:userId/query", async (req, res) => {
  const payload = req.body as AssistantQueryRequest;
  const attachments = payload.attachments ?? [];

  if (payload.timezone?.trim()) {
    void upsertUserTimezone(req.params.userId, payload.timezone.trim());
  }

  const [chat, runs, initialSnapshot, audioTranscript, externalItems] = await Promise.all([
    payload.chatId
      ? Promise.resolve({ id: payload.chatId })
      : createAssistantChat(req.params.userId, payload.question),
    listWorkflowRuns(req.params.userId),
    getLatestDailyContext(req.params.userId),
    transcribeAudioAttachment(attachments),
    listExternalItems(req.params.userId)
  ]);

  let snapshot = initialSnapshot;
  if (!snapshot) {
    try {
      const { snapshot: fresh } = await runDailyContextPipeline(req.params.userId);
      snapshot = fresh;
      void logPipelineTrace(req.params.userId, ["assistant.on-demand-pipeline"], snapshot.id);
    } catch (err) {
      console.warn("[assistant] On-demand pipeline failed:", err);
    }
  }

  const calendarKeywords =
    /(meeting|meetings|calendar|schedule|free|busy|appointment|event|day|today|scheduled)/i;
  const isCalendarQuestion =
    calendarKeywords.test(payload.question) ||
    /what'?s?\s+(my\s+)?(day|today)/i.test(payload.question) ||
    /(do\s+i\s+have|what\s+do\s+i\s+have)\s+(any\s+)?(meetings?|events?|appointments?|today|scheduled)/i.test(
      payload.question
    );

  let finalItems = externalItems;
  if (isCalendarQuestion) {
    try {
      await syncGoogleCalendarForUser(req.params.userId);
      finalItems = await listExternalItems(req.params.userId);
    } catch (err) {
      console.warn("[assistant] On-demand calendar sync failed:", err);
    }
  }

  const slackUserIds = new Set<string>();
  for (const item of finalItems) {
    if (item.sender) slackUserIds.add(item.sender);
    const text = `${item.title} ${item.summary}`;
    const matches = text.matchAll(SLACK_MENTION_REGEX);
    for (const m of matches) slackUserIds.add(m[1] || m[2] || "");
  }

  const [slackUserNames, chatHistory] = await Promise.all([
    resolveSlackUserNames(req.params.userId, [...slackUserIds]),
    chat.id && payload.chatId
      ? listAssistantChatMessages(req.params.userId, chat.id).then((msgs) => msgs.slice(-10))
      : Promise.resolve([] as Awaited<ReturnType<typeof listAssistantChatMessages>>)
  ]);

  const userMessage = await appendAssistantChatMessage({
    userId: req.params.userId,
    chatId: chat.id,
    role: "user",
    text: payload.question,
    attachments
  });

  const response = await answerAssistantQuestion(
    req.params.userId,
    payload.question,
    snapshot,
    runs,
    attachments,
    audioTranscript,
    finalItems,
    slackUserNames,
    chatHistory,
    payload.timezone
  );
  const assistantMessage = await appendAssistantChatMessage({
    userId: req.params.userId,
    chatId: chat.id,
    role: "assistant",
    text: response.answer,
    attachments: response.attachmentsUsed ?? [],
    contextReferences: response.contextReferences ?? []
  });
  void logAssistantAudit(req.params.userId, payload.question, response, snapshot?.id ?? null);
  res.json({
    response,
    chatId: chat.id,
    userMessage,
    assistantMessage
  });
});

app.get("/v1/profile/:userId", async (req, res) => {
  const timezone = await getUserTimezone(req.params.userId);
  res.json({ timezone });
});

app.patch("/v1/profile/:userId", async (req, res) => {
  const { timezone } = req.body as { timezone?: string };
  if (typeof timezone !== "string") {
    res.status(400).json({ error: "timezone must be a string (e.g. Europe/Copenhagen)" });
    return;
  }
  const ok = await upsertUserTimezone(req.params.userId, timezone);
  if (!ok) {
    res.status(400).json({ error: "Invalid timezone. Use IANA format (e.g. Europe/Copenhagen)" });
    return;
  }
  res.json({ timezone });
});

app.get("/v1/assistant/:userId/chats", async (req, res) => {
  const chats = await listAssistantChats(req.params.userId);
  res.json({ chats });
});

app.get("/v1/assistant/:userId/chats/:chatId/messages", async (req, res) => {
  const { userId, chatId } = req.params;
  const messages = await listAssistantChatMessages(userId, chatId);
  res.json({ chatId, messages });
});

// #6: Proactive suggestions
app.get("/v1/suggestions/:userId", async (req, res) => {
  const { generateSmartSuggestions } = await import("./services/suggestionsService");
  const [items, integrations] = await Promise.all([
    listExternalItems(req.params.userId),
    listIntegrationAccounts(req.params.userId)
  ]);
  const suggestions = generateSmartSuggestions(items, integrations);
  res.json({ suggestions });
});

// #2: Push notification registration
app.post("/v1/notifications/:userId/register", async (req, res) => {
  const { token, platform } = req.body as { token?: string; platform?: string };
  if (!token) {
    res.status(400).json({ error: "token required" });
    return;
  }
  const { registerPushToken } = await import("./services/notificationService");
  await registerPushToken(req.params.userId, token, platform ?? "ios");
  res.json({ success: true });
});

// #3: Direct reply endpoints
app.post("/v1/reply/:userId/email", async (req, res) => {
  const { threadId, body } = req.body as { threadId?: string; body?: string };
  if (!threadId || !body) {
    res.status(400).json({ error: "threadId and body required" });
    return;
  }
  const result = await sendGmailReply(req.params.userId, threadId, body);
  res.json(result);
});

app.post("/v1/reply/:userId/slack", async (req, res) => {
  const { channelId, text, threadTs } = req.body as { channelId?: string; text?: string; threadTs?: string };
  if (!channelId || !text) {
    res.status(400).json({ error: "channelId and text required" });
    return;
  }
  const result = await sendSlackReply(req.params.userId, channelId, text, threadTs);
  res.json(result);
});

// #4: Widget data endpoint (lightweight, for iOS/Android widgets)
app.get("/v1/widget/:userId", async (req, res) => {
  const [snapshot, items] = await Promise.all([
    getLatestDailyContext(req.params.userId),
    listExternalItems(req.params.userId)
  ]);
  const outstanding = items.filter((i) => i.isOutstanding);
  const needsReply = outstanding.filter((i) => i.requiresReply);
  const calendarToday = items
    .filter((i) => i.provider === "google_calendar" && i.type === "calendar_event")
    .filter((i) => {
      const m = i.summary?.match(/^([\d-]+)/);
      return m && m[1] === new Date().toISOString().slice(0, 10);
    });
  const nextEvent = calendarToday[0];
  res.json({
    outstandingCount: outstanding.length,
    needsReplyCount: needsReply.length,
    nextEvent: nextEvent ? { title: nextEvent.title, time: nextEvent.summary?.match(/T(\d{2}:\d{2})/)?.[1] } : null,
    topPriority: snapshot?.topBlockers?.[0] ?? null,
    lastSyncIso: snapshot?.generatedAtIso ?? null
  });
});

// #5: Tier check endpoint
app.get("/v1/account/:userId/tier", async (req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    res.json({ tier: "free", features: ["brief", "sync", "triage"] });
    return;
  }
  const { data } = await client
    .from("user_profiles")
    .select("tier")
    .eq("user_id", req.params.userId)
    .maybeSingle();
  const tier = data?.tier ?? "free";
  const features = tier === "pro"
    ? ["brief", "sync", "triage", "assistant", "workflows", "reply", "team"]
    : ["brief", "sync", "triage"];
  res.json({ tier, features });
});

// #8: Team context endpoint
app.get("/v1/team/:teamId/brief", async (req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    res.json({ members: [], totalOutstanding: 0 });
    return;
  }
  const { data: members } = await client
    .from("user_profiles")
    .select("user_id, display_name, timezone")
    .eq("team_id", req.params.teamId);

  if (!members || members.length === 0) {
    res.json({ members: [], totalOutstanding: 0 });
    return;
  }

  const memberBriefs = await Promise.all(
    members.map(async (m) => {
      const snapshot = await getLatestDailyContext(m.user_id);
      return {
        userId: m.user_id,
        displayName: m.display_name ?? "Team member",
        outstandingCount: snapshot?.outstandingItems?.length ?? 0,
        topBlocker: snapshot?.topBlockers?.[0] ?? null,
        lastSyncIso: snapshot?.generatedAtIso ?? null
      };
    })
  );

  res.json({
    members: memberBriefs,
    totalOutstanding: memberBriefs.reduce((sum, m) => sum + m.outstandingCount, 0)
  });
});

app.listen(env.PORT, () => {
  startScheduler();
  console.log(`PIA API listening on port ${env.PORT}`);
  const llmApiKey = env.CLAUDE_SONNET_4_5_API_KEY || env.OPENAI_API_KEY;
  if (!llmApiKey) {
    console.warn("No LLM API key set – assistant will use template answers. Set CLAUDE_SONNET_4_5_API_KEY or OPENAI_API_KEY");
  } else {
    const resolvedModel = env.CLAUDE_SONNET_4_5_API_KEY ? "anthropic/claude-sonnet-4.5" : env.OPENAI_MODEL;
    console.info(`LLM configured: model=${resolvedModel} provider=${env.OPENAI_BASE_URL.includes("openrouter") ? "OpenRouter" : "direct"} key=${env.CLAUDE_SONNET_4_5_API_KEY ? "CLAUDE_SONNET_4_5_API_KEY" : "OPENAI_API_KEY"}`);
  }
});
