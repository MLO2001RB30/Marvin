import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "../theme/ThemeProvider";

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

  return (
    <View style={{ gap: spacing.xs, paddingTop: spacing.xs }}>
      {subtitle ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          {showLiveIndicator ? (
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
          ) : null}
          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.xs, letterSpacing: 0.2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: compact ? typography.sizes.xl : typography.sizes.hero,
            fontWeight: "700",
            letterSpacing: -0.5
          }}
        >
          {title}
        </Text>
        {rightElement}
      </View>
    </View>
  );
}
