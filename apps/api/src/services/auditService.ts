import type { AssistantAnswer, ContextResult, IntegrationConsent } from "@pia/shared";

import { getSupabaseClient } from "./supabaseClient";

export async function logRecommendationAudit(userId: string, result: ContextResult) {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  await client.from("recommendation_audit").insert({
    user_id: userId,
    generated_at: result.generatedAtIso,
    payload: result
  });
}

export async function upsertConsent(userId: string, consent: IntegrationConsent) {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  await client.from("integration_consents").upsert(
    {
      user_id: userId,
      provider: consent.provider,
      enabled: consent.enabled,
      metadata_only: consent.metadataOnly,
      scopes: consent.scopes,
      updated_at: consent.updatedAtIso
    },
    { onConflict: "user_id,provider" }
  );
}

export async function listConsents(userId: string): Promise<IntegrationConsent[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  const { data } = await client
    .from("integration_consents")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => ({
    provider: row.provider,
    enabled: Boolean(row.enabled),
    scopes: row.scopes ?? [],
    metadataOnly: Boolean(row.metadata_only),
    updatedAtIso: row.updated_at ?? new Date().toISOString()
  })) as IntegrationConsent[];
}

export async function logPipelineTrace(userId: string, traces: string[], snapshotId: string) {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  await client.from("pipeline_audit").insert({
    user_id: userId,
    snapshot_id: snapshotId,
    traces,
    created_at: new Date().toISOString()
  });
}

export async function logAssistantAudit(
  userId: string,
  question: string,
  response: AssistantAnswer,
  snapshotId: string | null
) {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  await client.from("assistant_audit").insert({
    user_id: userId,
    snapshot_id: snapshotId,
    question,
    response,
    created_at: new Date().toISOString()
  });
}
