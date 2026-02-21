import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function HabitRow({
  title,
  subtitle,
  state
}: {
  title: string;
  subtitle: string;
  state: "done" | "progress" | "upcoming";
}) {
  const { colors, spacing, typography, icon } = useTheme();
  const iconColor = state === "done" ? colors.accentGold : state === "progress" ? colors.info : colors.textTertiary;
  const iconName = state === "done" ? "check-circle" : state === "progress" ? "clock" : "circle";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingVertical: spacing.xs
      }}
    >
      <Feather name={iconName} size={icon.md} color={iconColor} />
      <View style={{ gap: 2 }}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>{title}</Text>
        <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>{subtitle}</Text>
      </View>
    </View>
  );
}
