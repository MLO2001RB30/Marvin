import { getSlackAccessToken } from "./integrationService";
import { shouldBeOutstandingSlack } from "./itemFilters";
import { getSupabaseClient } from "./supabaseClient";

const MAX_CHANNELS = 10;
const MESSAGES_PER_CHANNEL = 50;

const NOISE_SUBTYPES = new Set([
  "channel_join",
  "channel_leave",
  "group_join",
  "group_leave",
  "bot_add",
  "bot_remove"
]);

const NOISE_TEXT_PATTERNS = [
  /has joined the channel/i,
  /has left the channel/i,
  /added an integration to this channel/i,
  /created this channel/i,
  /accepted your invitation to join Slack/i,
  /take a second to say hello/i,
  /has been (added|invited) to/i,
  /welcome to the channel/i,
  /(invited|added) you to/i,
  /^[\s👍👋🙌🎉✅❌]*$/i,
  /^(ok|thanks|thank you|got it|sounds good|perfect|nice|cool|great|👍|👌|yep|yeah|yes|no|nope)[\s!.]*$/i
];

const ACKNOWLEDGMENT_PATTERNS = [
  /^(ok|thanks|thank you|got it|sounds good|perfect|nice|cool|great|👍|👌|yep|yeah|yes|no|nope|will do|on it|done|lgtm)[\s!.]*$/i,
  /^[\p{Emoji}\s]+$/u
];

const ACTIONABLE_PHRASES = [
  /\?/,
  /\b(can you|could you|would you|please|when will|need you to|waiting on|follow up|reminder|urgent|asap|deadline|by when|when can)\b/i,
  /\b(need|want|request|asking|wondering|check|review|confirm|approve|action)\b/i,
  /\b(blocked|blocking|stuck|help|assist)\b/i
];

const MAX_AGE_DAYS = 7;

interface SlackConversation {
  id: string;
  name?: string;
  user?: string;
  is_im?: boolean;
  is_mpim?: boolean;
}

interface SlackMessage {
  ts: string;
  text: string;
  user?: string;
  type?: string;
  subtype?: string;
  bot_id?: string;
}

function parseSlackTs(ts: string): number {
  const num = parseFloat(ts);
  return isNaN(num) ? 0 : Math.floor(num) * 1000;
}

function isWithinMaxAge(ts: string): boolean {
  const msgTime = parseSlackTs(ts);
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return msgTime >= cutoff;
}

function isAcknowledgment(text: string): boolean {
  const t = text.trim();
  if (t.length < 3) return true;
  return ACKNOWLEDGMENT_PATTERNS.some((re) => re.test(t));
}

function looksActionable(text: string): boolean {
  return ACTIONABLE_PHRASES.some((re) => re.test(text));
}

interface SlackItemRow {
  id: string;
  provider: "slack";
  type: "slack_message";
  sourceRef: string;
  title: string;
  summary: string;
  requiresReply: boolean;
  isOutstanding: boolean;
  sender?: string;
  tags: string[];
  created_at_iso: string;
  updated_at_iso: string;
}

