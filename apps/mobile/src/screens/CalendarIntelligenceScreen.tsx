import { Text, View } from "react-native";

import { SectionBlock } from "../components/SectionBlock";
import { useAppState } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";

export function CalendarIntelligenceScreen() {
  const { mockInputs } = useAppState();
  const { colors, spacing, typography, radius } = useTheme();
  return (
    <SectionBlock title="Calendar Intelligence" rightLabel="Energy-aware plan">
      {mockInputs.calendar.payload.map((event) => (
        <View
          key={event.id}
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
            {event.title}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
            {new Date(event.startIso).toLocaleTimeString()} - {new Date(event.endIso).toLocaleTimeString()}
          </Text>
          <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
            Energy intensity: {event.intensity}
          </Text>
        </View>
      ))}
    </SectionBlock>
  );
}
