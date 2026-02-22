import { useState } from "react";
import { Image, ImageSourcePropType, Linking, Pressable, Text, View } from "react-native";
import {
  integrationProviderOrder,
  integrationProviderRegistry,
  type IntegrationAccount,
  type IntegrationConsent,
  type IntegrationProvider,
  type WorkflowDefinition,
  type WorkflowTemplate
} from "@pia/shared";

import { AppHeader } from "../../components/AppHeader";
import { EmptyStateCard } from "../../components/EmptyStateCard";
import { SectionBlock } from "../../components/SectionBlock";
import { useAppState } from "../../state/AppState";
import { useAuthState } from "../../state/AuthState";
import { useTheme } from "../../theme/ThemeProvider";

type ManageSubTab = "integrations" | "workflows" | "history" | "settings";

const localLogos: Partial<Record<IntegrationProvider, ImageSourcePropType>> = {
  slack: require("../../../assets/images/slack.png"),
  gmail: require("../../../assets/images/gmail.png"),
  google_drive: require("../../../assets/images/drive.png"),
  google_calendar: require("../../../assets/images/google_calendar.png"),
  onedrive: require("../../../assets/images/Onedrive.png"),
  dropbox: require("../../../assets/images/Dropbox.png"),
  healthkit: require("../../../assets/images/Apple_health.png")
};

function getStatusMeta(status: IntegrationAccount["status"]) {
  switch (status) {
    case "connected":
      return { label: "Connected", color: "#4ADE80" };
    case "token_expired":
      return { label: "Error", color: "#F87171" };
    case "sync_lagging":
      return { label: "Syncing", color: "#60A5FA" };
    default:
      return { label: "Disconnected", color: "#9A9A9C" };
  }
}

function IntegrationCard({
  provider,
  integration,
  onConnect,
  onDisconnect,
  isLoading
}: {
  provider: IntegrationProvider;
  integration: IntegrationAccount;
  onConnect: (provider: IntegrationProvider) => Promise<string>;
  onDisconnect: (provider: IntegrationProvider) => Promise<void>;
  isLoading: boolean;
}) {
  const { colors, spacing, typography, radius } = useTheme();
  const metadata = integrationProviderRegistry[provider];
  const statusMeta = getStatusMeta(integration.status);
  const logoSource = localLogos[provider] ?? { uri: metadata.logoUri };
  const isConnected = integration.status === "connected";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: spacing.sm,
        gap: spacing.sm,
        minHeight: 56
      }}
    >
      <Image
        source={logoSource}
        style={{ width: 32, height: 32, borderRadius: 8 }}
        resizeMode="contain"
      />
      <View style={{ flex: 1, justifyContent: "center", gap: 2 }}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }} numberOfLines={1}>
          {metadata.displayName}
        </Text>
        <Text style={{ color: statusMeta.color, fontSize: typography.sizes.xs }}>
          {statusMeta.label}
        </Text>
      </View>
      <Pressable
        onPress={async () => {
          if (isConnected) {
            await onDisconnect(provider);
          } else {
            const url = await onConnect(provider);
            await Linking.openURL(url);
          }
        }}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs
        }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
          {isLoading ? "..." : isConnected ? "Disconnect" : "Connect"}
        </Text>
      </Pressable>
    </View>
  );
}

