import type { DailyContextSnapshot } from "@pia/shared";

import { buildOutstandingDigest } from "./digestService";
import { buildDigestWithLLM } from "./llmService";
import { extractCommitments } from "./commitmentService";
import { listExternalItems, listIntegrationAccounts } from "./integrationService";
import { summarizeDailyContext } from "./llmService";
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

  const digest = await buildDigestWithLLM(
    { items, dateIso: dateIsoNow() },
    () => buildOutstandingDigest(items)
  );
  traces.push("pipeline.digest.complete");
  const commitments = await extractCommitments(items);
  if (commitments.length > 0) {
    traces.push(`pipeline.commitments:${commitments.length}`);
  }

  const summary = await summarizeDailyContext({
    userId,
    dateIso: dateIsoNow(),
    items,
    integrations,
    curatedItems: digest.items
  });
  traces.push(summary.usedFallback ? "pipeline.summarize.fallback" : "pipeline.summarize.llm");

  const latestRun = runs[0];
  const snapshot: DailyContextSnapshot = {
    id: makeSnapshotId(userId, dateIsoNow()),
    userId,
    dateIso: dateIsoNow(),
    generatedAtIso,
    summary: summary.summary,
    confidence: summary.confidence,
    outstandingItems: digest.items,
    topBlockers: summary.topBlockers,
    whatChanged:
      summary.whatChanged.length > 0
        ? summary.whatChanged
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
    commitments,
    llmModel: summary.model,
    fallbackUsed: summary.usedFallback
  };

  await upsertDailyContext(snapshot);
  traces.push("pipeline.persist.complete");
  return { snapshot, traces };
}
