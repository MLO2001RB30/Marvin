import type {
  AssistantChat,
  AssistantAttachment,
  AssistantAnswer,
  AssistantChatMessage,
  AssistantQueryRequest,
  DailyBriefJson,
  DailyContextSnapshot,
  ExternalItem,
  IntegrationAccount,
  IntegrationConsent,
  IntegrationProvider,
  Mode,
  WorkflowDefinition,
  WorkflowRun
} from "@pia/shared";
import {
  createContext,
  useEffect,
  PropsWithChildren,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState
} from "react";
import { AppState as RNAppState, Linking } from "react-native";

import type { RootTabKey } from "../navigation/tabIA";
import { createApiClient } from "../services/apiClient";
import { storage } from "../services/storage";

interface AppStateValue {
  isLoading: boolean;
  error: string | null;
  retryLoad: () => Promise<void>;
  activeTab: RootTabKey;
  setActiveTab: (next: RootTabKey) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  consents: IntegrationConsent[];
  upsertConsent: (consent: IntegrationConsent) => Promise<void>;
  integrationAccounts: IntegrationAccount[];
  startIntegrationConnect: (provider: IntegrationProvider) => Promise<string>;
  disconnectIntegration: (provider: IntegrationProvider) => Promise<void>;
  refreshIntegrations: () => Promise<void>;
  externalItems: ExternalItem[];
  workflows: WorkflowDefinition[];
  upsertWorkflow: (workflow: WorkflowDefinition) => Promise<void>;
  workflowRuns: WorkflowRun[];
  runWorkflowNow: (workflowId: string) => Promise<void>;
  latestContext: DailyContextSnapshot | null;
  dailyBrief: DailyBriefJson | null;
  runContextPipelineNow: () => Promise<void>;
  selectedRunDetails: WorkflowRun | null;
  loadRunDetails: (runId: string) => Promise<void>;
  assistantAnswer: AssistantAnswer["answer"] | null;
  assistantReferences: AssistantAnswer["contextReferences"] | null;
  assistantChats: AssistantChat[];
  assistantActiveChatId: string | null;
  assistantSidebarOpen: boolean;
  setAssistantSidebarOpen: (open: boolean) => void;
  assistantNavBarHidden: boolean;
  setAssistantNavBarHidden: (hidden: boolean) => void;
  assistantComposerCompactByChat: Record<string, boolean>;
  setAssistantComposerCompact: (chatId: string, compact: boolean) => void;
  setAssistantActiveChat: (chatId: string) => Promise<void>;
  startAssistantChat: () => void;
  assistantMessages: AssistantChatMessage[];
  assistantSending: boolean;
  sendAssistantMessage: (payload: AssistantQueryRequest) => Promise<void>;
  appendAssistantMessages: (messages: AssistantChatMessage[]) => void;
  refreshAssistantAnswer: () => Promise<void>;
  userTimezone: string;
  setUserTimezone: (timezone: string) => Promise<void>;
  suggestions: Array<{ id: string; type: string; title: string; body: string; actionType?: string; itemId?: string; provider?: string }>;
  replyToEmail: (threadId: string, body: string) => Promise<{ success: boolean }>;
  replyToSlack: (channelId: string, text: string, threadTs?: string) => Promise<{ success: boolean }>;
  userTier: string;
}

