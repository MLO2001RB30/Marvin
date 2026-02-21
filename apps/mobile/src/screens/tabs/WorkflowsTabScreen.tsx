import { Pressable, Text, View } from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { SectionBlock } from "../../components/SectionBlock";
import { useAppState } from "../../state/AppState";
import { useTheme } from "../../theme/ThemeProvider";

export function WorkflowsTabScreen() {
  const { workflows, addWorkflowRun } = useAppState();
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="Workflows" subtitle="Automation builder" />
      <SectionBlock title="Scheduled Workflows">
        {workflows.map((workflow) => (
          <View
            key={workflow.id}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 16,
              padding: spacing.md,
              gap: spacing.xs
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>{workflow.name}</Text>
            <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
              {`${workflow.trigger.schedule.cadence} at ${workflow.trigger.schedule.timeLocal} (${workflow.trigger.schedule.timezone})`}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
              {`Sources: ${workflow.selectedProviders.join(", ")}`}
            </Text>
            <Pressable
              onPress={() =>
                addWorkflowRun({
                  id: `run-${Date.now()}`,
                  workflowId: workflow.id,
                  startedAtIso: new Date().toISOString(),
                  finishedAtIso: new Date().toISOString(),
                  status: "success",
                  deliveredChannels: workflow.deliveryChannels
                })
              }
              style={{
                alignSelf: "flex-start",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>Run now</Text>
            </Pressable>
          </View>
        ))}
      </SectionBlock>
    </View>
  );
}
