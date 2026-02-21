import { PropsWithChildren } from "react";
import { View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function Surface({ children }: PropsWithChildren) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgSurface,
        padding: spacing.md,
        gap: spacing.sm
      }}
    >
      {children}
    </View>
  );
}
