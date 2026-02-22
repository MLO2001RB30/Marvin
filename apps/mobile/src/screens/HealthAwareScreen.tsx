import { Text, View } from "react-native";

import { SectionBlock } from "../components/SectionBlock";
import { useAppState } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";

export function HealthAwareScreen() {
  const { externalItems } = useAppState();
  const { colors, spacing, typography, radius } = useTheme();
  const outstanding = externalItems.filter((item) => item.isOutstanding).length;
  const replyNeeded = externalItems.filter((item) => item.isOutstanding && item.requiresReply).length;
  const recoveryScore = Math.max(0, 100 - outstanding * 8 - replyNeeded * 6);

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
          Recovery score: {recoveryScore}/100
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
          Outstanding: {outstanding} | Reply-needed: {replyNeeded}
        </Text>
        <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
          Suggested mode: {recoveryScore >= 70 ? "execution" : "recovery"}
        </Text>
      </View>
    </SectionBlock>
  );
}
