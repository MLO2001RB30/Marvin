export type RootTabKey = "home" | "workflows" | "assistant" | "history" | "settings";

export interface TabDefinition {
  key: RootTabKey;
  label: string;
  icon: "home" | "repeat" | "message-circle" | "clock" | "settings";
  surfaces: string[];
}

export const rootTabs: TabDefinition[] = [
  {
    key: "home",
    label: "Home",
    icon: "home",
    surfaces: ["Today Brief", "Outstanding Items", "Priority Signals"]
  },
  {
    key: "workflows",
    label: "Workflows",
    icon: "repeat",
    surfaces: ["Scheduled Triggers", "Templates", "Delivery Channels"]
  },
  {
    key: "assistant",
    label: "Assistant",
    icon: "message-circle",
    surfaces: ["Ask Questions", "Context Grounding", "Action Suggestions"]
  },
  {
    key: "history",
    label: "History",
    icon: "clock",
    surfaces: ["Workflow Runs", "Run Logs", "Delivery Outcomes"]
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
    surfaces: ["Integrations", "Notifications", "Privacy"]
  }
];
