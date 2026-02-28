import { PropsWithChildren } from "react";
import { View, ViewStyle } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function Surface({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.bgSurfaceAlt,
          borderRadius: radius.card,
          padding: spacing.card
        },
        style
      ]}
    >
      {children}
    </View>
  );
}
