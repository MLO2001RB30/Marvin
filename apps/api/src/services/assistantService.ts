import type { AssistantAnswer, DigestResult } from "@pia/shared";

export function answerAssistantQuestion(
  question: string,
  digest: DigestResult
): AssistantAnswer {
  const topItems = digest.items.slice(0, 3);
  const answer =
    topItems.length === 0
      ? "No urgent outstanding items right now."
      : `Top priorities: ${topItems.map((item) => item.title).join("; ")}.`;

  return {
    question,
    answer,
    citedItems: topItems.map((item) => ({
      itemId: item.itemId,
      provider: item.provider,
      reason: item.explainWhy
    })),
    generatedAtIso: new Date().toISOString()
  };
}
