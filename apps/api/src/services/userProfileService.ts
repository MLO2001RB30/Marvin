import { getSupabaseClient } from "./supabaseClient";

const IANA_TIMEZONE_REGEX = /^[A-Za-z]+\/[A-Za-z_]+$/;

function isValidTimezone(tz: string): boolean {
  return (
    tz === "UTC" ||
    tz === "GMT" ||
    IANA_TIMEZONE_REGEX.test(tz) ||
    tz.startsWith("Etc/")
  );
}

export async function getUserTimezone(userId: string): Promise<string> {
  const client = getSupabaseClient();
  if (!client) return "UTC";

  const { data } = await client
    .from("user_profiles")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  const tz = data?.timezone?.trim();
  if (!tz) return "UTC";

  if (isValidTimezone(tz)) return tz;
  return "UTC";
}

export async function upsertUserTimezone(userId: string, timezone: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const tz = timezone?.trim();
  if (!tz || !isValidTimezone(tz)) return false;

  const now = new Date().toISOString();
  const { error } = await client
    .from("user_profiles")
    .upsert({ user_id: userId, timezone: tz, updated_at: now }, { onConflict: "user_id" });

  return !error;
}
