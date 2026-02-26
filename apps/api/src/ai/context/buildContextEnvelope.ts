import type { ContextEnvelope, DailyContextSnapshot, ExternalItem } from "@pia/shared";

import {
  listExternalItems,
  listIntegrationAccounts
} from "../../services/integrationService";
import { getSupabaseClient } from "../../services/supabaseClient";
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
    body_text: ((i as unknown as Record<string, unknown>).bodyText as string | undefined)?.slice(0, 500) ?? undefined,
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

  let contactsContext: Array<{ name: string; providers: string[]; interaction_count: number; last_seen?: string }> = [];
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data: contactRows } = await client
        .from("contacts")
        .select("id, display_name")
        .eq("user_id", userId)
        .limit(20);
      if (contactRows && contactRows.length > 0) {
        const contactIds = contactRows.map((c: Record<string, unknown>) => c.id as string);
        const { data: identRows } = await client
          .from("contact_identifiers")
          .select("contact_id, provider")
          .eq("user_id", userId)
          .in("contact_id", contactIds);
        const { data: itemContactRows } = await client
          .from("item_contacts")
          .select("contact_id, item_id, role")
          .eq("user_id", userId)
          .in("contact_id", contactIds);
        const providersByContact = new Map<string, Set<string>>();
        for (const row of identRows ?? []) {
          const r = row as Record<string, unknown>;
          const cid = r.contact_id as string;
          if (!providersByContact.has(cid)) providersByContact.set(cid, new Set());
          providersByContact.get(cid)!.add(r.provider as string);
        }
        const countByContact = new Map<string, number>();
        for (const row of itemContactRows ?? []) {
          const r = row as Record<string, unknown>;
          const cid = r.contact_id as string;
          countByContact.set(cid, (countByContact.get(cid) ?? 0) + 1);
        }
        contactsContext = contactRows
          .map((c: Record<string, unknown>) => ({
            name: c.display_name as string,
            providers: [...(providersByContact.get(c.id as string) ?? [])],
            interaction_count: countByContact.get(c.id as string) ?? 0
          }))
          .sort((a, b) => b.interaction_count - a.interaction_count)
          .slice(0, 15);
      }
    }
  } catch {
    // Contact loading is best-effort
  }

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
    workflow_runs_recent: workflowRunsRecent,
    ...(contactsContext.length > 0 ? { contacts: contactsContext } : {})
  } as ContextEnvelope;
}
