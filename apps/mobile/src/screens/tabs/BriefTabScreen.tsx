import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { Feather } from "@expo/vector-icons";

import type { ExternalItem, IntegrationProvider, OutstandingItem } from "@pia/shared";
import { slackEmojiToUnicode } from "@pia/shared";

function triggerHaptic() {
  try {
    if (Platform.OS === "web") return;
    const Haptics = require("expo-haptics");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics not available
  }
}

import { AppHeader } from "../../components/AppHeader";
import { SenderAvatar } from "../../components/SenderAvatar";
import { SkeletonBrief } from "../../components/Skeleton";
import { useItemStatuses } from "../../hooks/useItemStatuses";
import { ReviewItemsScreen, type OpenItem } from "../../screens/ReviewItemsScreen";
import { useAppState } from "../../state/AppState";
import { createApiClient } from "../../services/apiClient";
import { useAuthState } from "../../state/AuthState";
import { useTheme } from "../../theme/ThemeProvider";

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

const providerLogos: Partial<Record<IntegrationProvider, ImageSourcePropType>> = {
  slack: require("../../../assets/images/slack.png"),
  gmail: require("../../../assets/images/gmail.png"),
  google_drive: require("../../../assets/images/drive.png"),
  google_calendar: require("../../../assets/images/google_calendar.png"),
  onedrive: require("../../../assets/images/Onedrive.png"),
  dropbox: require("../../../assets/images/Dropbox.png")
};

const PROVIDER_DISPLAY_NAMES: Record<IntegrationProvider, string> = {
  slack: "Slack",
  gmail: "Gmail",
  google_drive: "Google Drive",
  google_calendar: "Google Calendar",
  onedrive: "OneDrive",
  dropbox: "Dropbox",
  healthkit: "Health",
  weatherkit: "Weather"
};

const COHORT_ORDER: IntegrationProvider[] = [
  "slack",
  "gmail",
  "google_calendar",
  "google_drive",
  "onedrive",
  "dropbox",
  "healthkit",
  "weatherkit"
];

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getDisplayName(
  user: { user_metadata?: Record<string, unknown>; email?: string } | null
) {
  const metadata = user?.user_metadata ?? {};
  const rawName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    (typeof metadata.first_name === "string" && metadata.first_name) ||
    null;
  if (rawName?.trim()) return rawName.trim();
  if (user?.email) return user.email.split("@")[0];
  return "there";
}

