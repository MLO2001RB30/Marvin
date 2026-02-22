import { Text, View } from "react-native";

import { SectionBlock } from "../components/SectionBlock";
import { useAppState } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";

export function CalendarIntelligenceScreen() {
  const { workflows } = useAppState();
  const { colors, spacing, typography, radius } = useTheme();
  return (
    <SectionBlock title="Calendar Intelligence" rightLabel="Energy-aware plan">
      {workflows.map((workflow) => (
        <View
          key={workflow.id}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.card,
            backgroundColor: colors.bgSurface,
            padding: spacing.md,
            gap: spacing.xs
          }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
            {workflow.name}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
            {workflow.trigger.schedule.cadence} at {workflow.trigger.schedule.timeLocal} (
            {workflow.trigger.schedule.timezone})
          </Text>
          <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
            Sources: {workflow.selectedProviders.join(", ")}
          </Text>
        </View>
      ))}
    </SectionBlock>
  );
}
