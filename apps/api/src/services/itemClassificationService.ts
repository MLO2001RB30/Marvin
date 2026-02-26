import type { ExternalItem } from "@pia/shared";
import { env } from "../config/env";
import { getSupabaseClient } from "./supabaseClient";

interface ClassificationResult {
  item_id: string;
  urgency_score: number;
  action_type: string;
  requires_action: boolean;
  explain_why: string;
}

export async function classifyItemsWithLLM(
  userId: string,
  items: ExternalItem[]
): Promise<void> {
  const llmApiKey = env.CLAUDE_SONNET_4_5_API_KEY || env.OPENAI_API_KEY;
  if (!llmApiKey) return;

  const unclassified = items.filter((i) => i.isOutstanding).slice(0, 20);
  if (unclassified.length === 0) return;

  const itemSummaries = unclassified.map((i) => ({
    id: i.id,
    provider: i.provider,
    title: i.title,
    summary: (i.summary ?? "").slice(0, 150),
    sender: i.sender,
    requires_reply: i.requiresReply
  }));

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
            content: `Classify these work items by urgency and required action. Return JSON:
{"classifications": [{"item_id": "string", "urgency_score": 0-100, "action_type": "reply|review|prepare|delegate|none", "requires_action": true/false, "explain_why": "1 sentence"}]}
Score: 90-100=critical/blocking, 70-89=important/time-sensitive, 40-69=normal, 0-39=low/FYI.`
          },
          {
            role: "user",
            content: JSON.stringify(itemSummaries)
          }
        ]
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) return;

    const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    let raw = payload.choices?.[0]?.message?.content?.trim() ?? "";
    const fence = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (fence) raw = fence[1].trim();

    const parsed = JSON.parse(raw) as { classifications?: ClassificationResult[] };
    if (!Array.isArray(parsed.classifications)) return;

    const client = getSupabaseClient();
    if (!client) return;

    const nowIso = new Date().toISOString();
    for (const c of parsed.classifications) {
      await client
        .from("external_items")
        .update({
          urgency_score: c.urgency_score,
          action_type: c.action_type,
          requires_action: c.requires_action,
          explain_why: c.explain_why,
          classified_at: nowIso
        })
        .eq("id", c.item_id)
        .eq("user_id", userId);
    }

    console.info(`[classify] Classified ${parsed.classifications.length} items for user ${userId}`);
  } catch (err) {
    console.warn("[classify] Item classification failed:", err);
  }
}
