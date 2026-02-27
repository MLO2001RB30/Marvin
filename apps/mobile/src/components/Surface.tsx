import { PropsWithChildren } from "react";
import { View, ViewStyle } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function Surface({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { colors, spacing, radius, shadow } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.bgSurface,
          borderRadius: radius.card,
          padding: spacing.card,
          gap: spacing.sm,
          ...shadow.md
        },
        style
      ]}
    >
      {children}
    </View>
  );
}
