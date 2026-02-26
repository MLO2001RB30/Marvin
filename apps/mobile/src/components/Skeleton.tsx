import { useEffect, useRef } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

function SkeletonPulse({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.border, borderRadius: 8, opacity },
        style
      ]}
    />
  );
}

export function SkeletonCard() {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: spacing.md,
        backgroundColor: colors.bgSurface,
        gap: spacing.sm
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <SkeletonPulse style={{ width: 28, height: 28, borderRadius: 8 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonPulse style={{ height: 12, width: "80%" }} />
          <SkeletonPulse style={{ height: 10, width: "50%" }} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonTimeline() {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
          <SkeletonPulse style={{ width: 44, height: 14 }} />
          <View style={{ width: 2, height: 28, backgroundColor: colors.border, borderRadius: 1 }} />
          <SkeletonPulse style={{ flex: 1, height: 28, borderRadius: 10 }} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonBrief() {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.section }}>
      <View style={{ gap: spacing.xs }}>
        <SkeletonPulse style={{ height: 10, width: 120 }} />
        <SkeletonPulse style={{ height: 26, width: 220 }} />
      </View>
      <View style={{ gap: spacing.md }}>
        <SkeletonTimeline />
      </View>
      <View style={{ gap: spacing.sm }}>
        <SkeletonPulse style={{ height: 14, width: 100 }} />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    </View>
  );
}
