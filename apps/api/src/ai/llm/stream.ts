import { env } from "../../config/env";

function resolveApiKey(): string | undefined {
  return env.CLAUDE_SONNET_4_5_API_KEY || env.OPENAI_API_KEY;
}

function resolveModel(): string {
  if (env.CLAUDE_SONNET_4_5_API_KEY) return "anthropic/claude-sonnet-4.5";
  return env.OPENAI_MODEL;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolStatus?: (status: string) => void;
  onDone: (fullContent: string, usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }) => void;
  onError: (error: Error) => void;
}

export async function streamLLM(
  options: {
    systemPrompts: string[];
    contextEnvelopeJson?: string;
    userContent: string;
    chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    mode: string;
    responseFormat?: "json_object" | "text";
  },
  callbacks: StreamCallbacks
): Promise<void> {
  const { systemPrompts, contextEnvelopeJson, userContent, chatHistory = [], responseFormat } = options;

  const systemContent = contextEnvelopeJson
    ? [...systemPrompts, `CONTEXT_ENVELOPE:\n${contextEnvelopeJson}`].join("\n\n")
    : systemPrompts.join("\n\n");

  type Message = { role: string; content: string };
  const messages: Message[] = [{ role: "system", content: systemContent }];
  for (const msg of chatHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: "user", content: userContent });

  const requestBody: Record<string, unknown> = {
    model: resolveModel(),
    temperature: 0.3,
    stream: true,
    messages
  };
  if (responseFormat) {
    requestBody.response_format = { type: responseFormat };
  }

  const baseUrl = env.OPENAI_BASE_URL.replace(/\/+$/, "");
  const completionsUrl = `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${resolveApiKey()}`,
    "Content-Type": "application/json"
  };
  if (baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://marvin.app";
    headers["X-Title"] = "Marvin";
  }

  try {
    const response = await fetch(completionsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(90000)
    });

    if (!response.ok) {
      const errBody = await response.text();
      callbacks.onError(new Error(`LLM stream error ${response.status}: ${errBody.slice(0, 300)}`));
      return;
    }

    if (!response.body) {
      callbacks.onError(new Error("No response body for streaming"));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            fullContent += token;
            callbacks.onToken(token);
          }
          if (parsed.usage) {
            callbacks.onDone(fullContent, parsed.usage);
            return;
          }
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }

    callbacks.onDone(fullContent);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}
