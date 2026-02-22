import { useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";

import type { IntegrationProvider } from "@pia/shared";
import { slackEmojiToUnicode } from "@pia/shared";

import { AppHeader } from "../components/AppHeader";
import { useTheme } from "../theme/ThemeProvider";

const providerLogos: Partial<Record<IntegrationProvider, ImageSourcePropType>> = {
  slack: require("../../assets/images/slack.png"),
  gmail: require("../../assets/images/gmail.png"),
  google_drive: require("../../assets/images/drive.png"),
  google_calendar: require("../../assets/images/google_calendar.png"),
  onedrive: require("../../assets/images/Onedrive.png"),
  dropbox: require("../../assets/images/Dropbox.png")
};

function sanitizeForDisplay(raw: string): string {
  return raw
    .replace(/<@[A-Z0-9]+>/g, "a team member")
    .replace(/<#[A-Z0-9]+\|[^>]+>/g, (m) => m.split("|")[1] ?? "a channel")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function displaySlackText(raw: string): string {
  return slackEmojiToUnicode(sanitizeForDisplay(raw));
}

function formatItemDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type ItemStatus = "done" | "still_due" | "reply" | null;

export interface OpenItem {
  id: string;
  title: string;
  summary: string;
  provider: IntegrationProvider;
  sender?: string;
  dateIso?: string;
  sourceRef?: string;
}

function buildOpenInAppUrl(provider: IntegrationProvider, sourceRef: string | undefined): string | null {
  if (!sourceRef?.trim()) return null;
  const parts = sourceRef.split(":");
  if (provider === "slack") {
    const channelId = parts[0];
    if (channelId) return `https://slack.com/app_redirect?channel=${encodeURIComponent(channelId)}`;
  }
  if (provider === "gmail") {
    const threadId = parts[0];
    if (threadId) return `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(threadId)}`;
  }
  return null;
}

interface ReviewItemsScreenProps {
  visible: boolean;
  onClose: () => void;
  openItems: OpenItem[];
  itemStatuses: Record<string, ItemStatus>;
  getItemStatus: (id: string) => ItemStatus;
  setItemStatus: (id: string, status: ItemStatus) => void;
}

export function ReviewItemsScreen({
  visible,
  onClose,
  openItems,
  itemStatuses,
  getItemStatus,
  setItemStatus
}: ReviewItemsScreenProps) {
  const { colors, spacing, typography } = useTheme();
  const [selectedItem, setSelectedItem] = useState<OpenItem | null>(null);

  const openInAppUrl = selectedItem
    ? buildOpenInAppUrl(selectedItem.provider, selectedItem.sourceRef)
    : null;

  async function handleOpenInApp() {
    if (openInAppUrl) {
      const supported = await Linking.canOpenURL(openInAppUrl);
      if (supported) {
        await Linking.openURL(openInAppUrl);
      }
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
        <View style={{ paddingHorizontal: 28, paddingTop: 70, paddingBottom: spacing.md }}>
          <AppHeader
            title="Review items"
            subtitle={`${openItems.length} open`}
            onBack={onClose}
            backLabel="Done"
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: spacing.sm }}>
            {openItems.map((item) => {
              const logoSource = providerLogos[item.provider];
              const request = displaySlackText(item.title || item.summary || "");
              const sender = item.sender ? displaySlackText(item.sender) : null;
              const date = formatItemDate(item.dateIso);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedItem(item)}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    padding: spacing.md,
                    gap: spacing.sm,
                    backgroundColor: colors.bgSurfaceAlt
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
                    {logoSource ? (
                      <Image
                        source={logoSource}
                        style={{ width: 28, height: 28, borderRadius: 8 }}
                        resizeMode="contain"
                      />
                    ) : null}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}
                        numberOfLines={4}
                        ellipsizeMode="tail"
                      >
                        {request}
                      </Text>
                      <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm, marginTop: 4 }}>
                        {sender ?? "—"}
                        {date ? ` · ${date}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                    <Pressable
                      onPress={() => {
                        const next = getItemStatus(item.id) === "done" ? null : "done";
                        setItemStatus(item.id, next);
                        if (next === "done") setSelectedItem(null);
                      }}
                      style={{
                        borderWidth: 1,
                        borderColor: getItemStatus(item.id) === "done" ? colors.success : colors.border,
                        borderRadius: 999,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xxs,
                        backgroundColor:
                          getItemStatus(item.id) === "done" ? colors.success + "20" : "transparent"
                      }}
                    >
                      <Text
                        style={{
                          color: getItemStatus(item.id) === "done" ? colors.success : colors.textPrimary,
                          fontSize: typography.sizes.sm
                        }}
                      >
                        Done
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setItemStatus(
                          item.id,
                          getItemStatus(item.id) === "still_due" ? null : "still_due"
                        )
                      }
                      style={{
                        borderWidth: 1,
                        borderColor:
                          getItemStatus(item.id) === "still_due" ? colors.accentGold : colors.border,
                        borderRadius: 999,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xxs,
                        backgroundColor:
                          getItemStatus(item.id) === "still_due" ? colors.accentGoldTint : "transparent"
                      }}
                    >
                      <Text
                        style={{
                          color:
                            getItemStatus(item.id) === "still_due" ? colors.accentGold : colors.textPrimary,
                          fontSize: typography.sizes.sm
                        }}
                      >
                        Still due
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setItemStatus(item.id, getItemStatus(item.id) === "reply" ? null : "reply")
                      }
                      style={{
                        borderWidth: 1,
                        borderColor: getItemStatus(item.id) === "reply" ? colors.info : colors.border,
                        borderRadius: 999,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xxs,
                        backgroundColor:
                          getItemStatus(item.id) === "reply" ? colors.info + "20" : "transparent"
                      }}
                    >
                      <Text
                        style={{
                          color: getItemStatus(item.id) === "reply" ? colors.info : colors.textPrimary,
                          fontSize: typography.sizes.sm
                        }}
                      >
                        Reply
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Modal
          visible={selectedItem != null}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedItem(null)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              padding: spacing.lg
            }}
            onPress={() => setSelectedItem(null)}
          >
            {selectedItem && (
              <Pressable
                style={{
                  backgroundColor: colors.bgSurface,
                  borderRadius: 20,
                  padding: spacing.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  maxHeight: "85%"
                }}
                onPress={(e) => e.stopPropagation()}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    marginBottom: spacing.md
                  }}
                >
                  {providerLogos[selectedItem.provider] ? (
                    <Image
                      source={providerLogos[selectedItem.provider]!}
                      style={{ width: 32, height: 32, borderRadius: 8 }}
                      resizeMode="contain"
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
                      {selectedItem.sender ? displaySlackText(selectedItem.sender) : "—"}
                      {selectedItem.dateIso ? ` · ${formatItemDate(selectedItem.dateIso)}` : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelectedItem(null)}>
                    <Text style={{ color: colors.accentGold, fontSize: typography.sizes.md }}>
                      Close
                    </Text>
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={true}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.sizes.md,
                      lineHeight: 24
                    }}
                  >
                    {displaySlackText(selectedItem.title)}
                  </Text>
                  {selectedItem.summary && selectedItem.summary !== selectedItem.title && (
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.sizes.sm,
                        marginTop: spacing.sm,
                        lineHeight: 22
                      }}
                    >
                      {displaySlackText(selectedItem.summary)}
                    </Text>
                  )}
                </ScrollView>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: spacing.sm,
                    marginTop: spacing.md
                  }}
                >
                  {openInAppUrl && (
                    <Pressable
                      onPress={() => void handleOpenInApp()}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.xs,
                        borderWidth: 1,
                        borderColor: colors.accentGold,
                        borderRadius: 999,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs,
                        backgroundColor: colors.accentGoldTint
                      }}
                    >
                      <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
                        Open in {selectedItem.provider === "slack" ? "Slack" : selectedItem.provider === "gmail" ? "Gmail" : "app"}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => {
                      setItemStatus(
                        selectedItem.id,
                        getItemStatus(selectedItem.id) === "done" ? null : "done"
                      );
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor:
                        getItemStatus(selectedItem.id) === "done" ? colors.success : colors.border,
                      borderRadius: 999,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      backgroundColor:
                        getItemStatus(selectedItem.id) === "done" ? colors.success + "20" : "transparent"
                    }}
                  >
                    <Text
                      style={{
                        color:
                          getItemStatus(selectedItem.id) === "done" ? colors.success : colors.textPrimary,
                        fontSize: typography.sizes.sm
                      }}
                    >
                      Done
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setItemStatus(
                        selectedItem.id,
                        getItemStatus(selectedItem.id) === "still_due" ? null : "still_due"
                      );
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor:
                        getItemStatus(selectedItem.id) === "still_due" ? colors.accentGold : colors.border,
                      borderRadius: 999,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      backgroundColor:
                        getItemStatus(selectedItem.id) === "still_due" ? colors.accentGoldTint : "transparent"
                    }}
                  >
                    <Text
                      style={{
                        color:
                          getItemStatus(selectedItem.id) === "still_due"
                            ? colors.accentGold
                            : colors.textPrimary,
                        fontSize: typography.sizes.sm
                      }}
                    >
                      Still due
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setItemStatus(
                        selectedItem.id,
                        getItemStatus(selectedItem.id) === "reply" ? null : "reply"
                      );
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor:
                        getItemStatus(selectedItem.id) === "reply" ? colors.info : colors.border,
                      borderRadius: 999,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      backgroundColor:
                        getItemStatus(selectedItem.id) === "reply" ? colors.info + "20" : "transparent"
                    }}
                  >
                    <Text
                      style={{
                        color:
                          getItemStatus(selectedItem.id) === "reply" ? colors.info : colors.textPrimary,
                        fontSize: typography.sizes.sm
                      }}
                    >
                      Reply
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            )}
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}
