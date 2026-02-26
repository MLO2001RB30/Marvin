import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { ExternalItem, IntegrationAccount, IntegrationProvider } from "@pia/shared";

import { env } from "../config/env";
import {
  buildOAuthAdapterForProvider,
  getOAuthProviderGroup,
  getProvidersForGroup,
  getProviderScopes,
  parseGrantedScopes
} from "./oauthProviders";
import { getSupabaseClient } from "./supabaseClient";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export async function listIntegrationAccounts(userId: string): Promise<IntegrationAccount[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }
  const { data } = await client
    .from("integration_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => ({
    provider: row.provider,
    status: row.status,
    scopes: row.scopes ?? [],
    metadataOnly: Boolean(row.metadata_only),
    lastSyncAtIso: row.last_sync_at ?? new Date().toISOString()
  })) as IntegrationAccount[];
}

export async function listExternalItems(userId: string): Promise<ExternalItem[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }
  const { data } = await client
    .from("external_items")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at_iso", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    provider: row.provider,
    type: row.type,
    sourceRef: row.source_ref,
    title: row.title,
    summary: row.summary,
    requiresReply: Boolean(row.requires_action ?? row.requires_reply),
    isOutstanding: row.status === "new" || row.status === "open" || Boolean(row.is_outstanding),
    sender: row.sender ?? undefined,
    tags: row.tags ?? [],
    createdAtIso: row.created_at_iso,
    updatedAtIso: row.updated_at_iso
  })) as ExternalItem[];
}

function normalizeProvider(provider: string): IntegrationProvider | null {
  const allowed: IntegrationProvider[] = [
    "slack",
    "gmail",
    "google_drive",
    "onedrive",
    "dropbox",
    "google_calendar",
    "healthkit",
    "weatherkit"
  ];
  return allowed.includes(provider as IntegrationProvider) ? (provider as IntegrationProvider) : null;
}

function resolveTokenEncryptionKey() {
  if (!env.OAUTH_ENCRYPTION_KEY) {
    throw new Error("Missing OAUTH_ENCRYPTION_KEY env var");
  }
  const raw = env.OAUTH_ENCRYPTION_KEY.trim();
  const asHex = /^[a-fA-F0-9]{64}$/.test(raw) ? Buffer.from(raw, "hex") : null;
  const asBase64 = raw.length >= 43 ? Buffer.from(raw, "base64") : null;
  const key = asHex ?? asBase64;
  if (!key || key.length !== 32) {
    throw new Error("OAUTH_ENCRYPTION_KEY must decode to 32 bytes (hex/base64)");
  }
  return key;
}

function encryptSecret(plainText: string) {
  const key = resolveTokenEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipherText: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64")
  };
}

function decryptSecret(payload: { cipherText: string; iv: string; tag: string }) {
  const key = resolveTokenEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.cipherText, "base64")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

function combineEncryptedValue(cipherText: string, iv: string, tag: string) {
  return JSON.stringify({ cipherText, iv, tag });
}

