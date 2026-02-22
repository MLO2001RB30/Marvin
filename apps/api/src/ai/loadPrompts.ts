import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "../config/env";

const currentDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(currentDir, "../..");

export function loadCoreIdentityPrompt(): string {
  if (env.MARVIN_FIXED_CONTEXT?.trim()) {
    return env.MARVIN_FIXED_CONTEXT.trim();
  }
  const path = resolve(apiRoot, env.CORE_IDENTITY_PROMPT_PATH);
  try {
    return readFileSync(path, "utf-8").trim();
  } catch (err) {
    console.warn("[prompts] Failed to load core identity from", path, err);
    return "You are Marvin, a proactive personal AI assistant. Ground responses in provided context. Never invent data.";
  }
}

export function loadModePrompt(modeName: string): string {
  const path = resolve(apiRoot, "ai/prompts/modes", `${modeName}.txt`);
  try {
    return readFileSync(path, "utf-8").trim();
  } catch (err) {
    console.warn("[prompts] Failed to load mode prompt", modeName, err);
    return `Mode: ${modeName}. Use provided context. Return valid JSON when schema is specified.`;
  }
}
