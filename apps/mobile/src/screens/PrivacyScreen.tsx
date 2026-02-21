import { Pressable, Text, View } from "react-native";

import type { IntegrationConsent } from "@pia/shared";

import { ConsentRow } from "../components/ConsentRow";
import { SectionBlock } from "../components/SectionBlock";
import { useAppState } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";

function toggle(consent: IntegrationConsent): IntegrationConsent {
  return {
    ...consent,
    enabled: !consent.enabled,
    updatedAtIso: new Date().toISOString()
  };
}

export function PrivacyScreen() {
  const { consents, upsertConsent } = useAppState();
  const { colors, spacing, typography } = useTheme();
  return (
    <SectionBlock title="Privacy and Permissions" rightLabel="Local-first boundary">
      {consents.map((consent) => (
        <ConsentRow key={consent.provider} consent={consent} onToggle={() => upsertConsent(toggle(consent))} />
      ))}
      <Pressable
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 999,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          alignSelf: "flex-start"
        }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
          Embeddings-only cloud processing is enforced.
        </Text>
      </Pressable>
    </SectionBlock>
  );
}
