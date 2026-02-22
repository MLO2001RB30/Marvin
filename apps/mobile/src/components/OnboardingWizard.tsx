import { Pressable, Text, View } from "react-native";

import type { IntegrationProvider } from "@pia/shared";

import { useTheme } from "../theme/ThemeProvider";

const mvpProviders: IntegrationProvider[] = [
  "gmail",
  "google_calendar",
  "healthkit",
  "weatherkit"
];

function providerLabel(provider: IntegrationProvider) {
  return provider.replace("_", " ");
}

export function OnboardingWizard({
  step,
  onNext,
  onSkip,
  onBack,
  onConnectProvider,
  onRunDemo,
  onRunConnected,
  isBusy
}: {
  step: 0 | 1 | 2 | 3;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
  onConnectProvider: (provider: IntegrationProvider) => void;
  onRunDemo: () => void;
  onRunConnected: () => void;
  isBusy: boolean;
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing.section }}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.hero }}>
        Get started
      </Text>
      {step === 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
            Marvin captures signals, reasons over priority and energy, then executes through workflows.
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
            You can start in demo mode now and connect integrations later.
          </Text>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
            Connect providers (optional)
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
            Start with one provider or skip and run the first pipeline in demo mode.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {mvpProviders.map((provider) => (
              <Pressable
                key={provider}
                onPress={() => onConnectProvider(provider)}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 999,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs
                }}
              >
                <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                  Connect {providerLabel(provider)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
            Privacy first
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
            Sensitive content stays local-first where possible. Cloud reasoning uses metadata/embeddings with revocable per-provider consent.
          </Text>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
            Run your first daily context
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
            Generate your first morning brief from connected integrations or demo fallback data.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            <Pressable
              onPress={onRunDemo}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                {isBusy ? "Running..." : "Run in demo mode"}
              </Text>
            </Pressable>
            <Pressable
              onPress={onRunConnected}
              style={{
                borderWidth: 1,
                borderColor: colors.accentGold,
                borderRadius: 999,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs
              }}
            >
              <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
                {isBusy ? "Running..." : "Run with connected accounts"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
        {step > 0 ? (
          <Pressable
            onPress={onBack}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 999,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>Back</Text>
          </Pressable>
        ) : null}
        {step < 3 ? (
          <Pressable
            onPress={onNext}
            style={{
              borderWidth: 1,
              borderColor: colors.accentGold,
              borderRadius: 999,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs
            }}
          >
            <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>Continue</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onSkip}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 999,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs
          }}
        >
          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}
