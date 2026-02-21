import type {
  AssistantAnswer,
  ContextInputs,
  ContextResult,
  DigestResult,
  ExternalItem,
  IntegrationAccount,
  IntegrationConsent,
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

export interface UpsertConsentRequest {
  userId: string;
  consent: IntegrationConsent;
}

export interface UpsertConsentResponse {
  success: boolean;
}

export interface ListIntegrationsResponse {
  integrations: IntegrationAccount[];
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
}

export interface AssistantQueryResponse {
  response: AssistantAnswer;
}