async function slackApiGet(
  token: string,
  method: string,
  params: Record<string, string> = {}
): Promise<{ ok: boolean; [key: string]: unknown }> {
  const url = new URL(`https://slack.com/api/${method}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  return (await response.json()) as { ok: boolean; [key: string]: unknown };
}

export async function syncSlackForUser(userId: string): Promise<number> {
  const token = await getSlackAccessToken(userId);
  if (!token) {
    return 0;
  }

  const client = getSupabaseClient();
  if (!client) {
    return 0;
  }

  const authRes = await slackApiGet(token, "auth.test", {});
  const currentUserSlackId: string | null =
    authRes.ok && typeof authRes.user_id === "string" ? (authRes.user_id as string) : null;

  const listRes = await slackApiGet(token, "users.conversations", {
    types: "public_channel,private_channel,im,mpim",
    limit: String(MAX_CHANNELS),
    exclude_archived: "true"
  });

  if (!listRes.ok || !Array.isArray(listRes.channels)) {
    return 0;
  }

  const channelMap = new Map<string, { name: string; isDm: boolean }>();
  (listRes.channels as SlackConversation[]).forEach((ch) => {
    if (!ch.id) return;
    const name = ch.name ?? (ch.is_im ? "DM" : ch.is_mpim ? "Group DM" : "unknown");
    channelMap.set(ch.id, { name, isDm: Boolean(ch.is_im || ch.is_mpim) });
  });
  const channelIds = Array.from(channelMap.keys());

  const items: SlackItemRow[] = [];
  const now = new Date().toISOString();
  const userIdsToResolve = new Set<string>();

  for (const channelId of channelIds) {
    const channelMeta = channelMap.get(channelId) ?? { name: "unknown", isDm: false };
    const channelName = channelMeta.name;
    const oldestTs = Math.floor(Date.now() / 1000 - MAX_AGE_DAYS * 24 * 60 * 60);
    const historyRes = await slackApiGet(token, "conversations.history", {
      channel: channelId,
      limit: String(MESSAGES_PER_CHANNEL),
      oldest: String(oldestTs)
    });

    if (!historyRes.ok || !Array.isArray(historyRes.messages)) {
      continue;
    }

    const messages = historyRes.messages as SlackMessage[];
    for (const msg of messages) {
      if (msg.type !== "message" || !msg.text?.trim()) continue;
      if (msg.subtype && NOISE_SUBTYPES.has(msg.subtype)) continue;
      if (NOISE_TEXT_PATTERNS.some((re) => re.test(msg.text))) continue;
      if (msg.bot_id) continue;
      if (!isWithinMaxAge(msg.ts)) continue;
      if (isAcknowledgment(msg.text)) continue;

      const isDm = channelMeta.isDm;
      const mentionsUser =
        currentUserSlackId != null &&
        (msg.text.includes(`<@${currentUserSlackId}>`) || msg.text.includes(`@${currentUserSlackId}`));
      const isOpenItem = isDm || mentionsUser;

      if (!isOpenItem) continue;

      if (!isDm && mentionsUser && !looksActionable(msg.text)) continue;
      if (!shouldBeOutstandingSlack(msg.text)) continue;

      if (msg.user) userIdsToResolve.add(msg.user);

      const sourceRef = `${channelId}:${msg.ts}`;
      const id = `slack-${userId}-${sourceRef.replace(/[^a-zA-Z0-9-]/g, "_")}`;
      const title = msg.text.slice(0, 80) + (msg.text.length > 80 ? "…" : "");
      const msgPreview = msg.text.slice(0, 600) + (msg.text.length > 600 ? "…" : "");
      const summary = `#${channelName}${msg.user ? ` @${msg.user}` : ""}: ${msgPreview}`;

      items.push({
        id,
        provider: "slack",
        type: "slack_message",
        sourceRef,
        title,
        summary,
        requiresReply: isDm || mentionsUser,
        isOutstanding: true,
        sender: msg.user ?? undefined,
        tags: ["slack_sync"],
        created_at_iso: now,
        updated_at_iso: now
      });
    }
  }

  if (items.length === 0) {
    return 0;
  }

  const nameMap = await resolveSlackUserNames(userId, [...userIdsToResolve]);
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
    sender: item.sender ? (nameMap.get(item.sender) ?? item.sender) : null,
    tags: item.tags as string[],
    created_at_iso: item.created_at_iso,
    updated_at_iso: item.updated_at_iso
  }));

  await client
    .from("external_items")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "slack");

  await client.from("external_items").upsert(rows, { onConflict: "id" });

  await client
    .from("integration_accounts")
    .update({
      last_sync_at: now,
      updated_at: now
    })
    .eq("user_id", userId)
    .eq("provider", "slack");

  return items.length;
}

export async function resolveSlackUserNames(
  userId: string,
  userIds: string[]
): Promise<Map<string, string>> {
  const token = await getSlackAccessToken(userId);
  if (!token) return new Map();
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  for (const uid of unique) {
    try {
      const res = await slackApiGet(token, "users.info", { user: uid });
      if (res.ok && res.user && typeof res.user === "object") {
        const u = res.user as { real_name?: string; profile?: { display_name?: string } };
        const name = u.real_name || u.profile?.display_name || uid;
        map.set(uid, name);
      }
    } catch {
      // Skip on error
    }
  }
  return map;
}
