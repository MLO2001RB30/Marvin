import { Text, View } from "react-native";

import { SectionBlock } from "../components/SectionBlock";
import { useAppState } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";

export function MorningBriefScreen() {
  const { mockInputs } = useAppState();
  const { colors, spacing, typography, radius } = useTheme();
  return (
    <SectionBlock title="Morning Intelligence Brief">
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
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
          Unanswered priority threads: {mockInputs.mail.payload.length}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
          Meetings today: {mockInputs.calendar.payload.length}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
          Weather: {mockInputs.weather.payload.condition}, {mockInputs.weather.payload.temperatureC}
          °C
        </Text>
      </View>
    </SectionBlock>
  );
}
