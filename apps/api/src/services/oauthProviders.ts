import type { IntegrationProvider } from "@pia/shared";

import { env } from "../config/env";

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
  scope?: string;
  tokenType?: string;
}

interface OAuthProviderAdapter {
  buildAuthorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthTokenResponse>;
  revokeToken(accessToken: string): Promise<void>;
}

type OAuthProviderGroup = "google" | "slack" | "microsoft" | "dropbox";

const GOOGLE_SHARED_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.metadata",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events"
];

const PROVIDER_GROUPS: Record<IntegrationProvider, OAuthProviderGroup | "local"> = {
  slack: "slack",
  gmail: "google",
  google_drive: "google",
  google_calendar: "google",
  onedrive: "microsoft",
  dropbox: "dropbox",
  healthkit: "local",
  weatherkit: "local"
};

const GROUP_TO_PROVIDERS: Record<OAuthProviderGroup, IntegrationProvider[]> = {
  google: ["gmail", "google_drive", "google_calendar"],
  slack: ["slack"],
  microsoft: ["onedrive"],
  dropbox: ["dropbox"]
};

function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function toScopeList(scope: string | undefined) {
  return scope?.split(/[,\s]+/).map((value) => value.trim()).filter(Boolean) ?? [];
}

async function readJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

function createGoogleAdapter(): OAuthProviderAdapter {
  const clientId = required("GOOGLE_CLIENT_ID", env.GOOGLE_CLIENT_ID);
  const clientSecret = required("GOOGLE_CLIENT_SECRET", env.GOOGLE_CLIENT_SECRET);
  const redirectUri = required("GOOGLE_REDIRECT_URI", env.GOOGLE_REDIRECT_URI);
  return {
    buildAuthorizationUrl(state) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        access_type: "offline",
        include_granted_scopes: "true",
        prompt: "consent",
        scope: GOOGLE_SHARED_SCOPES.join(" "),
        state
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    },
    async exchangeCode(code) {
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      });
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      const json = await readJsonSafely(response);
      if (!response.ok) {
        throw new Error(`Google token exchange failed: ${response.status} ${JSON.stringify(json)}`);
      }
      return {
        accessToken: String(json.access_token ?? ""),
        refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
        expiresInSeconds:
          typeof json.expires_in === "number"
            ? json.expires_in
            : Number.parseInt(String(json.expires_in ?? "0"), 10) || undefined,
        scope: typeof json.scope === "string" ? json.scope : undefined,
        tokenType: typeof json.token_type === "string" ? json.token_type : undefined
      };
    },
    async revokeToken(accessToken) {
      const url = new URL("https://oauth2.googleapis.com/revoke");
      url.searchParams.set("token", accessToken);
      await fetch(url.toString(), { method: "POST" });
    }
  };
}

function createSlackAdapter(): OAuthProviderAdapter {
  const clientId = required("SLACK_CLIENT_ID", env.SLACK_CLIENT_ID);
  const clientSecret = required("SLACK_CLIENT_SECRET", env.SLACK_CLIENT_SECRET);
  const redirectUri = required("SLACK_REDIRECT_URI", env.SLACK_REDIRECT_URI);
  const scopes = [
    "channels:read",
    "channels:history",
    "groups:read",
    "groups:history",
    "im:read",
    "im:history",
    "mpim:read",
    "mpim:history",
    "users:read"
  ];
  return {
    buildAuthorizationUrl(state) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        user_scope: scopes.join(","),
        state
      });
      return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
    },
    async exchangeCode(code) {
      const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      });
      const response = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      const json = await readJsonSafely(response);
      if (!response.ok || json.ok !== true) {
        throw new Error(`Slack token exchange failed: ${response.status} ${JSON.stringify(json)}`);
      }
      const authedUser = (json.authed_user ?? {}) as Record<string, unknown>;
      const token = typeof authedUser.access_token === "string" ? authedUser.access_token : undefined;
      return {
        accessToken: token ?? String(json.access_token ?? ""),
        scope: typeof authedUser.scope === "string" ? authedUser.scope : undefined,
        tokenType: typeof json.token_type === "string" ? json.token_type : undefined
      };
    },
    async revokeToken(accessToken) {
      const body = new URLSearchParams({ token: accessToken });
      await fetch("https://slack.com/api/auth.revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
    }
  };
}