function parseEncryptedValue(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { cipherText: string; iv: string; tag: string };
    if (!parsed.cipherText || !parsed.iv || !parsed.tag) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function buildAppRedirectUrl(params: {
  provider: IntegrationProvider;
  userId: string;
  status: "success" | "error";
  reason?: string;
}) {
  if (!env.OAUTH_APP_CALLBACK_URL) {
    return null;
  }
  const url = new URL(env.OAUTH_APP_CALLBACK_URL);
  url.searchParams.set("provider", params.provider);
  url.searchParams.set("userId", params.userId);
  url.searchParams.set("status", params.status);
  if (params.reason) {
    url.searchParams.set("reason", params.reason);
  }
  return url.toString();
}

async function upsertIntegrationStatus(
  userId: string,
  providers: IntegrationProvider[],
  status: IntegrationAccount["status"],
  scopes: string[],
  metadataOnly: boolean
) {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  const now = new Date().toISOString();
  for (const provider of providers) {
    await client.from("integration_accounts").upsert(
      {
        user_id: userId,
        provider,
        status,
        scopes,
        metadata_only: metadataOnly,
        last_sync_at: now,
        updated_at: now
      },
      { onConflict: "user_id,provider" }
    );
  }
}

async function runInitialSyncProjection(
  userId: string,
  providers: IntegrationProvider[],
  scopes: string[]
) {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  const now = new Date().toISOString();
  const rows = providers.map((provider, idx) => ({
    id: `${provider}-${userId}-${Date.now()}-${idx}`,
    user_id: userId,
    provider,
    type:
      provider === "slack"
        ? "slack_message"
        : provider === "gmail"
          ? "gmail_thread"
          : provider === "google_drive"
            ? "drive_file"
            : provider === "google_calendar"
              ? "calendar_event"
              : provider === "onedrive"
                ? "onedrive_file"
                : "dropbox_file",
    source_ref: `initial-sync:${provider}:${now}`,
    title: `Connected ${provider} account`,
    summary: "Initial sync projection created during OAuth callback.",
    requires_reply: false,
    is_outstanding: false,
    tags: ["integration_connected", "oauth"],
    created_at_iso: now,
    updated_at_iso: now
  }));
  await client.from("external_items").upsert(rows, { onConflict: "id" });
  await upsertIntegrationStatus(userId, providers, "connected", scopes, false);
}

export async function startIntegrationOAuth(userId: string, provider: IntegrationProvider) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is required for OAuth state persistence");
  }
  const normalizedProvider = normalizeProvider(provider);
  if (!normalizedProvider) {
    throw new Error(`Unknown integration provider: ${provider}`);
  }
  const group = getOAuthProviderGroup(normalizedProvider);
  if (group === "local") {
    throw new Error(`Provider ${normalizedProvider} does not support OAuth`);
  }
  const state = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();
  await client.from("oauth_states").insert({
    state,
    user_id: userId,
    provider: normalizedProvider,
    expires_at: expiresAt
  });

  const adapter = buildOAuthAdapterForProvider(normalizedProvider);
  const authorizationUrl = adapter.buildAuthorizationUrl(state);
  return { provider: normalizedProvider, authorizationUrl, state };
}

export async function completeIntegrationOAuth(params: {
  provider: string;
  state: string;
  code?: string;
  error?: string;
}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is required for OAuth callbacks");
  }
  const callbackProvider = normalizeProvider(params.provider);
  const { data: stateRow } = await client
    .from("oauth_states")
    .select("*")
    .eq("state", params.state)
    .maybeSingle();

  if (!stateRow) {
    throw new Error("Invalid OAuth state");
  }
  const provider = normalizeProvider(String(stateRow.provider));
  if (!provider) {
    throw new Error("OAuth state contains unsupported provider");
  }
  if (callbackProvider && callbackProvider !== provider) {
    const callbackGroup = getOAuthProviderGroup(callbackProvider);
    const stateGroup = getOAuthProviderGroup(provider);
    if (callbackGroup !== stateGroup || callbackGroup === "local") {
      throw new Error("OAuth callback provider does not match state provider");
    }
  }
  if (new Date(stateRow.expires_at).getTime() < Date.now() || stateRow.consumed_at) {
    throw new Error("OAuth state expired or already used");
  }
  const userId = String(stateRow.user_id);
  await client
    .from("oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("state", params.state)
    .eq("provider", provider);

  if (params.error || !params.code) {
    await upsertIntegrationStatus(userId, [provider], "disconnected", getProviderScopes(provider), true);
    return {
      ok: false,
      provider,
      userId,
      appRedirectUrl: buildAppRedirectUrl({
        provider,
        userId,
        status: "error",
        reason: params.error ?? "missing_code"
      })
    };
  }

  const adapter = buildOAuthAdapterForProvider(provider);
  const token = await adapter.exchangeCode(params.code);
  const group = getOAuthProviderGroup(provider);
  if (group === "local") {
    throw new Error("Local-only providers cannot complete OAuth");
  }
  const groupedProviders = getProvidersForGroup(group);
  const scopes = parseGrantedScopes(token.scope);
  const expiresAt =
    typeof token.expiresInSeconds === "number" && token.expiresInSeconds > 0
      ? new Date(Date.now() + token.expiresInSeconds * 1000).toISOString()
      : null;

  const encryptedAccess = encryptSecret(token.accessToken);
  const encryptedRefresh = token.refreshToken ? encryptSecret(token.refreshToken) : null;
  const now = new Date().toISOString();

  for (const targetProvider of groupedProviders) {
    await client.from("integration_tokens").upsert(
      {
        user_id: userId,
        provider: targetProvider,
        access_token_encrypted: combineEncryptedValue(
          encryptedAccess.cipherText,
          encryptedAccess.iv,
          encryptedAccess.tag
        ),
        refresh_token_encrypted: encryptedRefresh
          ? combineEncryptedValue(
              encryptedRefresh.cipherText,
              encryptedRefresh.iv,
              encryptedRefresh.tag
            )
          : null,
        expires_at: expiresAt,
        scopes,
        token_type: token.tokenType ?? null,
        updated_at: now
      },
      { onConflict: "user_id,provider" }
    );
  }

  await upsertIntegrationStatus(userId, groupedProviders, "connected", scopes, false);
  await runInitialSyncProjection(userId, groupedProviders, scopes);

  return {
    ok: true,
    provider,
    userId,
    appRedirectUrl: buildAppRedirectUrl({ provider, userId, status: "success" })
  };
}

