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
}

export interface AssistantAnswer {
  question: string;
  answer: string;
  citedItems: Array<{ itemId: string; provider: IntegrationProvider; reason: string }>;
  generatedAtIso: string;
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
