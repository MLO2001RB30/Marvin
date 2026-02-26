export type Mode = "focus" | "recovery" | "execution" | "travel";

export type IntegrationProvider =
  | "slack"
  | "gmail"
  | "google_drive"
  | "onedrive"
  | "dropbox"
  | "google_calendar"
  | "healthkit"
  | "weatherkit";

export type IntegrationHealthStatus =
  | "connected"
  | "disconnected"
  | "token_expired"
  | "sync_lagging";

export type IntegrationProviderCategory = "communication" | "storage" | "calendar" | "health" | "context";

export interface IntegrationProviderMetadata {
  provider: IntegrationProvider;
  displayName: string;
  category: IntegrationProviderCategory;
  logoUri: string;
  defaultScopes: string[];
  docsUrl?: string;
  oauthProviderGroup?: "google" | "slack" | "microsoft" | "dropbox";
}

export interface IntegrationConsent {
  provider: IntegrationProvider;
  enabled: boolean;
  scopes: string[];
  metadataOnly: boolean;
  updatedAtIso: string;
}

export interface IntegrationAccount {
  provider: IntegrationProvider;
  status: IntegrationHealthStatus;
  scopes: string[];
  metadataOnly: boolean;
  lastSyncAtIso: string;
}

export type ExternalItemType =
  | "slack_message"
  | "gmail_thread"
  | "drive_file"
  | "calendar_event"
  | "onedrive_file"
  | "dropbox_file";

export interface ExternalItem {
  id: string;
  provider: IntegrationProvider;
  type: ExternalItemType;
  sourceRef: string;
  title: string;
  summary: string;
  requiresReply: boolean;
  isOutstanding: boolean;
  sender?: string;
  tags: string[];
  createdAtIso: string;
  updatedAtIso: string;
}

export interface WorkflowSchedule {
  cadence: "daily" | "weekly";
  timeLocal: string;
  timezone: string;
  weekdays?: number[];
}

export interface WorkflowTrigger {
  type: "schedule";
  schedule: WorkflowSchedule;
}

export type WorkflowTemplate =
  | "daily_digest"
  | "follow_up_summary"
  | "today_focus_list";

export interface WorkflowDefinition {
  id: string;
  name: string;
  enabled: boolean;
  selectedProviders: IntegrationProvider[];
  template: WorkflowTemplate;
  trigger: WorkflowTrigger;
  deliveryChannels: Array<"in_app" | "slack_dm" | "email">;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface PrioritySignal {
  id: string;
  label: string;
  weight: number;
  evidence: string;
}

export interface OutstandingItem {
  itemId: string;
  provider: IntegrationProvider;
  title: string;
  category: "reply_needed" | "blocked" | "fyi";
  score: number;
  explainWhy: string;
}

export type CommitmentDirection = "user_made" | "others_made";

export interface Commitment {
  id: string;
  sourceItemId: string;
  provider: IntegrationProvider;
  direction: CommitmentDirection;
  brief: string;
  counterparty?: string;
  dueDateIso?: string;
  sourceRef: string;
}

export interface DigestResult {
  generatedAtIso: string;
  summary: string;
  items: OutstandingItem[];
  signals: PrioritySignal[];
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  startedAtIso: string;
  finishedAtIso: string;
  status: "success" | "failed";
  deliveredChannels: Array<"in_app" | "slack_dm" | "email">;
  digest?: DigestResult;
  errorMessage?: string;
  integrationsUsed?: IntegrationProvider[];
  stageResults?: WorkflowStageResult[];
  artifactRefs?: WorkflowArtifactReference[];
  contextSnapshotId?: string;
}

export interface WorkflowStageResult {
  stage: "ingest" | "score" | "summarize" | "deliver";
  status: "success" | "failed";
  startedAtIso: string;
  finishedAtIso: string;
  message: string;
}

export interface WorkflowArtifactReference {
  artifactId: string;
  artifactType: "digest" | "insight" | "notification";
  workflowRunId: string;
}

export interface ContextSourceStatus {
  provider: IntegrationProvider;
  health: IntegrationHealthStatus;
  itemCount: number;
  lastSyncAtIso: string;
}

export interface DailyContextSnapshot {
  id: string;
  userId: string;
  dateIso: string;
  generatedAtIso: string;
  summary: string;
  confidence: number;
  outstandingItems: OutstandingItem[];
  topBlockers: string[];
  whatChanged: string[];
  digest: DigestResult;
  sourceStatuses: ContextSourceStatus[];
  workflowArtifactRefs: WorkflowArtifactReference[];
  llmModel: string;
  fallbackUsed: boolean;
  commitments?: Commitment[];
}

export interface AssistantContextReference {
  snapshotId: string;
  workflowRunId?: string;
  itemId?: string;
}

export interface AssistantAttachment {
  type: "image" | "audio";
  uri: string;
  mimeType?: string;
  fileName?: string;
  sizeBytes?: number;
  durationMs?: number;
  base64?: string;
}

export interface RecommendedAction {
  label: string;
  action_type: "reply_email" | "reply_slack" | "create_event" | "run_workflow" | "open_thread" | "draft_reply" | "open_calendar" | "none";
  payload?: Record<string, unknown>;
}

export type AssistantDisplayType =
  | "text"
  | "items_list"
  | "calendar_view"
  | "action_result";

export interface DisplayItem {
  provider: IntegrationProvider;
  sender: string;
  channel?: string;
  header: string;
  body: string;
  item_id?: string;
  urgency?: "high" | "med" | "low";
  actions: RecommendedAction[];
}

export interface DisplayCalendarEvent {
  start: string;
  end: string;
  title: string;
  location?: string;
  organizer?: string;
}

export interface StructuredAssistantResponse {
  display_type: AssistantDisplayType;
  summary: string;
  items?: DisplayItem[];
  events?: DisplayCalendarEvent[];
  action_status?: "success" | "failed";
  action_description?: string;
  recommended_actions?: RecommendedAction[];
}

export interface AssistantAnswer {
  question: string;
  answer: string;
  structured?: StructuredAssistantResponse;
  citedItems: Array<{ itemId: string; provider: IntegrationProvider; reason: string }>;
  contextReferences?: AssistantContextReference[];
  recommendedActions?: RecommendedAction[];
  attachmentsUsed?: AssistantAttachment[];
  audioTranscript?: string;
  generatedAtIso: string;
}

export interface AssistantChatMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  text: string;
  createdAtIso: string;
  attachments?: AssistantAttachment[];
  contextReferences?: AssistantContextReference[];
  structured?: StructuredAssistantResponse;
}

