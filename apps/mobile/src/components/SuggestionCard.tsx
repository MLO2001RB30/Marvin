import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function SuggestionCard({
  title,
  body,
  tag
}: {
  title: string;
  body: string;
  tag: string;
}) {
  const { colors, spacing, typography, radius, icon } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.card,
        backgroundColor: colors.bgSurface,
        padding: spacing.md,
        gap: spacing.sm
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>{title}</Text>
        <Feather name="star" size={icon.sm} color={colors.accentGold} />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>{body}</Text>
      <Text style={{ color: colors.accentGold, fontSize: typography.sizes.xs }}>{tag}</Text>
    </View>
  );
}
