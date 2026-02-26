import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function ProgressRing({
  done,
  total,
  size = 48,
  strokeWidth = 4
}: {
  done: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const { colors, typography } = useTheme();
  const progress = total > 0 ? done / total : 0;
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: progress,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [progress, animValue]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: colors.border
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: progress >= 1 ? colors.success : colors.accentGold,
          borderTopColor: progress > 0 ? (progress >= 1 ? colors.success : colors.accentGold) : "transparent",
          borderRightColor: progress > 0.25 ? (progress >= 1 ? colors.success : colors.accentGold) : "transparent",
          borderBottomColor: progress > 0.5 ? (progress >= 1 ? colors.success : colors.accentGold) : "transparent",
          borderLeftColor: progress > 0.75 ? (progress >= 1 ? colors.success : colors.accentGold) : "transparent",
          transform: [{ rotate: "-90deg" }]
        }}
      />
      <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, fontWeight: "600" }}>
        {done}/{total}
      </Text>
    </View>
  );
}
