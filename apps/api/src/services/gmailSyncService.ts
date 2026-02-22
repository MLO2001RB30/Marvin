import { getGoogleAccessToken } from "./integrationService";
import { shouldBeOutstandingGmail } from "./itemFilters";
import { getSupabaseClient } from "./supabaseClient";

const MAX_MESSAGES = 50;

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessagePart {
  mimeType?: string;
  headers?: GmailHeader[];
  parts?: GmailMessagePart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: GmailMessagePart;
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
}

function collectHeaders(part: GmailMessagePart | undefined): GmailHeader[] {
  if (!part) return [];
  const fromPart = part.headers ?? [];
  const fromNested = (part.parts ?? []).flatMap((p) => collectHeaders(p));
  return fromPart.length > 0 ? fromPart : fromNested;
}

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers) return "";
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

async function gmailApiGet(
  token: string,
  path: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail API error ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json();
}

export async function syncGmailForUser(userId: string): Promise<number> {
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    console.warn("[gmail] No token for user", userId);
    return 0;
  }

  const client = getSupabaseClient();
  if (!client) {
    return 0;
  }

  const listRes = (await gmailApiGet(token, "/messages", {
    maxResults: String(MAX_MESSAGES),
    labelIds: "INBOX"
  })) as GmailListResponse;

  const messages = listRes.messages ?? [];
  console.log("[gmail] Fetched", messages.length, "messages for user", userId);
  if (messages.length === 0) {
    return 0;
  }

  const items: Array<{
    id: string;
    provider: "gmail";
    type: "gmail_thread";
    sourceRef: string;
    title: string;
    summary: string;
    requiresReply: boolean;
    isOutstanding: boolean;
    sender?: string;
    tags: string[];
    created_at_iso: string;
    updated_at_iso: string;
  }> = [];
  const now = new Date().toISOString();

  for (const msg of messages.slice(0, MAX_MESSAGES)) {
    try {
      const fullMsg = (await gmailApiGet(token, `/messages/${msg.id}`, {
        format: "metadata"
      })) as GmailMessage;

      const headers = collectHeaders(fullMsg.payload);
      const subject = getHeader(headers, "Subject") || "(No subject)";
      const from = getHeader(headers, "From");
      const snippet = fullMsg.snippet ?? "";
      const preview = snippet.slice(0, 600) + (snippet.length > 600 ? "…" : "");

      const id = `gmail-${userId}-${msg.id}`;
      const sourceRef = `${msg.threadId}:${msg.id}`;
      const title = subject.slice(0, 80) + (subject.length > 80 ? "…" : "");
      const summary = `From: ${from}\nSubject: ${subject}\n${preview}`;
      const isOutstanding = shouldBeOutstandingGmail(subject, from);

      items.push({
        id,
        provider: "gmail",
        type: "gmail_thread",
        sourceRef,
        title,
        summary,
        requiresReply: false,
        isOutstanding,
        sender: from || undefined,
        tags: ["gmail_sync"],
        created_at_iso: now,
        updated_at_iso: now
      });
    } catch {
      // Skip failed message fetches
    }
  }

  const outstandingCount = items.filter((i) => i.isOutstanding).length;
  console.log("[gmail] Storing", items.length, "items,", outstandingCount, "outstanding");

  if (items.length === 0) {
    return 0;
  }

  await client
    .from("external_items")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "gmail");

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

  await client
    .from("integration_accounts")
    .update({
      last_sync_at: now,
      updated_at: now
    })
    .eq("user_id", userId)
    .eq("provider", "gmail");

  return items.length;
}
