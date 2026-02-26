import { Feather } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

import type { IntegrationProvider } from "@pia/shared";

import { useTheme } from "../theme/ThemeProvider";

const STEPS = [
  { title: "Your morning, simplified", icon: "sunrise" as const },
  { title: "Ask Marvin anything", icon: "message-circle" as const },
  { title: "Connect your tools", icon: "link" as const },
  { title: "Your data stays safe", icon: "shield" as const }
];

const connectProviders: { provider: IntegrationProvider; label: string; icon: string }[] = [
  { provider: "gmail", label: "Gmail", icon: "mail" },
  { provider: "google_calendar", label: "Calendar", icon: "calendar" },
  { provider: "slack", label: "Slack", icon: "message-square" },
  { provider: "google_drive", label: "Drive", icon: "hard-drive" }
];

const DEMO_BRIEF = {
  headline: "Light meeting day — tackle the proposal before lunch",
  priorities: [
    { title: "Reply to partnership proposal", why: "Sarah from Acme has been waiting 2 days", step: "Draft a response" },
    { title: "Review Q3 LTV report", why: "John needs it for Friday's board meeting", step: "Pull numbers from analytics" },
    { title: "Prepare for 2pm design review", why: "Mike left comments on the mockups", step: "Review feedback in Figma" }
  ],
  schedule: ["9:00 — Team standup", "14:00 — Design review", "16:30 — 1:1 with manager"],
  note: "You have a 3-hour focus block this morning. Use it for the proposal."
};

const DEMO_PROMPTS = [
  "What are my open items?",
  "What's on my calendar today?",
  "What needs my reply?",
  "How should I prioritize today?"
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
    <View style={{ gap: spacing.lg, flex: 1 }}>
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

      <View style={{ alignItems: "center", gap: spacing.sm }}>
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

      {/* Step 0: Demo brief — show value first */}
      {step === 0 && (
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, textAlign: "center" }}>
            Here's what your morning could look like with Marvin:
          </Text>
          <View
            style={{
              backgroundColor: colors.bgSurface,
              borderRadius: 16,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
              gap: spacing.sm
            }}
          >
            <Text style={{ color: colors.accentGold, fontSize: typography.sizes.md, fontWeight: "700" }}>
              {DEMO_BRIEF.headline}
            </Text>
            {DEMO_BRIEF.priorities.map((p, idx) => (
              <View key={idx} style={{ borderLeftWidth: 2, borderLeftColor: idx === 0 ? colors.danger : colors.accentGold, paddingLeft: spacing.sm }}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm, fontWeight: "600" }}>{p.title}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.xs }}>{p.why}</Text>
                <Text style={{ color: colors.accentGold, fontSize: typography.sizes.xs }}>→ {p.step}</Text>
              </View>
            ))}
            {DEMO_BRIEF.schedule.map((e, idx) => (
              <Text key={idx} style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
                {e}
              </Text>
            ))}
            <View style={{ backgroundColor: colors.accentGoldTint, borderRadius: 8, padding: spacing.xs }}>
              <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.xs }}>
                💡 {DEMO_BRIEF.note}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Step 1: Try the assistant */}
      {step === 1 && (
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.md, textAlign: "center" }}>
            Marvin answers questions about your day using real context from your connected tools.
          </Text>
          <View style={{ gap: spacing.xs }}>
            {DEMO_PROMPTS.map((prompt, idx) => (
              <View
                key={idx}
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
                <Feather name="message-circle" size={16} color={colors.accentGold} />
                <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm, flex: 1 }}>
                  "{prompt}"
                </Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={onRunDemo}
            disabled={isBusy}
            style={{
              backgroundColor: colors.accentGoldTint,
              borderRadius: 14,
              paddingVertical: spacing.sm,
              alignItems: "center",
              opacity: isBusy ? 0.6 : 1
            }}
          >
            <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm, fontWeight: "600" }}>
              {isBusy ? "Loading demo..." : "Try with demo data"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Step 2: Connect tools */}
      {step === 2 && (
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.md, textAlign: "center" }}>
            Connect your tools so Marvin can work with your real data.
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
        </View>
      )}

      {/* Step 3: Privacy */}
      {step === 3 && (
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
          <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
            <Feather name="shield" size={16} color={colors.success} style={{ marginTop: 3 }} />
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.md, flex: 1, lineHeight: 22 }}>
              Marvin never shares your data with third parties. All processing stays within your private workspace.
            </Text>
          </View>
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
          {step < 3 ? (
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
          ) : (
            <Pressable
              onPress={onRunConnected}
              disabled={isBusy}
              style={{
                backgroundColor: colors.accentGold,
                borderRadius: 10,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.xs,
                opacity: isBusy ? 0.6 : 1
              }}
            >
              <Text style={{ color: "#1A1A1C", fontSize: typography.sizes.sm, fontWeight: "600" }}>
                {isBusy ? "Setting up..." : "Get started"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
