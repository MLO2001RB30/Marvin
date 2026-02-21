import { Text, View } from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { SectionBlock } from "../../components/SectionBlock";
import { useAppState } from "../../state/AppState";
import { useTheme } from "../../theme/ThemeProvider";

export function HomeTabScreen() {
  const { externalItems, workflowRuns, workflows } = useAppState();
  const { colors, spacing, typography } = useTheme();
  const outstanding = externalItems.filter((item) => item.isOutstanding);
  const activeWorkflowCount = workflows.filter((item) => item.enabled).length;
  const latestRun = workflowRuns[0];
  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="Good morning" subtitle="Personal AI Assistant" />
      <SectionBlock title="Today's Brief" rightLabel="7:00 AM">
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
          {`You have ${outstanding.length} outstanding items across connected integrations.`}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
          {`Active workflows: ${activeWorkflowCount}. Last run: ${
            latestRun ? new Date(latestRun.finishedAtIso).toLocaleTimeString() : "not run yet"
          }.`}
        </Text>
      </SectionBlock>
      <SectionBlock title="Top Outstanding">
        {outstanding.slice(0, 3).map((item) => (
          <View
            key={item.id}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 16,
              padding: spacing.md,
              gap: spacing.xs
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>{item.title}</Text>
            <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>{item.summary}</Text>
          </View>
        ))}
      </SectionBlock>
    </View>
  );
}
