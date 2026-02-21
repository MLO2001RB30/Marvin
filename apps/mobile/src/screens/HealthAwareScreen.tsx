import { Text, View } from "react-native";

import { SectionBlock } from "../components/SectionBlock";
import { useAppState } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";

export function HealthAwareScreen() {
  const { mockInputs } = useAppState();
  const { colors, spacing, typography, radius } = useTheme();
  const health = mockInputs.health.payload;

  return (
    <SectionBlock title="Health-Aware Decision Engine">
      <View
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
          Recovery score: {health.recoveryScore}/100
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
          Sleep: {health.sleepHours}h | HRV: {health.hrv} | RHR: {health.restingHeartRate}
        </Text>
        <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
          Suggested mode: {health.recoveryScore >= 70 ? "execution" : "recovery"}
        </Text>
      </View>
    </SectionBlock>
  );
}
