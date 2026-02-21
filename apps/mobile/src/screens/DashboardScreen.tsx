import { Text, View } from "react-native";

import { MetricCard } from "../components/MetricCard";
import { SectionBlock } from "../components/SectionBlock";
import { useAppState } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";

export function DashboardScreen() {
  const { mockInputs } = useAppState();
  const { colors, spacing, typography, radius } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <SectionBlock title="Today">
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <MetricCard value="47" label="Day streak" hint="Personal best" />
          <MetricCard value="2,847" label="Total points" hint="+34 today" />
        </View>
      </SectionBlock>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <MetricCard value="74" label="Readiness" hint="Execution mode" />
        <MetricCard value="3" label="Priority actions" hint="Recommended now" />
      </View>
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.card,
          backgroundColor: colors.bgSurface,
          padding: spacing.md,
          gap: spacing.sm
        }}
      >
        <Text style={{ color: colors.textPrimary, fontFamily: typography.serif, fontSize: typography.sizes.lg }}>
          Unified Dashboard
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
          Top focus: {mockInputs.goals.payload[0]}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
          This week: 5 of 8 habits completed.
        </Text>
      </View>
    </View>
  );
}
