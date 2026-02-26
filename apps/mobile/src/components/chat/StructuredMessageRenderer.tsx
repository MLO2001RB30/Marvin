import { Feather } from "@expo/vector-icons";
import type React from "react";
import { useState } from "react";
import { Image, ImageSourcePropType, Pressable, Text, View } from "react-native";

import type {
  AssistantDisplayType,
  DisplayCalendarEvent,
  DisplayItem,
  IntegrationProvider,
  RecommendedAction,
  StructuredAssistantResponse
} from "@pia/shared";
import { slackEmojiToUnicode } from "@pia/shared";

const PROVIDER_LOGOS: Partial<Record<IntegrationProvider, ImageSourcePropType>> = {
  slack: require("../../../assets/images/slack.png"),
  gmail: require("../../../assets/images/gmail.png"),
  google_drive: require("../../../assets/images/drive.png"),
  google_calendar: require("../../../assets/images/google_calendar.png"),
  onedrive: require("../../../assets/images/Onedrive.png"),
  dropbox: require("../../../assets/images/Dropbox.png")
};

const PROVIDER_NAMES: Partial<Record<IntegrationProvider, string>> = {
  slack: "Slack",
  gmail: "Gmail",
  google_drive: "Google Drive",
  google_calendar: "Calendar",
  onedrive: "OneDrive",
  dropbox: "Dropbox"
};

interface ThemeColors {
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  bgSurface: string;
  bgSurfaceAlt: string;
  accentGold: string;
  accentGoldTint: string;
  danger: string;
  success: string;
  info: string;
}

interface ThemeTypography {
  sizes: { xs: number; sm: number; md: number; lg: number };
}

interface ThemeSpacing {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
}

interface RendererProps {
  structured: StructuredAssistantResponse;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  onAction?: (action: RecommendedAction) => void;
}

function sanitize(raw: string): string {
  return slackEmojiToUnicode(
    raw
      .replace(/<@[A-Z0-9]+>/g, "a team member")
      .replace(/<#[A-Z0-9]+\|([^>]+)>/g, (_, name) => name)
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function UrgencyDot({ urgency, colors }: { urgency?: string; colors: ThemeColors }) {
  const color =
    urgency === "high" ? colors.danger : urgency === "med" ? colors.accentGold : colors.textTertiary;
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        marginRight: 6
      }}
    />
  );
}

function ActionChip({
  action,
  colors,
  typography,
  spacing,
  onPress
}: {
  action: RecommendedAction;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  onPress?: () => void;
}) {
  const iconName: keyof typeof Feather.glyphMap =
    action.action_type === "reply_slack"
      ? "corner-up-left"
      : action.action_type === "reply_email"
        ? "mail"
        : action.action_type === "create_event"
          ? "calendar"
          : action.action_type === "draft_reply"
            ? "edit-2"
            : action.action_type === "run_workflow"
              ? "zap"
              : "chevron-right";

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "transparent"
      }}
    >
      <Feather name={iconName} size={13} color={colors.accentGold} />
      <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
        {action.label}
      </Text>
    </Pressable>
  );
}

