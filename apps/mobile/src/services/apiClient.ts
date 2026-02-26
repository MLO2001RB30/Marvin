import type {
  AssistantQueryRequest,
  AssistantQueryResponse,
  DailyBriefJson,
  DigestResponse,
  IntegrationProvider,
  IntegrationConsent,
  ListAssistantChatMessagesResponse,
  ListAssistantChatsResponse,
  LatestDailyContextResponse,
  ListConsentsResponse,
  ListExternalItemsResponse,
  ListIntegrationsResponse,
  ListWorkflowRunsResponse,
  ListWorkflowsResponse,
  PipelineRunResponse,
  RunHistoryDetailResponse,
  RunWorkflowResponse,
  StartIntegrationOAuthResponse,
  UpsertConsentResponse,
  UpsertWorkflowRequest,
  UpsertWorkflowResponse,
  WorkflowDefinition
} from "@pia/shared";
import Constants from "expo-constants";
import { NativeModules } from "react-native";

function resolveApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
  try {
    const parsed = new URL(configured);
    const localHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
    const expoHostUri =
      (Constants.expoConfig?.hostUri as string | undefined) ??
      ((Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
        .manifest2?.extra?.expoClient?.hostUri as string | undefined) ??
      ((Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost as
        | string
        | undefined);

    const candidateHostFromScript = scriptURL ? new URL(scriptURL).hostname : null;
    const candidateHostFromExpo =
      expoHostUri?.split(":")[0]?.trim() && expoHostUri?.split(":")[0] !== "localhost"
        ? expoHostUri.split(":")[0]
        : null;
    const candidateHost =
      candidateHostFromScript && candidateHostFromScript !== "localhost" && candidateHostFromScript !== "127.0.0.1"
        ? candidateHostFromScript
        : candidateHostFromExpo;

    if (!localHost || !candidateHost) {
      return configured;
    }

    parsed.hostname = candidateHost;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return configured;
  }
}

const apiBaseUrl = resolveApiBaseUrl();

export function getApiBaseUrl() {
  return apiBaseUrl;
}

interface ApiClientOptions {
  userId: string;
  accessToken: string;
}

const NETWORK_ERROR_PATTERN = /network request failed|failed to fetch|network error|econnrefused|enotfound|etimedout/i;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;
const DEFAULT_TIMEOUT_MS = 25000;
const ASSISTANT_TIMEOUT_MS = 120000;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        ...init,
        signal: controller.signal
      });
      clearTimeout(timeout);
      return res;
    } catch (e) {
      lastErr = e;
      const msg = String(e instanceof Error ? e.message : e);
      const isNetwork = NETWORK_ERROR_PATTERN.test(msg) || msg.includes("aborted");
      if (attempt < MAX_RETRIES && isNetwork) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function request<T>(
  path: string,
  options: RequestInit,
  accessToken: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const response = await fetchWithRetry(
    `${apiBaseUrl}${path}`,
    {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {})
    }
  },
    timeoutMs
  );
  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${bodyText}`);
  }
  if (bodyText.trimStart().startsWith("<")) {
    const url = `${apiBaseUrl}${path}`;
    throw new Error(
      `API returned HTML instead of JSON from ${url}. ` +
        `Check that EXPO_PUBLIC_API_URL points to your API server (port 4000) and that the API is running. ` +
        `Response starts with: ${bodyText.slice(0, 80).replace(/\s+/g, " ")}...`
    );
  }
  try {
    return JSON.parse(bodyText) as T;
  } catch (parseErr) {
    throw new Error(
      `API returned invalid JSON from ${apiBaseUrl}${path}. ` +
        `Response: ${bodyText.slice(0, 200)}...`
    );
  }
}

export function createApiClient({ userId, accessToken }: ApiClientOptions) {
  return {
    listConsents: () =>
      request<ListConsentsResponse>(`/v1/privacy/consent/${userId}`, { method: "GET" }, accessToken),
    upsertConsent: (consent: IntegrationConsent) =>
      request<UpsertConsentResponse>(
        "/v1/privacy/consent",
        { method: "POST", body: JSON.stringify({ userId, consent }) },
        accessToken
      ),
    listIntegrations: () =>
      request<ListIntegrationsResponse>(`/v1/integrations/${userId}`, { method: "GET" }, accessToken),
    startIntegrationOAuth: (provider: IntegrationProvider) =>
      request<StartIntegrationOAuthResponse>(
        `/v1/integrations/${userId}/${provider}/start`,
        { method: "POST" },
        accessToken
      ),
    disconnectIntegration: (provider: IntegrationProvider) =>
      request<ListIntegrationsResponse>(
        `/v1/integrations/${userId}/${provider}/disconnect`,
        { method: "POST" },
        accessToken
      ),
    listItems: () =>
      request<ListExternalItemsResponse>(`/v1/items/${userId}`, { method: "GET" }, accessToken),
    listWorkflows: () =>
      request<ListWorkflowsResponse>(`/v1/workflows/${userId}`, { method: "GET" }, accessToken),
    upsertWorkflow: (workflow: WorkflowDefinition) =>
      request<UpsertWorkflowResponse>(
        `/v1/workflows/${userId}`,
        {
          method: "POST",
          body: JSON.stringify({ workflow } satisfies UpsertWorkflowRequest)
        },
        accessToken
      ),
    runWorkflow: (workflowId: string) =>
      request<RunWorkflowResponse>(
        `/v1/workflows/${userId}/${workflowId}/run`,
        { method: "POST" },
        accessToken
      ),
    listHistory: () =>
      request<ListWorkflowRunsResponse>(`/v1/history/${userId}`, { method: "GET" }, accessToken),
    getRunDetails: (runId: string) =>
      request<RunHistoryDetailResponse>(`/v1/history/${userId}/${runId}`, { method: "GET" }, accessToken),
    getLatestContext: () =>
      request<LatestDailyContextResponse>(`/v1/context/${userId}/latest`, { method: "GET" }, accessToken),
    runContextPipeline: () =>
      request<PipelineRunResponse>(
        `/v1/context/${userId}/pipeline/run`,
        { method: "POST" },
        accessToken,
        120000
      ),
    getDailyBrief: () =>
      request<{ dailyBrief: DailyBriefJson | null; date?: string; modelVersion?: string; createdAt?: string }>(
        `/v1/brief/${userId}/daily`,
        { method: "GET" },
        accessToken
      ),
    getDigest: () => request<DigestResponse>(`/v1/digest/${userId}`, { method: "GET" }, accessToken),
    getProfile: () =>
      request<{ timezone: string }>(`/v1/profile/${userId}`, { method: "GET" }, accessToken),
    updateProfile: (data: { timezone: string }) =>
      request<{ timezone: string }>(
        `/v1/profile/${userId}`,
        { method: "PATCH", body: JSON.stringify(data) },
        accessToken
      ),
    askAssistant: (payload: AssistantQueryRequest) =>
      request<AssistantQueryResponse>(
        `/v1/assistant/${userId}/query`,
        { method: "POST", body: JSON.stringify(payload) },
        accessToken,
        ASSISTANT_TIMEOUT_MS
      ),
    listAssistantChats: () =>
      request<ListAssistantChatsResponse>(`/v1/assistant/${userId}/chats`, { method: "GET" }, accessToken),
    listAssistantChatMessages: (chatId: string) =>
      request<ListAssistantChatMessagesResponse>(
        `/v1/assistant/${userId}/chats/${chatId}/messages`,
        { method: "GET" },
        accessToken
      ),
    replyEmail: (threadId: string, body: string) =>
      request<{ success: boolean; error?: string }>(
        `/v1/reply/${userId}/email`,
        { method: "POST", body: JSON.stringify({ threadId, body }) },
        accessToken
      ),
    replySlack: (channelId: string, text: string, threadTs?: string) =>
      request<{ success: boolean; error?: string }>(
        `/v1/reply/${userId}/slack`,
        { method: "POST", body: JSON.stringify({ channelId, text, threadTs }) },
        accessToken
      ),
    getSuggestions: () =>
      request<{ suggestions: Array<{ id: string; type: string; title: string; body: string; actionType?: string; itemId?: string; provider?: string }> }>(
        `/v1/suggestions/${userId}`,
        { method: "GET" },
        accessToken
      ),
    getTier: () =>
      request<{ tier: string; features: string[] }>(
        `/v1/account/${userId}/tier`,
        { method: "GET" },
        accessToken
      ),
    registerPushToken: (token: string, platform: string) =>
      request<{ success: boolean }>(
        `/v1/notifications/${userId}/register`,
        { method: "POST", body: JSON.stringify({ token, platform }) },
        accessToken
      )
  };
}
