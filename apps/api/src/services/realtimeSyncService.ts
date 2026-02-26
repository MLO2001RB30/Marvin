import type { IntegrationProvider } from "@pia/shared";
import { syncSlackForUser } from "./slackSyncService";
import { syncGmailForUser } from "./gmailSyncService";
import { syncGoogleCalendarForUser } from "./googleCalendarSyncService";
import { listIntegrationAccounts } from "./integrationService";

interface WebhookEvent {
  provider: IntegrationProvider;
  userId: string;
  eventType: string;
  payload: Record<string, unknown>;
  receivedAtIso: string;
}

const recentEvents: WebhookEvent[] = [];
const MAX_RECENT = 100;

function recordEvent(event: WebhookEvent) {
  recentEvents.unshift(event);
  if (recentEvents.length > MAX_RECENT) recentEvents.pop();
}

export function getRecentWebhookEvents(userId?: string): WebhookEvent[] {
  if (!userId) return recentEvents.slice(0, 20);
  return recentEvents.filter((e) => e.userId === userId).slice(0, 20);
}

export async function handleSlackEventPayload(
  body: Record<string, unknown>
): Promise<{ ok: boolean; challenge?: string }> {
  if (body.type === "url_verification" && typeof body.challenge === "string") {
    return { ok: true, challenge: body.challenge };
  }

  if (body.type !== "event_callback") return { ok: true };

  const event = body.event as Record<string, unknown> | undefined;
  if (!event) return { ok: true };

  const teamId = typeof body.team_id === "string" ? body.team_id : undefined;
  if (!teamId) return { ok: true };

  const eventType = typeof event.type === "string" ? event.type : "unknown";
  const channelId = typeof event.channel === "string" ? event.channel : undefined;
  const userId = typeof event.user === "string" ? event.user : undefined;

  console.info(`[realtime] Slack event: type=${eventType} team=${teamId} channel=${channelId}`);

  const resolvedUserId = await resolveSlackTeamToUserId(teamId);
  if (!resolvedUserId) {
    console.warn("[realtime] No user found for Slack team", teamId);
    return { ok: true };
  }

  recordEvent({
    provider: "slack",
    userId: resolvedUserId,
    eventType,
    payload: { channel: channelId, slackUser: userId },
    receivedAtIso: new Date().toISOString()
  });

  if (["message", "message.channels", "message.groups", "message.im"].includes(eventType)) {
    void syncSlackForUser(resolvedUserId).catch((err) =>
      console.warn("[realtime] Slack sync failed after webhook:", err)
    );
  }

  return { ok: true };
}

export async function handleGmailPushNotification(
  body: Record<string, unknown>
): Promise<{ ok: boolean }> {
  const message = body.message as Record<string, unknown> | undefined;
  if (!message) return { ok: true };

  const rawData = typeof message.data === "string" ? message.data : "";
  let decoded: Record<string, unknown> = {};
  try {
    decoded = JSON.parse(Buffer.from(rawData, "base64").toString("utf-8")) as Record<string, unknown>;
  } catch {
    return { ok: true };
  }

  const emailAddress = typeof decoded.emailAddress === "string" ? decoded.emailAddress : undefined;
  const historyId = typeof decoded.historyId === "string" ? decoded.historyId : undefined;
  console.info(`[realtime] Gmail push: email=${emailAddress} historyId=${historyId}`);

  if (!emailAddress) return { ok: true };

  const resolvedUserId = await resolveEmailToUserId(emailAddress);
  if (!resolvedUserId) return { ok: true };

  recordEvent({
    provider: "gmail",
    userId: resolvedUserId,
    eventType: "gmail_push",
    payload: { emailAddress, historyId },
    receivedAtIso: new Date().toISOString()
  });

  void syncGmailForUser(resolvedUserId).catch((err) =>
    console.warn("[realtime] Gmail sync failed after webhook:", err)
  );

  return { ok: true };
}

export async function handleCalendarPushNotification(
  headers: Record<string, string | undefined>,
  userId?: string
): Promise<{ ok: boolean }> {
  const channelId = headers["x-goog-channel-id"];
  const resourceState = headers["x-goog-resource-state"];
  console.info(`[realtime] Calendar push: channelId=${channelId} state=${resourceState}`);

  if (resourceState === "sync") return { ok: true };

  const resolvedUserId = userId ?? (channelId ? await resolveCalendarChannelToUserId(channelId) : undefined);
  if (!resolvedUserId) return { ok: true };

  recordEvent({
    provider: "google_calendar",
    userId: resolvedUserId,
    eventType: `calendar_${resourceState ?? "update"}`,
    payload: { channelId, resourceState },
    receivedAtIso: new Date().toISOString()
  });

  void syncGoogleCalendarForUser(resolvedUserId).catch((err) =>
    console.warn("[realtime] Calendar sync failed after webhook:", err)
  );

  return { ok: true };
}

async function resolveSlackTeamToUserId(teamId: string): Promise<string | undefined> {
  const { getSupabaseClient } = await import("./supabaseClient");
  const client = getSupabaseClient();
  if (!client) return undefined;
  const { data } = await client
    .from("integration_accounts")
    .select("user_id")
    .eq("provider", "slack")
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();
  return data?.user_id as string | undefined;
}

async function resolveEmailToUserId(email: string): Promise<string | undefined> {
  const { getSupabaseClient } = await import("./supabaseClient");
  const client = getSupabaseClient();
  if (!client) return undefined;
  const { data } = await client
    .from("integration_accounts")
    .select("user_id")
    .eq("provider", "gmail")
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();
  return data?.user_id as string | undefined;
}

async function resolveCalendarChannelToUserId(channelId: string): Promise<string | undefined> {
  const { getSupabaseClient } = await import("./supabaseClient");
  const client = getSupabaseClient();
  if (!client) return undefined;
  const { data } = await client
    .from("integration_accounts")
    .select("user_id")
    .eq("provider", "google_calendar")
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();
  return data?.user_id as string | undefined;
}
