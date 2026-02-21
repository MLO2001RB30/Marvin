import { Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {subtitle ? (
        <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>{subtitle}</Text>
      ) : null}
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: typography.serif,
          fontSize: typography.sizes.hero
        }}
      >
        {title}
      </Text>
    </View>
  );
}
