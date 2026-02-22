import { Feather } from "@expo/vector-icons";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BottomTabBar } from "../components/BottomTabBar";
import { getApiBaseUrl } from "../services/apiClient";
import { OnboardingWizard } from "../components/OnboardingWizard";
import { useAppState } from "../state/AppState";
import { AssistantTabScreen } from "../screens/tabs/AssistantTabScreen";
import { BriefTabScreen } from "../screens/tabs/BriefTabScreen";
import { ManageTabScreen } from "../screens/tabs/ManageTabScreen";
import type { RootTabKey } from "./tabIA";
import { useTheme } from "../theme/ThemeProvider";

function ActiveScreen() {
  const { activeTab, isLoading, error, retryLoad } = useAppState();
  const { colors, spacing } = useTheme();

  if (isLoading) {
    return <View style={{ minHeight: 120, backgroundColor: colors.bgPage }} />;
  }
  if (error) {
    const isNetworkError = /network request failed|failed to fetch|network error/i.test(error);
    const isHtmlResponseError = /HTML instead of JSON|Unexpected character/i.test(error);
    return (
      <View
        style={{
          minHeight: 120,
          backgroundColor: colors.bgPage,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
          gap: spacing.md
        }}
      >
        <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
          Loading failed: {error}
        </Text>
        {(isNetworkError || isHtmlResponseError) && (
          <Text style={{ color: colors.textTertiary, fontSize: 13, textAlign: "center" }}>
            {isHtmlResponseError
              ? "The app is reaching the wrong server (e.g. Expo on 8081 instead of API on 4000). Set EXPO_PUBLIC_API_URL in apps/mobile/.env to your API URL (e.g. http://YOUR_IP:4000), restart Expo with --clear, and ensure the API is running."
              : "Make sure the API is running and EXPO_PUBLIC_API_URL is reachable from your device (use LAN IP or tunnel URL, not localhost on a physical device)."}
            {"\n\n"}
            Trying: {getApiBaseUrl()}
          </Text>
        )}
        <Pressable
          onPress={() => void retryLoad()}
          style={{
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            backgroundColor: colors.accentGoldTint,
            borderRadius: 8
          }}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  switch (activeTab) {
    case "brief":
      return <BriefTabScreen />;
    case "assistant":
      return <AssistantTabScreen />;
    case "manage":
      return <ManageTabScreen />;
    default:
      return <BriefTabScreen />;
  }
}

export function AppShell() {
  const {
    activeTab,
    setActiveTab,
    integrationAccounts,
    latestContext,
    isLoading,
    error,
    assistantChats,
    assistantActiveChatId,
    assistantSidebarOpen,
    setAssistantSidebarOpen,
    assistantNavBarHidden,
    setAssistantNavBarHidden,
    setAssistantActiveChat,
    startAssistantChat,
    setAssistantComposerCompact,
    runContextPipelineNow
  } = useAppState();
  const { colors, spacing, typography, radius, icon } = useTheme();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2 | 3>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTintColor, setRefreshTintColor] = useState("#C9A962");
  const ACCENT_GOLD = "#C9A962";

  useEffect(() => {
    if (Platform.OS === "ios" && activeTab === "brief") {
      setRefreshTintColor("#FFFFFF");
      const id = setTimeout(() => setRefreshTintColor(ACCENT_GOLD), 100);
      return () => clearTimeout(id);
    }
  }, [activeTab]);

  const onBriefRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await runContextPipelineNow();
    } finally {
      setRefreshing(false);
    }
  }, [runContextPipelineNow]);

  const shouldShowOnboarding = useMemo(() => {
    if (isLoading || Boolean(error) || onboardingDismissed) {
      return false;
    }
    const connectedCount = integrationAccounts.filter((item) => item.status === "connected").length;
    return connectedCount === 0 && !latestContext;
  }, [error, integrationAccounts, isLoading, latestContext, onboardingDismissed]);
  const isAssistantTab = activeTab === "assistant";
  const sidebarWidth = 280;
  const sidebarAnimation = useRef(new Animated.Value(assistantSidebarOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: assistantSidebarOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [assistantSidebarOpen, sidebarAnimation]);

  useEffect(() => {
    if (activeTab !== "assistant") {
      if (assistantSidebarOpen) setAssistantSidebarOpen(false);
      setAssistantNavBarHidden(false);
    }
  }, [activeTab, assistantSidebarOpen, setAssistantSidebarOpen, setAssistantNavBarHidden]);

  const sidebarTranslateX = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-sidebarWidth - 6, 0]
  });

  const tabBarHidden = isAssistantTab && assistantNavBarHidden;
  const navBarAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(navBarAnim, {
      toValue: tabBarHidden ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [tabBarHidden, navBarAnim]);
  const navBarTranslateY = navBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 75]
  });

  if (shouldShowOnboarding) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPage, paddingHorizontal: 28, paddingTop: 24 }}>
        <OnboardingWizard
          step={onboardingStep}
          onNext={() => setOnboardingStep((current) => (current < 3 ? ((current + 1) as 0 | 1 | 2 | 3) : current))}
          onBack={() => setOnboardingStep((current) => (current > 0 ? ((current - 1) as 0 | 1 | 2 | 3) : current))}
          onSkip={() => setOnboardingDismissed(true)}
          onConnectProvider={(_provider) => {
            setActiveTab("manage");
          }}
          onRunDemo={() => {
            void runContextPipelineNow().then(() => setOnboardingDismissed(true));
          }}
          onRunConnected={() => {
            void runContextPipelineNow().then(() => setOnboardingDismissed(true));
          }}
          isBusy={isLoading}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPage, position: "relative", overflow: "hidden" }}>
      {isAssistantTab ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 10, paddingBottom: 20 }}>
            <ActiveScreen />
          </View>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 10, paddingBottom: 90 }}
          refreshControl={
            activeTab === "brief" ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onBriefRefresh}
                tintColor={refreshTintColor}
                colors={["#C9A962"]}
              />
            ) : undefined
          }
        >
          <ActiveScreen />
        </ScrollView>
      )}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 21,
          paddingTop: 12,
          paddingBottom: 5,
          transform: [{ translateY: isAssistantTab ? navBarTranslateY : 0 }],
          opacity: isAssistantTab ? navBarAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 1
        }}
        pointerEvents={tabBarHidden ? "none" : "auto"}
      >
        <BottomTabBar activeTab={activeTab} onTabPress={(tab: RootTabKey) => setActiveTab(tab)} />
      </Animated.View>

      {isAssistantTab ? (
        <>
          <Animated.View
            pointerEvents={assistantSidebarOpen ? "auto" : "none"}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
              backgroundColor: colors.bgPage,
              opacity: sidebarAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.48]
              })
            }}
          >
            <Pressable style={{ flex: 1 }} onPress={() => setAssistantSidebarOpen(false)} />
          </Animated.View>

          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: sidebarWidth,
              zIndex: 40,
              borderRightWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.bgSurface,
              paddingHorizontal: spacing.sm,
              paddingTop: spacing.md,
              paddingBottom: spacing.md,
              gap: spacing.sm,
              transform: [{ translateX: sidebarTranslateX }]
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>Chats</Text>
              <Pressable onPress={() => setAssistantSidebarOpen(false)}>
                <Feather name="chevron-left" size={icon.md} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => {
                startAssistantChat();
                setAssistantComposerCompact("__draft__", false);
                setAssistantSidebarOpen(false);
              }}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.pill,
                paddingVertical: spacing.xs,
                alignItems: "center",
                backgroundColor: colors.bgSurfaceAlt
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>New chat</Text>
            </Pressable>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: spacing.xs }}>
                {assistantChats.map((chat) => (
                  <Pressable
                    key={chat.id}
                    onPress={() => {
                      void setAssistantActiveChat(chat.id);
                      setAssistantSidebarOpen(false);
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.sm,
                      backgroundColor:
                        assistantActiveChatId === chat.id ? colors.accentGoldTint : colors.bgSurfaceAlt
                    }}
                  >
                    <Text numberOfLines={1} style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                      {chat.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}
