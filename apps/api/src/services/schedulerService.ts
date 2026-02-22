import { env } from "../config/env";
import { runDailyContextPipeline } from "./pipelineService";
import { listWorkflows } from "./workflowService";

let timer: NodeJS.Timeout | null = null;

async function deriveUsersFromWorkflows(): Promise<string[]> {
  // This scheduler is intentionally conservative: it runs only when explicitly started
  // and only for users that currently have persisted workflows.
  const demoUsers = ["demo-user"];
  const activeUsers = await Promise.all(
    demoUsers.map(async (userId) => {
      const workflows = await listWorkflows(userId);
      return workflows.length > 0 ? userId : null;
    })
  );
  return activeUsers.filter((value): value is string => Boolean(value));
}

export function startScheduler() {
  if (!env.PIPELINE_AUTO_RUN || timer) {
    return;
  }
  timer = setInterval(async () => {
    const users = await deriveUsersFromWorkflows();
    for (const userId of users) {
      await runDailyContextPipeline(userId);
    }
  }, env.PIPELINE_TICK_MS);
}

export function stopScheduler() {
  if (!timer) {
    return;
  }
  clearInterval(timer);
  timer = null;
}
