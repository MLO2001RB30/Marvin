import type { ContextEnvelope, DailyContextSnapshot, ExternalItem } from "@pia/shared";

import {
  listExternalItems,
  listIntegrationAccounts
} from "../../services/integrationService";
import { getLatestDailyContext } from "../../services/contextSnapshotService";
import { listWorkflowRuns } from "../../services/workflowService";
import { getUserTimezone } from "../../services/userProfileService";

const MAX_OUTSTANDING = 15;
const MAX_CALENDAR = 10;
const MAX_WORKFLOW_RUNS = 5;

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
  /** Pre-fetched external items (avoids duplicate fetch when caller already has them) */
  externalItems?: ExternalItem[];
  /** Pre-fetched daily brief from daily_briefs table (when available) */
  dailyBrief?: { headline: string; top_priorities: Array<{ title: string; why: string; next_step: string }> };
}

export async function buildContextEnvelope(
  userId: string,
  _mode: string,
  options: BuildContextEnvelopeOptions = {}
): Promise<ContextEnvelope> {
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  const [integrations, items, snapshot, runs, timezone] = await Promise.all([
    listIntegrationAccounts(userId),
    options.externalItems ?? listExternalItems(userId),
    getLatestDailyContext(userId),
    listWorkflowRuns(userId),
    getUserTimezone(userId)
  ]);

  const connectedProviders = new Set(
    integrations.filter((a) => a.status === "connected").map((a) => a.provider)
  );

  const allProviders = [
    "slack",
    "gmail",
    "google_drive",
    "google_calendar",
    "onedrive",
    "dropbox",
    "healthkit",
    "weatherkit"
  ] as const;

  const integrationsPayload = allProviders.map((p) => ({
    provider: p,
    connected: connectedProviders.has(p),
    last_sync_at: integrations.find((a) => a.provider === p)?.lastSyncAtIso
  }));

  const outstandingRaw = items.filter((i) => i.isOutstanding);
  const outstandingItems = outstandingRaw.slice(0, MAX_OUTSTANDING).map((i) => ({
    id: i.id,
    provider: i.provider,
    title: i.title,
    urgency: i.tags.includes("urgent") ? "high" : i.requiresReply ? "med" : "low"
  }));
  const outstandingTruncated = outstandingRaw.length > MAX_OUTSTANDING;

  const calendarRaw = items.filter(
    (i) => i.provider === "google_calendar" && i.type === "calendar_event" && !i.sourceRef?.startsWith("initial-sync")
  );
  const todayStart = `${today}T00:00:00`;
  const todayEnd = `${today}T23:59:59`;
  const calendarToday = calendarRaw
    .filter((i) => {
      const m = i.summary.match(/^([\d-]+T?[\d:]*)/);
      if (!m) return false;
      const start = m[1];
      return start >= todayStart && start <= todayEnd;
    })
    .slice(0, MAX_CALENDAR)
    .map((i) => {
      const { start, end } = parseCalendarTimesFromSummary(i.summary);
      return { start, end, title: i.title };
    });
  const calendarTruncated = calendarRaw.length > MAX_CALENDAR;

  const workflowRunsRecent = runs.slice(0, MAX_WORKFLOW_RUNS).map((r) => ({
    id: r.id,
    workflow_id: r.workflowId,
    status: r.status
  }));

  const truncationNotes: string[] = [];
  if (outstandingTruncated) truncationNotes.push(`outstanding_items capped at ${MAX_OUTSTANDING}`);
  if (calendarTruncated) truncationNotes.push(`calendar_today capped at ${MAX_CALENDAR}`);

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
    workflow_runs_recent: workflowRunsRecent,
    truncation_notes: truncationNotes.length > 0 ? truncationNotes.join("; ") : undefined
  };
}
