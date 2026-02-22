import type { IntegrationProvider, IntegrationProviderMetadata } from "./types";

export const integrationProviderRegistry: Record<IntegrationProvider, IntegrationProviderMetadata> = {
  slack: {
    provider: "slack",
    displayName: "Slack",
    category: "communication",
    logoUri: "https://cdn.simpleicons.org/slack/ffffff",
    defaultScopes: ["channels:history", "users:read"],
    docsUrl: "https://api.slack.com/authentication/oauth-v2",
    oauthProviderGroup: "slack"
  },
  gmail: {
    provider: "gmail",
    displayName: "Gmail",
    category: "communication",
    logoUri: "https://cdn.simpleicons.org/gmail/ffffff",
    defaultScopes: ["gmail.readonly", "gmail.metadata"],
    docsUrl: "https://developers.google.com/workspace/gmail/api/auth/scopes",
    oauthProviderGroup: "google"
  },
  google_drive: {
    provider: "google_drive",
    displayName: "Google Drive",
    category: "storage",
    logoUri: "https://cdn.simpleicons.org/googledrive/ffffff",
    defaultScopes: ["drive.metadata.readonly"],
    docsUrl: "https://developers.google.com/drive/api/guides/api-specific-auth",
    oauthProviderGroup: "google"
  },
  google_calendar: {
    provider: "google_calendar",
    displayName: "Google Calendar",
    category: "calendar",
    logoUri: "https://cdn.simpleicons.org/googlecalendar/ffffff",
    defaultScopes: ["calendar.read"],
    docsUrl: "https://developers.google.com/workspace/calendar/api/auth",
    oauthProviderGroup: "google"
  },
  onedrive: {
    provider: "onedrive",
    displayName: "Microsoft OneDrive",
    category: "storage",
    logoUri: "https://cdn.simpleicons.org/microsoftonedrive/ffffff",
    defaultScopes: ["files.read"],
    docsUrl: "https://learn.microsoft.com/graph/permissions-reference",
    oauthProviderGroup: "microsoft"
  },
  dropbox: {
    provider: "dropbox",
    displayName: "Dropbox",
    category: "storage",
    logoUri: "https://cdn.simpleicons.org/dropbox/ffffff",
    defaultScopes: ["files.metadata.read"],
    docsUrl: "https://www.dropbox.com/developers/reference/oauth-guide",
    oauthProviderGroup: "dropbox"
  },
  healthkit: {
    provider: "healthkit",
    displayName: "Apple Health",
    category: "health",
    logoUri: "https://cdn.simpleicons.org/apple/ffffff",
    defaultScopes: ["sleep.read", "hrv.read", "recovery.read"]
  },
  weatherkit: {
    provider: "weatherkit",
    displayName: "WeatherKit",
    category: "context",
    logoUri: "https://cdn.simpleicons.org/apple/ffffff",
    defaultScopes: ["weather.read"]
  }
};

export const integrationProviderOrder: IntegrationProvider[] = [
  "slack",
  "gmail",
  "google_drive",
  "google_calendar",
  "onedrive",
  "dropbox",
  "healthkit",
  "weatherkit"
];