function formatUpdatedAt(generatedAtIso: string | undefined): string {
  if (!generatedAtIso) return "";
  const diffMs = Date.now() - new Date(generatedAtIso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Updated just now";
  if (diffMins < 60) return `Updated ${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  return `Updated ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
}

function formatItemDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return "Just now";
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const totalHours = Math.floor(diffMins / 60);
  if (totalHours < 24) return `${totalHours}h ago`;
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  if (days < 2) return remainingHours > 0 ? `1 day ${remainingHours}h ago` : "1 day ago";
  if (days < 7) return remainingHours > 0 ? `${days} days ${remainingHours}h ago` : `${days} days ago`;
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  if (weeks < 4) return remainingDays > 0 ? `${weeks}w ${remainingDays}d ago` : `${weeks}w ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toOpenItem(
  item: ExternalItem | OutstandingItem,
  externalItems?: ExternalItem[]
): OpenItem {
  if ("id" in item && "summary" in item) {
    const ext = item as ExternalItem;
    return {
      id: ext.id,
      title: ext.title,
      summary: ext.summary,
      provider: ext.provider,
      sender: ext.sender,
      dateIso: ext.updatedAtIso ?? ext.createdAtIso,
      sourceRef: ext.sourceRef
    };
  }
  const out = item as OutstandingItem;
  const ext = externalItems?.find((e) => e.id === out.itemId);
  return {
    id: out.itemId,
    title: out.title,
    summary: ext?.summary ?? out.explainWhy,
    provider: out.provider,
    sender: ext?.sender,
    dateIso: ext?.updatedAtIso ?? ext?.createdAtIso,
    sourceRef: ext?.sourceRef
  };
}

function SwipeableCard({
  children,
  onSwipeRight,
  onSwipeLeft
}: {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
}) {
  const { colors, spacing } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        translateX.setValue(Math.max(-80, Math.min(80, g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 60 && onSwipeRight) {
          Animated.timing(translateX, { toValue: 100, duration: 150, useNativeDriver: true }).start(() => {
            onSwipeRight();
            translateX.setValue(0);
          });
        } else if (g.dx < -60 && onSwipeLeft) {
          Animated.timing(translateX, { toValue: -100, duration: 150, useNativeDriver: true }).start(() => {
            onSwipeLeft();
            translateX.setValue(0);
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      }
    })
  ).current;

  return (
    <View style={{ position: "relative", overflow: "hidden", borderRadius: 14 }}>
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 80, backgroundColor: colors.success + "30", borderRadius: 14, justifyContent: "center", paddingLeft: spacing.md }}>
        <Feather name="check" size={20} color={colors.success} />
      </View>
      <View style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 80, backgroundColor: colors.info + "30", borderRadius: 14, justifyContent: "center", alignItems: "flex-end", paddingRight: spacing.md }}>
        <Feather name="corner-up-left" size={20} color={colors.info} />
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export function BriefTabScreen() {
  const {
    latestContext,
    dailyBrief,
    setActiveTab,
    runContextPipelineNow,
    integrationAccounts,
    externalItems,
    isLoading,
    suggestions,
    replyToEmail,
    replyToSlack,
    sendAssistantMessage,
    startAssistantChat
  } = useAppState();
  const { user } = useAuthState();
  const accessToken = user ? (user as unknown as { access_token?: string }).access_token : undefined;
  const { colors, spacing, typography, providerColors } = useTheme();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OpenItem | null>(null);
  const [doneFolderExpanded, setDoneFolderExpanded] = useState(false);
  const [selectedItemFromDone, setSelectedItemFromDone] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [contextPackages, setContextPackages] = useState<Array<{ id: string; triggerType: string; title: string; summary: string; startsAtIso: string; evidence: Array<{ id: string; kind: string; title: string; summary: string | null; reason: string; provider: string | null }> }>>([]);
  const { itemStatuses, setItemStatus: rawSetItemStatus, getItemStatus } = useItemStatuses(user?.id ?? "");

  const setItemStatus = (id: string, status: import("../../hooks/useItemStatuses").ItemStatus) => {
    triggerHaptic();
    rawSetItemStatus(id, status);
  };

  const isFirstTime = !latestContext && integrationAccounts.filter((a) => a.status === "connected").length === 0;
  const digestItems = latestContext?.outstandingItems ?? latestContext?.digest?.items ?? [];
  const digestIds = new Set(
    digestItems.map((i) => ("itemId" in i ? i.itemId : (i as { id?: string }).id ?? ""))
  );

  const fromDigest = digestItems.map((item) => toOpenItem(item, externalItems));
  const fromExternal = externalItems
    .filter((item) => item.isOutstanding && !digestIds.has(item.id))
    .map((item) => toOpenItem(item));

  const allItems: OpenItem[] = [...fromDigest, ...fromExternal];
  const openItems = allItems.filter((item) => getItemStatus(item.id) !== "done");
  const doneItems = allItems.filter((item) => getItemStatus(item.id) === "done");

  const greeting = getTimeGreeting();
  const displayName = getDisplayName(user);
  const updatedLabel = isFirstTime ? "" : formatUpdatedAt(latestContext?.generatedAtIso);
  const hasOpenItems = openItems.length > 0;
  const { height: screenHeight } = useWindowDimensions();

  type UrgencyKey = "needs_reply" | "time_sensitive" | "review";
  const URGENCY_LABELS: Record<UrgencyKey, string> = {
    needs_reply: "Needs reply",
    time_sensitive: "Time-sensitive",
    review: "Review"
  };
  const URGENCY_ICONS: Record<UrgencyKey, "message-circle" | "clock" | "inbox"> = {
    needs_reply: "message-circle",
    time_sensitive: "clock",
    review: "inbox"
  };
  const URGENCY_COLORS: Record<UrgencyKey, string> = {
    needs_reply: colors.danger,
    time_sensitive: colors.accentGold,
    review: colors.textSecondary
  };

  const itemsByUrgency = openItems.reduce(
    (acc, item) => {
      const ext = externalItems.find((e) => e.id === item.id);
      let urgency: UrgencyKey = "review";
      if (ext?.requiresReply) urgency = "needs_reply";
      else if (ext?.provider === "google_calendar") urgency = "time_sensitive";
      else if (ext?.tags?.includes("urgent")) urgency = "time_sensitive";
      if (!acc[urgency]) acc[urgency] = [];
      acc[urgency].push(item);
      return acc;
    },
    {} as Record<UrgencyKey, OpenItem[]>
  );

  const urgencyOrder: UrgencyKey[] = ["needs_reply", "time_sensitive", "review"];
  const cohorts = urgencyOrder
    .filter((u) => (itemsByUrgency[u]?.length ?? 0) > 0)
    .map((urgency) => ({
      urgency,
      label: URGENCY_LABELS[urgency],
      icon: URGENCY_ICONS[urgency],
      color: URGENCY_COLORS[urgency],
      items: (itemsByUrgency[urgency] ?? []).slice(0, 5),
      totalCount: itemsByUrgency[urgency]?.length ?? 0
    }));

  const CARD_HEIGHT = 88;
  const stackHeightFor = (n: number) => CARD_HEIGHT * (1 + 0.2 * Math.max(0, n - 1));
  const openItemsCardHeight = Math.round(screenHeight * 0.75);

  const headline = dailyBrief?.headline ?? latestContext?.summary;
  const briefPriorities = dailyBrief?.top_priorities ?? [];
  const briefSchedule = dailyBrief?.schedule ?? [];
  const briefNote = dailyBrief?.note;

  if (isLoading && !latestContext && externalItems.length === 0) {
    return <SkeletonBrief />;
  }

  const calendarToday = externalItems
    .filter((i) => i.provider === "google_calendar" && i.type === "calendar_event")
    .filter((i) => {
      const m = i.summary?.match(/^([\d-]+)/);
      return m && m[1] === new Date().toISOString().slice(0, 10);
    })
    .slice(0, 5);

  const needsReply = openItems.filter((i) => {
    const ext = externalItems.find((e) => e.id === i.id);
    return ext?.requiresReply;
  });

  const whatChanged = latestContext?.whatChanged ?? [];
  const topBlockers = latestContext?.topBlockers ?? [];

  return (
    <View style={{ gap: spacing.lg }}>
      <AppHeader
        title={`${greeting}, ${displayName}`}
        subtitle={(headline ?? updatedLabel) || "Personal AI Assistant"}
        compact
        showLiveIndicator={updatedLabel === "Updated just now"}
      />

      {allItems.length > 0 && (
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
              {doneItems.length}/{allItems.length} cleared
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.xs }}>
              {allItems.length - doneItems.length} remaining
            </Text>
          </View>
          <View style={{ height: 3, backgroundColor: colors.borderSubtle, borderRadius: 2, overflow: "hidden" }}>
            <View
              style={{
                height: 3,
                borderRadius: 2,
                backgroundColor: doneItems.length === allItems.length ? colors.success : colors.accentGold,
                width: `${allItems.length > 0 ? Math.round((doneItems.length / allItems.length) * 100) : 0}%`
              }}
            />
          </View>
        </View>
      )}

      {/* Intelligence Hero — LLM-generated daily brief */}
      {(briefPriorities.length > 0 || briefNote) && (
        <View
          style={{
            backgroundColor: colors.bgSurfaceAlt,
            borderRadius: 12,
            padding: spacing.lg,
            gap: spacing.md
          }}
        >
          {briefNote && (
            <View style={{ flexDirection: "row", gap: spacing.sm, backgroundColor: colors.accentGoldMuted, borderRadius: 8, padding: spacing.sm, alignItems: "flex-start" }}>
              <Feather name="zap" size={14} color={colors.accentGold} style={{ marginTop: 2 }} />
              <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md, lineHeight: typography.sizes.md * 1.6, flex: 1 }}>
                {briefNote}
              </Text>
            </View>
          )}

          {briefPriorities.length > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: "600" }}>
                Marvin's priorities for today
              </Text>
              {briefPriorities.slice(0, 3).map((p, idx) => (
                <View
                  key={idx}
                  style={{
                    borderLeftWidth: 2,
                    borderLeftColor: idx === 0 ? colors.danger : idx === 1 ? colors.accentGold : colors.textTertiary,
                    paddingLeft: spacing.sm,
                    gap: 1
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm, fontWeight: "600" }}>
                    {p.title}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.xs }}>
                    {p.why}
                  </Text>
                  <Text style={{ color: colors.accentGold, fontSize: typography.sizes.xs }}>
                    → {p.next_step}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {briefSchedule.length > 0 && (
            <View style={{ gap: spacing.xs }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: "600" }}>
                Schedule
              </Text>
              {briefSchedule.slice(0, 4).map((ev, idx) => {
                const timeMatch = ev.start.match(/T(\d{2}:\d{2})/);
                const time = timeMatch ? timeMatch[1] : ev.start;
                const dateMatch = ev.start.match(/^(\d{4}-\d{2}-\d{2})/);
                const today = new Date().toISOString().slice(0, 10);
                const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
                const datePrefix = dateMatch?.[1] === today ? "" : dateMatch?.[1] === tomorrow ? "Tomorrow " : "";
                return (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                    <Text style={{ color: colors.accentGold, fontSize: typography.sizes.xs, fontWeight: "600", width: 72 }}>
                      {datePrefix}{time}
                    </Text>
                    <View style={{ width: 2, height: 12, backgroundColor: colors.accentGold, borderRadius: 1, opacity: 0.3 }} />
                    <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.xs, flex: 1 }} numberOfLines={1}>
                      {ev.title}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

        </View>
      )}

      {contextPackages.length > 0 && (
        <View style={{ gap: spacing.xs }}>
          {contextPackages.map((pkg) => {
            const timeMatch = pkg.startsAtIso.match(/T(\d{2}:\d{2})/);
            const time = timeMatch ? timeMatch[1] : "";
            return (
              <View
                key={pkg.id}
                style={{
                  backgroundColor: colors.bgSurface,
                  borderRadius: 16,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.accentGoldTint,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.info,
                  gap: spacing.xs
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <Feather name={pkg.triggerType === "meeting_prep" ? "calendar" : "clock"} size={14} color={colors.info} />
                  <Text style={{ color: colors.info, fontSize: typography.sizes.xs, fontWeight: "600" }}>
                    {pkg.triggerType === "meeting_prep" ? "Meeting prep" : "Deadline prep"} · {time}
                  </Text>
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm, fontWeight: "600" }}>
                  {pkg.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }} numberOfLines={2}>
                  {pkg.summary}
                </Text>
                {pkg.evidence.length > 0 && (
                  <View style={{ gap: 2 }}>
                    {pkg.evidence.slice(0, 3).map((ev) => (
                      <Text key={ev.id} style={{ color: colors.textTertiary, fontSize: typography.sizes.xs }} numberOfLines={1}>
                        • {ev.title}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {suggestions.length > 0 && (
        <View style={{ gap: spacing.xs }}>
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => {
                if (s.actionType === "reply" && s.itemId) {
                  const item = externalItems.find((e) => e.id === s.itemId);
                  if (item) {
                    setSelectedItem(toOpenItem(item));
                    setSelectedItemFromDone(false);
                    setReplyText("");
                    return;
                  }
                }
                startAssistantChat();
                setActiveTab("assistant");
                void sendAssistantMessage({ question: s.body || s.title });
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                backgroundColor: colors.bgSurfaceAlt,
                borderRadius: 8,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.7 : 1
              })}
            >
              <Feather
                name={s.type === "reply_overdue" ? "alert-circle" : s.type === "meeting_prep" ? "calendar" : "info"}
                size={16}
                color={colors.accentGold}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm, fontWeight: "600" }}>
                  {s.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }} numberOfLines={2}>
                  {s.body}
                </Text>
              </View>
              {s.actionType === "reply" && (
                <View style={{ backgroundColor: colors.accentGold + "18", borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs }}>
                  <Text style={{ color: colors.accentGold, fontSize: typography.sizes.xs, fontWeight: "600" }}>Reply</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <View
        style={{
          backgroundColor: colors.bgSurfaceAlt,
          borderRadius: 12,
          padding: spacing.lg,
          gap: spacing.md,
          ...(hasOpenItems && { maxHeight: openItemsCardHeight })
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.lg, fontWeight: "600" }}>
            Open items{hasOpenItems ? ` (${openItems.length})` : ""}
          </Text>
          {hasOpenItems && (
            <Pressable
              onPress={() => setReviewModalOpen(true)}
              style={({ pressed }) => ({
                borderRadius: 8,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                backgroundColor: colors.accentGoldTint,
                opacity: pressed ? 0.7 : 1
              })}
            >
              <Text style={{ color: colors.accentGold, fontSize: typography.sizes.xs, fontWeight: "500" }}>
                Review all
              </Text>
            </Pressable>
          )}
        </View>

        {!hasOpenItems ? (
          <View style={{ paddingVertical: spacing.lg }}>
            {isFirstTime && !latestContext ? (
              <View style={{ alignItems: "center", gap: spacing.lg }}>
                <Image source={require("../../../assets/images/Marvin_logo.png")} style={{ width: 56, height: 56, opacity: 0.8 }} resizeMode="contain" />
                <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.lg, fontWeight: "600", textAlign: "center" }}>
                  Marvin is ready to work for you
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, textAlign: "center", lineHeight: 20 }}>
                  Connect your tools and Marvin will surface what needs your attention each day.
                </Text>
                <View style={{ gap: spacing.xs, width: "100%" }}>
                  {[
                    { label: "Gmail", icon: "mail" as const, onPress: () => setActiveTab("manage") },
                    { label: "Google Calendar", icon: "calendar" as const, onPress: () => setActiveTab("manage") },
                    { label: "Slack", icon: "message-square" as const, onPress: () => setActiveTab("manage") }
                  ].map((item) => (
                    <Pressable
                      key={item.label}
                      onPress={item.onPress}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.sm,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 14,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        backgroundColor: colors.bgSurface,
                        opacity: pressed ? 0.7 : 1
                      })}
                    >
                      <Feather name={item.icon} size={20} color={colors.accentGold} />
                      <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md, flex: 1 }}>
                        Connect {item.label}
                      </Text>
                      <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  onPress={() => void runContextPipelineNow()}
                  style={({ pressed }) => ({
                    paddingVertical: spacing.xs,
                    opacity: pressed ? 0.6 : 1
                  })}
                >
                  <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
                    or try with demo data
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.md }}>
                <Feather name="check-circle" size={32} color={colors.success} />
                <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.lg, fontWeight: "600" }}>
                  You're all caught up
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, textAlign: "center" }}>
                  New items from your connected apps will appear here.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>
            {cohorts.map(({ urgency, label, icon: urgencyIcon, color: urgencyColor, items, totalCount }, cohortIdx) => {
              const stackHeight = stackHeightFor(items.length);
              return (
                <View key={urgency} style={{ gap: spacing.xs }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs, marginTop: cohortIdx > 0 ? spacing.lg : 0 }}>
                    <Feather name={urgencyIcon} size={14} color={urgencyColor} />
                    <Text style={{ color: urgencyColor, fontSize: typography.sizes.sm, fontWeight: "600", letterSpacing: 0.3 }}>
                      {label}
                    </Text>
                    <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.xs }}>
                      {totalCount}
                    </Text>
                  </View>
                  <View style={{ gap: spacing.xs }}>
                    {items.slice(0, 3).map((item) => {
                      const logoSource = providerLogos[item.provider];
                      const request = displaySlackText(item.title || item.summary || "");
                      const sender = item.sender ? displaySlackText(item.sender) : null;
                      const date = formatItemDate(item.dateIso);
                      return (
                        <SwipeableCard
                          key={item.id}
                          onSwipeRight={() => setItemStatus(item.id, "done")}
                          onSwipeLeft={() => setItemStatus(item.id, "reply")}
                        >
                          <Pressable
                            onPress={() => {
                              setSelectedItem(item);
                              setSelectedItemFromDone(false);
                            }}
                            onLongPress={() => setItemStatus(item.id, "done")}
                            style={({ pressed }) => ({
                              flexDirection: "row",
                              alignItems: "center",
                              borderRadius: 8,
                              paddingVertical: spacing.sm,
                              paddingHorizontal: spacing.md,
                              backgroundColor: pressed ? colors.bgElevated : "transparent",
                              gap: spacing.sm,
                              opacity: pressed ? 0.8 : 1
                            })}
                          >
                            {logoSource ? (
                              <Image source={logoSource} style={{ width: 24, height: 24, borderRadius: 6 }} resizeMode="contain" />
                            ) : (
                              <SenderAvatar sender={item.sender} provider={item.provider} size={24} />
                            )}
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600" }}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                              >
                                {request}
                              </Text>
                              <Text
                                style={{ color: colors.textTertiary, fontSize: typography.sizes.xs, opacity: 0.8 }}
                                numberOfLines={1}
                              >
                                {sender ?? "—"}
                                {date ? ` · ${date}` : ""}
                              </Text>
                            </View>
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                                setSelectedItemFromDone(false);
                                setReplyText("");
                              }}
                              hitSlop={8}
                              style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.5 : 1 })}
                            >
                              <Feather name="corner-up-left" size={14} color={colors.accentGold} />
                            </Pressable>
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                setItemStatus(item.id, "done");
                              }}
                              hitSlop={8}
                              style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.5 : 1 })}
                            >
                              <Feather name="check" size={16} color={colors.textTertiary} />
                            </Pressable>
                          </Pressable>
                        </SwipeableCard>
                      );
                    })}
                    {totalCount > 3 && (
                      <Pressable
                        onPress={() => setReviewModalOpen(true)}
                        style={({ pressed }) => ({
                          alignSelf: "center",
                          paddingVertical: spacing.xs,
                          paddingHorizontal: spacing.md,
                          borderRadius: 999,
                          opacity: pressed ? 0.5 : 0.8
                        })}
                      >
                        <Text style={{ color: colors.accentGold, fontSize: typography.sizes.xs }}>
                          Show all {totalCount} →
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {doneItems.length > 0 && (
          <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
            <Pressable
              onPress={() => setDoneFolderExpanded(!doneFolderExpanded)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.7 : 1
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Feather
                  name={doneFolderExpanded ? "chevron-down" : "chevron-right"}
                  size={18}
                  color={colors.success}
                />
                <Text style={{ color: colors.success, fontSize: typography.sizes.sm, fontWeight: "600" }}>
                  {doneItems.length} cleared today
                </Text>
              </View>
              <Feather name="check-circle" size={14} color={colors.success} style={{ opacity: 0.5 }} />
            </Pressable>
            {doneFolderExpanded && (
              <View style={{ gap: spacing.xs }}>
                {doneItems.map((item) => {
                  const logoSource = providerLogos[item.provider];
                  const request = displaySlackText(item.title || item.summary || "");
                  const sender = item.sender ? displaySlackText(item.sender) : null;
                  const date = formatItemDate(item.dateIso);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setSelectedItem(item);
                        setSelectedItemFromDone(true);
                      }}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: colors.success + "20",
                        borderRadius: 12,
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.md,
                        backgroundColor: colors.success + "08",
                        gap: spacing.sm,
                        opacity: pressed ? 0.5 : 0.7
                      })}
                    >
                      {logoSource ? (
                        <Image
                          source={logoSource}
                          style={{ width: 24, height: 24, borderRadius: 6, opacity: 0.5 }}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: colors.border }} />
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{ color: colors.textTertiary, fontSize: typography.sizes.sm, textDecorationLine: "line-through" }}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {request}
                        </Text>
                        <Text
                          style={{ color: colors.textTertiary, fontSize: typography.sizes.xs, opacity: 0.6 }}
                          numberOfLines={1}
                        >
                          {sender ?? "—"}
                          {date ? ` · ${date}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      <View style={{ alignItems: "center", paddingVertical: spacing.lg, gap: spacing.xs }}>
        <Feather name="check-circle" size={16} color={colors.textTertiary} style={{ opacity: 0.5 }} />
        <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.xs, textAlign: "center" }}>
          That's everything for now
        </Text>
        {latestContext?.generatedAtIso && (
          <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.xs, opacity: 0.6 }}>
            Last synced {formatItemDate(latestContext.generatedAtIso)}
          </Text>
        )}
      </View>

      <ReviewItemsScreen
        visible={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        openItems={openItems}
        itemStatuses={itemStatuses}
        getItemStatus={getItemStatus}
        setItemStatus={setItemStatus}
      />

      <Modal
        visible={selectedItem != null}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setSelectedItem(null);
          setSelectedItemFromDone(false);
          setReplyText("");
        }}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "flex-end"
          }}
          onPress={() => {
            setSelectedItem(null);
            setSelectedItemFromDone(false);
            setReplyText("");
          }}
        >
          {selectedItem && (
            <Pressable
              style={{
                backgroundColor: colors.bgElevated,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                padding: spacing.lg,
                paddingBottom: spacing.xl,
                maxHeight: "80%"
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.md, opacity: 0.7 }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
                {providerLogos[selectedItem.provider] ? (
                  <Image
                    source={providerLogos[selectedItem.provider]!}
                    style={{ width: 28, height: 28, borderRadius: 8 }}
                    resizeMode="contain"
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
                    {selectedItem.sender ? displaySlackText(selectedItem.sender) : "—"}
                    {selectedItem.dateIso ? ` · ${formatItemDate(selectedItem.dateIso)}` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setSelectedItem(null);
                    setSelectedItemFromDone(false);
                  }}
                >
                  <Text style={{ color: colors.accentGold, fontSize: typography.sizes.md }}>Close</Text>
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={true}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md, lineHeight: 24 }}>
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

              {(selectedItem.provider === "slack" || selectedItem.provider === "gmail") && (
                <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm, alignItems: "center" }}>
                  <TextInput
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder="Quick reply..."
                    placeholderTextColor={colors.textTertiary}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      color: colors.textPrimary,
                      fontSize: typography.sizes.sm
                    }}
                  />
                  <Pressable
                    onPress={() => {
                      if (!replyText.trim()) return;
                      triggerHaptic();
                      const text = replyText.trim();
                      setReplyText("");
                      if (selectedItem.provider === "gmail") {
                        replyToEmail(selectedItem.id, text).catch(() => {});
                      } else if (selectedItem.provider === "slack" && selectedItem.sourceRef) {
                        const parts = selectedItem.sourceRef.split(":");
                        const channelId = parts[0];
                        const threadTs = parts[1] || undefined;
                        replyToSlack(channelId, text, threadTs).catch(() => {});
                      }
                      setItemStatus(selectedItem.id, "done");
                      setSelectedItem(null);
                    }}
                    style={{
                      backgroundColor: colors.accentGold,
                      borderRadius: 10,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs
                    }}
                  >
                    <Feather name="send" size={14} color="#1A1A1C" />
                  </Pressable>
                </View>
              )}

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md }}>
                {selectedItemFromDone && (
                  <Pressable
                    onPress={() => {
                      setItemStatus(selectedItem.id, null);
                      setSelectedItem(null);
                      setSelectedItemFromDone(false);
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.accentGold,
                      borderRadius: 999,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      backgroundColor: colors.accentGoldTint
                    }}
                  >
                    <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
                      Move back to Open
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    const next = getItemStatus(selectedItem.id) === "done" ? null : "done";
                    setItemStatus(selectedItem.id, next);
                    if (next === "done") {
                      setSelectedItem(null);
                      setSelectedItemFromDone(false);
                    }
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: getItemStatus(selectedItem.id) === "done" ? colors.success : colors.border,
                    borderRadius: 999,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    backgroundColor: getItemStatus(selectedItem.id) === "done" ? colors.success + "20" : "transparent"
                  }}
                >
                  <Text
                    style={{
                      color: getItemStatus(selectedItem.id) === "done" ? colors.success : colors.textPrimary,
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
                        getItemStatus(selectedItem.id) === "still_due" ? colors.accentGold : colors.textPrimary,
                      fontSize: typography.sizes.sm
                    }}
                  >
                    Still due
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setItemStatus(selectedItem.id, getItemStatus(selectedItem.id) === "reply" ? null : "reply");
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: getItemStatus(selectedItem.id) === "reply" ? colors.info : colors.border,
                    borderRadius: 999,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    backgroundColor: getItemStatus(selectedItem.id) === "reply" ? colors.info + "20" : "transparent"
                  }}
                >
                  <Text
                    style={{
                      color: getItemStatus(selectedItem.id) === "reply" ? colors.info : colors.textPrimary,
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
  );
}
