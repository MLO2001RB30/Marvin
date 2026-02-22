import type { DailyBriefJson } from "@pia/shared";

import { getSupabaseClient } from "./supabaseClient";

export async function getDailyBrief(
  userId: string,
  date?: string
): Promise<{ brief: DailyBriefJson; modelVersion: string; createdAt: string } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const { data } = await client
    .from("daily_briefs")
    .select("brief_json, model_version, created_at")
    .eq("user_id", userId)
    .eq("date", targetDate)
    .maybeSingle();

  if (!data) return null;
  return {
    brief: data.brief_json as DailyBriefJson,
    modelVersion: data.model_version ?? "v1",
    createdAt: data.created_at
  };
}

export async function getLatestDailyBrief(
  userId: string
): Promise<{ brief: DailyBriefJson; modelVersion: string; createdAt: string; date: string } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data } = await client
    .from("daily_briefs")
    .select("date, brief_json, model_version, created_at")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    brief: data.brief_json as DailyBriefJson,
    modelVersion: data.model_version ?? "v1",
    createdAt: data.created_at,
    date: data.date
  };
}

export async function upsertDailyBrief(
  userId: string,
  date: string,
  briefJson: DailyBriefJson,
  modelVersion = "v1"
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  await client
    .from("daily_briefs")
    .upsert(
      {
        user_id: userId,
        date,
        brief_json: briefJson,
        model_version: modelVersion,
        created_at: new Date().toISOString()
      },
      { onConflict: "user_id,date" }
    );
}
