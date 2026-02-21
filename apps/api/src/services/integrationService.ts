import {
  mockExternalItems,
  mockIntegrationAccounts,
  type ExternalItem,
  type IntegrationAccount,
  type IntegrationProvider
} from "@pia/shared";

import {
  MockExternalItemProvider,
  MockIntegrationProvider
} from "../integrations/mockProviders";

const integrationProvider = new MockIntegrationProvider();
const externalItemProvider = new MockExternalItemProvider();

export async function listIntegrationAccounts(userId: string): Promise<IntegrationAccount[]> {
  const accounts = await integrationProvider.listAccounts(userId);
  return accounts.length > 0 ? accounts : mockIntegrationAccounts;
}

export async function listExternalItems(userId: string): Promise<ExternalItem[]> {
  const items = await externalItemProvider.listItems(userId);
  return items.length > 0 ? items : mockExternalItems;
}

export async function connectIntegration(
  userId: string,
  provider: IntegrationProvider
): Promise<IntegrationAccount[]> {
  const accounts = await listIntegrationAccounts(userId);
  return accounts.map((item) =>
    item.provider === provider
      ? {
          ...item,
          status: "connected",
          lastSyncAtIso: new Date().toISOString()
        }
      : item
  );
}
