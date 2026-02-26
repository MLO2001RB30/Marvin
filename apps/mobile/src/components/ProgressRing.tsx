import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function ProgressRing({
  done,
  total,
  size = 44,
  strokeWidth = 3
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

  const ringColor = progress >= 1 ? colors.success : colors.accentGold;
  const segments = 12;
  const segmentAngle = 360 / segments;
  const filledSegments = Math.round(progress * segments);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: colors.border + "60"
        }}
      />
      {progress > 0 && (
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: ringColor,
            borderTopColor: progress > 0 ? ringColor : "transparent",
            borderRightColor: progress > 0.25 ? ringColor : "transparent",
            borderBottomColor: progress > 0.5 ? ringColor : "transparent",
            borderLeftColor: progress > 0.75 ? ringColor : "transparent",
            transform: [{ rotate: "-90deg" }]
          }}
        />
      )}
      <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.xs, fontWeight: "700" }}>
        {done}/{total}
      </Text>
    </View>
  );
}
