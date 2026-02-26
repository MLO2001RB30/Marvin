import { Feather } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

import type { IntegrationProvider } from "@pia/shared";

import { useTheme } from "../theme/ThemeProvider";

const STEPS = [
  { title: "Welcome to Marvin", icon: "zap" as const },
  { title: "Connect your tools", icon: "link" as const },
  { title: "Your data stays safe", icon: "shield" as const },
  { title: "See your first brief", icon: "sunrise" as const }
];

const connectProviders: { provider: IntegrationProvider; label: string; icon: string }[] = [
  { provider: "gmail", label: "Gmail", icon: "mail" },
  { provider: "google_calendar", label: "Calendar", icon: "calendar" },
  { provider: "slack", label: "Slack", icon: "message-square" },
  { provider: "google_drive", label: "Drive", icon: "hard-drive" }
];

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
    <View style={{ gap: spacing.xl, flex: 1 }}>
      <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "center" }}>
        {STEPS.map((s, idx) => (
          <View
            key={idx}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: idx <= step ? colors.accentGold : colors.border
            }}
          />
        ))}
      </View>

      <View style={{ alignItems: "center", gap: spacing.md }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.accentGoldTint,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Feather name={STEPS[step].icon} size={24} color={colors.accentGold} />
        </View>
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.xl, fontWeight: "600", textAlign: "center" }}>
          {STEPS[step].title}
        </Text>
      </View>

      {step === 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.md, lineHeight: 22, textAlign: "center" }}>
            Marvin connects your email, calendar, and messaging to surface what matters most — so you can focus on what counts.
          </Text>
        </View>
      )}

      {step === 1 && (
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.md, textAlign: "center" }}>
            Connect at least one integration to get started.
          </Text>
          <View style={{ gap: spacing.xs }}>
            {connectProviders.map(({ provider, label, icon }) => (
              <Pressable
                key={provider}
                onPress={() => onConnectProvider(provider)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  backgroundColor: colors.bgSurface
                }}
              >
                <Feather name={icon as any} size={20} color={colors.accentGold} />
                <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md, flex: 1 }}>
                  {label}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
            <Feather name="lock" size={16} color={colors.success} style={{ marginTop: 3 }} />
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.md, flex: 1, lineHeight: 22 }}>
              Sensitive content stays local-first. Cloud reasoning uses metadata only with revocable per-provider consent.
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
            <Feather name="eye-off" size={16} color={colors.success} style={{ marginTop: 3 }} />
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.md, flex: 1, lineHeight: 22 }}>
              You can disconnect any integration at any time from Settings.
            </Text>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.md, textAlign: "center" }}>
            Generate your first brief from connected integrations.
          </Text>
          <Pressable
            onPress={onRunConnected}
            disabled={isBusy}
            style={{
              backgroundColor: colors.accentGold,
              borderRadius: 14,
              paddingVertical: spacing.sm,
              alignItems: "center",
              opacity: isBusy ? 0.6 : 1
            }}
          >
            <Text style={{ color: "#1A1A1C", fontSize: typography.sizes.md, fontWeight: "600" }}>
              {isBusy ? "Building your brief..." : "Build my brief"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onRunDemo}
            disabled={isBusy}
            style={{ alignItems: "center", paddingVertical: spacing.xs }}
          >
            <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
              or try with demo data
            </Text>
          </Pressable>
        </View>
      )}

      <View style={{ flex: 1 }} />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: spacing.lg }}>
        {step > 0 ? (
          <Pressable onPress={onBack} style={{ padding: spacing.xs }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.md }}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Pressable onPress={onSkip} style={{ padding: spacing.xs }}>
            <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>Skip</Text>
          </Pressable>
          {step < 3 && (
            <Pressable
              onPress={onNext}
              style={{
                backgroundColor: colors.accentGold,
                borderRadius: 10,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.xs
              }}
            >
              <Text style={{ color: "#1A1A1C", fontSize: typography.sizes.sm, fontWeight: "600" }}>
                Continue
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