function ConsentScopeRow({
  consent,
  onToggle
}: {
  consent: IntegrationConsent;
  onToggle: (next: IntegrationConsent) => Promise<void>;
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: spacing.md,
        gap: spacing.xs
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>{consent.provider}</Text>
      <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
        {`Metadata only: ${consent.metadataOnly ? "yes" : "no"} • scopes: ${consent.scopes.join(", ") || "none"}`}
      </Text>
      <Pressable
        onPress={() =>
          void onToggle({
            ...consent,
            enabled: !consent.enabled,
            updatedAtIso: new Date().toISOString()
          })
        }
        style={{
          alignSelf: "flex-start",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 999,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs
        }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
          {consent.enabled ? "Disable consent" : "Enable consent"}
        </Text>
      </Pressable>
    </View>
  );
}

function createTemplateWorkflow(template: WorkflowTemplate): WorkflowDefinition {
  const nowIso = new Date().toISOString();
  return {
    id: `wf-${template}-${Date.now()}`,
    name:
      template === "daily_digest"
        ? "Daily Digest"
        : template === "follow_up_summary"
          ? "Follow-up Summary"
          : "Today Focus List",
    enabled: true,
    selectedProviders: ["gmail", "google_calendar", "weatherkit"],
    template,
    trigger: {
      type: "schedule",
      schedule: {
        cadence: "daily",
        timeLocal: "07:00",
        timezone: "Europe/Copenhagen"
      }
    },
    deliveryChannels: ["in_app"],
    createdAtIso: nowIso,
    updatedAtIso: nowIso
  };
}

export function ManageTabScreen() {
  const {
    integrationAccounts,
    startIntegrationConnect,
    disconnectIntegration,
    latestContext,
    isLoading,
    consents,
    upsertConsent,
    workflows,
    runWorkflowNow,
    upsertWorkflow,
    workflowRuns,
    selectedRunDetails,
    loadRunDetails,
    runContextPipelineNow,
    userTimezone,
    setUserTimezone
  } = useAppState();
  const { signOut } = useAuthState();
  const { colors, spacing, typography, radius } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<ManageSubTab>("integrations");

  const subTabs: { key: ManageSubTab; label: string }[] = [
    { key: "integrations", label: "Apps" },
    { key: "workflows", label: "Flows" },
    { key: "history", label: "History" },
    { key: "settings", label: "Settings" }
  ];

  const onConnect = (provider: IntegrationProvider) => startIntegrationConnect(provider);

  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="Manage" subtitle="Integrations, workflows, and settings" />

      <View
        style={{
          flexDirection: "row",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.pill,
          backgroundColor: colors.bgSurface,
          padding: spacing.xxs,
          gap: spacing.xxs
        }}
      >
        {subTabs.map((tab) => {
          const isActive = tab.key === activeSubTab;
          const tint = isActive ? colors.accentGold : colors.textTertiary;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveSubTab(tab.key)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: isActive ? colors.accentGoldTint : "transparent"
              }}
            >
              <Text style={{ color: tint, fontSize: typography.sizes.sm }} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeSubTab === "integrations" && (
        <SectionBlock title="Integrations">
          {integrationAccounts.filter((a) => a.status === "connected").length === 0 ? (
            <EmptyStateCard
              title="No integrations connected"
              body="Connect your tools to unlock prioritized insights."
              actions={[
                {
                  label: "Connect your first integration",
                  onPress: async () => {
                    const url = await startIntegrationConnect("slack");
                    await Linking.openURL(url);
                  }
                }
              ]}
            />
          ) : null}
          <View style={{ gap: spacing.sm }}>
            {integrationProviderOrder.map((provider) => {
              const metadata = integrationProviderRegistry[provider];
              const integration =
                integrationAccounts.find((item) => item.provider === provider) ??
                ({
                  provider,
                  status: "disconnected",
                  scopes: metadata.defaultScopes,
                  metadataOnly: true,
                  lastSyncAtIso: new Date().toISOString()
                } satisfies IntegrationAccount);
              return (
                <IntegrationCard
                  key={provider}
                  provider={provider}
                  integration={integration}
                  onConnect={onConnect}
                  onDisconnect={disconnectIntegration}
                  isLoading={isLoading}
                />
              );
            })}
          </View>
        </SectionBlock>
      )}

      {activeSubTab === "workflows" && (
        <>
          <SectionBlock title="Active Workflows">
            {workflows.length === 0 ? (
              <EmptyStateCard
                title="No workflows yet"
                body="Start with a template and run your first automation in under a minute."
                actions={[
                  {
                    label: "Create daily digest",
                    onPress: () => void upsertWorkflow(createTemplateWorkflow("daily_digest"))
                  },
                  {
                    label: "Create follow-up summary",
                    onPress: () => void upsertWorkflow(createTemplateWorkflow("follow_up_summary"))
                  }
                ]}
              />
            ) : (
              workflows.map((workflow) => (
                <View
                  key={workflow.id}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    padding: spacing.md,
                    gap: spacing.xs
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
                    {workflow.name}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
                    {`${workflow.trigger.schedule.cadence} at ${workflow.trigger.schedule.timeLocal} (${workflow.trigger.schedule.timezone})`}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
                    {`Sources: ${workflow.selectedProviders.join(", ")}`}
                  </Text>
                  <Pressable
                    onPress={() => void runWorkflowNow(workflow.id)}
                    style={{
                      alignSelf: "flex-start",
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 999,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs
                    }}
                  >
                    <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                      {isLoading ? "Running..." : "Run now"}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </SectionBlock>
          <Pressable
            onPress={() => void runContextPipelineNow()}
            style={{
              alignSelf: "flex-start",
              borderWidth: 1,
              borderColor: colors.accentGold,
              borderRadius: 999,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs
            }}
          >
            <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
              {isLoading ? "Running..." : "Refresh context"}
            </Text>
          </Pressable>
        </>
      )}

      {activeSubTab === "history" && (
        <SectionBlock title="History">
          {workflowRuns.length === 0 ? (
            <EmptyStateCard
              title="No workflow runs yet"
              body="Run the context pipeline or execute a workflow to populate your timeline."
            />
          ) : (
            (() => {
              const byDay = new Map<string, typeof workflowRuns>();
              for (const run of workflowRuns) {
                const dayKey = run.finishedAtIso.slice(0, 10);
                const list = byDay.get(dayKey) ?? [];
                list.push(run);
                byDay.set(dayKey, list);
              }
              const sortedDays = Array.from(byDay.keys()).sort((a, b) => (a > b ? -1 : 1));
              return sortedDays.map((dayKey) => {
                const runs = byDay.get(dayKey)!;
                const dateLabel =
                  dayKey === new Date().toISOString().slice(0, 10)
                    ? "Today"
                    : dayKey ===
                        new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                      ? "Yesterday"
                      : new Date(dayKey).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric"
                        });
                return (
                  <View key={dayKey} style={{ gap: spacing.sm }}>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.sizes.sm,
                        fontWeight: "600",
                        marginTop: spacing.xs
                      }}
                    >
                      {dateLabel}
                    </Text>
                    {runs.map((run) => {
                      const workflow = workflows.find((item) => item.id === run.workflowId);
                      return (
                        <Pressable
                          key={run.id}
                          onPress={() => void loadRunDetails(run.id)}
                          style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 16,
                            padding: spacing.md,
                            gap: spacing.xs
                          }}
                        >
                          <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
                            {workflow?.name ?? run.workflowId}
                          </Text>
                          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
                            {`Status: ${run.status} • ${new Date(run.finishedAtIso).toLocaleTimeString()}`}
                          </Text>
                          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
                            {`Delivered via: ${run.deliveredChannels.join(", ") || "none"}`}
                          </Text>
                          {run.status === "failed" && run.errorMessage ? (
                            <Text style={{ color: colors.danger, fontSize: typography.sizes.sm }}>
                              {run.errorMessage}
                            </Text>
                          ) : null}
                          <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
                            Tap for execution details
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              });
            })()
          )}
        </SectionBlock>
      )}

      {activeSubTab === "history" && selectedRunDetails ? (
        <SectionBlock title="Run Details">
          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
            {`Integrations: ${(selectedRunDetails.integrationsUsed ?? []).join(", ") || "none"}`}
          </Text>
          {(selectedRunDetails.stageResults ?? []).map((stage) => (
            <Text
              key={`${selectedRunDetails.id}-${stage.stage}`}
              style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}
            >
              {`${stage.stage}: ${stage.status} (${stage.message})`}
            </Text>
          ))}
        </SectionBlock>
      ) : null}

      {activeSubTab === "settings" && (
        <>
          <SectionBlock title="Timezone" rightLabel="For calendar events">
            <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm, marginBottom: spacing.sm }}>
              Used when creating calendar events (e.g. "Add blocker tomorrow 13-14").
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              {[
                "Europe/Copenhagen",
                "Europe/London",
                "Europe/Berlin",
                "America/New_York",
                "America/Los_Angeles",
                "UTC"
              ].map((tz) => {
                const isActive = userTimezone === tz;
                return (
                  <Pressable
                    key={tz}
                    onPress={() => void setUserTimezone(tz)}
                    style={{
                      borderWidth: 1,
                      borderColor: isActive ? colors.accentGold : colors.border,
                      borderRadius: 999,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      backgroundColor: isActive ? colors.accentGoldTint : "transparent"
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? colors.accentGold : colors.textPrimary,
                        fontSize: typography.sizes.sm
                      }}
                    >
                      {tz.replace("_", " ")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionBlock>
          <SectionBlock title="Consent and scope controls">
            {consents.map((consent) => (
              <ConsentScopeRow
                key={consent.provider}
                consent={consent}
                onToggle={async (next) => {
                  await upsertConsent(next);
                }}
              />
            ))}
          </SectionBlock>
          <SectionBlock title="Notifications" rightLabel="Quiet hours">
            <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
              Daily digest at 07:00. Follow-up sweep at 16:30. Quiet hours from 22:00 to 06:30.
            </Text>
          </SectionBlock>
          <Pressable
            onPress={() => void signOut()}
            style={{
              alignSelf: "flex-start",
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 999,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>Sign out</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
