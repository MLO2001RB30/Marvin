export const habitElegantBaseline = {
  source: {
    file: "pencil-demo.pen",
    nodeId: "ZRyHQ",
    nodeName: "Habit Tracker - Elegant Luxury"
  },
  colors: {
    bgPage: "#1A1A1C",
    bgSurface: "#242426",
    strokeSubtle: "#3A3A3C",
    textPrimary: "#FFFFFF",
    textMuted: "#6E6E70",
    accentGold: "#C9A962",
    accentGoldSoft: "#C9A96240"
  },
  spacing: {
    screenInsetX: 28,
    sectionGap: 40,
    cardGap: 20,
    innerGap: 12,
    tabInsetBottom: 21
  },
  radius: {
    searchField: 26,
    card: 20,
    segmented: 24,
    tabBar: 34
  },
  typography: {
    headerFamily: "serif-display",
    bodyFamily: "Inter",
    metricFamily: "serif-display",
    sizes: {
      label: 10,
      body: 12,
      title: 16,
      metric: 40
    }
  },
  anatomy: {
    topLevel: ["Status bar", "Content Wrapper", "Tab Bar Section"],
    contentSections: [
      "Header",
      "Search",
      "Today Section",
      "Habits Section",
      "Week Section",
      "Programs Section",
      "Segmented Wrap",
      "Schedule Section",
      "Help Section"
    ],
    bottomTabs: ["Home", "Stats", "Discover", "Profile"]
  }
} as const;

export type HabitElegantBaseline = typeof habitElegantBaseline;
