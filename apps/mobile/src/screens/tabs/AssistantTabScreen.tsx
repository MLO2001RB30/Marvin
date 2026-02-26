import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";

function getImagePicker(): typeof import("expo-image-picker") | null {
  try {
    return require("expo-image-picker");
  } catch {
    return null;
  }
}
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";

import type { AssistantAttachment, AssistantChatMessage } from "@pia/shared";
import { slackEmojiToUnicode } from "@pia/shared";

import { StructuredMessageRenderer } from "../../components/chat/StructuredMessageRenderer";
import { useAppState } from "../../state/AppState";
import { useTheme } from "../../theme/ThemeProvider";

type SpeechModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  isRecognitionAvailable: () => boolean;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  addListener: (
    eventName: string,
    listener: (event: Record<string, unknown>) => void
  ) => { remove: () => void };
};

function getSpeechModule(): SpeechModule | null {
  try {
    const maybeModule = require("expo-speech-recognition") as {
      ExpoSpeechRecognitionModule?: SpeechModule;
    };
    return maybeModule.ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
}

function sanitizeForDisplay(raw: string): string {
  return raw
    .replace(/<@[A-Z0-9]+>/g, "a team member")
    .replace(/<#[A-Z0-9]+\|[^>]+>/g, (m) => m.split("|")[1] ?? "a channel")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildContextualOpening(
  outstandingCount: number,
  topBlockers: string[],
  workflowCount: number
): string {
  const parts: string[] = [];
  if (outstandingCount > 0) {
    parts.push(`You have ${outstandingCount} item${outstandingCount > 1 ? "s" : ""} from today's brief still open.`);
  }
  if (topBlockers.length > 0) {
    const first = sanitizeForDisplay(topBlockers[0]);
    if (first) {
      parts.push(`Top blocker: ${first.length > 40 ? first.slice(0, 40) + "…" : first}.`);
    }
  }
  if (workflowCount > 0) {
    parts.push(`${workflowCount} workflow${workflowCount > 1 ? "s" : ""} running.`);
  }
  if (parts.length === 0) {
    return "What would you like to work on?";
  }
  return `${parts.join(" ")} What would you like to work on?`;
}

function buildSuggestedPrompts(
  outstandingItems: { title: string }[],
  topBlockers: string[],
  hasWorkflows: boolean
): string[] {
  const prompts: string[] = [];
  prompts.push("What's on my calendar today?");
  if (topBlockers.length > 0) {
    const blocker = sanitizeForDisplay(topBlockers[0]);
    const project = blocker.length > 25 ? "progress" : blocker.replace(/\.$/, "");
    prompts.push(`What's blocking ${project}?`);
  }
  if (outstandingItems.length > 0) {
    prompts.push("What needs my reply?");
  }
  prompts.push("How should I prioritize today?");
  return prompts.slice(0, 4);
}

const SLACK_ICON = require("../../../assets/images/slack.png");
const GMAIL_ICON = require("../../../assets/images/gmail.png");
const DRIVE_ICON = require("../../../assets/images/drive.png");
const CALENDAR_ICON = require("../../../assets/images/google_calendar.png");

function parseFormattedText(
  text: string,
  baseStyle: { color: string; fontSize: number }
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    const underlineMatch = remaining.match(/__([^_]+)__/);
    const italicMatch = remaining.match(/\*([^*]+)\*/);
    let match: RegExpMatchArray | null = null;
    let type: "bold" | "underline" | "italic" | "plain" = "plain";
    let earliest = remaining.length;
    if (boldMatch && boldMatch.index !== undefined && boldMatch.index < earliest) {
      match = boldMatch;
      type = "bold";
      earliest = boldMatch.index;
    }
    if (underlineMatch && underlineMatch.index !== undefined && underlineMatch.index < earliest) {
      match = underlineMatch;
      type = "underline";
      earliest = underlineMatch.index;
    }
    if (italicMatch && italicMatch.index !== undefined && italicMatch.index < earliest) {
      match = italicMatch;
      type = "italic";
      earliest = italicMatch.index;
    }
    if (match) {
      if (earliest > 0) {
        parts.push(
          <Text key={key++} style={baseStyle}>
            {remaining.slice(0, earliest)}
          </Text>
        );
      }
      const content = match[1];
      const style =
        type === "bold"
          ? { ...baseStyle, fontWeight: "700" as const }
          : type === "underline"
            ? { ...baseStyle, textDecorationLine: "underline" as const }
            : type === "italic"
              ? { ...baseStyle, fontStyle: "italic" as const }
              : baseStyle;
      parts.push(
        <Text key={key++} style={style}>
          {content}
        </Text>
      );
      remaining = remaining.slice(earliest + match[0].length);
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

type ParsedBlock = {
  source?: string;
  from?: string;
  message?: string;
  deadline?: string;
};

function parseSlackMessage(
  text: string
): { blocks: ParsedBlock[]; nextSteps: string[] } | null {
  const blocks: ParsedBlock[] = [];
  let current: ParsedBlock = {};
  const nextSteps: string[] = [];
  const lines = text.split("\n");
  let inNextSteps = false;

  const pushBlock = () => {
    if (current.source || current.from || current.message || current.deadline) {
      blocks.push(current);
      current = {};
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const isSeparator = /^---\s*$/.test(trimmed);
    const sourceMatch = trimmed.match(/^\*\*Source:\*\*\s*(.+)/i);
    const fromMatch = trimmed.match(/^\*\*From:\*\*\s*(.+)/i);
    const messageMatch = trimmed.match(/^\*\*Message:\*\*\s*(.+)/i);
    const deadlineMatch = trimmed.match(/^\*\*Deadline:\*\*\s*(.+)/i);
    const nextStepsHeader = /^__Next steps:__/i.test(trimmed);
    const bulletMatch = trimmed.match(/^[-•]\s*(.+)/);

    if (isSeparator) {
      pushBlock();
    } else if (sourceMatch) {
      pushBlock();
      current = { source: sourceMatch[1].trim() };
    } else if (fromMatch) {
      current.from = fromMatch[1].trim();
    } else if (messageMatch) {
      current.message = messageMatch[1].trim();
    } else if (deadlineMatch) {
      current.deadline = deadlineMatch[1].trim();
    } else if (nextStepsHeader) {
      pushBlock();
      inNextSteps = true;
    } else if (inNextSteps && bulletMatch) {
      const raw = bulletMatch[1].trim();
      const bracketMatch = raw.match(/^\[([^\]]+)\]$/);
      nextSteps.push(bracketMatch ? bracketMatch[1] : raw);
    } else if (inNextSteps && trimmed) {
      inNextSteps = false;
    }
  }
  pushBlock();

  if (blocks.length > 0 || nextSteps.length > 0) {
    return { blocks, nextSteps };
  }
  return null;
}

function renderSlackBlock(
  block: ParsedBlock,
  key: number,
  baseStyle: { color: string; fontSize: number },
  parseFormattedText: (t: string, s: { color: string; fontSize: number }) => React.ReactNode[],
  isLastBlock: boolean
) {
  const elements: React.ReactNode[] = [];
  let k = 0;
  const source = block.source ?? "";
  const icon =
    source.includes("Slack")
      ? SLACK_ICON
      : source.includes("Gmail")
        ? GMAIL_ICON
        : source.includes("Drive")
          ? DRIVE_ICON
          : source.includes("Calendar")
            ? CALENDAR_ICON
            : null;
  if (source && icon) {
    elements.push(
      <View key={k++} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Image source={icon} style={{ width: 16, height: 16 }} resizeMode="contain" />
        <Text style={baseStyle}>{slackEmojiToUnicode(source)}</Text>
      </View>
    );
  } else if (source) {
    elements.push(
      <View key={k++} style={{ marginBottom: 4 }}>
        {parseFormattedText(`**Source:** ${slackEmojiToUnicode(source)}`, baseStyle)}
      </View>
    );
  }
  if (block.from) {
    elements.push(
      <Text key={k++} style={{ marginBottom: 4 }}>
        {parseFormattedText(`**From:** ${slackEmojiToUnicode(block.from)}`, baseStyle)}
      </Text>
    );
  }
  if (block.message) {
    elements.push(
      <Text key={k++} style={{ marginBottom: 4 }}>
        {parseFormattedText(`**Message:** ${slackEmojiToUnicode(block.message)}`, baseStyle)}
      </Text>
    );
  }
  if (block.deadline) {
    elements.push(
      <Text key={k++} style={{ marginBottom: 4 }}>
        {parseFormattedText(`**Deadline:** ${slackEmojiToUnicode(block.deadline)}`, baseStyle)}
      </Text>
    );
  }
  return (
    <View
      key={key}
      style={{
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: isLastBlock ? 0 : 1,
        borderBottomColor: "rgba(255,255,255,0.08)"
      }}
    >
      {elements}
    </View>
  );
}

function FormattedAssistantMessage({
  text,
  colors,
  typography
}: {
  text: string;
  colors: { textPrimary: string; textTertiary: string; border: string };
  typography: { sizes: { md: number; sm: number } };
}) {
  const baseStyle = { color: colors.textPrimary, fontSize: typography.sizes.md };
  const parsed = parseSlackMessage(text);

  if (parsed) {
    const elements: React.ReactNode[] = [];
    let key = 0;

    parsed.blocks.forEach((block, idx) => {
      const isLastBlock = idx === parsed.blocks.length - 1;
      elements.push(renderSlackBlock(block, key++, baseStyle, parseFormattedText, isLastBlock));
    });

    if (parsed.nextSteps.length > 0) {
      elements.push(
        <Text key={key++} style={{ ...baseStyle, fontWeight: "700", marginBottom: 8, textDecorationLine: "underline" }}>
          Next steps:
        </Text>
      );
      elements.push(
        <View key={key++} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {parsed.nextSteps.map((label) => (
            <Pressable
              key={label}
              onPress={() => {}}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "transparent"
              }}
            >
              <Text style={{ ...baseStyle, fontSize: typography.sizes.sm }}>{slackEmojiToUnicode(label)}</Text>
            </Pressable>
          ))}
        </View>
      );
    }
    return <View style={{ gap: 2 }}>{elements}</View>;
  }

  const lines = text.split("\n");
  const fallbackElements: React.ReactNode[] = [];
  let lineKey = 0;
  for (const line of lines) {
    const isSourceLine = /^\s*\*\*Source:\*\*/i.test(line) && line.includes("Slack");
    if (isSourceLine) {
      const afterSource = line.replace(/^\s*\*\*Source:\*\*\s*/i, "");
      fallbackElements.push(
        <View key={lineKey++} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Image source={SLACK_ICON} style={{ width: 16, height: 16 }} resizeMode="contain" />
          <Text style={baseStyle}>{slackEmojiToUnicode(afterSource)}</Text>
        </View>
      );
    } else if (line.trim()) {
      fallbackElements.push(
        <Text key={lineKey++} style={{ marginBottom: 4 }}>
          {parseFormattedText(slackEmojiToUnicode(line), baseStyle)}
        </Text>
      );
    } else {
      fallbackElements.push(<View key={lineKey++} style={{ height: 8 }} />);
    }
  }
  return <View style={{ gap: 2 }}>{fallbackElements}</View>;
}

function ThinkingDots({ colors }: { colors: { textTertiary: string } }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true
          })
        ])
      );
    const a1 = createBounce(dot1, 0);
    const a2 = createBounce(dot2, 100);
    const a3 = createBounce(dot3, 200);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const translateY = (anim: Animated.Value) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const opacity = (anim: Animated.Value) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Animated.View style={{ transform: [{ translateY: translateY(dot1) }], opacity: opacity(dot1) }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textTertiary }} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY: translateY(dot2) }], opacity: opacity(dot2) }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textTertiary }} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY: translateY(dot3) }], opacity: opacity(dot3) }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textTertiary }} />
      </Animated.View>
    </View>
  );
}

