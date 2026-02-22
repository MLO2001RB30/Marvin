import { Pressable, Text, View } from "react-native";

import { Feather } from "@expo/vector-icons";

import { useTheme } from "../theme/ThemeProvider";

export function AppHeader({
  title,
  subtitle,
  compact,
  showLiveIndicator,
  onBack,
  backLabel
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  showLiveIndicator?: boolean;
  onBack?: () => void;
  backLabel?: string;
}) {
  const { colors, spacing, typography } = useTheme();
  const titleSize = compact ? typography.sizes.xl : typography.sizes.hero;
  const content = (
    <>
      {subtitle ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          {showLiveIndicator ? (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.success
              }}
            />
          ) : null}
          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>{subtitle}</Text>
        </View>
      ) : null}
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: titleSize
        }}
      >
        {title}
      </Text>
    </>
  );
  if (onBack) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>{content}</View>
        <Pressable onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <Feather name="chevron-left" size={20} color={colors.accentGold} />
          <Text style={{ color: colors.accentGold, fontSize: typography.sizes.md }}>{backLabel ?? "Back"}</Text>
        </Pressable>
      </View>
    );
  }
  return <View style={{ gap: spacing.xs }}>{content}</View>;
}
