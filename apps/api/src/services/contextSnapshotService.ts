import {
  type DailyContextSnapshot
} from "@pia/shared";

import { getSupabaseClient } from "./supabaseClient";

function todayDateIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function upsertDailyContext(snapshot: DailyContextSnapshot): Promise<DailyContextSnapshot> {
  const client = getSupabaseClient();
  if (!client) {
    return snapshot;
  }
  await client.from("daily_context_snapshots").upsert(
    {
      id: snapshot.id,
      user_id: snapshot.userId,
      date_iso: snapshot.dateIso,
      generated_at_iso: snapshot.generatedAtIso,
      summary: snapshot.summary,
      confidence: snapshot.confidence,
      outstanding_items: snapshot.outstandingItems,
      top_blockers: snapshot.topBlockers,
      what_changed: snapshot.whatChanged,
      digest: snapshot.digest,
      source_statuses: snapshot.sourceStatuses,
      workflow_artifact_refs: snapshot.workflowArtifactRefs,
      commitments: snapshot.commitments ?? [],
      llm_model: snapshot.llmModel,
      fallback_used: snapshot.fallbackUsed,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );
  return snapshot;
}

export async function getLatestDailyContext(userId: string): Promise<DailyContextSnapshot | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data } = await client
    .from("daily_context_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("generated_at_iso", { ascending: false })
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    dateIso: data.date_iso,
    generatedAtIso: data.generated_at_iso,
    summary: data.summary,
    confidence: Number(data.confidence ?? 0),
    outstandingItems: data.outstanding_items ?? [],
    topBlockers: data.top_blockers ?? [],
    whatChanged: data.what_changed ?? [],
    digest: data.digest,
    sourceStatuses: data.source_statuses ?? [],
    workflowArtifactRefs: data.workflow_artifact_refs ?? [],
    commitments: data.commitments ?? [],
    llmModel: data.llm_model ?? "unknown",
    fallbackUsed: Boolean(data.fallback_used)
  };
}

export function makeSnapshotId(userId: string, dateIso = todayDateIso()) {
  return `${userId}-${dateIso}`;
}
