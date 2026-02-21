import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { rootTabs, type RootTabKey } from "../navigation/tabIA";
import { useTheme } from "../theme/ThemeProvider";

export function BottomTabBar({
  activeTab,
  onTabPress
}: {
  activeTab: RootTabKey;
  onTabPress: (tab: RootTabKey) => void;
}) {
  const { colors, spacing, typography, radius, icon } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        backgroundColor: colors.bgSurface,
        padding: spacing.xxs,
        flexDirection: "row",
        justifyContent: "space-around"
      }}
    >
      {rootTabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const tint = isActive ? colors.accentGold : colors.textTertiary;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            style={{ alignItems: "center", gap: spacing.xxs, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }}
          >
            <Feather name={tab.icon} size={icon.lg} color={tint} />
            <Text style={{ color: tint, fontSize: typography.sizes.xs }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
