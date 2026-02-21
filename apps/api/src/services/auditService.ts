import type { ContextResult, IntegrationConsent } from "@pia/shared";

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
  await client.from("integration_consents").upsert({
    user_id: userId,
    provider: consent.provider,
    enabled: consent.enabled,
    metadata_only: consent.metadataOnly,
    scopes: consent.scopes,
    updated_at: consent.updatedAtIso
  });
}
