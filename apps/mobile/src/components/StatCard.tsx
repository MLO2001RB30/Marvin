import { Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function StatCard({
  label,
  value,
  subtitle
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderColor: colors.border,
        borderWidth: 1,
        padding: spacing.md,
        gap: spacing.xs,
        backgroundColor: colors.bgSurface
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>{label}</Text>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.sizes.xxl
        }}
      >
        {value}
      </Text>
      {subtitle ? (
        <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
