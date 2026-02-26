import { getGoogleAccessToken } from "./integrationService";
import { shouldBeOutstandingDrive } from "./itemFilters";
import { getSupabaseClient } from "./supabaseClient";

const MAX_FILES = 20;

interface DriveFile {
  id: string;
  name?: string;
  mimeType?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface DriveListResponse {
  files?: DriveFile[];
  nextPageToken?: string;
}

async function driveApiGet(
  token: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive API error ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json();
}

export async function syncGoogleDriveForUser(userId: string): Promise<number> {
  const token = await getGoogleAccessToken(userId);
  if (!token) {
    return 0;
  }

  const client = getSupabaseClient();
  if (!client) {
    return 0;
  }

  const listRes = (await driveApiGet(token, {
    orderBy: "modifiedTime desc",
    pageSize: String(MAX_FILES),
    q: "trashed = false",
    fields: "files(id,name,mimeType,modifiedTime,webViewLink)"
  })) as DriveListResponse;

  const files = listRes.files ?? [];
  if (files.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();
  const items = files.map((file) => {
    const name = file.name ?? "Untitled";
    const mimeType = file.mimeType ?? "";
    const modified = file.modifiedTime ?? now;
    const summary = `Modified: ${modified}\nType: ${mimeType}`;
    return {
      id: `drive-${userId}-${file.id}`,
      provider: "google_drive" as const,
      type: "drive_file" as const,
      sourceRef: file.id,
      title: name.slice(0, 80) + (name.length > 80 ? "…" : ""),
      summary,
      requiresReply: false,
      isOutstanding: shouldBeOutstandingDrive(),
      tags: ["drive_sync"],
      created_at_iso: now,
      updated_at_iso: now
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
    sender: null,
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
    .eq("provider", "google_drive")
    .not("id", "in", `(${freshIds.join(",")})`);

  await client
    .from("integration_accounts")
    .update({
      last_sync_at: now,
      updated_at: now
    })
    .eq("user_id", userId)
    .eq("provider", "google_drive");

  return items.length;
}
