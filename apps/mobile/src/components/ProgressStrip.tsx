import { Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function ProgressStrip({ values, labels }: { values: number[]; labels: string[] }) {
  const { colors, spacing, typography, radius } = useTheme();
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
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {values.map((value, index) => (
          <View
            key={`${labels[index]}-${value}`}
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              borderWidth: 1,
              borderColor: value > 0 ? colors.accentGold : colors.border,
              backgroundColor: value > 0 ? colors.accentGoldTint : "transparent",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: value > 0 ? colors.accentGold : colors.textTertiary, fontSize: typography.sizes.xs }}>
              {value > 0 ? value : ""}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {labels.map((label, index) => (
          <Text key={`${label}-${index}`} style={{ color: colors.textTertiary, fontSize: typography.sizes.xs }}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
