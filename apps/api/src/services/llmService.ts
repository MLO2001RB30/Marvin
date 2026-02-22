import type {
  DailyContextSnapshot,
  DigestResult,
  ExternalItem,
  IntegrationAccount,
  IntegrationProvider,
  OutstandingItem,
  PrioritySignal
} from "@pia/shared";

import { env } from "../config/env";

interface SummaryInput {
  userId: string;
  dateIso: string;
  items: ExternalItem[];
  integrations: IntegrationAccount[];
  /** When provided, use these for the brief instead of filtering items by isOutstanding */
  curatedItems?: OutstandingItem[];
}

interface SummaryOutput {
  summary: string;
  confidence: number;
  topBlockers: string[];
  whatChanged: string[];
  model: string;
  usedFallback: boolean;
}

function fallbackSummary(input: SummaryInput): SummaryOutput {
  const outstanding = input.curatedItems ?? input.items.filter((item) => item.isOutstanding);
  const top = outstanding.slice(0, 3).map((item) => item.title);
  return {
    summary: `You have ${outstanding.length} outstanding items across ${input.integrations.length} integrations.`,
    confidence: 0.65,
    topBlockers: top.slice(0, 2),
    whatChanged: top.length ? [`Top item now: ${top[0]}`] : ["No major changes detected."],
    model: "deterministic-fallback",
    usedFallback: true
  };
}

export async function summarizeDailyContext(input: SummaryInput): Promise<SummaryOutput> {
  if (!env.OPENAI_API_KEY) {
    return fallbackSummary(input);
  }

  const prompt = [
    "You are generating a personal productivity context brief.",
    "Return strict JSON with keys: summary, confidence, topBlockers, whatChanged.",
    "Keep summary under 50 words and specific to provided data.",
    `Date: ${input.dateIso}`,
    `Outstanding items: ${(input.curatedItems ?? input.items.filter((item) => item.isOutstanding)).map((item) => `${item.provider}:${item.title}`).join(" | ")}`,
    `Integrations: ${input.integrations.map((item) => `${item.provider}:${item.status}`).join(" | ")}`
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
      return fallbackSummary(input);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return fallbackSummary(input);
    }
    const parsed = JSON.parse(content) as Partial<DailyContextSnapshot>;
    return {
      summary: String(parsed.summary ?? ""),
      confidence: Number(parsed.confidence ?? 0.7),
      topBlockers: Array.isArray(parsed.topBlockers) ? parsed.topBlockers.map(String) : [],
      whatChanged: Array.isArray(parsed.whatChanged) ? parsed.whatChanged.map(String) : [],
      model: env.OPENAI_MODEL,
      usedFallback: false
    };
  } catch {
    return fallbackSummary(input);
  }
}

const DIGEST_LLM_SYSTEM_PROMPT = `You curate a personal productivity "open items" list. ONLY include items that ACTIVELY require action from the user.

STRICT DEFINITION OF "REQUIRES ACTION":
- Someone is explicitly waiting for the user's reply, decision, approval, or input
- A deadline the user must meet
- A direct request or question addressed to the user
- Something the user must do (submit, confirm, attend, sign off)

EXCLUDE (do NOT include):
- FYI emails, informational updates, newsletters, digests
- Notifications (someone liked, commented, viewed—unless it's a direct message needing reply)
- Order confirmations, receipts, shipping updates
- Automated reminders, system messages
- Emails that are purely informational with no clear next step for the user
- When in doubt, EXCLUDE. Be conservative.

INCLUDE only when there is a clear, direct action:
- Email explicitly asking for a reply or response
- Slack DM or @mention with a question/request for the user
- Meeting invite awaiting response
- Deadline or commitment the user made

category: "reply_needed" (someone waiting for user's reply), "blocked" (user waiting on someone else), "fyi" (rare—only if truly actionable).
score: 0–100. Higher = more urgent. Be strict: most items should score under 60 unless clearly urgent.
explainWhy: one short sentence stating the specific action required.`;

interface DigestLLMInput {
  items: ExternalItem[];
  dateIso: string;
}

interface DigestLLMOutput {
  items: Array<{
    itemId: string;
    provider: IntegrationProvider;
    title: string;
    category: "reply_needed" | "blocked" | "fyi";
    score: number;
    explainWhy: string;
  }>;
}

export async function buildDigestWithLLM(
  input: DigestLLMInput,
  fallback: () => DigestResult
): Promise<DigestResult> {
  if (!env.OPENAI_API_KEY || input.items.length === 0) {
    return fallback();
  }

  const itemPayload = input.items
    .slice(0, 60)
    .map(
      (item) =>
        `[id=${item.id} provider=${item.provider} sender=${item.sender ?? "-"}]\n` +
        `title: ${item.title}\n` +
        `summary: ${(item.summary ?? "").slice(0, 300)}`
    )
    .join("\n\n---\n\n");

  const userPrompt = [
    `Date: ${input.dateIso}`,
    "",
    "Return strict JSON: { items: [{ itemId, provider, title, category, score, explainWhy }] }",
    "itemId must match an [id=...] above. provider must match. title can be shortened.",
    "",
    "Items to curate:",
    itemPayload
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
        messages: [
          { role: "system", content: DIGEST_LLM_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      return fallback();
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return fallback();
    }

    const parsed = JSON.parse(content) as DigestLLMOutput;
    const llmItems = Array.isArray(parsed.items) ? parsed.items : [];
    const itemMap = new Map(input.items.map((i) => [i.id, i]));
    const validItems: OutstandingItem[] = llmItems
      .filter((o) => itemMap.has(o.itemId))
      .slice(0, 15)
      .map((o) => {
        const source = itemMap.get(o.itemId)!;
        return {
          itemId: o.itemId,
          provider: source.provider,
          title: o.title || source.title,
          category: (["reply_needed", "blocked", "fyi"].includes(o.category ?? "") ? o.category : "fyi") as
            | "reply_needed"
            | "blocked"
            | "fyi",
          score: Math.max(0, Math.min(100, Number(o.score) || 50)),
          explainWhy: String(o.explainWhy ?? "Flagged by AI as relevant.")
        };
      })
      .sort((a, b) => b.score - a.score);

    const replyNeededCount = validItems.filter((i) => i.category === "reply_needed").length;
    const blockedCount = validItems.filter((i) => i.category === "blocked").length;
    const signals: PrioritySignal[] = [
      {
        id: "signal-reply-pressure",
        label: "Reply pressure",
        weight: Math.min(1, replyNeededCount / 5),
        evidence: `${replyNeededCount} reply-needed items`
      },
      {
        id: "signal-blocker-pressure",
        label: "Blocker pressure",
        weight: Math.min(1, blockedCount / 3),
        evidence: `${blockedCount} blocked items`
      }
    ];

    return {
      generatedAtIso: new Date().toISOString(),
      summary: `You have ${validItems.length} curated items needing attention, including ${replyNeededCount} that need a reply.`,
      items: validItems,
      signals
    };
  } catch {
    return fallback();
  }
}
