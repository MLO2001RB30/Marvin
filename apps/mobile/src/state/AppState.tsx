import {
  mockContextInputs,
  mockExternalItems,
  mockIntegrationAccounts,
  mockWorkflowRuns,
  mockWorkflows,
  type ExternalItem,
  type IntegrationAccount,
  type IntegrationConsent,
  type IntegrationProvider,
  type Mode,
  type WorkflowDefinition,
  type WorkflowRun
} from "@pia/shared";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState
} from "react";

import type { RootTabKey } from "../navigation/tabIA";

interface AppStateValue {
  activeTab: RootTabKey;
  setActiveTab: (next: RootTabKey) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  consents: IntegrationConsent[];
  upsertConsent: (consent: IntegrationConsent) => void;
  integrationAccounts: IntegrationAccount[];
  toggleIntegration: (provider: IntegrationProvider) => void;
  externalItems: ExternalItem[];
  workflows: WorkflowDefinition[];
  upsertWorkflow: (workflow: WorkflowDefinition) => void;
  workflowRuns: WorkflowRun[];
  addWorkflowRun: (run: WorkflowRun) => void;
  mockInputs: typeof mockContextInputs;
}

const initialConsents: IntegrationConsent[] = [
  {
    provider: "gmail",
    enabled: true,
    scopes: ["threads.read", "threads.metadata"],
    metadataOnly: true,
    updatedAtIso: new Date().toISOString()
  },
  {
    provider: "google_calendar",
    enabled: true,
    scopes: ["calendar.read"],
    metadataOnly: true,
    updatedAtIso: new Date().toISOString()
  },
  {
    provider: "healthkit",
    enabled: true,
    scopes: ["sleep.read", "hrv.read", "recovery.read"],
    metadataOnly: true,
    updatedAtIso: new Date().toISOString()
  },
  {
    provider: "weatherkit",
    enabled: true,
    scopes: ["weather.read"],
    metadataOnly: true,
    updatedAtIso: new Date().toISOString()
  }
];

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [activeTab, setActiveTab] = useState<RootTabKey>("home");
  const [mode, setMode] = useState<Mode>("execution");
  const [consents, setConsents] = useState<IntegrationConsent[]>(initialConsents);
  const [integrationAccounts, setIntegrationAccounts] = useState<IntegrationAccount[]>(
    mockIntegrationAccounts
  );
  const [externalItems] = useState<ExternalItem[]>(mockExternalItems);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(mockWorkflows);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>(mockWorkflowRuns);

  const value = useMemo<AppStateValue>(
    () => ({
      activeTab,
      setActiveTab,
      mode,
      setMode,
      consents,
      upsertConsent: (consent) => {
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
      toggleIntegration: (provider) => {
        setIntegrationAccounts((current) =>
          current.map((account) =>
            account.provider === provider
              ? {
                  ...account,
                  status: account.status === "connected" ? "disconnected" : "connected",
                  lastSyncAtIso: new Date().toISOString()
                }
              : account
          )
        );
      },
      externalItems,
      workflows,
      upsertWorkflow: (workflow) => {
        setWorkflows((current) => {
          const index = current.findIndex((item) => item.id === workflow.id);
          if (index === -1) {
            return [...current, workflow];
          }
          const copy = [...current];
          copy[index] = workflow;
          return copy;
        });
      },
      workflowRuns,
      addWorkflowRun: (run) => {
        setWorkflowRuns((current) => [run, ...current]);
      },
      mockInputs: mockContextInputs
    }),
    [activeTab, mode, consents, integrationAccounts, externalItems, workflows, workflowRuns]
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
