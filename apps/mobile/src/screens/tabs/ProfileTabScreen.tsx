import { Pressable, Text, View } from "react-native";

import type { Mode } from "@pia/shared";

import { AppHeader } from "../../components/AppHeader";
import { SectionBlock } from "../../components/SectionBlock";
import { useAppState } from "../../state/AppState";
import { useTheme } from "../../theme/ThemeProvider";
import { PrivacyScreen } from "../PrivacyScreen";

const modes: Mode[] = ["focus", "recovery", "execution", "travel"];

export function ProfileTabScreen() {
  const { mode, setMode, spacing, colors, typography, borderRadius } = useProfileUi();

  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="Profile" subtitle="Integrations and preferences" />
      <SectionBlock title="Mode Defaults">
        <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          {modes.map((item) => (
            <Pressable
              key={item}
              onPress={() => setMode(item)}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                backgroundColor: item === mode ? colors.accentGoldTint : "transparent"
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </SectionBlock>
      <PrivacyScreen />
    </View>
  );
}

function useProfileUi() {
  const { mode, setMode } = useAppState();
  const { spacing, colors, typography } = useTheme();
  return {
    mode,
    setMode,
    spacing,
    colors,
    typography,
    borderRadius: 999
  };
}