const consentProviders: IntegrationProvider[] = [
  "slack",
  "gmail",
  "google_drive",
  "onedrive",
  "dropbox",
  "google_calendar",
  "healthkit",
  "weatherkit"
];

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({
  children,
  userId,
  accessToken
}: PropsWithChildren<{ userId: string; accessToken: string }>) {
  const api = useMemo(() => createApiClient({ userId, accessToken }), [accessToken, userId]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RootTabKey>("brief");
  const [mode, setMode] = useState<Mode>("execution");
  const [consents, setConsents] = useState<IntegrationConsent[]>([]);
  const [integrationAccounts, setIntegrationAccounts] = useState<IntegrationAccount[]>([]);
  const [externalItems, setExternalItems] = useState<ExternalItem[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [latestContext, setLatestContext] = useState<DailyContextSnapshot | null>(null);
  const [dailyBrief, setDailyBrief] = useState<DailyBriefJson | null>(null);
  const [selectedRunDetails, setSelectedRunDetails] = useState<WorkflowRun | null>(null);
  const [assistantAnswer, setAssistantAnswer] = useState<AssistantAnswer["answer"] | null>(null);
  const [assistantReferences, setAssistantReferences] = useState<AssistantAnswer["contextReferences"] | null>(null);
  const [assistantChats, setAssistantChats] = useState<AssistantChat[]>([]);
  const [assistantActiveChatId, setAssistantActiveChatId] = useState<string | null>(null);
  const [assistantSidebarOpen, setAssistantSidebarOpen] = useState(false);
  const [assistantNavBarHidden, setAssistantNavBarHidden] = useState(false);
  const [assistantComposerCompactByChat, setAssistantComposerCompactByChat] = useState<
    Record<string, boolean>
  >({});
  const [assistantMessages, setAssistantMessages] = useState<AssistantChatMessage[]>([]);
  const [assistantSending, setAssistantSending] = useState(false);
  const [userTimezone, setUserTimezoneState] = useState<string>(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [suggestions, setSuggestions] = useState<AppStateValue["suggestions"]>([]);
  const [userTier, setUserTier] = useState("free");

  const CACHE_KEY = `marvin:appCache:${userId}`;

  const loadCachedState = useCallback(async () => {
    try {
      const raw = await storage.getItem(CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw) as {
        latestContext?: DailyContextSnapshot;
        externalItems?: ExternalItem[];
        integrations?: IntegrationAccount[];
      };
      if (cached.latestContext) setLatestContext(cached.latestContext);
      if (cached.externalItems?.length) setExternalItems(cached.externalItems);
      if (cached.integrations?.length) setIntegrationAccounts(cached.integrations);
    } catch {
      // Cache miss is fine
    }
  }, [CACHE_KEY]);

  const persistCache = useCallback(async (ctx: DailyContextSnapshot | null, items: ExternalItem[], integrations: IntegrationAccount[]) => {
    try {
      await storage.setItem(CACHE_KEY, JSON.stringify({
        latestContext: ctx,
        externalItems: items.slice(0, 100),
        integrations
      }));
    } catch {
      // Cache write failure is non-critical
    }
  }, [CACHE_KEY]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    await loadCachedState();

    try {
      const [
        consentsResponse,
        integrationsResponse,
        itemsResponse,
        workflowsResponse,
        historyResponse,
        latestContextResponse,
        dailyBriefResponse,
        chatsResponse,
        profileResponse
      ] =
        await Promise.all([
          api.listConsents(),
          api.listIntegrations(),
          api.listItems(),
          api.listWorkflows(),
          api.listHistory(),
          api.getLatestContext(),
          api.getDailyBrief(),
          api.listAssistantChats(),
          api.getProfile().catch(() => ({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }))
        ]);

      const byProvider = new Map(consentsResponse.consents.map((item) => [item.provider, item]));
      const nowIso = new Date().toISOString();
      setConsents(
        consentProviders.map(
          (provider) =>
            byProvider.get(provider) ?? {
              provider,
              enabled: false,
              scopes: [],
              metadataOnly: true,
              updatedAtIso: nowIso
            }
        )
      );
      setIntegrationAccounts(integrationsResponse.integrations);
      setExternalItems(itemsResponse.items);
      setWorkflows(workflowsResponse.workflows);
      setWorkflowRuns(historyResponse.runs);
      setLatestContext(latestContextResponse.snapshot);
      if (dailyBriefResponse?.dailyBrief) setDailyBrief(dailyBriefResponse.dailyBrief);
      setAssistantChats(chatsResponse.chats);
      const firstChatId = chatsResponse.chats[0]?.id ?? null;
      setAssistantActiveChatId(firstChatId);
      if (firstChatId) {
        const { messages } = await api.listAssistantChatMessages(firstChatId);
        setAssistantMessages(messages);
      } else {
        setAssistantMessages([]);
      }
      setUserTimezoneState(profileResponse.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

      void persistCache(latestContextResponse.snapshot, itemsResponse.items, integrationsResponse.integrations);

      void api.getSuggestions().then((r) => setSuggestions(r.suggestions)).catch(() => {});
      void api.getTier().then((r) => setUserTier(r.tier)).catch(() => {});

      setIsLoading(false);

      const snapshot = latestContextResponse.snapshot;
      const staleThresholdMs = 15 * 60 * 1000;
      const isStale =
        !snapshot ||
        Date.now() - new Date(snapshot.generatedAtIso).getTime() > staleThresholdMs;
      if (isStale) {
        try {
          const { snapshot: fresh } = await api.runContextPipeline();
          setLatestContext(fresh);
          const [{ runs }, { integrations }, { items }] = await Promise.all([
            api.listHistory(),
            api.listIntegrations(),
            api.listItems()
          ]);
          setWorkflowRuns(runs);
          setIntegrationAccounts(integrations);
          setExternalItems(items);
          void persistCache(fresh, items, integrations);
        } catch {
          // ignore – user can refresh manually
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load app state.");
      setIsLoading(false);
    }
  }, [api, loadCachedState, persistCache]);

  const sendAssistantMessage = useCallback(async (payload: AssistantQueryRequest) => {
    const question = payload.question.trim();
    const normalizedQuestion =
      question.length > 0 ? question : "Please analyze the attached media using my latest context.";
    const attachments: AssistantAttachment[] = payload.attachments ?? [];

    setAssistantSending(true);
    try {
      const { response, chatId, userMessage, assistantMessage } = await api.askAssistant({
        question: normalizedQuestion,
        attachments,
        chatId: assistantActiveChatId ?? undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      setAssistantAnswer(response.answer);
      setAssistantReferences(response.contextReferences ?? null);
      setAssistantActiveChatId(chatId);
      setAssistantComposerCompactByChat((current) => ({
        ...current,
        [chatId]: true
      }));
      const enrichedAssistantMessage = response.structured
        ? { ...assistantMessage, structured: response.structured }
        : assistantMessage;
      setAssistantMessages((current) => {
        const withoutThinking = current.filter((m) => m.id !== "thinking-placeholder");
        if (assistantActiveChatId && assistantActiveChatId === chatId) {
          return [...withoutThinking, userMessage, enrichedAssistantMessage];
        }
        return [userMessage, enrichedAssistantMessage];
      });
      const { chats } = await api.listAssistantChats();
      setAssistantChats(chats);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Assistant request failed.";
      setError(
        msg.toLowerCase().includes("aborted")
          ? "Request timed out. The assistant may be busy—try again in a moment."
          : msg
      );
      setAssistantMessages((current) => current.filter((m) => m.id !== "thinking-placeholder"));
    } finally {
      setAssistantSending(false);
    }
  }, [api, assistantActiveChatId]);

  const appendAssistantMessages = useCallback((messages: AssistantChatMessage[]) => {
    setAssistantMessages((current) => [...current, ...messages]);
  }, []);

  const setUserTimezone = useCallback(
    async (timezone: string) => {
      await api.updateProfile({ timezone });
      setUserTimezoneState(timezone);
    },
    [api]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      try {
        const parsed = new URL(url);
        const isOAuthCallback = parsed.host === "oauth" && parsed.pathname === "/callback";
        if (isOAuthCallback) {
          void (async () => {
            const { integrations } = await api.listIntegrations();
            setIntegrationAccounts(integrations);
          })();
        }
      } catch {
        // Ignore malformed deeplink events.
      }
    });
    return () => {
      subscription.remove();
    };
  }, [api]);

  const lastBackgroundAtRef = useRef<number | null>(null);

  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        lastBackgroundAtRef.current = Date.now();
      }
      if (nextState === "active") {
        const inactiveMs = lastBackgroundAtRef.current
          ? Date.now() - lastBackgroundAtRef.current
          : 0;
        const inactiveThresholdMs = 15 * 60 * 1000;
        if (inactiveMs >= inactiveThresholdMs) {
          setAssistantActiveChatId(null);
          setAssistantMessages([]);
          setAssistantAnswer(null);
          setAssistantReferences(null);
        }
        void (async () => {
          try {
            const { snapshot } = await api.getLatestContext();
            const staleThresholdMs = 15 * 60 * 1000;
            const isStale =
              !snapshot ||
              Date.now() - new Date(snapshot.generatedAtIso).getTime() > staleThresholdMs;
            if (isStale) {
              const { snapshot: fresh, dailyBrief: brief } = await api.runContextPipeline();
              setLatestContext(fresh);
              if (brief) setDailyBrief(brief);
              const { runs } = await api.listHistory();
              setWorkflowRuns(runs);
              const { integrations } = await api.listIntegrations();
              setIntegrationAccounts(integrations);
            }
          } catch {
            // ignore
          }
        })();
      }
    });
    return () => sub.remove();
  }, [api]);

  const value = useMemo<AppStateValue>(
    () => ({
      isLoading,
      error,
      retryLoad: loadAll,
      activeTab,
      setActiveTab,
      mode,
      setMode,
      consents,
      upsertConsent: async (consent) => {
        await api.upsertConsent(consent);
        setConsents((current) => {
          const index = current.findIndex((item) => item.provider === consent.provider);
          if (index === -1) {
            return [...current, consent];
          }
          const copy = [...current];
          copy[index] = consent;
          return copy;
        });
      },
      integrationAccounts,
      startIntegrationConnect: async (provider) => {
        const { authorizationUrl } = await api.startIntegrationOAuth(provider);
        return authorizationUrl;
      },
      disconnectIntegration: async (provider) => {
        const { integrations } = await api.disconnectIntegration(provider);
        setIntegrationAccounts(integrations);
      },
      refreshIntegrations: async () => {
        const { integrations } = await api.listIntegrations();
        setIntegrationAccounts(integrations);
      },
      externalItems,
      workflows,
      upsertWorkflow: async (workflow) => {
        const { workflow: nextWorkflow } = await api.upsertWorkflow(workflow);
        setWorkflows((current) => {
          const index = current.findIndex((item) => item.id === nextWorkflow.id);
          if (index === -1) {
            return [...current, nextWorkflow];
          }
          const copy = [...current];
          copy[index] = nextWorkflow;
          return copy;
        });
      },
      workflowRuns,
      runWorkflowNow: async (workflowId) => {
        try {
        const { run } = await api.runWorkflow(workflowId);
        setWorkflowRuns((current) => [run, ...current]);
        const { snapshot } = await api.getLatestContext();
        setLatestContext(snapshot);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Workflow failed");
        }
      },
      latestContext,
      dailyBrief,
      runContextPipelineNow: async () => {
        try {
        const { snapshot, dailyBrief: brief } = await api.runContextPipeline();
        setLatestContext(snapshot);
        if (brief) setDailyBrief(brief);
        const [{ runs }, { integrations }, { items }] = await Promise.all([
          api.listHistory(),
          api.listIntegrations(),
          api.listItems()
        ]);
        setWorkflowRuns(runs);
        setIntegrationAccounts(integrations);
        setExternalItems(items);
        void persistCache(snapshot, items, integrations);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Pipeline failed");
        }
      },
      selectedRunDetails,
      loadRunDetails: async (runId) => {
        const { run } = await api.getRunDetails(runId);
        setSelectedRunDetails(run);
      },
      assistantAnswer,
      assistantReferences,
      assistantChats,
      assistantActiveChatId,
      assistantSidebarOpen,
      setAssistantSidebarOpen,
      assistantNavBarHidden,
      setAssistantNavBarHidden,
      assistantComposerCompactByChat,
      setAssistantComposerCompact: (chatId, compact) => {
        setAssistantComposerCompactByChat((current) => ({
          ...current,
          [chatId]: compact
        }));
      },
      setAssistantActiveChat: async (chatId) => {
        setAssistantActiveChatId(chatId);
        const { messages } = await api.listAssistantChatMessages(chatId);
        setAssistantMessages(messages);
      },
      startAssistantChat: () => {
        setAssistantActiveChatId(null);
        setAssistantMessages([]);
        setAssistantAnswer(null);
        setAssistantReferences(null);
      },
      assistantMessages,
      assistantSending,
      sendAssistantMessage,
      appendAssistantMessages,
      refreshAssistantAnswer: async () => {
        const { response, assistantMessage } = await api.askAssistant({
          question: "What is blocking me this morning?",
          chatId: assistantActiveChatId ?? undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        setAssistantAnswer(response.answer);
        setAssistantReferences(response.contextReferences ?? null);
        if (response.structured && assistantMessage) {
          setAssistantMessages((current) => [...current, { ...assistantMessage, structured: response.structured }]);
        }
      },
      userTimezone,
      setUserTimezone,
      suggestions,
      replyToEmail: async (threadId: string, body: string) => {
        return api.replyEmail(threadId, body);
      },
      replyToSlack: async (channelId: string, text: string, threadTs?: string) => {
        return api.replySlack(channelId, text, threadTs);
      },
      userTier
    }),
    [
      isLoading,
      error,
      activeTab,
      mode,
      consents,
      integrationAccounts,
      externalItems,
      workflows,
      workflowRuns,
      latestContext,
      selectedRunDetails,
      assistantAnswer,
      assistantReferences,
      assistantChats,
      assistantActiveChatId,
      assistantSidebarOpen,
      assistantNavBarHidden,
      assistantComposerCompactByChat,
      assistantMessages,
      assistantSending,
      sendAssistantMessage,
      appendAssistantMessages,
      userTimezone,
      setUserTimezone,
      suggestions,
      userTier,
      api
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }
  return context;
}
