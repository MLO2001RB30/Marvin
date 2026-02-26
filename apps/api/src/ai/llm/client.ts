import { createHash } from "node:crypto";

import { env } from "../../config/env";

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CallLLMOptions {
  systemPrompts: string[];
  contextEnvelopeJson?: string;
  userContent: string;
  chatHistory?: ChatMessage[];
  tools?: OpenAITool[];
  executeTool?: (name: string, args: Record<string, unknown>) => Promise<string>;
  mode: string;
  coreVersion?: string;
  modeVersion?: string;
  responseFormat?: "json_object" | "text";
  userId?: string;
}

export interface CallLLMResult {
  content: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  latencyMs: number;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

const LLM_TIMEOUT_MS = 60_000;
const MAX_TOOL_ITERATIONS = 3;

export async function callLLM(options: CallLLMOptions): Promise<CallLLMResult> {
  const {
    systemPrompts,
    contextEnvelopeJson,
    userContent,
    chatHistory = [],
    tools = [],
    executeTool,
    mode,
    coreVersion = "v1",
    modeVersion = "v1",
    responseFormat,
    userId
  } = options;

  const startMs = Date.now();
  const toolCallsLog: Array<{ name: string; args: Record<string, unknown>; result: string }> = [];

  const systemContent = contextEnvelopeJson
    ? [...systemPrompts, `CONTEXT_ENVELOPE:\n${contextEnvelopeJson}`].join("\n\n")
    : systemPrompts.join("\n\n");

  type Message =
    | { role: "system"; content: string }
    | { role: "user"; content: string }
    | { role: "assistant"; content: string; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> }
    | { role: "tool"; tool_call_id: string; content: string };

  const messages: Message[] = [{ role: "system", content: systemContent }];
  for (const msg of chatHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: "user", content: userContent });

  const requestBody: Record<string, unknown> = {
    model: env.OPENAI_MODEL,
    temperature: 0.3,
    messages
  };
  if (tools.length > 0) {
    requestBody.tools = tools;
  }
  if (responseFormat) {
    requestBody.response_format = { type: responseFormat };
  }

  const baseUrl = env.OPENAI_BASE_URL.replace(/\/+$/, "");
  const completionsUrl = `${baseUrl}/chat/completions`;

  const contextHash = contextEnvelopeJson ? sha256Hex(contextEnvelopeJson).slice(0, 16) : "none";
  let lastUsage: CallLLMResult["usage"];

  let iterations = 0;
  let lastContent = "";

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    };
    if (baseUrl.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = "https://marvin.app";
      headers["X-Title"] = "Marvin";
    }
    const response = await fetch(completionsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errBody.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>;
        };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const choice = payload.choices?.[0]?.message;
    if (!choice) {
      throw new Error("LLM returned empty message");
    }

    if (payload.usage) {
      lastUsage = payload.usage;
    }

    lastContent = choice.content ?? "";
    requestBody.messages = [
      ...(requestBody.messages as Message[]),
      {
        role: "assistant",
        content: lastContent,
        tool_calls: choice.tool_calls
      }
    ];

    const toolCalls = choice.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      break;
    }

    if (!executeTool) {
      console.warn("[llm] Model requested tools but executeTool not provided");
      break;
    }

    const toolResults = await Promise.all(
      toolCalls.map(async (tc) => {
        let result: string;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
          result = await executeTool(tc.function.name, args);
        } catch (err) {
          result = JSON.stringify({
            error: err instanceof Error ? err.message : "Tool execution failed"
          });
        }
        toolCallsLog.push({ name: tc.function.name, args, result });
        return { tool_call_id: tc.id, content: result };
      })
    );

    for (const tr of toolResults) {
      (requestBody.messages as Message[]).push({
        role: "tool",
        tool_call_id: tr.tool_call_id,
        content: tr.content
      });
    }
  }

  const latencyMs = Date.now() - startMs;

  const usageStr = lastUsage
    ? `in=${lastUsage.prompt_tokens ?? "?"} out=${lastUsage.completion_tokens ?? "?"}`
    : "no-usage";
  console.info(
    `[llm] ${mode} iter=${iterations} tools=${toolCallsLog.length} ${usageStr} ${latencyMs}ms`
  );

  if (userId) {
    const { logLLMCall } = await import("../../services/llmAuditService");
    void logLLMCall({
      userId,
      coreVersion,
      modeVersion,
      mode,
      contextHash,
      toolCalls: toolCallsLog.map((t) => ({ name: t.name, args: t.args })),
      tokenUsage: lastUsage,
      latencyMs
    });
  }

  return {
    content: lastContent,
    toolCalls: toolCallsLog,
    usage: lastUsage,
    latencyMs
  };
}
