import type {
  AssistantChat,
  AssistantChatMessage,
  AssistantAttachment,
  AssistantAnswer,
  ContextInputs,
  ContextResult,
  DailyBriefJson,
  DailyContextSnapshot,
  DigestResult,
  ExternalItem,
  IntegrationAccount,
  IntegrationConsent,
  IntegrationProvider,
  MorningBrief,
  WorkflowDefinition,
  WorkflowRun
} from "./types";

export interface BuildContextRequest {
  userId: string;
  inputs: ContextInputs;
}

export interface BuildContextResponse {
  result: ContextResult;
}

export interface MorningBriefResponse {
  brief: MorningBrief;
}

export interface DailyBriefResponse {
  dailyBrief: DailyBriefJson | null;
  date?: string;
  modelVersion?: string;
  createdAt?: string;
}

export interface PipelineRunResponse {
  snapshot: DailyContextSnapshot;
  traces: string[];
  dailyBrief?: DailyBriefJson | null;
}

export interface UpsertConsentRequest {
  userId: string;
  consent: IntegrationConsent;
}

export interface UpsertConsentResponse {
  success: boolean;
}

export interface ListConsentsResponse {
  consents: IntegrationConsent[];
}

export interface ListIntegrationsResponse {
  integrations: IntegrationAccount[];
}

export interface StartIntegrationOAuthResponse {
  provider: IntegrationProvider;
  authorizationUrl: string;
  state: string;
}

export interface IntegrationCallbackResponse {
  ok: boolean;
  provider: IntegrationProvider;
  userId: string;
}

export interface ListExternalItemsResponse {
  items: ExternalItem[];
}

export interface ListWorkflowsResponse {
  workflows: WorkflowDefinition[];
}

export interface UpsertWorkflowRequest {
  workflow: WorkflowDefinition;
}

export interface UpsertWorkflowResponse {
  workflow: WorkflowDefinition;
}

export interface RunWorkflowResponse {
  run: WorkflowRun;
}

export interface ListWorkflowRunsResponse {
  runs: WorkflowRun[];
}

export interface DigestResponse {
  digest: DigestResult;
}

export interface AssistantQueryRequest {
  question: string;
  attachments?: AssistantAttachment[];
  chatId?: string;
  /** Device timezone (e.g. Europe/Copenhagen) for calendar event creation */
  timezone?: string;
}

export interface AssistantQueryResponse {
  response: AssistantAnswer;
  chatId: string;
  userMessage: AssistantChatMessage;
  assistantMessage: AssistantChatMessage;
}

export interface ListAssistantChatsResponse {
  chats: AssistantChat[];
}

export interface ListAssistantChatMessagesResponse {
  chatId: string;
  messages: AssistantChatMessage[];
}

export interface LatestDailyContextResponse {
  snapshot: DailyContextSnapshot | null;
}

export interface RunHistoryDetailResponse {
  run: WorkflowRun | null;
}
