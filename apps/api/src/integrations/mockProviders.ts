import {
  mockContextInputs,
  mockExternalItems,
  mockIntegrationAccounts
} from "@pia/shared";

import type {
  CalendarProvider,
  ExternalItemProvider,
  HealthProvider,
  IntegrationProvider,
  MailProvider,
  WeatherProvider
} from "./types";

export class MockMailProvider implements MailProvider {
  async listUnansweredThreads(_userId: string): Promise<typeof mockContextInputs.mail.payload> {
    return mockContextInputs.mail.payload;
  }
}

export class MockCalendarProvider implements CalendarProvider {
  async listEventsForDay(
    _userId: string,
    _isoDate: string
  ): Promise<typeof mockContextInputs.calendar.payload> {
    return mockContextInputs.calendar.payload;
  }
}

export class MockHealthProvider implements HealthProvider {
  async getDailySignals(_userId: string): Promise<typeof mockContextInputs.health.payload> {
    return mockContextInputs.health.payload;
  }
}

export class MockWeatherProvider implements WeatherProvider {
  async getLocalSnapshot(_userId: string): Promise<typeof mockContextInputs.weather.payload> {
    return mockContextInputs.weather.payload;
  }
}

export class MockIntegrationProvider implements IntegrationProvider {
  async listAccounts(_userId: string) {
    return mockIntegrationAccounts;
  }
}

export class MockExternalItemProvider implements ExternalItemProvider {
  async listItems(_userId: string) {
    return mockExternalItems;
  }
}
