import { View } from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { MetricCard } from "../../components/MetricCard";
import { ProgressStrip } from "../../components/ProgressStrip";
import { SectionBlock } from "../../components/SectionBlock";
import { useAppState } from "../../state/AppState";
import { useTheme } from "../../theme/ThemeProvider";
import { CalendarIntelligenceScreen } from "../CalendarIntelligenceScreen";
import { HealthAwareScreen } from "../HealthAwareScreen";

export function StatsTabScreen() {
  const { externalItems, workflows } = useAppState();
  const { spacing } = useTheme();
  const replyNeededCount = externalItems.filter((item) => item.isOutstanding && item.requiresReply).length;
  const connectedWorkflows = workflows.filter((item) => item.enabled).length;

  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="Stats" subtitle="Performance overview" />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <MetricCard value="47" label="Day streak" hint="Personal best" />
        <MetricCard value="2,847" label="Total points" hint="+34 today" />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <MetricCard value={`${replyNeededCount}`} label="Reply needed" hint="Live inbox pressure" />
        <MetricCard value={`${connectedWorkflows}`} label="Enabled workflows" hint="Automation coverage" />
      </View>
      <SectionBlock title="Consistency">
        <ProgressStrip values={[4, 5, 3, 6, 7, 2, 0]} labels={["M", "T", "W", "T", "F", "S", "S"]} />
      </SectionBlock>
      <CalendarIntelligenceScreen />
      <HealthAwareScreen />
    </View>
  );
}
