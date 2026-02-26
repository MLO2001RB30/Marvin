import { getSupabaseClient } from "./supabaseClient";

export interface PushToken {
  userId: string;
  token: string;
  platform: "ios" | "android" | "web";
}

export async function registerPushToken(userId: string, token: string, platform: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from("push_tokens").upsert(
    { user_id: userId, token, platform, updated_at: new Date().toISOString() },
    { onConflict: "user_id,token" }
  );
}

export async function getUserPushTokens(userId: string): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data } = await client
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);
  return (data ?? []).map((r) => r.token);
}

export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    title,
    body,
    sound: "default",
    data: data ?? {}
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages)
    });
  } catch (err) {
    console.warn("[push] Failed to send notification:", err);
  }
}

export async function sendDailyBriefNotification(
  userId: string,
  outstandingCount: number,
  needsReplyCount: number,
  topPriority: string | null
): Promise<void> {
  const tokens = await getUserPushTokens(userId);
  if (tokens.length === 0) return;

  let body = `You have ${outstandingCount} outstanding item${outstandingCount !== 1 ? "s" : ""}`;
  if (needsReplyCount > 0) {
    body += `, ${needsReplyCount} need${needsReplyCount === 1 ? "s" : ""} a reply`;
  }
  body += ".";
  if (topPriority) {
    body += ` Top priority: ${topPriority}`;
  }

  await sendPushNotification(tokens, "Your morning brief", body, { screen: "brief" });
}
