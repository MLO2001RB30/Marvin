import { ScrollView, View } from "react-native";

import { BottomTabBar } from "../components/BottomTabBar";
import { useAppState } from "../state/AppState";
import { AssistantTabScreen } from "../screens/tabs/AssistantTabScreen";
import { HistoryTabScreen } from "../screens/tabs/HistoryTabScreen";
import { HomeTabScreen } from "../screens/tabs/HomeTabScreen";
import { SettingsTabScreen } from "../screens/tabs/SettingsTabScreen";
import { WorkflowsTabScreen } from "../screens/tabs/WorkflowsTabScreen";
import type { RootTabKey } from "./tabIA";
import { useTheme } from "../theme/ThemeProvider";

function ActiveScreen() {
  const { activeTab } = useAppState();
  switch (activeTab) {
    case "home":
      return <HomeTabScreen />;
    case "workflows":
      return <WorkflowsTabScreen />;
    case "assistant":
      return <AssistantTabScreen />;
    case "history":
      return <HistoryTabScreen />;
    case "settings":
      return <SettingsTabScreen />;
    default:
      return <HomeTabScreen />;
  }
}

export function AppShell() {
  const { activeTab, setActiveTab } = useAppState();
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 10, paddingBottom: 20 }}>
        <ActiveScreen />
      </ScrollView>
      <View style={{ paddingHorizontal: 21, paddingTop: 12, paddingBottom: 21 }}>
        <BottomTabBar activeTab={activeTab} onTabPress={(tab: RootTabKey) => setActiveTab(tab)} />
      </View>
    </View>
  );
}
