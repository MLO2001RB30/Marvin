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
  /** Prior chat messages (user/assistant pairs) to include before userContent */
  chatHistory?: ChatMessage[];
  tools?: OpenAITool[];
  executeTool?: (name: string, args: Record<string, unknown>) => Promise<string>;
  mode: string;
  coreVersion?: string;
  modeVersion?: string;
  responseFormat?: "json_object" | "text";
  /** Optional: for audit logging */
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

  const systemParts: string[] = [...systemPrompts];
  if (contextEnvelopeJson) {
    systemParts.push(`CONTEXT_ENVELOPE:\n${contextEnvelopeJson}`);
  }

  type Message =
    | { role: "system"; content: string }
    | { role: "user"; content: string }
    | { role: "assistant"; content: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }
    | { role: "tool"; tool_call_id: string; content: string };

  const messages: Message[] = systemParts.map((content) => ({ role: "system" as const, content }));
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

  const contextHash = contextEnvelopeJson ? sha256Hex(contextEnvelopeJson).slice(0, 16) : "none";

  let iterations = 0;
  const maxIterations = 5;
  let lastContent = "";

  while (iterations < maxIterations) {
    iterations++;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const choice = payload.choices?.[0]?.message;
    if (!choice) {
      throw new Error("OpenAI returned empty message");
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

    for (const tc of toolCalls) {
      let result: string;
      try {
        const args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
        result = await executeTool(tc.function.name, args);
        toolCallsLog.push({ name: tc.function.name, args, result });
      } catch (err) {
        result = JSON.stringify({
          error: err instanceof Error ? err.message : "Tool execution failed"
        });
        toolCallsLog.push({
          name: tc.function.name,
          args: {},
          result
        });
      }
      (requestBody.messages as Message[]).push({
        role: "tool",
        tool_call_id: tc.id,
        content: result
      });
    }
  }

  const latencyMs = Date.now() - startMs;

  console.info(
    "[llm]",
    "mode=",
    mode,
    "core=",
    coreVersion,
    "ctx_hash=",
    contextHash,
    "tools=",
    toolCallsLog.length,
    "latency_ms=",
    latencyMs
  );

  if (userId) {
    const { logLLMCall } = await import("../../services/llmAuditService");
    void logLLMCall({
      userId,
      coreVersion,
      modeVersion: modeVersion,
      mode,
      contextHash,
      toolCalls: toolCallsLog.map((t) => ({ name: t.name, args: t.args })),
      latencyMs
    });
  }

  return {
    content: lastContent,
    toolCalls: toolCallsLog,
    usage: undefined,
    latencyMs
  };
}
