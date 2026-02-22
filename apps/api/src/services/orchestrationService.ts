import {
  type ContextInputs,
  type MorningBrief,
  type WorkflowArtifactReference,
  type WorkflowDefinition,
  type WorkflowStageResult,
  type WorkflowRun
} from "@pia/shared";

import { env } from "../config/env";
import { loadCoreIdentityPrompt, loadModePrompt } from "../ai/loadPrompts";
import { callLLM } from "../ai/llm/client";
import { buildContextResult } from "./contextEngine";
import { buildOutstandingDigest } from "./digestService";
import { listExternalItems } from "./integrationService";
import { getSupabaseClient } from "./supabaseClient";

/** Parse startIso/endIso from calendar event summary (format: "2025-02-21T10:00 – 2025-02-21T11:00\n...") */
function parseCalendarTimesFromSummary(summary: string): {
  startIso: string;
  endIso: string;
} {
  const match = summary.match(/^([\d-]+T?[\d:]*)\s*[–-]\s*([\d-]+T?[\d:]*)/);
  if (match) {
    const start = match[1].trim();
    const end = match[2].trim();
    const startIso = start.length <= 10 ? `${start}T00:00:00` : start.length === 16 ? `${start}:00` : start;
    const endIso = end.length <= 10 ? `${end}T23:59:59` : end.length === 16 ? `${end}:00` : end;
    return { startIso, endIso };
  }
  const fallback = new Date().toISOString();
  return { startIso: fallback, endIso: fallback };
}

export async function ingestSignals(userId: string): Promise<ContextInputs> {
  const client = getSupabaseClient();
  const nowIso = new Date().toISOString();
  const externalItems = await listExternalItems(userId);

  let goalsPayload: string[] = [];
  let healthPayload = {
    sleepHours: 0,
    hrv: 0,
    restingHeartRate: 0,
    recoveryScore: 0
  };
  let weatherPayload = {
    temperatureC: 0,
    condition: "Unavailable",
    precipitationChance: 0
  };

  if (client) {
    const { data: contexts } = await client
      .from("context_inputs")
      .select("*")
      .eq("user_id", userId)
      .order("captured_at_iso", { ascending: false });

    for (const item of contexts ?? []) {
      if (item.source === "goals" && goalsPayload.length === 0 && Array.isArray(item.payload)) {
        goalsPayload = item.payload as string[];
      }
      if (item.source === "healthkit" && healthPayload.recoveryScore === 0) {
        healthPayload = item.payload as typeof healthPayload;
      }
      if (item.source === "weatherkit" && weatherPayload.condition === "Unavailable") {
        weatherPayload = item.payload as typeof weatherPayload;
      }
    }
  }

  const mail = externalItems
    .filter((item) => item.type === "gmail_thread")
    .map((item) => ({
      id: item.id,
      subject: item.title,
      sender: item.sender ?? "unknown",
      unansweredHours: item.requiresReply ? 8 : 1,
      importanceScore:
        item.tags.includes("urgent") || item.tags.includes("high_priority") ? 0.9 : 0.5
    }));

  const calendar = externalItems
    .filter(
      (item) => item.provider === "google_calendar" && item.type === "calendar_event"
    )
    .slice(0, 10)
    .map((item) => {
      const { startIso, endIso } = parseCalendarTimesFromSummary(item.summary);
      return {
        id: item.id,
        title: item.title,
        startIso,
        endIso,
        intensity: (item.tags.includes("urgent") ? "high" : "medium") as "high" | "medium" | "low"
      };
    });

  return {
    mail: {
      source: "gmail",
      capturedAtIso: nowIso,
      sensitivity: "high",
      payload: mail
    },
    calendar: {
      source: "google_calendar",
      capturedAtIso: nowIso,
      sensitivity: "medium",
      payload: calendar
    },
    health: {
      source: "healthkit",
      capturedAtIso: nowIso,
      sensitivity: "high",
      payload: healthPayload
    },
    weather: {
      source: "weatherkit",
      capturedAtIso: nowIso,
      sensitivity: "low",
      payload: weatherPayload
    },
    goals: {
      source: "goals",
      capturedAtIso: nowIso,
      sensitivity: "medium",
      payload: goalsPayload
    }
  };
}

export async function buildMorningBrief(userId: string): Promise<MorningBrief> {
  const client = getSupabaseClient();
  const inputs = await ingestSignals(userId);
  const result = buildContextResult(inputs);
  const brief: MorningBrief = {
    unansweredCount: inputs.mail.payload.length,
    meetingsToday: inputs.calendar.payload.length,
    weatherSummary: `${inputs.weather.payload.condition}, ${inputs.weather.payload.temperatureC}°C`,
    readiness: result.scores.energyScore >= 65 ? "Ready for execution mode" : "Recommend recovery mode",
    topPriorities: inputs.goals.payload,
    suggestedActions: result.recommendations
  };

  if (client) {
    await client.from("morning_briefs").insert({
      user_id: userId,
      generated_at: new Date().toISOString(),
      payload: brief
    });
  }

  return brief;
}

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
    if (env.OPENAI_API_KEY) {
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
