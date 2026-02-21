import { Text, View } from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { SectionBlock } from "../../components/SectionBlock";
import { useAppState } from "../../state/AppState";
import { useTheme } from "../../theme/ThemeProvider";

export function AssistantTabScreen() {
  const { externalItems } = useAppState();
  const { colors, spacing, typography } = useTheme();

  const replyNeeded = externalItems.filter((item) => item.isOutstanding && item.requiresReply);
  const answer = replyNeeded.length
    ? `You should respond to ${replyNeeded[0]?.title} first, then clear ${replyNeeded.length - 1} additional reply-needed items.`
    : "No reply-needed items detected right now.";

  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="Assistant" subtitle="Ask with full context" />
      <SectionBlock title="Suggested prompt" rightLabel="Grounded">
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
          What is blocking me this morning?
        </Text>
      </SectionBlock>
      <SectionBlock title="Assistant response">
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>{answer}</Text>
      </SectionBlock>
    </View>
  );
}
