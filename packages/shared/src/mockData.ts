import type {
  ContextInputs,
  ExternalItem,
  IntegrationAccount,
  WorkflowDefinition,
  WorkflowRun
} from "./types";

export const mockContextInputs: ContextInputs = {
  health: {
    source: "healthkit",
    capturedAtIso: "2026-02-21T06:30:00.000Z",
    sensitivity: "high",
    payload: {
      sleepHours: 7.1,
      hrv: 52,
      restingHeartRate: 58,
      recoveryScore: 74
    }
  },
  calendar: {
    source: "google_calendar",
    capturedAtIso: "2026-02-21T06:30:00.000Z",
    sensitivity: "medium",
    payload: [
      {
        id: "evt-1",
        title: "Weekly leadership sync",
        startIso: "2026-02-21T09:00:00.000Z",
        endIso: "2026-02-21T10:00:00.000Z",
        intensity: "high"
      },
      {
        id: "evt-2",
        title: "Hiring review",
        startIso: "2026-02-21T13:30:00.000Z",
        endIso: "2026-02-21T14:00:00.000Z",
        intensity: "medium"
      }
    ]
  },
  mail: {
    source: "gmail",
    capturedAtIso: "2026-02-21T06:30:00.000Z",
    sensitivity: "high",
    payload: [
      {
        id: "mail-1",
        subject: "Investor update follow-up",
        sender: "partner@fund.io",
        unansweredHours: 22,
        importanceScore: 0.94
      },
      {
        id: "mail-2",
        subject: "Launch retro notes",
        sender: "ops@company.com",
        unansweredHours: 4,
        importanceScore: 0.68
      }
    ]
  },
  weather: {
    source: "weatherkit",
    capturedAtIso: "2026-02-21T06:30:00.000Z",
    sensitivity: "low",
    payload: {
      temperatureC: 3,
      condition: "Cold and clear",
      precipitationChance: 0.1
    }
  },
  goals: {
    source: "goals",
    capturedAtIso: "2026-02-21T06:30:00.000Z",
    sensitivity: "medium",
    payload: [
      "Protect deep work blocks before noon",
      "Close investor update before lunch",
      "Maintain movement and hydration habits"
    ]
  }
};

export const mockIntegrationAccounts: IntegrationAccount[] = [
  {
    provider: "slack",
    status: "connected",
    scopes: ["channels:history", "users:read"],
    metadataOnly: true,
    lastSyncAtIso: "2026-02-21T06:40:00.000Z"
  },
  {
    provider: "gmail",
    status: "connected",
    scopes: ["gmail.readonly", "gmail.metadata"],
    metadataOnly: true,
    lastSyncAtIso: "2026-02-21T06:40:00.000Z"
  },
  {
    provider: "google_drive",
    status: "sync_lagging",
    scopes: ["drive.metadata.readonly"],
    metadataOnly: true,
    lastSyncAtIso: "2026-02-21T05:10:00.000Z"
  },
  {
    provider: "onedrive",
    status: "disconnected",
    scopes: ["files.read"],
    metadataOnly: true,
    lastSyncAtIso: "2026-02-20T17:00:00.000Z"
  },
  {
    provider: "dropbox",
    status: "token_expired",
    scopes: ["files.metadata.read"],
    metadataOnly: true,
    lastSyncAtIso: "2026-02-20T09:30:00.000Z"
  }
];

export const mockExternalItems: ExternalItem[] = [
  {
    id: "slack-urgent-1",
    provider: "slack",
    type: "slack_message",
    sourceRef: "slack://channel/ops/1782",
    title: "Production migration approval",
    summary: "Ops is waiting for a go/no-go response before 09:30.",
    requiresReply: true,
    isOutstanding: true,
    sender: "ops-lead",
    tags: ["urgent", "approval"],
    createdAtIso: "2026-02-21T06:10:00.000Z",
    updatedAtIso: "2026-02-21T06:35:00.000Z"
  },
  {
    id: "gmail-investor-2",
    provider: "gmail",
    type: "gmail_thread",
    sourceRef: "gmail://thread/18b9d2a",
    title: "Investor follow-up",
    summary: "Awaiting metrics and launch timeline reply.",
    requiresReply: true,
    isOutstanding: true,
    sender: "partner@fund.io",
    tags: ["external", "high_priority"],
    createdAtIso: "2026-02-20T15:00:00.000Z",
    updatedAtIso: "2026-02-21T06:00:00.000Z"
  },
  {
    id: "drive-q1-plan-3",
    provider: "google_drive",
    type: "drive_file",
    sourceRef: "drive://file/91A",
    title: "Q1 planning doc comments",
    summary: "3 unresolved comments assigned to you.",
    requiresReply: false,
    isOutstanding: true,
    tags: ["doc", "follow_up"],
    createdAtIso: "2026-02-20T08:00:00.000Z",
    updatedAtIso: "2026-02-21T05:20:00.000Z"
  },
  {
    id: "onedrive-roadmap-4",
    provider: "onedrive",
    type: "onedrive_file",
    sourceRef: "onedrive://item/2F1",
    title: "Roadmap deck export",
    summary: "No action needed yet.",
    requiresReply: false,
    isOutstanding: false,
    tags: ["fyi"],
    createdAtIso: "2026-02-20T13:30:00.000Z",
    updatedAtIso: "2026-02-20T13:30:00.000Z"
  }
];

export const mockWorkflows: WorkflowDefinition[] = [
  {
    id: "wf-daily-brief-7am",
    name: "7 AM Outstanding Digest",
    enabled: true,
    selectedProviders: ["slack", "gmail", "google_drive"],
    template: "daily_digest",
    trigger: {
      type: "schedule",
      schedule: {
        cadence: "daily",
        timeLocal: "07:00",
        timezone: "Europe/Copenhagen"
      }
    },
    deliveryChannels: ["in_app", "email"],
    createdAtIso: "2026-02-20T08:00:00.000Z",
    updatedAtIso: "2026-02-21T06:00:00.000Z"
  },
  {
    id: "wf-followups-1630",
    name: "16:30 Follow-up Sweep",
    enabled: true,
    selectedProviders: ["slack", "gmail"],
    template: "follow_up_summary",
    trigger: {
      type: "schedule",
      schedule: {
        cadence: "daily",
        timeLocal: "16:30",
        timezone: "Europe/Copenhagen"
      }
    },
    deliveryChannels: ["in_app"],
    createdAtIso: "2026-02-20T08:00:00.000Z",
    updatedAtIso: "2026-02-21T06:00:00.000Z"
  }
];

export const mockWorkflowRuns: WorkflowRun[] = [
  {
    id: "run-1",
    workflowId: "wf-daily-brief-7am",
    startedAtIso: "2026-02-21T06:59:58.000Z",
    finishedAtIso: "2026-02-21T07:00:02.000Z",
    status: "success",
    deliveredChannels: ["in_app", "email"]
  }
];
