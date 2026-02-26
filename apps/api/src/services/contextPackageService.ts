import { getSupabaseClient } from "./supabaseClient";

export interface ContextPackage {
  id: string;
  triggerType: "meeting_prep" | "deadline_prep";
  triggerRef: string;
  state: "pending" | "active" | "expired" | "dismissed";
  title: string;
  summary: string;
  startsAtIso: string;
  fireAtIso: string;
  confidence: number;
  evidence: Array<{
    id: string;
    kind: string;
    title: string;
    summary: string | null;
    reason: string;
    provider: string | null;
  }>;
}

export async function listActiveContextPackages(userId: string): Promise<ContextPackage[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const now = new Date().toISOString();
  const { data: packages } = await client
    .from("context_packages")
    .select("*")
    .eq("user_id", userId)
    .in("state", ["pending", "active"])
    .gte("starts_at_iso", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order("fire_at_iso", { ascending: true })
    .limit(5);

  if (!packages || packages.length === 0) return [];

  const packageIds = packages.map((p: Record<string, unknown>) => p.id as string);
  const { data: evidenceRows } = await client
    .from("context_package_evidence")
    .select("*")
    .eq("user_id", userId)
    .in("package_id", packageIds)
    .order("score", { ascending: false });

  const evidenceByPackage = new Map<string, Array<Record<string, unknown>>>();
  for (const row of evidenceRows ?? []) {
    const r = row as Record<string, unknown>;
    const pid = r.package_id as string;
    if (!evidenceByPackage.has(pid)) evidenceByPackage.set(pid, []);
    evidenceByPackage.get(pid)!.push(r);
  }

  return packages.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    triggerType: p.trigger_type as ContextPackage["triggerType"],
    triggerRef: p.trigger_ref as string,
    state: p.state as ContextPackage["state"],
    title: p.title as string,
    summary: p.summary as string,
    startsAtIso: p.starts_at_iso as string,
    fireAtIso: p.fire_at_iso as string,
    confidence: p.confidence as number,
    evidence: (evidenceByPackage.get(p.id as string) ?? []).slice(0, 5).map((e) => ({
      id: e.id as string,
      kind: e.kind as string,
      title: e.title as string,
      summary: e.summary as string | null,
      reason: e.reason as string,
      provider: e.provider as string | null
    }))
  }));
}
