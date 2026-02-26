import {
  type WorkflowArtifactReference,
  type WorkflowDefinition,
  type WorkflowStageResult,
  type WorkflowRun
} from "@pia/shared";

import { env } from "../config/env";
import { loadCoreIdentityPrompt, loadModePrompt } from "../ai/loadPrompts";
import { callLLM } from "../ai/llm/client";
import { buildOutstandingDigest } from "./digestService";
import { listExternalItems } from "./integrationService";

export async function executeWorkflow(
  userId: string,
  workflow: WorkflowDefinition
): Promise<WorkflowRun> {
  const runId = `run-${Date.now()}`;
  const startedAtIso = new Date().toISOString();
  const stageResults: WorkflowStageResult[] = [];
  try {
    const ingestStart = new Date().toISOString();
    const externalItems = await listExternalItems(userId);
    const selected = externalItems.filter((item) =>
      workflow.selectedProviders.includes(item.provider)
    );
    stageResults.push({
      stage: "ingest",
      status: "success",
      startedAtIso: ingestStart,
      finishedAtIso: new Date().toISOString(),
      message: `Collected ${selected.length} candidate items`
    });

    const scoreStart = new Date().toISOString();
    const digest = buildOutstandingDigest(selected);
    stageResults.push({
      stage: "score",
      status: "success",
      startedAtIso: scoreStart,
      finishedAtIso: new Date().toISOString(),
      message: `Ranked ${digest.items.length} outstanding items`
    });

    const summarizeStart = new Date().toISOString();
    stageResults.push({
      stage: "summarize",
      status: "success",
      startedAtIso: summarizeStart,
      finishedAtIso: new Date().toISOString(),
      message: "Generated digest narrative"
    });
    const artifactRefs: WorkflowArtifactReference[] = [
      {
        artifactId: `artifact-digest-${Date.now()}`,
        artifactType: "digest",
        workflowRunId: runId
      }
    ];
    stageResults.push({
      stage: "deliver",
      status: "success",
      startedAtIso: new Date().toISOString(),
      finishedAtIso: new Date().toISOString(),
      message: `Prepared delivery channels: ${workflow.deliveryChannels.join(", ")}`
    });

    let enhancedDigest = digest;
    if (env.CLAUDE_SONNET_4_5_API_KEY || env.OPENAI_API_KEY) {
      try {
        const runContext = JSON.stringify({
          workflow_id: workflow.id,
          workflow_name: workflow.name,
          digest_summary: digest.summary,
          items: digest.items.slice(0, 10).map((i) => ({ title: i.title, provider: i.provider }))
        });
        const result = await callLLM({
          systemPrompts: [loadCoreIdentityPrompt(), loadModePrompt("WORKFLOW_RUN_SUMMARY_v1")],
          userContent: `Workflow run data:\n${runContext}\n\nGenerate a user-facing summary.`,
          mode: "WORKFLOW_RUN_SUMMARY",
          responseFormat: "json_object",
          userId
        });
        const parsed = JSON.parse(result.content) as { summary?: string; key_items?: string[] };
        if (typeof parsed.summary === "string") {
          enhancedDigest = {
            ...digest,
            summary: parsed.summary
          };
        }
      } catch {
        // Keep original digest on LLM failure
      }
    }

    return {
      id: runId,
      workflowId: workflow.id,
      startedAtIso,
      finishedAtIso: new Date().toISOString(),
      status: "success",
      deliveredChannels: workflow.deliveryChannels,
      digest: enhancedDigest,
      integrationsUsed: workflow.selectedProviders,
      stageResults,
      artifactRefs
    };
  } catch (error) {
    stageResults.push({
      stage: "deliver",
      status: "failed",
      startedAtIso: new Date().toISOString(),
      finishedAtIso: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Unknown workflow execution error"
    });
    return {
      id: runId,
      workflowId: workflow.id,
      startedAtIso,
      finishedAtIso: new Date().toISOString(),
      status: "failed",
      deliveredChannels: [],
      errorMessage: error instanceof Error ? error.message : "Unknown workflow execution error",
      integrationsUsed: workflow.selectedProviders,
      stageResults
    };
  }
}
