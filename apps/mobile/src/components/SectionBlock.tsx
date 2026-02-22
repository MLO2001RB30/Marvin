import { PropsWithChildren } from "react";
import { Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function SectionBlock({
  title,
  rightLabel,
  children
}: PropsWithChildren<{ title: string; rightLabel?: string }>) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing.card }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.lg }}>
          {title}
        </Text>
        {rightLabel ? (
          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>{rightLabel}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