function createMicrosoftAdapter(): OAuthProviderAdapter {
  const clientId = required("MICROSOFT_CLIENT_ID", env.MICROSOFT_CLIENT_ID);
  const clientSecret = required("MICROSOFT_CLIENT_SECRET", env.MICROSOFT_CLIENT_SECRET);
  const redirectUri = required("MICROSOFT_REDIRECT_URI", env.MICROSOFT_REDIRECT_URI);
  const scopes = ["offline_access", "Files.Read", "User.Read"];
  return {
    buildAuthorizationUrl(state) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        response_mode: "query",
        scope: scopes.join(" "),
        state
      });
      return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    },
    async exchangeCode(code) {
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      });
      const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      const json = await readJsonSafely(response);
      if (!response.ok) {
        throw new Error(`Microsoft token exchange failed: ${response.status} ${JSON.stringify(json)}`);
      }
      return {
        accessToken: String(json.access_token ?? ""),
        refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
        expiresInSeconds:
          typeof json.expires_in === "number"
            ? json.expires_in
            : Number.parseInt(String(json.expires_in ?? "0"), 10) || undefined,
        scope: typeof json.scope === "string" ? json.scope : undefined,
        tokenType: typeof json.token_type === "string" ? json.token_type : undefined
      };
    },
    async revokeToken() {
      // Microsoft Graph typically revokes on app-side deletion/rotation. Treat as no-op.
    }
  };
}

function createDropboxAdapter(): OAuthProviderAdapter {
  const clientId = required("DROPBOX_CLIENT_ID", env.DROPBOX_CLIENT_ID);
  const clientSecret = required("DROPBOX_CLIENT_SECRET", env.DROPBOX_CLIENT_SECRET);
  const redirectUri = required("DROPBOX_REDIRECT_URI", env.DROPBOX_REDIRECT_URI);
  return {
    buildAuthorizationUrl(state) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        token_access_type: "offline",
        state
      });
      return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
    },
    async exchangeCode(code) {
      const body = new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      });
      const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      const json = await readJsonSafely(response);
      if (!response.ok) {
        throw new Error(`Dropbox token exchange failed: ${response.status} ${JSON.stringify(json)}`);
      }
      return {
        accessToken: String(json.access_token ?? ""),
        refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
        expiresInSeconds:
          typeof json.expires_in === "number"
            ? json.expires_in
            : Number.parseInt(String(json.expires_in ?? "0"), 10) || undefined,
        scope: Array.isArray(json.scope) ? (json.scope as string[]).join(" ") : undefined,
        tokenType: typeof json.token_type === "string" ? json.token_type : undefined
      };
    },
    async revokeToken(accessToken) {
      await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    }
  };
}

export function getOAuthProviderGroup(provider: IntegrationProvider) {
  return PROVIDER_GROUPS[provider];
}

export function getProvidersForGroup(group: OAuthProviderGroup): IntegrationProvider[] {
  return GROUP_TO_PROVIDERS[group];
}

export function getProviderScopes(provider: IntegrationProvider): string[] {
  if (provider === "gmail" || provider === "google_drive" || provider === "google_calendar") {
    return GOOGLE_SHARED_SCOPES;
  }
  if (provider === "slack") {
    return ["channels:read", "channels:history", "users:read"];
  }
  if (provider === "onedrive") {
    return ["Files.Read", "User.Read"];
  }
  if (provider === "dropbox") {
    return ["files.metadata.read"];
  }
  return [];
}

export function buildOAuthAdapterForProvider(provider: IntegrationProvider) {
  const group = getOAuthProviderGroup(provider);
  if (group === "local") {
    throw new Error(`Provider ${provider} does not support OAuth`);
  }
  if (group === "google") {
    return createGoogleAdapter();
  }
  if (group === "slack") {
    return createSlackAdapter();
  }
  if (group === "microsoft") {
    return createMicrosoftAdapter();
  }
  return createDropboxAdapter();
}

export function parseGrantedScopes(scope: string | undefined) {
  return toScopeList(scope);
}
