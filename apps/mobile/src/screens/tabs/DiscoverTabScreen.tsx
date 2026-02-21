import { View } from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { SectionBlock } from "../../components/SectionBlock";
import { SuggestionCard } from "../../components/SuggestionCard";
import { useTheme } from "../../theme/ThemeProvider";
import { CommandCenterScreen } from "../CommandCenterScreen";
import { MailIntelligenceScreen } from "../MailIntelligenceScreen";

export function DiscoverTabScreen() {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="Discover" subtitle="Proactive recommendations" />
      <SectionBlock title="Today Suggestions">
        <SuggestionCard
          title="Focus block recommendation"
          body="Schedule 90 minutes of deep work before your first high-intensity meeting."
          tag="Mode: Execution"
        />
        <SuggestionCard
          title="Recovery adjustment"
          body="Move one admin task to later and insert a 15 min walking reset."
          tag="Health-aware"
        />
      </SectionBlock>
      <CommandCenterScreen />
      <MailIntelligenceScreen />
    </View>
  );
}
