import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { rootTabs, type RootTabKey } from "../navigation/tabIA";
import { useTheme } from "../theme/ThemeProvider";

export function BottomTabBar({
  activeTab,
  onTabPress,
  badges
}: {
  activeTab: RootTabKey;
  onTabPress: (tab: RootTabKey) => void;
  badges?: Partial<Record<RootTabKey, number>>;
}) {
  const { colors, spacing, typography, radius, icon } = useTheme();
  return (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: colors.bgElevated,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        flexDirection: "row",
        justifyContent: "space-around",
        borderWidth: 1,
        borderColor: colors.border
      }}
    >
      {rootTabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const tint = isActive ? colors.accentGold : colors.textTertiary;
        const badgeCount = badges?.[tab.key] ?? 0;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            style={({ pressed }) => ({
              alignItems: "center",
              gap: spacing.xxs,
              paddingVertical: spacing.xxs,
              paddingHorizontal: spacing.md,
              opacity: pressed ? 0.6 : 1
            })}
          >
            <View style={{ alignItems: "center" }}>
              <Feather name={tab.icon} size={icon.md} color={tint} />
              {isActive && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accentGold, marginTop: 4 }} />
              )}
              {badgeCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -10,
                    backgroundColor: colors.danger,
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4
                  }}
                >
                  <Text style={{ color: "#FFF", fontSize: 9, fontWeight: "700" }}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ color: tint, fontSize: typography.sizes.xs, fontWeight: isActive ? "500" : "400" }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
