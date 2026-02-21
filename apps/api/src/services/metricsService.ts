import type { WorkflowRun } from "@pia/shared";

export interface ProductMetrics {
  dailyBriefingOpenRate: number;
  sameDayActionRate: number;
  falsePositiveUrgentRate: number;
  timeToFirstValueMinutes: number;
}

export function computeProductMetrics(runs: WorkflowRun[]): ProductMetrics {
  if (runs.length === 0) {
    return {
      dailyBriefingOpenRate: 0,
      sameDayActionRate: 0,
      falsePositiveUrgentRate: 0,
      timeToFirstValueMinutes: 0
    };
  }

  const successful = runs.filter((run) => run.status === "success");
  const openRate = successful.length / runs.length;
  const actionRate = successful.filter((run) => (run.digest?.items.length ?? 0) > 0).length / runs.length;
  const falsePositiveRate = successful.filter((run) => (run.digest?.items.length ?? 0) === 0).length / runs.length;
  const firstRun = [...runs].sort((a, b) => a.startedAtIso.localeCompare(b.startedAtIso))[0];
  const timeToFirstValueMinutes = Math.max(
    0,
    Math.round(
      (new Date(firstRun.finishedAtIso).getTime() - new Date(firstRun.startedAtIso).getTime()) / 60000
    )
  );

  return {
    dailyBriefingOpenRate: Number(openRate.toFixed(2)),
    sameDayActionRate: Number(actionRate.toFixed(2)),
    falsePositiveUrgentRate: Number(falsePositiveRate.toFixed(2)),
    timeToFirstValueMinutes
  };
}