function CollapsibleBody({
  body,
  colors,
  typography,
  spacing
}: {
  body: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
}) {
  const [expanded, setExpanded] = useState(false);
  const lines = sanitize(body).split("\n");
  const needsCollapse = lines.length > 3;
  const visibleText = needsCollapse && !expanded ? lines.slice(0, 3).join("\n") : lines.join("\n");

  return (
    <View>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.sizes.sm,
          lineHeight: typography.sizes.sm * 1.6
        }}
      >
        {visibleText}
        {needsCollapse && !expanded ? "…" : ""}
      </Text>
      {needsCollapse && (
        <Pressable onPress={() => setExpanded(!expanded)} style={{ marginTop: spacing.xxs }}>
          <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
            {expanded ? "Show less" : "Show more"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function ItemCard({
  item,
  isLast,
  colors,
  typography,
  spacing,
  onAction
}: {
  item: DisplayItem;
  isLast: boolean;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  onAction?: (action: RecommendedAction) => void;
}) {
  const logo = PROVIDER_LOGOS[item.provider];
  const providerName = PROVIDER_NAMES[item.provider] ?? item.provider;
  const senderDisplay = sanitize(item.sender || "Unknown");
  const channelDisplay = item.channel ? sanitize(item.channel) : null;

  return (
    <View>
      <View style={{ gap: spacing.xs }}>
        {/* Provider row: logo + sender + channel */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          {logo ? (
            <Image
              source={logo}
              style={{ width: 18, height: 18, borderRadius: 4 }}
              resizeMode="contain"
            />
          ) : (
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                backgroundColor: colors.border,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: colors.textTertiary, fontSize: 9 }}>
                {providerName.charAt(0)}
              </Text>
            </View>
          )}
          <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm, fontWeight: "600" }}>
            {senderDisplay}
          </Text>
          {channelDisplay && (
            <>
              <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>|</Text>
              <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
                {channelDisplay}
              </Text>
            </>
          )}
          <View style={{ flex: 1 }} />
          <UrgencyDot urgency={item.urgency} colors={colors} />
        </View>

        {/* Header */}
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.sizes.md,
            fontWeight: "600",
            lineHeight: typography.sizes.md * 1.4
          }}
          numberOfLines={2}
        >
          {sanitize(item.header)}
        </Text>

        {/* Collapsible body */}
        {item.body ? (
          <CollapsibleBody body={item.body} colors={colors} typography={typography} spacing={spacing} />
        ) : null}

        {/* Action chips */}
        {item.actions && item.actions.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xxs }}>
            {item.actions.map((action, idx) => (
              <ActionChip
                key={idx}
                action={action}
                colors={colors}
                typography={typography}
                spacing={spacing}
                onPress={onAction ? () => onAction(action) : undefined}
              />
            ))}
          </View>
        )}
      </View>

      {/* Separator */}
      {!isLast && (
        <View
          style={{
            height: 1,
            backgroundColor: colors.border,
            opacity: 0.4,
            marginVertical: spacing.md
          }}
        />
      )}
    </View>
  );
}

function ItemsListRenderer({ structured, colors, typography, spacing, onAction }: RendererProps) {
  const items = structured.items ?? [];

  return (
    <View style={{ gap: spacing.sm }}>
      {/* Summary */}
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.sizes.md,
          lineHeight: typography.sizes.md * 1.5
        }}
      >
        {sanitize(structured.summary)}
      </Text>

      {/* Items */}
      {items.length > 0 && (
        <View style={{ marginTop: spacing.xs }}>
          {items.map((item, idx) => (
            <ItemCard
              key={item.item_id ?? idx}
              item={item}
              isLast={idx === items.length - 1}
              colors={colors}
              typography={typography}
              spacing={spacing}
              onAction={onAction}
            />
          ))}
        </View>
      )}

      {/* Top-level actions */}
      {structured.recommended_actions && structured.recommended_actions.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs }}>
          {structured.recommended_actions.map((action, idx) => (
            <ActionChip
              key={idx}
              action={action}
              colors={colors}
              typography={typography}
              spacing={spacing}
              onPress={onAction ? () => onAction(action) : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CalendarViewRenderer({ structured, colors, typography, spacing }: RendererProps) {
  const events = structured.events ?? [];

  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.sizes.md,
          lineHeight: typography.sizes.md * 1.5
        }}
      >
        {sanitize(structured.summary)}
      </Text>

      {events.length > 0 && (
        <View style={{ gap: spacing.xs }}>
          {events.map((event, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                alignItems: "stretch"
              }}
            >
              <View style={{ alignItems: "center", width: 52 }}>
                <Text
                  style={{
                    color: colors.accentGold,
                    fontSize: typography.sizes.sm,
                    fontWeight: "600"
                  }}
                >
                  {event.start}
                </Text>
                {event.end && (
                  <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.xs }}>
                    {event.end}
                  </Text>
                )}
              </View>
              <View
                style={{
                  width: 2,
                  backgroundColor: colors.accentGold,
                  borderRadius: 1,
                  opacity: 0.4,
                  marginVertical: 2
                }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.sizes.sm,
                    fontWeight: "600"
                  }}
                  numberOfLines={2}
                >
                  {sanitize(event.title)}
                </Text>
                {event.location && (
                  <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.xs }}>
                    {event.location}
                  </Text>
                )}
                {event.organizer && (
                  <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.xs }}>
                    {sanitize(event.organizer)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ActionResultRenderer({ structured, colors, typography, spacing }: RendererProps) {
  const isSuccess = structured.action_status === "success";
  const statusColor = isSuccess ? colors.success : colors.danger;
  const statusIcon = isSuccess ? "check-circle" : "alert-circle";

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Feather name={statusIcon} size={20} color={statusColor} />
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.sizes.md,
            fontWeight: "600",
            flex: 1
          }}
        >
          {isSuccess ? "Done" : "Failed"}
        </Text>
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.sizes.md,
          lineHeight: typography.sizes.md * 1.5
        }}
      >
        {sanitize(structured.summary)}
      </Text>
      {structured.action_description && (
        <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
          {sanitize(structured.action_description)}
        </Text>
      )}
    </View>
  );
}

