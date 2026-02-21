import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function SearchField({ placeholder }: { placeholder: string }) {
  const { colors, spacing, typography, icon } = useTheme();
  return (
    <View
      style={{
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: colors.bgPage
      }}
    >
      <Feather name="search" size={icon.md} color={colors.textTertiary} />
      <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.md }}>{placeholder}</Text>
    </View>
  );
}
