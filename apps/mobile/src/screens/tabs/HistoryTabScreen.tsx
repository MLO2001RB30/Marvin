import { Text, View } from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { SectionBlock } from "../../components/SectionBlock";
import { useAppState } from "../../state/AppState";
import { useTheme } from "../../theme/ThemeProvider";

export function HistoryTabScreen() {
  const { workflowRuns, workflows } = useAppState();
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="History" subtitle="Workflow run timeline" />
      <SectionBlock title="Recent Runs">
        {workflowRuns.map((run) => {
          const workflow = workflows.find((item) => item.id === run.workflowId);
          return (
            <View
              key={run.id}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: spacing.md,
                gap: spacing.xs
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
                {workflow?.name ?? run.workflowId}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
                {`Status: ${run.status} • ${new Date(run.finishedAtIso).toLocaleString()}`}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
                {`Delivered via: ${run.deliveredChannels.join(", ") || "none"}`}
              </Text>
            </View>
          );
        })}
      </SectionBlock>
    </View>
  );
}
