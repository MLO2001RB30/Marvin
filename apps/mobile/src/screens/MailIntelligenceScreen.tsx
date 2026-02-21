import { Text, View } from "react-native";

import { SectionBlock } from "../components/SectionBlock";
import { useAppState } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";

export function MailIntelligenceScreen() {
  const { mockInputs } = useAppState();
  const { colors, spacing, typography, radius } = useTheme();
  return (
    <SectionBlock title="Mail Intelligence" rightLabel="Thread triage">
      {mockInputs.mail.payload.map((thread) => (
        <View
          key={thread.id}
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
            {thread.subject}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
            {thread.sender} - {thread.unansweredHours}h unanswered
          </Text>
          <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
            Importance: {(thread.importanceScore * 100).toFixed(0)}%
          </Text>
        </View>
      ))}
    </SectionBlock>
  );
}
