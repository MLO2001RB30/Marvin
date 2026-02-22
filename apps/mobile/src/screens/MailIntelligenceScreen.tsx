import { Text, View } from "react-native";

import { SectionBlock } from "../components/SectionBlock";
import { useAppState } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";

export function MailIntelligenceScreen() {
  const { externalItems } = useAppState();
  const { colors, spacing, typography, radius } = useTheme();
  const mailThreads = externalItems.filter((item) => item.type === "gmail_thread");
  return (
    <SectionBlock title="Mail Intelligence" rightLabel="Thread triage">
      {mailThreads.map((thread) => (
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
            {thread.title}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
            {thread.sender ?? "unknown"} - {thread.requiresReply ? "Needs reply" : "No reply needed"}
          </Text>
          <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
            Importance: {thread.tags.includes("urgent") || thread.tags.includes("high_priority") ? "High" : "Normal"}
          </Text>
        </View>
      ))}
    </SectionBlock>
  );
}
