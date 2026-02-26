import type { DailyContextSnapshot, WorkflowRun } from "@pia/shared";

export interface ProductMetrics {
  totalWorkflowRuns: number;
  workflowSuccessRate: number;
  snapshotFreshnessMinutes: number | null;
  outstandingItemCount: number;
  connectedIntegrationCount: number;
  lastPipelineRunIso: string | null;
}

export function computeProductMetrics(
  runs: WorkflowRun[],
  snapshot: DailyContextSnapshot | null
): ProductMetrics {
  const successful = runs.filter((run) => run.status === "success");
  return {
    totalWorkflowRuns: runs.length,
    workflowSuccessRate: runs.length > 0 ? Number((successful.length / runs.length).toFixed(2)) : 0,
    snapshotFreshnessMinutes: snapshot
      ? Math.max(0, Math.round((Date.now() - new Date(snapshot.generatedAtIso).getTime()) / 60000))
      : null,
    outstandingItemCount: snapshot?.outstandingItems?.length ?? 0,
    connectedIntegrationCount: snapshot?.sourceStatuses?.filter((s) => s.health === "connected").length ?? 0,
    lastPipelineRunIso: snapshot?.generatedAtIso ?? null
  };
}
