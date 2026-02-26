import type { ContextEnvelope, DailyContextSnapshot, ExternalItem } from "@pia/shared";

import {
  listExternalItems,
  listIntegrationAccounts
} from "../../services/integrationService";
import { getLatestDailyContext } from "../../services/contextSnapshotService";
import { listWorkflowRuns } from "../../services/workflowService";
import { getUserTimezone } from "../../services/userProfileService";

const MAX_OUTSTANDING = 15;
const MAX_CALENDAR = 15;
const MAX_EMAILS = 10;
const MAX_SLACK = 10;
const MAX_WORKFLOW_RUNS = 3;

function parseCalendarTimesFromSummary(summary: string): { start: string; end: string } {
  const match = summary.match(/^([\d-]+T?[\d:]*)\s*[–-]\s*([\d-]+T?[\d:]*)/);
  if (match) {
    const start = match[1].trim();
    const end = match[2].trim();
    const startIso = start.length <= 10 ? `${start}T00:00:00` : start.length === 16 ? `${start}:00` : start;
    const endIso = end.length <= 10 ? `${end}T23:59:59` : end.length === 16 ? `${end}:00` : end;
    return { start: startIso, end: endIso };
  }
  const fallback = new Date().toISOString();
  return { start: fallback, end: fallback };
}

export interface BuildContextEnvelopeOptions {
  externalItems?: ExternalItem[];
  dailyBrief?: { headline: string; top_priorities: Array<{ title: string; why: string; next_step: string }> };
  snapshot?: DailyContextSnapshot | null;
  runs?: Array<{ id: string; workflowId: string; status: string }>;
  timezone?: string;
}

export async function buildContextEnvelope(
  userId: string,
  _mode: string,
  options: BuildContextEnvelopeOptions = {}
): Promise<ContextEnvelope> {
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  const needsItems = !options.externalItems;
  const needsSnapshot = options.snapshot === undefined;
  const needsRuns = !options.runs;
  const needsTimezone = !options.timezone;

  const [integrations, fetchedItems, fetchedSnapshot, fetchedRuns, fetchedTimezone] =
    await Promise.all([
      listIntegrationAccounts(userId),
      needsItems ? listExternalItems(userId) : Promise.resolve([]),
      needsSnapshot ? getLatestDailyContext(userId) : Promise.resolve(null),
      needsRuns ? listWorkflowRuns(userId) : Promise.resolve([]),
      needsTimezone ? getUserTimezone(userId) : Promise.resolve("UTC")
    ]);

  const items = options.externalItems ?? fetchedItems;
  const snapshot = options.snapshot !== undefined ? options.snapshot : fetchedSnapshot;
  const runs = options.runs ?? fetchedRuns.map((r) => ({ id: r.id, workflowId: r.workflowId, status: r.status }));
  const timezone = options.timezone ?? fetchedTimezone;

  const connectedProviders = new Set(
    integrations.filter((a) => a.status === "connected").map((a) => a.provider)
  );

  const integrationsPayload = integrations
    .filter((a) => a.status === "connected")
    .map((a) => ({
      provider: a.provider,
      connected: true,
      last_sync_at: a.lastSyncAtIso
    }));

  const outstandingRaw = items.filter((i) => i.isOutstanding);
  const outstandingItems = outstandingRaw.slice(0, MAX_OUTSTANDING).map((i) => ({
    id: i.id,
    provider: i.provider,
    title: i.title,
    summary: (i.summary ?? "").slice(0, 200),
    sender: i.sender,
    requires_reply: i.requiresReply,
    urgency: i.tags.includes("urgent") ? "high" : i.requiresReply ? "med" : "low"
  }));

  const calendarRaw = items.filter(
    (i) => i.provider === "google_calendar" && i.type === "calendar_event" && !i.sourceRef?.startsWith("initial-sync")
  );
  const calendarToday = calendarRaw
    .filter((i) => {
      const m = i.summary.match(/^([\d-]+T?[\d:]*)/);
      return m && m[1] >= `${today}T00:00:00` && m[1] <= `${today}T23:59:59`;
    })
    .slice(0, MAX_CALENDAR)
    .map((i) => {
      const { start, end } = parseCalendarTimesFromSummary(i.summary);
      return { start, end, title: i.title, organizer: i.sender };
    });

  const emailThreads = items
    .filter((i) => i.provider === "gmail" && i.type === "gmail_thread")
    .slice(0, MAX_EMAILS)
    .map((i) => ({
      id: i.id,
      title: i.title,
      sender: i.sender,
      summary: (i.summary ?? "").slice(0, 200),
      requires_reply: i.requiresReply
    }));

  const slackMessages = items
    .filter((i) => i.provider === "slack")
    .slice(0, MAX_SLACK)
    .map((i) => ({
      id: i.id,
      title: i.title,
      sender: i.sender,
      summary: (i.summary ?? "").slice(0, 200),
      requires_reply: i.requiresReply
    }));

  const workflowRunsRecent = runs.slice(0, MAX_WORKFLOW_RUNS).map((r) => ({
    id: r.id,
    workflow_id: r.workflowId,
    status: r.status
  }));

  const daily_brief: ContextEnvelope["daily_brief"] =
    options.dailyBrief ??
    (snapshot
      ? {
          headline: snapshot.summary,
          top_priorities: (snapshot.outstandingItems ?? []).slice(0, 5).map((item) => ({
            title: item.title,
            why: item.explainWhy,
            next_step: item.category === "reply_needed" ? "Reply" : "Review"
          }))
        }
      : undefined);

  return {
    metadata: {
      user_id: userId,
      timezone,
      locale: "en",
      now_iso: nowIso
    },
    integrations: integrationsPayload,
    daily_brief,
    outstanding_items: outstandingItems,
    calendar_today: calendarToday,
    email_threads: emailThreads,
    slack_messages: slackMessages,
    workflow_runs_recent: workflowRunsRecent
  };
}