async function readAccessToken(userId: string, provider: IntegrationProvider) {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data } = await client
    .from("integration_tokens")
    .select("access_token_encrypted")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  const encryptedPayload = parseEncryptedValue(data?.access_token_encrypted);
  if (!encryptedPayload) {
    return null;
  }
  return decryptSecret(encryptedPayload);
}

const GOOGLE_TOKEN_BUFFER_MS = 5 * 60 * 1000;

async function refreshGoogleToken(
  userId: string,
  refreshToken: string
): Promise<{ accessToken: string; expiresInSeconds: number } | null> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!response.ok) {
    return null;
  }
  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  const accessToken = typeof json.access_token === "string" ? json.access_token : null;
  const expiresInSeconds = typeof json.expires_in === "number" ? json.expires_in : 3600;
  if (!accessToken) {
    return null;
  }
  const client = getSupabaseClient();
  if (client) {
    const encryptedAccess = encryptSecret(accessToken);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const now = new Date().toISOString();
    for (const provider of ["gmail", "google_drive", "google_calendar"] as const) {
      await client.from("integration_tokens").upsert(
        {
          user_id: userId,
          provider,
          access_token_encrypted: combineEncryptedValue(
            encryptedAccess.cipherText,
            encryptedAccess.iv,
            encryptedAccess.tag
          ),
          expires_at: expiresAt,
          updated_at: now
        },
        { onConflict: "user_id,provider" }
      );
    }
  }
  return { accessToken, expiresInSeconds };
}

export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data } = await client
    .from("integration_tokens")
    .select("access_token_encrypted, refresh_token_encrypted, expires_at")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .maybeSingle();
  if (!data) {
    return null;
  }
  const accessPayload = parseEncryptedValue(data.access_token_encrypted);
  if (!accessPayload) {
    return null;
  }
  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  const now = Date.now();
  if (expiresAt > now + GOOGLE_TOKEN_BUFFER_MS) {
    return decryptSecret(accessPayload);
  }
  const refreshPayload = parseEncryptedValue(data.refresh_token_encrypted);
  if (!refreshPayload) {
    return decryptSecret(accessPayload);
  }
  const refreshToken = decryptSecret(refreshPayload);
  const refreshed = await refreshGoogleToken(userId, refreshToken);
  return refreshed?.accessToken ?? decryptSecret(accessPayload);
}

export async function getSlackAccessToken(userId: string): Promise<string | null> {
  return readAccessToken(userId, "slack");
}

export async function disconnectIntegration(userId: string, provider: IntegrationProvider) {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }
  const group = getOAuthProviderGroup(provider);
  if (group === "local") {
    await upsertIntegrationStatus(userId, [provider], "disconnected", getProviderScopes(provider), true);
    return listIntegrationAccounts(userId);
  }
  const providers = getProvidersForGroup(group);

  try {
    const adapter = buildOAuthAdapterForProvider(provider);
    const accessToken = await readAccessToken(userId, provider);
    if (accessToken) {
      await adapter.revokeToken(accessToken);
    }
  } catch {
    await upsertIntegrationStatus(userId, providers, "token_expired", getProviderScopes(provider), true);
  }
  await client.from("integration_tokens").delete().eq("user_id", userId).in("provider", providers);
  await upsertIntegrationStatus(userId, providers, "disconnected", getProviderScopes(provider), true);

  return listIntegrationAccounts(userId);
}
