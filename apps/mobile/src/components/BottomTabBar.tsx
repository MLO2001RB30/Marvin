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
        borderRadius: radius.pill,
        backgroundColor: colors.bgElevated,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        flexDirection: "row",
        justifyContent: "space-around",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 12
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
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
              position: "relative" as const,
              opacity: pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }]
            })}
          >
            <View style={{ alignItems: "center" }}>
              <Feather name={tab.icon} size={icon.lg} color={tint} />
              {isActive && (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.accentGold,
                    marginTop: 3
                  }}
                />
              )}
              {badgeCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -8,
                    backgroundColor: colors.accentGold,
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 3
                  }}
                >
                  <Text style={{ color: "#1A1A1C", fontSize: 9, fontWeight: "700" }}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ color: tint, fontSize: typography.sizes.xs }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
