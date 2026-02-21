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
  const { mockInputs } = useAppState();
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="Stats" subtitle="Performance overview" />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <MetricCard value="47" label="Day streak" hint="Personal best" />
        <MetricCard value="2,847" label="Total points" hint="+34 today" />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <MetricCard value={`${mockInputs.health.payload.recoveryScore}`} label="Recovery score" hint="Health-aware" />
        <MetricCard value={`${mockInputs.calendar.payload.length}`} label="Meetings today" hint="Energy-balanced" />
      </View>
      <SectionBlock title="Consistency">
        <ProgressStrip values={[4, 5, 3, 6, 7, 2, 0]} labels={["M", "T", "W", "T", "F", "S", "S"]} />
      </SectionBlock>
      <CalendarIntelligenceScreen />
      <HealthAwareScreen />
    </View>
  );
}
