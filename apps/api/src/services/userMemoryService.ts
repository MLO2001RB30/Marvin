import { getSupabaseClient } from "./supabaseClient";
import { env } from "../config/env";

export interface UserMemoryEntry {
  id: string;
  category: "preference" | "contact" | "pattern" | "goal";
  content: string;
  source: string;
  createdAtIso: string;
}

const inMemoryStore = new Map<string, UserMemoryEntry[]>();

export async function listUserMemories(userId: string): Promise<UserMemoryEntry[]> {
  const client = getSupabaseClient();
  if (!client) {
    return inMemoryStore.get(userId) ?? [];
  }
  const { data } = await client
    .from("user_memories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    category: row.category as UserMemoryEntry["category"],
    content: row.content as string,
    source: row.source as string,
    createdAtIso: row.created_at as string
  }));
}

export async function addUserMemory(
  userId: string,
  entry: Omit<UserMemoryEntry, "id" | "createdAtIso">
): Promise<void> {
  const client = getSupabaseClient();
  const nowIso = new Date().toISOString();
  if (!client) {
    const existing = inMemoryStore.get(userId) ?? [];
    if (existing.some((e) => e.content === entry.content)) return;
    existing.unshift({ ...entry, id: `mem-${Date.now()}`, createdAtIso: nowIso });
    if (existing.length > 30) existing.pop();
    inMemoryStore.set(userId, existing);
    return;
  }
  const { data: existingRows } = await client
    .from("user_memories")
    .select("id")
    .eq("user_id", userId)
    .eq("content", entry.content)
    .limit(1);
  if (existingRows && existingRows.length > 0) return;

  await client.from("user_memories").insert({
    user_id: userId,
    category: entry.category,
    content: entry.content,
    source: entry.source,
    created_at: nowIso
  });
}

export function buildMemoryPromptSection(memories: UserMemoryEntry[]): string {
  if (memories.length === 0) return "";
  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m.content);
  }
  const parts: string[] = ["USER MEMORY (learned from past conversations):"];
  for (const [cat, items] of Object.entries(grouped)) {
    parts.push(`[${cat}] ${items.join("; ")}`);
  }
  return parts.join("\n");
}

export async function extractMemoriesFromConversation(
  userId: string,
  question: string,
  answer: string
): Promise<void> {
  const llmApiKey = env.CLAUDE_SONNET_4_5_API_KEY || env.OPENAI_API_KEY;
  if (!llmApiKey) return;

  const combined = `User: ${question}\nAssistant: ${answer}`;
  if (combined.length < 40) return;

  try {
    const resolvedModel = env.CLAUDE_SONNET_4_5_API_KEY ? "anthropic/claude-sonnet-4.5" : env.OPENAI_MODEL;
    const baseUrl = env.OPENAI_BASE_URL.replace(/\/+$/, "");
    const headers: Record<string, string> = {
      Authorization: `Bearer ${llmApiKey}`,
      "Content-Type": "application/json"
    };
    if (baseUrl.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = "https://marvin.app";
      headers["X-Title"] = "Marvin";
    }
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: resolvedModel,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Extract user preferences, key contacts, goals, or work patterns from this conversation. Return JSON: {"memories": [{"category": "preference|contact|pattern|goal", "content": "concise fact"}]}. Only include genuinely useful long-term facts. Return {"memories": []} if nothing notable. Max 3 entries.`
          },
          { role: "user", content: combined }
        ]
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return;
    const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    let raw = payload.choices?.[0]?.message?.content?.trim() ?? "";
    const fence = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (fence) raw = fence[1].trim();
    const parsed = JSON.parse(raw) as { memories?: Array<{ category?: string; content?: string }> };
    if (!Array.isArray(parsed.memories)) return;
    for (const m of parsed.memories) {
      if (m.category && m.content) {
        await addUserMemory(userId, {
          category: m.category as UserMemoryEntry["category"],
          content: m.content,
          source: "conversation"
        });
      }
    }
  } catch {
    // Memory extraction is best-effort
  }
}
