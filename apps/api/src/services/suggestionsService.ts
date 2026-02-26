import type { ExternalItem, IntegrationAccount } from "@pia/shared";

export interface SmartSuggestion {
  id: string;
  type: "reply_overdue" | "meeting_prep" | "follow_up" | "digest_ready";
  title: string;
  body: string;
  actionType?: "reply" | "open" | "review";
  itemId?: string;
  provider?: string;
}

export function generateSmartSuggestions(
  items: ExternalItem[],
  integrations: IntegrationAccount[]
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const now = Date.now();

  const unreplied = items
    .filter((i) => i.requiresReply && i.isOutstanding)
    .sort((a, b) => (a.createdAtIso ?? "").localeCompare(b.createdAtIso ?? ""));

  if (unreplied.length > 0) {
    const oldest = unreplied[0];
    const ageMs = now - new Date(oldest.createdAtIso ?? now).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    if (ageHours > 4) {
      suggestions.push({
        id: `suggestion-reply-${oldest.id}`,
        type: "reply_overdue",
        title: `Reply overdue (${ageHours}h)`,
        body: oldest.title,
        actionType: "reply",
        itemId: oldest.id,
        provider: oldest.provider
      });
    }
  }

  const calendarToday = items.filter((i) => {
    if (i.provider !== "google_calendar" || i.type !== "calendar_event") return false;
    const m = i.summary?.match(/^([\d-]+)T(\d{2}):(\d{2})/);
    if (!m) return false;
    const eventDate = m[1];
    const today = new Date().toISOString().slice(0, 10);
    if (eventDate !== today) return false;
    const eventHour = parseInt(m[2], 10);
    const currentHour = new Date().getHours();
    return eventHour > currentHour && eventHour <= currentHour + 2;
  });

  if (calendarToday.length > 0) {
    const next = calendarToday[0];
    suggestions.push({
      id: `suggestion-prep-${next.id}`,
      type: "meeting_prep",
      title: "Upcoming meeting",
      body: `${next.title} — prepare any notes or context`,
      actionType: "open",
      itemId: next.id,
      provider: "google_calendar"
    });
  }

  const staleIntegrations = integrations.filter((a) => {
    if (a.status !== "connected" || !a.lastSyncAtIso) return false;
    const syncAge = now - new Date(a.lastSyncAtIso).getTime();
    return syncAge > 6 * 60 * 60 * 1000;
  });

  if (staleIntegrations.length > 0) {
    suggestions.push({
      id: "suggestion-stale-sync",
      type: "digest_ready",
      title: "Data may be stale",
      body: `${staleIntegrations.map((a) => a.provider).join(", ")} haven't synced in 6+ hours. Pull to refresh.`,
      actionType: "review"
    });
  }

  return suggestions.slice(0, 3);
}
