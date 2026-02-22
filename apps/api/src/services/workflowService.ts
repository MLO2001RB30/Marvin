import type { WorkflowDefinition, WorkflowRun } from "@pia/shared";

import { getSupabaseClient } from "./supabaseClient";

export async function listWorkflows(userId: string): Promise<WorkflowDefinition[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }
  const { data } = await client
    .from("workflows")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at_iso", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    enabled: Boolean(row.enabled),
    selectedProviders: row.selected_providers ?? [],
    template: row.template,
    trigger: row.trigger,
    deliveryChannels: row.delivery_channels ?? [],
    createdAtIso: row.created_at_iso,
    updatedAtIso: row.updated_at_iso
  })) as WorkflowDefinition[];
}

export async function upsertWorkflow(
  userId: string,
  workflow: WorkflowDefinition
): Promise<WorkflowDefinition> {
  const client = getSupabaseClient();
  if (!client) {
    return workflow;
  }
  await client.from("workflows").upsert(
    {
      id: workflow.id,
      user_id: userId,
      name: workflow.name,
      enabled: workflow.enabled,
      selected_providers: workflow.selectedProviders,
      template: workflow.template,
      trigger: workflow.trigger,
      delivery_channels: workflow.deliveryChannels,
      created_at_iso: workflow.createdAtIso,
      updated_at_iso: workflow.updatedAtIso,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );
  return workflow;
}

export async function addWorkflowRun(userId: string, run: WorkflowRun): Promise<WorkflowRun> {
  const client = getSupabaseClient();
  if (!client) {
    return run;
  }
  await client.from("workflow_runs").insert({
    id: run.id,
    user_id: userId,
    workflow_id: run.workflowId,
    started_at_iso: run.startedAtIso,
    finished_at_iso: run.finishedAtIso,
    status: run.status,
    delivered_channels: run.deliveredChannels,
    digest: run.digest ?? null,
    error_message: run.errorMessage ?? null,
    integrations_used: run.integrationsUsed ?? [],
    stage_results: run.stageResults ?? [],
    artifact_refs: run.artifactRefs ?? [],
    context_snapshot_id: run.contextSnapshotId ?? null
  });
  return run;
}

export async function listWorkflowRuns(userId: string): Promise<WorkflowRun[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }
  const { data } = await client
    .from("workflow_runs")
    .select("*")
    .eq("user_id", userId)
    .order("finished_at_iso", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    workflowId: row.workflow_id,
    startedAtIso: row.started_at_iso,
    finishedAtIso: row.finished_at_iso,
    status: row.status,
    deliveredChannels: row.delivered_channels ?? [],
    digest: row.digest ?? undefined,
    errorMessage: row.error_message ?? undefined,
    integrationsUsed: row.integrations_used ?? [],
    stageResults: row.stage_results ?? [],
    artifactRefs: row.artifact_refs ?? [],
    contextSnapshotId: row.context_snapshot_id ?? undefined
  })) as WorkflowRun[];
}

export async function getWorkflowRunById(
  userId: string,
  runId: string
): Promise<WorkflowRun | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data } = await client
    .from("workflow_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", runId)
    .maybeSingle();

  if (!data) {
    return null;
  }
  return {
    id: data.id,
    workflowId: data.workflow_id,
    startedAtIso: data.started_at_iso,
    finishedAtIso: data.finished_at_iso,
    status: data.status,
    deliveredChannels: data.delivered_channels ?? [],
    digest: data.digest ?? undefined,
    errorMessage: data.error_message ?? undefined,
    integrationsUsed: data.integrations_used ?? [],
    stageResults: data.stage_results ?? [],
    artifactRefs: data.artifact_refs ?? [],
    contextSnapshotId: data.context_snapshot_id ?? undefined
  } as WorkflowRun;
}

export async function getWorkflowById(
  userId: string,
  workflowId: string
): Promise<WorkflowDefinition | undefined> {
  const client = getSupabaseClient();
  if (!client) {
    return undefined;
  }
  const { data } = await client
    .from("workflows")
    .select("*")
    .eq("user_id", userId)
    .eq("id", workflowId)
    .maybeSingle();

  if (!data) {
    return undefined;
  }
  return {
    id: data.id,
    name: data.name,
    enabled: Boolean(data.enabled),
    selectedProviders: data.selected_providers ?? [],
    template: data.template,
    trigger: data.trigger,
    deliveryChannels: data.delivery_channels ?? [],
    createdAtIso: data.created_at_iso,
    updatedAtIso: data.updated_at_iso
  } as WorkflowDefinition;
}
