import { getGoogleAccessToken } from "./integrationService";
import { shouldBeOutstandingCalendar } from "./itemFilters";
import { getSupabaseClient } from "./supabaseClient";

const MAX_EVENTS = 30;

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  organizer?: { displayName?: string; email?: string };
  attendees?: Array<{ displayName?: string; email?: string }>;
}

interface CalendarListResponse {
  items?: CalendarEvent[];
  nextPageToken?: string;
}

function formatEventTime(start?: { dateTime?: string; date?: string }): string {
  if (!start) return "";
  const dt = start.dateTime ?? start.date;
  if (!dt) return "";
  const d = new Date(dt);
  return d.toISOString().slice(0, 16);
}

async function calendarApiGet(
  token: string,
  path: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/primary${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Calendar API error ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json();
}

async function calendarApiPost(token: string, path: string, body: object): Promise<unknown> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Calendar API error ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json();
}

export interface CreateCalendarEventParams {
  title: string;
  startIso: string;
  endIso: string;
  description?: string;
  timeZone?: string;
}

export async function createCalendarEvent(
  userId: string,
  params: CreateCalendarEventParams
): Promise<{ id: string; htmlLink?: string } | null> {
  const token = await getGoogleAccessToken(userId);
  if (!token) return null;

  const tz = params.timeZone ?? "UTC";
  const body = {
    summary: params.title,
    description: params.description ?? undefined,
    start: { dateTime: params.startIso, timeZone: tz },
    end: { dateTime: params.endIso, timeZone: tz }
  };

  const result = (await calendarApiPost(token, "/events", body)) as {
    id?: string;
    htmlLink?: string;
  };
  return result?.id ? { id: result.id, htmlLink: result.htmlLink } : null;
}

export async function syncGoogleCalendarForUser(userId: string): Promise<number> {
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    console.warn("[calendar] No Google access token for user", userId, "- ensure Google is connected in Manage");
    return 0;
  }

  const client = getSupabaseClient();
  if (!client) {
    console.warn("[calendar] Supabase client unavailable");
    return 0;
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  let listRes: CalendarListResponse;
  try {
    listRes = (await calendarApiGet(token, "/events", {
      timeMin,
      timeMax,
      maxResults: String(MAX_EVENTS),
      orderBy: "startTime",
      singleEvents: "true"
    })) as CalendarListResponse;
  } catch (err) {
    console.warn("[calendar] Google Calendar API error for user", userId, err);
    return 0;
  }

  const events = listRes.items ?? [];

  if (events.length === 0) {
    await client
      .from("external_items")
      .delete()
      .eq("user_id", userId)
      .eq("provider", "google_calendar");
    return 0;
  }

  const nowIso = new Date().toISOString();
  const items = events.map((event) => {
    const summary = event.summary ?? "Untitled event";
    const startIso = event.start?.dateTime ?? event.start?.date;
    const startTime = formatEventTime(event.start);
    const endTime = formatEventTime(event.end);
    const organizer = event.organizer?.displayName ?? event.organizer?.email ?? "";
    const location = event.location ?? "";
    const desc = event.description ?? "";
    const summaryText = [
      startTime && endTime ? `${startTime} – ${endTime}` : startTime || endTime,
      organizer ? `Organizer: ${organizer}` : "",
      location ? `Location: ${location}` : "",
      desc ? desc.slice(0, 200) + (desc.length > 200 ? "…" : "") : ""
    ]
      .filter(Boolean)
      .join("\n");

    return {
      id: `calendar-${userId}-${event.id}`,
      provider: "google_calendar" as const,
      type: "calendar_event" as const,
      sourceRef: event.id,
      title: summary.slice(0, 80) + (summary.length > 80 ? "…" : ""),
      summary: summaryText,
      requiresReply: false,
      isOutstanding: shouldBeOutstandingCalendar(startIso),
      sender: organizer || undefined,
      tags: ["calendar_sync"],
      created_at_iso: nowIso,
      updated_at_iso: nowIso
    };
  });

  const rows = items.map((item) => ({
    id: item.id,
    user_id: userId,
    provider: item.provider,
    type: item.type,
    source_ref: item.sourceRef,
    title: item.title,
    summary: item.summary,
    requires_reply: item.requiresReply,
    is_outstanding: item.isOutstanding,
    sender: item.sender ?? null,
    tags: item.tags as string[],
    created_at_iso: item.created_at_iso,
    updated_at_iso: item.updated_at_iso
  }));

  await client.from("external_items").upsert(rows, { onConflict: "id" });

  const freshIds = rows.map((r) => r.id);
  await client
    .from("external_items")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "google_calendar")
    .not("id", "in", `(${freshIds.join(",")})`);

  await client
    .from("integration_accounts")
    .update({
      last_sync_at: nowIso,
      updated_at: nowIso
    })
    .eq("user_id", userId)
    .eq("provider", "google_calendar");

  if (items.length > 0) {
    console.info("[calendar] Synced", items.length, "events for user", userId);
  }
  return items.length;
}
