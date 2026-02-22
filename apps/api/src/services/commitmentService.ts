import { randomUUID } from "node:crypto";

import type { Commitment, CommitmentDirection, ExternalItem } from "@pia/shared";

import { env } from "../config/env";

const COMMITMENT_SOURCE_TYPES = ["gmail_thread", "slack_message"] as const;

interface RawCommitment {
  sourceItemId: string;
  direction: CommitmentDirection;
  brief: string;
  counterparty?: string;
  dueDateIso?: string;
}

interface ExtractionResponse {
  commitments?: RawCommitment[];
}

function filterCommitmentItems(items: ExternalItem[]): ExternalItem[] {
  return items.filter((item) =>
    COMMITMENT_SOURCE_TYPES.includes(item.type as (typeof COMMITMENT_SOURCE_TYPES)[number])
  );
}

export async function extractCommitments(items: ExternalItem[]): Promise<Commitment[]> {
  const candidates = filterCommitmentItems(items);
  if (candidates.length === 0) {
    return [];
  }

  if (!env.OPENAI_API_KEY) {
    return [];
  }

  const itemsPayload = candidates
    .map(
      (item) =>
        `[id=${item.id} provider=${item.provider} sender=${item.sender ?? "unknown"}]\n` +
        `Title: ${item.title}\n` +
        `Summary: ${item.summary}`
    )
    .join("\n\n---\n\n");

  const prompt = [
    "You are analyzing communications (email threads, Slack messages) to detect commitments.",
    "The inbox owner is 'you' (the user).",
    "Extract only explicit promises with timeframes or clear deliverables.",
    "Examples: 'I'll send that by Friday' (user_made), 'James said he'd get back by Wednesday' (others_made).",
    "Skip vague phrases like 'we should chat sometime' or 'let me know when you can'.",
    "Return strict JSON: { commitments: [{ sourceItemId: string, direction: 'user_made'|'others_made', brief: string, counterparty?: string, dueDateIso?: string }] }",
    "sourceItemId must match the [id=...] from the items above.",
    "brief: short actionable description (e.g. 'send deck by Friday'). counterparty: person name when known. dueDateIso: YYYY-MM-DD if extractable.",
    "",
    "Items to analyze:",
    itemsPayload
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return [];
    }

    const parsed = JSON.parse(content) as ExtractionResponse;
    const raw = parsed.commitments ?? [];
    if (!Array.isArray(raw) || raw.length === 0) {
      return [];
    }

    const itemMap = new Map(candidates.map((c) => [c.id, c]));
    const commitments: Commitment[] = [];

    for (const r of raw) {
      if (typeof r.sourceItemId !== "string" || typeof r.direction !== "string" || typeof r.brief !== "string")
        continue;
      if (r.direction !== "user_made" && r.direction !== "others_made") continue;

      const source = itemMap.get(r.sourceItemId);
      if (!source) continue;

      commitments.push({
        id: randomUUID(),
        sourceItemId: source.id,
        provider: source.provider,
        direction: r.direction,
        brief: r.brief.trim(),
        counterparty: typeof r.counterparty === "string" ? r.counterparty.trim() || undefined : undefined,
        dueDateIso: typeof r.dueDateIso === "string" ? r.dueDateIso : undefined,
        sourceRef: source.sourceRef
      });
    }

    return commitments;
  } catch {
    return [];
  }
}
