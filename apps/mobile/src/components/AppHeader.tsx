import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "../theme/ThemeProvider";

function GradientBar() {
  const { colors, colorScheme } = useTheme();
  const gradientColor = colorScheme === "dark" ? "rgba(26,26,28," : "rgba(245,245,247,";
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: -28,
        right: -28,
        height: 80,
        zIndex: -1
      }}
    >
      <View style={{ flex: 1, backgroundColor: `${gradientColor}0.95)` }} />
      <View style={{ height: 20, backgroundColor: `${gradientColor}0.6)` }} />
      <View style={{ height: 10, backgroundColor: `${gradientColor}0.2)` }} />
    </View>
  );
}

export function AppHeader({
  title,
  subtitle,
  compact,
  showLiveIndicator,
  onBack,
  backLabel,
  rightElement
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  showLiveIndicator?: boolean;
  onBack?: () => void;
  backLabel?: string;
  rightElement?: React.ReactNode;
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
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, letterSpacing: 0.2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      ) : null}
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: titleSize,
          fontWeight: compact ? "700" : "400",
          letterSpacing: compact ? -0.4 : -0.5
        }}
      >
        {title}
      </Text>
    </>
  );

  return (
    <View style={{ position: "relative", zIndex: 1 }}>
      <GradientBar />
      {onBack ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>{content}</View>
          <Pressable onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Feather name="chevron-left" size={20} color={colors.accentGold} />
            <Text style={{ color: colors.accentGold, fontSize: typography.sizes.md }}>{backLabel ?? "Back"}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: spacing.xs }}>{content}</View>
          {rightElement}
        </View>
      )}
    </View>
  );
}
