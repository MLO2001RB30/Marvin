import { Text, View } from "react-native";

import { SectionBlock } from "../components/SectionBlock";
import { SuggestionCard } from "../components/SuggestionCard";
import { useTheme } from "../theme/ThemeProvider";

export function CommandCenterScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  return (
    <SectionBlock title="AI Command Center" rightLabel="3 ready">
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
          Suggested prompt: Draft investor follow-up and schedule two deep-work blocks.
        </Text>
        <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
          Context-aware actions ready: 3
        </Text>
      </View>
      <SuggestionCard
        title="Autopilot candidate"
        body="Prepare a draft reply for the highest-scored unanswered thread."
        tag="Mail Intelligence"
      />
    </SectionBlock>
  );
}
