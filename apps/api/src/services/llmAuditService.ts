import { getSupabaseClient } from "./supabaseClient";

export interface LLMCallAuditEntry {
  userId: string;
  coreVersion: string;
  modeVersion: string;
  mode: string;
  contextHash?: string;
  toolCalls?: Array<{ name: string; args?: Record<string, unknown> }>;
  tokenUsage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  latencyMs?: number;
}

export async function logLLMCall(entry: LLMCallAuditEntry): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  await client.from("llm_call_audit").insert({
    user_id: entry.userId,
    core_version: entry.coreVersion,
    mode_version: entry.modeVersion,
    mode: entry.mode,
    context_hash: entry.contextHash ?? null,
    tool_calls: entry.toolCalls ?? [],
    token_usage: entry.tokenUsage ?? null,
    latency_ms: entry.latencyMs ?? null
  });
}
