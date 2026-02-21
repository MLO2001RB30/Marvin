import type {
  ContextInputs,
  ContextResult,
  ContextScores,
  Recommendation,
  RecommendationTrace
} from "@pia/shared";

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreEnergy(inputs: ContextInputs) {
  const { sleepHours, hrv, recoveryScore } = inputs.health.payload;
  return clamp((sleepHours / 8) * 40 + (hrv / 100) * 20 + recoveryScore * 0.4);
}

function scorePriority(inputs: ContextInputs) {
  const mailPressure = inputs.mail.payload.reduce((sum, item) => sum + item.importanceScore * 10, 0);
  const eventPressure = inputs.calendar.payload.filter((item) => item.intensity === "high").length * 12;
  return clamp(mailPressure + eventPressure + 35);
}

function scoreCognitiveLoad(inputs: ContextInputs) {
  const meetingLoad = inputs.calendar.payload.length * 11;
  const unansweredLoad = inputs.mail.payload.filter((item) => item.unansweredHours > 8).length * 14;
  return clamp(meetingLoad + unansweredLoad + 22);
}

function buildRecommendations(
  inputs: ContextInputs,
  scores: ContextScores
): { recommendations: Recommendation[]; traces: RecommendationTrace[] } {
  const recommendations: Recommendation[] = [];
  const traces: RecommendationTrace[] = [];

  if (scores.priorityScore > 70) {
    recommendations.push({
      id: "rec-priority-mail",
      title: "Respond to high-importance threads before first meeting",
      reason: "Priority pressure is elevated from unanswered high-importance messages.",
      confidence: 0.89,
      actionType: "email"
    });
    traces.push({
      ruleId: "priority.mail.v1",
      explanation: "Triggered when priority score exceeds 70 and unanswered critical threads exist.",
      inputsUsed: ["mail.importanceScore", "mail.unansweredHours"]
    });
  }

  if (scores.energyScore >= 65) {
    recommendations.push({
      id: "rec-deep-work",
      title: "Protect a 90-minute deep-work block before noon",
      reason: "Current energy score supports demanding focus work.",
      confidence: 0.82,
      actionType: "focus"
    });
    traces.push({
      ruleId: "energy.focus.v1",
      explanation: "Triggered when energy score >= 65.",
      inputsUsed: ["health.sleepHours", "health.hrv", "health.recoveryScore"]
    });
  } else {
    recommendations.push({
      id: "rec-recovery-buffer",
      title: "Shift one high-intensity task to afternoon and add a recovery block",
      reason: "Lower energy suggests recovery-aware planning.",
      confidence: 0.77,
      actionType: "health"
    });
    traces.push({
      ruleId: "energy.recovery.v1",
      explanation: "Triggered when energy score < 65.",
      inputsUsed: ["health.sleepHours", "health.recoveryScore"]
    });
  }

  if (inputs.weather.payload.precipitationChance > 0.6) {
    recommendations.push({
      id: "rec-weather-adjust",
      title: "Convert outdoor workout to indoor mobility",
      reason: "Weather risk is high for outdoor sessions.",
      confidence: 0.73,
      actionType: "habit"
    });
    traces.push({
      ruleId: "weather.habit.v1",
      explanation: "Triggered when precipitation chance exceeds 60%.",
      inputsUsed: ["weather.precipitationChance"]
    });
  }

  return { recommendations, traces };
}

export function buildContextResult(inputs: ContextInputs): ContextResult {
  const scores: ContextScores = {
    energyScore: scoreEnergy(inputs),
    priorityScore: scorePriority(inputs),
    cognitiveLoadIndex: scoreCognitiveLoad(inputs)
  };

  const { recommendations, traces } = buildRecommendations(inputs, scores);

  return {
    scores,
    recommendations,
    traces,
    generatedAtIso: new Date().toISOString()
  };
}
