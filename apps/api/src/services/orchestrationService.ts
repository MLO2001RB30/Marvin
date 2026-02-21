import {
  mockContextInputs,
  type ContextInputs,
  type MorningBrief,
  type WorkflowDefinition,
  type WorkflowRun
} from "@pia/shared";

import { buildContextResult } from "./contextEngine";
import { buildOutstandingDigest } from "./digestService";
import { listExternalItems } from "./integrationService";
import {
  MockCalendarProvider,
  MockHealthProvider,
  MockMailProvider,
  MockWeatherProvider
} from "../integrations/mockProviders";

const mailProvider = new MockMailProvider();
const calendarProvider = new MockCalendarProvider();
const healthProvider = new MockHealthProvider();
const weatherProvider = new MockWeatherProvider();

export async function ingestSignals(userId: string): Promise<ContextInputs> {
  const [mail, calendar, health, weather] = await Promise.all([
    mailProvider.listUnansweredThreads(userId),
    calendarProvider.listEventsForDay(userId, new Date().toISOString().slice(0, 10)),
    healthProvider.getDailySignals(userId),
    weatherProvider.getLocalSnapshot(userId)
  ]);

  return {
    ...mockContextInputs,
    mail: { ...mockContextInputs.mail, payload: mail },
    calendar: { ...mockContextInputs.calendar, payload: calendar },
    health: { ...mockContextInputs.health, payload: health },
    weather: { ...mockContextInputs.weather, payload: weather }
  };
}

export async function buildMorningBrief(userId: string): Promise<MorningBrief> {
  const inputs = await ingestSignals(userId);
  const result = buildContextResult(inputs);

  return {
    unansweredCount: inputs.mail.payload.length,
    meetingsToday: inputs.calendar.payload.length,
    weatherSummary: `${inputs.weather.payload.condition}, ${inputs.weather.payload.temperatureC}°C`,
    readiness: result.scores.energyScore >= 65 ? "Ready for execution mode" : "Recommend recovery mode",
    topPriorities: inputs.goals.payload,
    suggestedActions: result.recommendations
  };
}

export async function executeWorkflow(
  userId: string,
  workflow: WorkflowDefinition
): Promise<WorkflowRun> {
  const startedAtIso = new Date().toISOString();
  try {
    const externalItems = await listExternalItems(userId);
    const selected = externalItems.filter((item) =>
      workflow.selectedProviders.includes(item.provider)
    );
    const digest = buildOutstandingDigest(selected);
    return {
      id: `run-${Date.now()}`,
      workflowId: workflow.id,
      startedAtIso,
      finishedAtIso: new Date().toISOString(),
      status: "success",
      deliveredChannels: workflow.deliveryChannels,
      digest
    };
  } catch (error) {
    return {
      id: `run-${Date.now()}`,
      workflowId: workflow.id,
      startedAtIso,
      finishedAtIso: new Date().toISOString(),
      status: "failed",
      deliveredChannels: [],
      errorMessage: error instanceof Error ? error.message : "Unknown workflow execution error"
    };
  }
}
