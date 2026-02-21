import { Pressable, Text, View } from "react-native";

import type { IntegrationConsent } from "@pia/shared";

import { useTheme } from "../theme/ThemeProvider";

export function ConsentRow({
  consent,
  onToggle
}: {
  consent: IntegrationConsent;
  onToggle: () => void;
}) {
  const { colors, spacing, typography, radius } = useTheme();
  return (
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
      <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>{consent.provider}</Text>
      <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
        Metadata-only: {consent.metadataOnly ? "enabled" : "disabled"}
      </Text>
      <Pressable
        onPress={onToggle}
        style={{
          alignSelf: "flex-start",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 999,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          backgroundColor: consent.enabled ? colors.accentGoldTint : "transparent"
        }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
          {consent.enabled ? "Connected" : "Disconnected"}
        </Text>
      </Pressable>
    </View>
  );
}
