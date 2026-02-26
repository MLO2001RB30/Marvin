import { Buffer } from "node:buffer";

import type { AssistantAttachment } from "@pia/shared";

import { env } from "../config/env";

function fallbackTranscript(attachments: AssistantAttachment[]) {
  const audio = attachments.find((item) => item.type === "audio");
  if (!audio) {
    return undefined;
  }
  return "Audio note provided. Transcription unavailable, using metadata only.";
}

export async function transcribeAudioAttachment(
  attachments: AssistantAttachment[]
): Promise<string | undefined> {
  const audio = attachments.find((item) => item.type === "audio");
  if (!audio) {
    return undefined;
  }

  if (!env.OPENAI_API_KEY || !audio.base64) {
    return fallbackTranscript(attachments);
  }

  const isOpenRouter = env.OPENAI_BASE_URL.includes("openrouter.ai");
  if (isOpenRouter) {
    return fallbackTranscript(attachments);
  }

  try {
    const buffer = Buffer.from(audio.base64, "base64");
    const formData = new FormData();
    const blob = new Blob([buffer], { type: audio.mimeType ?? "audio/m4a" });
    formData.append("file", blob, audio.fileName ?? "voice-note.m4a");
    formData.append("model", env.OPENAI_AUDIO_MODEL);

    const baseUrl = env.OPENAI_BASE_URL.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      return fallbackTranscript(attachments);
    }

    const payload = (await response.json()) as { text?: string };
    return payload.text?.trim() || fallbackTranscript(attachments);
  } catch {
    return fallbackTranscript(attachments);
  }
}
