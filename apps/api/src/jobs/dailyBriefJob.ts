import type { DailyBriefJson } from "@pia/shared";

import { env } from "../config/env";
import { loadCoreIdentityPrompt, loadModePrompt } from "../ai/loadPrompts";
import { buildContextEnvelope } from "../ai/context/buildContextEnvelope";
import { callLLM } from "../ai/llm/client";
import { runDailyContextPipeline } from "../services/pipelineService";
import { upsertDailyBrief } from "../services/dailyBriefService";

export async function runDailyBriefForUser(userId: string): Promise<DailyBriefJson | null> {
  const llmApiKey = env.CLAUDE_SONNET_4_5_API_KEY || env.OPENAI_API_KEY;
  if (!llmApiKey) {
    console.warn("[dailyBrief] No LLM API key set");
    return null;
  }

  try {
    await runDailyContextPipeline(userId);
  } catch (err) {
    console.warn("[dailyBrief] Pipeline failed for user", userId, err);
  }

  const envelope = await buildContextEnvelope(userId, "morning_brief");
  const envelopeJson = JSON.stringify(envelope);

  const systemPrompts = [loadCoreIdentityPrompt(), loadModePrompt("MORNING_BRIEF_GENERATE_v1")];
  const userContent = "Generate today's morning brief from the context envelope above.";

  const today = new Date().toISOString().slice(0, 10);

  try {
    const result = await callLLM({
      systemPrompts,
      contextEnvelopeJson: envelopeJson,
      userContent,
      mode: "MORNING_BRIEF_GENERATE",
      responseFormat: "json_object",
      userId
    });

    const raw = result.content.trim();
    let brief: DailyBriefJson;
    try {
      brief = JSON.parse(raw) as DailyBriefJson;
      brief.date = brief.date ?? today;
      brief.headline = brief.headline ?? "Your day at a glance";
      brief.top_priorities = Array.isArray(brief.top_priorities) ? brief.top_priorities : [];
      brief.outstanding = Array.isArray(brief.outstanding) ? brief.outstanding : [];
      brief.schedule = Array.isArray(brief.schedule) ? brief.schedule : [];
      brief.note = brief.note ?? null;
    } catch {
      console.warn("[dailyBrief] Failed to parse LLM response as JSON");
      brief = {
        date: today,
        headline: "No context available yet",
        top_priorities: [],
        outstanding: [],
        schedule: [],
        note: "Connect integrations in Manage and pull to refresh to sync your data."
      };
    }

    await upsertDailyBrief(userId, today, brief, env.OPENAI_MODEL);
    return brief;
  } catch (err) {
    console.warn("[dailyBrief] LLM call failed for user", userId, err);
    return null;
  }
}
