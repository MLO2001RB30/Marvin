import { config as loadDotEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadDotEnv({ path: resolve(currentDir, "../../.env") });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  /** Fixed context injected into every assistant request (system prompt). Overrides file if set. */
  MARVIN_FIXED_CONTEXT: z.string().optional(),
  /** Path to core identity prompt file (relative to api root). Default: ai/prompts/core_identity_v1.txt */
  CORE_IDENTITY_PROMPT_PATH: z.string().default("ai/prompts/core_identity_v1.txt"),
  OPENAI_AUDIO_MODEL: z.string().default("gpt-4o-mini-transcribe"),
  OAUTH_BASE_URL: z.string().url().optional(),
  OAUTH_APP_CALLBACK_URL: z.string().url().optional(),
  OAUTH_ENCRYPTION_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().url().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_REDIRECT_URI: z.string().url().optional(),
  DROPBOX_CLIENT_ID: z.string().optional(),
  DROPBOX_CLIENT_SECRET: z.string().optional(),
  DROPBOX_REDIRECT_URI: z.string().url().optional(),
  PIPELINE_AUTO_RUN: z.coerce.boolean().default(false),
  PIPELINE_TICK_MS: z.coerce.number().default(300000)
});

export const env = envSchema.parse(process.env);