function ChatMessageBubble({
  message,
  colors,
  spacing,
  radius,
  typography
}: {
  message: AssistantChatMessage;
  colors: { textPrimary: string; textSecondary: string; textTertiary: string; border: string; bgSurface: string; bgSurfaceAlt: string; accentGold: string; accentGoldTint: string; danger: string; success: string; info: string };
  spacing: { xxs: number; xs: number; sm: number; md: number; lg: number };
  radius: { card: number };
  typography: { sizes: { xs: number; sm: number; md: number; lg: number } };
}) {
  const isAssistant = message.role === "assistant";
  const isThinking = message.id === "thinking-placeholder";
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 10
    }).start();
  }, [anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <Animated.View
      style={{
        alignSelf: isAssistant ? "stretch" : "flex-end",
        maxWidth: "88%",
        opacity,
        transform: [{ scale }, { translateY }]
      }}
    >
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.card,
          padding: spacing.md,
          backgroundColor: isAssistant ? colors.bgSurface : colors.bgSurfaceAlt
        }}
      >
        {isThinking ? (
          <ThinkingDots colors={colors} />
        ) : message.role === "assistant" && message.structured ? (
          <StructuredMessageRenderer
            structured={message.structured}
            colors={colors}
            typography={typography}
            spacing={spacing}
          />
        ) : message.role === "assistant" ? (
          <FormattedAssistantMessage
            text={message.text}
            colors={colors}
            typography={typography}
          />
        ) : (
          <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>
            {message.text}
          </Text>
        )}
        {message.attachments && message.attachments.length > 0 ? (
          <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
            {message.attachments
              .filter((item) => item.type === "image")
              .map((item) => (
                <Image
                  key={`${message.id}-${item.uri}`}
                  source={{ uri: item.uri }}
                  style={{
                    width: 140,
                    height: 100,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                  resizeMode="cover"
                />
              ))}
            <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
              {`Attachments: ${message.attachments.map((item) => item.type).join(", ")}`}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

export function AssistantTabScreen() {
  const {
    assistantSidebarOpen,
    setAssistantSidebarOpen,
    assistantNavBarHidden,
    setAssistantNavBarHidden,
    startAssistantChat,
    assistantMessages,
    assistantSending,
    sendAssistantMessage,
    appendAssistantMessages,
    assistantActiveChatId,
    latestContext,
    workflows
  } = useAppState();
  const outstandingItems = latestContext?.outstandingItems ?? latestContext?.digest?.items ?? [];
  const topBlockers = latestContext?.topBlockers ?? [];
  const contextualOpening = buildContextualOpening(
    outstandingItems.length,
    topBlockers,
    workflows.filter((w) => w.enabled).length
  );
  const suggestedPrompts = buildSuggestedPrompts(
    outstandingItems,
    topBlockers,
    workflows.length > 0
  );
  const { colors, spacing, typography, radius, icon } = useTheme();
  const [text, setText] = useState("");
  const [imageAttachment, setImageAttachment] = useState<AssistantAttachment | null>(null);
  const [audioAttachment, setAudioAttachment] = useState<AssistantAttachment | null>(null);
  const [micPressed, setMicPressed] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lastScrollY = useRef(0);
  const speechModule = useMemo(() => getSpeechModule(), []);

  function handleAssistantScroll(e: { nativeEvent: { contentOffset: { y: number } } }) {
    const y = e.nativeEvent.contentOffset.y;
    const prev = lastScrollY.current;
    lastScrollY.current = y;
    if (y > 80 && y > prev) {
      setAssistantNavBarHidden(true);
    } else if (y < 30) {
      setAssistantNavBarHidden(false);
    }
  }

  function handleScrollEndDrag(e: {
    nativeEvent: { contentOffset: { y: number }; velocity?: { x: number; y: number } };
  }) {
    const velocity = e.nativeEvent.velocity;
    if (velocity && velocity.y < -0.5) {
      setAssistantNavBarHidden(false);
    }
  }

  function handleMomentumScrollEnd(e: {
    nativeEvent: { contentOffset: { y: number }; velocity?: { x: number; y: number } };
  }) {
    const velocity = e.nativeEvent.velocity;
    if (velocity && velocity.y < -0.5) {
      setAssistantNavBarHidden(false);
    }
  }
  // Only compact when we have messages; avoid animating on keyboard show (causes focus loss)
  const composerCompact = assistantMessages.length > 0;
  const composerAnimation = useRef(new Animated.Value(composerCompact ? 0 : 1)).current;

  const hasDraftAttachment = useMemo(
    () => Boolean(imageAttachment || audioAttachment),
    [imageAttachment, audioAttachment]
  );

  useEffect(() => {
    if (!speechModule) {
      return;
    }
    const resultSubscription = speechModule.addListener("result", (event) => {
      const results = event.results as Array<{ transcript?: string }> | undefined;
      const transcript = results?.[0]?.transcript ?? "";
      if (!transcript) {
        return;
      }
      setLiveTranscript(transcript);
      setText(transcript);
    });
    const errorSubscription = speechModule.addListener("error", (event) => {
      setMicPressed(false);
      const message = (event.message as string | undefined) ?? "Speech recognition error";
      const code = event.code as string | undefined;
      setComposerError(code ? `${message} (${code})` : message);
    });
    const audioEndSubscription = speechModule.addListener("audioend", (event) => {
      const uri = event.uri as string | undefined;
      if (!uri) {
        return;
      }
      void (async () => {
        try {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: "base64"
          });
          const fileInfo = await FileSystem.getInfoAsync(uri);
          setAudioAttachment({
            type: "audio",
            uri,
            mimeType: "audio/wav",
            fileName: `voice-${Date.now()}.wav`,
            sizeBytes:
              fileInfo.exists && "size" in fileInfo && typeof fileInfo.size === "number"
                ? fileInfo.size
                : undefined,
            base64
          });
        } catch {
          setComposerError("Could not process recorded audio.");
        }
      })();
    });
    return () => {
      resultSubscription.remove();
      errorSubscription.remove();
      audioEndSubscription.remove();
    };
  }, [speechModule]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [assistantMessages]);

  useEffect(() => {
    Animated.timing(composerAnimation, {
      toValue: composerCompact ? 0 : 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [composerAnimation, composerCompact]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  async function handlePickImage() {
    setComposerError(null);
    const ImagePicker = getImagePicker();
    if (!ImagePicker) {
      setComposerError("Image upload is not available in this build. Rebuild with: eas build --profile development");
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setComposerError("Media library permission is required to upload an image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        base64: true
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }
      const asset = result.assets[0];
      setImageAttachment({
        type: "image",
        uri: asset.uri,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? `image-${Date.now()}.jpg`,
        sizeBytes: asset.fileSize,
        base64: asset.base64 ?? undefined
      });
    } catch {
      setComposerError("Image upload is not available in this build. Rebuild with: eas build --profile development");
    }
  }

  async function handleMicPressIn() {
    setComposerError(null);
    setLiveTranscript("");
    if (!speechModule) {
      setComposerError(
        "Speech recognition native module is unavailable. Use a development build (npx expo run:ios/android)."
      );
      return;
    }
    const permission = await speechModule.requestPermissionsAsync();
    if (!permission.granted) {
      setComposerError("Microphone/speech permission is required to use voice input.");
      return;
    }
    if (!speechModule.isRecognitionAvailable()) {
      setComposerError("Speech recognition is not available on this device.");
      return;
    }
    setMicPressed(true);
    speechModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      recordingOptions: {
        persist: true
      }
    });
  }

  async function handleMicPressOut() {
    if (!micPressed) {
      return;
    }
    setMicPressed(false);
    if (speechModule) {
      speechModule.stop();
    }
  }

  async function handleSend() {
    const attachments = [imageAttachment, audioAttachment].filter(
      (item): item is AssistantAttachment => Boolean(item)
    );
    const question = text.trim();
    if (question.length === 0 && attachments.length === 0) {
      return;
    }
    const chatId = assistantActiveChatId ?? "new";
    const optimisticUser: AssistantChatMessage = {
      id: `temp-${Date.now()}`,
      chatId,
      role: "user",
      text: question,
      createdAtIso: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined
    };
    const thinkingPlaceholder: AssistantChatMessage = {
      id: "thinking-placeholder",
      chatId,
      role: "assistant",
      text: "",
      createdAtIso: new Date().toISOString()
    };
    appendAssistantMessages([optimisticUser, thinkingPlaceholder]);
    setText("");
    setImageAttachment(null);
    setAudioAttachment(null);
    await sendAssistantMessage({
      question,
      attachments
    });
  }

  const composerHeight = composerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [72, 128]
  });
  const composerPaddingTop = composerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 9]
  });
  const composerPaddingBottom = composerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 7]
  });
  const hasTypedText = text.trim().length > 0;
  const canSendNow = hasTypedText || hasDraftAttachment;

  const hasMessages = assistantMessages.length > 0;
  const chatboxBottom =
    keyboardVisible ? 8 : (assistantNavBarHidden ? (hasMessages ? 0 : 8) : 64);
  const CHATBOX_HEIGHT = 80;
  const scrollContainerPaddingBottom = CHATBOX_HEIGHT + chatboxBottom;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 54,
            zIndex: 4,
            backgroundColor: colors.bgPage
          }}
          pointerEvents="none"
        />
        <Pressable
          onPress={() => setAssistantSidebarOpen(!assistantSidebarOpen)}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 5,
            width: 44,
            height: 44,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bgSurface,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Feather name={assistantSidebarOpen ? "x" : "menu"} size={icon.md} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => {
            startAssistantChat();
            Keyboard.dismiss();
          }}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            zIndex: 5,
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Feather name="plus" size={icon.md} color={colors.accentGold} />
        </Pressable>

        <View style={{ flex: 1, paddingBottom: scrollContainerPaddingBottom, overflow: "hidden" }}>
          <ScrollView
            ref={scrollRef}
            onScroll={handleAssistantScroll}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            contentContainerStyle={{
              gap: spacing.md,
              paddingBottom: spacing.lg,
              paddingTop: 64
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <View style={{ gap: spacing.md }}>
              {assistantMessages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  colors={colors}
                  spacing={spacing}
                  radius={radius}
                  typography={typography}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {assistantMessages.length === 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 64,
              left: 0,
              right: 0,
              bottom: 200,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: spacing.lg
            }}
          >
            <Text style={{ color: colors.accentGold, fontSize: typography.sizes.md, textAlign: "center" }}>
              {contextualOpening}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            position: "absolute",
            left: spacing.xs,
            right: spacing.xs,
            bottom: chatboxBottom,
            zIndex: 10,
            backgroundColor: colors.bgPage
          }}
        >
          <Animated.View
            style={{
              height: composerHeight,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.card,
              backgroundColor: colors.bgSurface,
              paddingHorizontal: spacing.md,
              paddingTop: composerPaddingTop,
              paddingBottom: composerPaddingBottom,
              gap: spacing.xs
            }}
          >
          {composerError ? (
            <Text style={{ color: colors.danger, fontSize: typography.sizes.sm }}>{composerError}</Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="How can I help you?"
              placeholderTextColor={colors.textSecondary}
              multiline={!composerCompact}
              blurOnSubmit={false}
              autoCorrect
              spellCheck
              style={{
                flex: 1,
                color: colors.textPrimary,
                fontSize: composerCompact ? typography.sizes.md : typography.sizes.lg,
                minHeight: composerCompact ? 30 : 52,
                maxHeight: composerCompact ? 36 : 88
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Pressable onPress={handlePickImage}>
                <Feather name="image" size={icon.md} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={canSendNow ? () => void handleSend() : undefined}
                onPressIn={canSendNow ? undefined : () => void handleMicPressIn()}
                onPressOut={canSendNow ? undefined : () => void handleMicPressOut()}
                disabled={assistantSending}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.accentGold
                }}
              >
                <Feather
                  name={canSendNow ? "arrow-up" : micPressed ? "square" : "mic"}
                  size={icon.md}
                  color={colors.bgPage}
                />
              </Pressable>
            </View>
          </View>
          </Animated.View>
        </View>

        {!keyboardVisible && !hasMessages ? (
          <View
            style={{
              position: "absolute",
              left: spacing.xs,
              right: spacing.xs,
              bottom: 8,
              zIndex: 5,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.xs,
              backgroundColor: colors.bgPage
            }}
          >
            {suggestedPrompts.map((prompt, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  setText(prompt);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.pill,
                  backgroundColor: colors.bgSurface,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.sm
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }} numberOfLines={1}>
                  {prompt}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

      </View>
    </View>
  );
}
