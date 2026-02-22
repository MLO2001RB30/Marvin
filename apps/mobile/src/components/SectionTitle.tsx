import { Text } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function SectionTitle({ title }: { title: string }) {
  const { colors, typography } = useTheme();
  return (
    <Text
      style={{
        color: colors.textPrimary,
        fontSize: typography.sizes.lg
      }}
    >
      {title}
    </Text>
  );
}
