import type { DailyContextSnapshot } from "@pia/shared";

import { buildOutstandingDigest } from "./digestService";
import { listExternalItems, listIntegrationAccounts } from "./integrationService";
import { syncGmailForUser } from "./gmailSyncService";
import { syncGoogleCalendarForUser } from "./googleCalendarSyncService";
import { syncGoogleDriveForUser } from "./googleDriveSyncService";
import { syncSlackForUser } from "./slackSyncService";
import { listWorkflowRuns } from "./workflowService";
import { makeSnapshotId, upsertDailyContext } from "./contextSnapshotService";

export interface PipelineRunResult {
  snapshot: DailyContextSnapshot;
  traces: string[];
}

function dateIsoNow() {
  return new Date().toISOString().slice(0, 10);
}

export async function runDailyContextPipeline(userId: string): Promise<PipelineRunResult> {
  const traces: string[] = [];
  const generatedAtIso = new Date().toISOString();
  traces.push("pipeline.start");

  const [slackSynced, gmailSynced, driveSynced, calendarSynced] = await Promise.all([
    syncSlackForUser(userId),
    syncGmailForUser(userId),
    syncGoogleDriveForUser(userId),
    syncGoogleCalendarForUser(userId)
  ]);
  if (slackSynced > 0) traces.push(`pipeline.slack.synced:${slackSynced}`);
  if (gmailSynced > 0) traces.push(`pipeline.gmail.synced:${gmailSynced}`);
  if (driveSynced > 0) traces.push(`pipeline.drive.synced:${driveSynced}`);
  if (calendarSynced > 0) traces.push(`pipeline.calendar.synced:${calendarSynced}`);

  const [items, integrations, runs] = await Promise.all([
    listExternalItems(userId),
    listIntegrationAccounts(userId),
    listWorkflowRuns(userId)
  ]);
  traces.push("pipeline.ingest.complete");

  const digest = buildOutstandingDigest(items);
  traces.push("pipeline.digest.deterministic");

  const outstanding = digest.items;
  const top = outstanding.slice(0, 3).map((item) => item.title);
  const summary = `You have ${outstanding.length} outstanding items across ${integrations.filter((a) => a.status === "connected").length} connected integrations.`;
  const topBlockers = top.slice(0, 2);
  const whatChanged = top.length
    ? [`Top item: ${top[0]}`]
    : ["No outstanding items detected."];

  const latestRun = runs[0];
  const snapshot: DailyContextSnapshot = {
    id: makeSnapshotId(userId, dateIsoNow()),
    userId,
    dateIso: dateIsoNow(),
    generatedAtIso,
    summary,
    confidence: 0.7,
    outstandingItems: digest.items,
    topBlockers,
    whatChanged:
      whatChanged.length > 0
        ? whatChanged
        : latestRun
          ? [`Latest workflow ${latestRun.workflowId} completed ${latestRun.finishedAtIso}`]
          : ["No workflow runs yet today"],
    digest,
    sourceStatuses: integrations.map((item) => ({
      provider: item.provider,
      health: item.status,
      itemCount: items.filter((it) => it.provider === item.provider).length,
      lastSyncAtIso: item.lastSyncAtIso
    })),
    workflowArtifactRefs: runs.flatMap((run) => run.artifactRefs ?? []).slice(0, 20),
    commitments: [],
    llmModel: "deterministic",
    fallbackUsed: false
  };

  await upsertDailyContext(snapshot);
  traces.push("pipeline.persist.complete");

  void import("./notificationService").then(({ sendDailyBriefNotification }) => {
    const needsReply = outstanding.filter((i) => i.category === "reply_needed").length;
    void sendDailyBriefNotification(userId, outstanding.length, needsReply, topBlockers[0] ?? null);
  });

  return { snapshot, traces };
}
