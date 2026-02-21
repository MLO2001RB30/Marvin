import type {
  DigestResult,
  ExternalItem,
  OutstandingItem,
  PrioritySignal
} from "@pia/shared";

function scoreOutstanding(item: ExternalItem): number {
  let score = 35;
  if (item.provider === "slack" || item.provider === "gmail") {
    score += 20;
  }
  if (item.requiresReply) {
    score += 25;
  }
  if (item.tags.includes("urgent")) {
    score += 20;
  }
  if (item.tags.includes("high_priority")) {
    score += 15;
  }
  return Math.max(0, Math.min(100, score));
}

function toCategory(item: ExternalItem): OutstandingItem["category"] {
  if (item.requiresReply) {
    return "reply_needed";
  }
  if (item.tags.includes("follow_up")) {
    return "blocked";
  }
  return "fyi";
}

export function buildOutstandingDigest(items: ExternalItem[]): DigestResult {
  const outstanding = items
    .filter((item) => item.isOutstanding)
    .map<OutstandingItem>((item) => {
      const score = scoreOutstanding(item);
      return {
        itemId: item.id,
        provider: item.provider,
        title: item.title,
        category: toCategory(item),
        score,
        explainWhy: item.requiresReply
          ? "Requires a reply and is still unresolved."
          : "Flagged as outstanding from connected sources."
      };
    })
    .sort((a, b) => b.score - a.score);

  const replyNeededCount = outstanding.filter((item) => item.category === "reply_needed").length;
  const blockedCount = outstanding.filter((item) => item.category === "blocked").length;
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
    summary: `You have ${outstanding.length} outstanding items, including ${replyNeededCount} that need a reply.`,
    items: outstanding,
    signals
  };
}
