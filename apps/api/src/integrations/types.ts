import type {
  CalendarEvent,
  ExternalItem,
  HealthSignals,
  IntegrationAccount,
  MailThread,
  WeatherSnapshot
} from "@pia/shared";

export interface MailProvider {
  listUnansweredThreads(userId: string): Promise<MailThread[]>;
}

export interface CalendarProvider {
  listEventsForDay(userId: string, isoDate: string): Promise<CalendarEvent[]>;
}

export interface HealthProvider {
  getDailySignals(userId: string): Promise<HealthSignals>;
}

export interface WeatherProvider {
  getLocalSnapshot(userId: string): Promise<WeatherSnapshot>;
}

export interface IntegrationProvider {
  listAccounts(userId: string): Promise<IntegrationAccount[]>;
}

export interface ExternalItemProvider {
  listItems(userId: string): Promise<ExternalItem[]>;
}
