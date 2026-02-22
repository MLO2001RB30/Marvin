import { Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function MetricCard({
  value,
  label,
  hint
}: {
  value: string;
  label: string;
  hint: string;
}) {
  const { colors, spacing, typography, radius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.card,
        backgroundColor: colors.bgSurface,
        padding: spacing.md,
        gap: spacing.xs
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.xxl }}>
        {value}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>{label}</Text>
      <Text style={{ color: colors.accentGold, fontSize: typography.sizes.xs }}>{hint}</Text>
    </View>
  );
}