function parseBoldSegments(
  text: string,
  baseStyle: { color: string; fontSize: number }
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const match = remaining.match(/\*\*([^*]+)\*\*/);
    if (match && match.index !== undefined) {
      if (match.index > 0) {
        parts.push(
          <Text key={key++} style={baseStyle}>
            {remaining.slice(0, match.index)}
          </Text>
        );
      }
      parts.push(
        <Text key={key++} style={{ ...baseStyle, fontWeight: "700" }}>
          {match[1]}
        </Text>
      );
      remaining = remaining.slice(match.index + match[0].length);
    } else {
      parts.push(
        <Text key={key++} style={baseStyle}>
          {remaining}
        </Text>
      );
      break;
    }
  }
  return parts;
}

function TextRenderer({ structured, colors, typography, spacing, onAction }: RendererProps) {
  const baseStyle = { color: colors.textPrimary, fontSize: typography.sizes.md };
  const lines = sanitize(structured.summary).split("\n");

  return (
    <View style={{ gap: spacing.xs }}>
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <View key={idx} style={{ height: spacing.xs }} />;
        }
        const isBullet = /^[-•]\s/.test(line);
        if (isBullet) {
          return (
            <View key={idx} style={{ flexDirection: "row", paddingLeft: spacing.xs }}>
              <Text style={{ ...baseStyle, marginRight: spacing.xs }}>•</Text>
              <Text style={{ ...baseStyle, flex: 1 }}>
                {parseBoldSegments(line.replace(/^[-•]\s*/, ""), baseStyle)}
              </Text>
            </View>
          );
        }
        return (
          <Text key={idx} style={{ ...baseStyle, lineHeight: typography.sizes.md * 1.5 }}>
            {parseBoldSegments(line, baseStyle)}
          </Text>
        );
      })}

      {structured.recommended_actions && structured.recommended_actions.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs }}>
          {structured.recommended_actions.map((action, idx) => (
            <ActionChip
              key={idx}
              action={action}
              colors={colors}
              typography={typography}
              spacing={spacing}
              onPress={onAction ? () => onAction(action) : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const RENDERERS: Record<AssistantDisplayType, React.FC<RendererProps>> = {
  items_list: ItemsListRenderer,
  calendar_view: CalendarViewRenderer,
  action_result: ActionResultRenderer,
  text: TextRenderer
};

export function StructuredMessageRenderer({
  structured,
  colors,
  typography,
  spacing,
  onAction
}: RendererProps) {
  const Renderer = RENDERERS[structured.display_type] ?? TextRenderer;
  return (
    <Renderer
      structured={structured}
      colors={colors}
      typography={typography}
      spacing={spacing}
      onAction={onAction}
    />
  );
}
