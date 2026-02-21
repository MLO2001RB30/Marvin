import { Pressable, Text, View } from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { SectionBlock } from "../../components/SectionBlock";
import { useAppState } from "../../state/AppState";
import { useTheme } from "../../theme/ThemeProvider";

export function SettingsTabScreen() {
  const { integrationAccounts, toggleIntegration } = useAppState();
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="Settings" subtitle="Integrations and controls" />
      <SectionBlock title="Integrations">
        {integrationAccounts.map((integration) => (
          <View
            key={integration.provider}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 16,
              padding: spacing.md,
              gap: spacing.xs
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
              {integration.provider}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
              {`Status: ${integration.status} • Scopes: ${integration.scopes.join(", ")}`}
            </Text>
            <Pressable
              onPress={() => toggleIntegration(integration.provider)}
              style={{
                alignSelf: "flex-start",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                {integration.status === "connected" ? "Disconnect" : "Connect"}
              </Text>
            </Pressable>
          </View>
        ))}
      </SectionBlock>
      <SectionBlock title="Notifications" rightLabel="Quiet hours">
        <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
          Daily digest at 07:00. Follow-up sweep at 16:30. Quiet hours from 22:00 to 06:30.
        </Text>
      </SectionBlock>
    </View>
  );
}
