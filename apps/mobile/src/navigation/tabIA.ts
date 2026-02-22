export type RootTabKey = "brief" | "assistant" | "manage";

export interface TabDefinition {
  key: RootTabKey;
  label: string;
  icon: "home" | "message-circle" | "settings";
  surfaces: string[];
}

export const rootTabs: TabDefinition[] = [
  {
    key: "brief",
    label: "Brief",
    icon: "home",
    surfaces: ["Today Brief", "Urgent", "Important", "Ambient"]
  },
  {
    key: "assistant",
    label: "Assistant",
    icon: "message-circle",
    surfaces: ["Ask Questions", "Context Grounding", "Action Suggestions"]
  },
  {
    key: "manage",
    label: "Manage",
    icon: "settings",
    surfaces: ["Integrations", "Workflows", "History", "Settings"]
  }
];