export interface AssistantChat {
  id: string;
  title: string;
  createdAtIso: string;
  updatedAtIso: string;
  lastMessageAtIso: string;
}

export interface SignalEnvelope<TPayload> {
  source: string;
  capturedAtIso: string;
  payload: TPayload;
  sensitivity: "high" | "medium" | "low";
}

export interface HealthSignals {
  sleepHours: number;
  hrv: number;
  restingHeartRate: number;
  recoveryScore: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startIso: string;
  endIso: string;
  intensity: "low" | "medium" | "high";
}

export interface MailThread {
  id: string;
  subject: string;
  sender: string;
  unansweredHours: number;
  importanceScore: number;
}

export interface WeatherSnapshot {
  temperatureC: number;
  condition: string;
  precipitationChance: number;
}

export interface ContextInputs {
  health: SignalEnvelope<HealthSignals>;
  calendar: SignalEnvelope<CalendarEvent[]>;
  mail: SignalEnvelope<MailThread[]>;
  weather: SignalEnvelope<WeatherSnapshot>;
  goals: SignalEnvelope<string[]>;
}

export interface ContextScores {
  energyScore: number;
  priorityScore: number;
  cognitiveLoadIndex: number;
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  confidence: number;
  actionType: "schedule" | "email" | "habit" | "health" | "focus";
}

export interface RecommendationTrace {
  ruleId: string;
  explanation: string;
  inputsUsed: string[];
}

export interface ContextResult {
  scores: ContextScores;
  recommendations: Recommendation[];
  traces: RecommendationTrace[];
  generatedAtIso: string;
}

export interface MorningBrief {
  unansweredCount: number;
  meetingsToday: number;
  weatherSummary: string;
  readiness: string;
  topPriorities: string[];
  suggestedActions: Recommendation[];
}

export interface DailyBriefJson {
  date: string;
  headline: string;
  top_priorities: Array<{ title: string; why: string; next_step: string }>;
  outstanding: Array<{
    id: string;
    source: string;
    title: string;
    urgency: string;
    suggested_action: string;
  }>;
  schedule: Array<{
    start: string;
    end: string;
    title: string;
    location: string | null;
  }>;
  note: string | null;
}

export interface ContextEnvelope {
  metadata: {
    user_id: string;
    timezone: string;
    locale: string;
    now_iso: string;
  };
  integrations: Array<{
    provider: string;
    connected: boolean;
    last_sync_at?: string;
  }>;
  daily_brief?: {
    headline: string;
    top_priorities: Array<{ title: string; why: string; next_step: string }>;
  };
  outstanding_items: Array<{
    id: string;
    provider: string;
    title: string;
    summary?: string;
    sender?: string;
    requires_reply?: boolean;
    urgency: string;
  }>;
  calendar_today: Array<{
    start: string;
    end: string;
    title: string;
    organizer?: string;
  }>;
  email_threads?: Array<{
    id: string;
    title: string;
    sender?: string;
    summary?: string;
    requires_reply?: boolean;
  }>;
  slack_messages?: Array<{
    id: string;
    title: string;
    sender?: string;
    summary?: string;
    requires_reply?: boolean;
  }>;
  workflow_runs_recent: Array<{
    id: string;
    workflow_id: string;
    status: string;
  }>;
}
