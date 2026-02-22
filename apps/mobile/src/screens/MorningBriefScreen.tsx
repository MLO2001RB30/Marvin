import { Text, View } from "react-native";

import { SectionBlock } from "../components/SectionBlock";
import { useAppState } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";

export function MorningBriefScreen() {
  const { externalItems, workflows } = useAppState();
  const { colors, spacing, typography, radius } = useTheme();
  const mailCount = externalItems.filter((item) => item.type === "gmail_thread" && item.isOutstanding).length;
  const workflowCount = workflows.filter((item) => item.enabled).length;
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
          Unanswered priority threads: {mailCount}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
          Enabled workflows: {workflowCount}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
          Outstanding items: {externalItems.filter((item) => item.isOutstanding).length}
        </Text>
      </View>
    </SectionBlock>
  );
}
