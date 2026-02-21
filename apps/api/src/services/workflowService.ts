import {
  mockWorkflows,
  mockWorkflowRuns,
  type WorkflowDefinition,
  type WorkflowRun
} from "@pia/shared";

const workflowsByUser = new Map<string, WorkflowDefinition[]>();
const runsByUser = new Map<string, WorkflowRun[]>();

function ensureWorkflows(userId: string) {
  const current = workflowsByUser.get(userId);
  if (current) {
    return current;
  }
  const seeded = mockWorkflows.map((item) => ({ ...item }));
  workflowsByUser.set(userId, seeded);
  return seeded;
}

function ensureRuns(userId: string) {
  const current = runsByUser.get(userId);
  if (current) {
    return current;
  }
  const seeded = mockWorkflowRuns.map((item) => ({ ...item }));
  runsByUser.set(userId, seeded);
  return seeded;
}

export function listWorkflows(userId: string): WorkflowDefinition[] {
  return ensureWorkflows(userId);
}

export function upsertWorkflow(userId: string, workflow: WorkflowDefinition): WorkflowDefinition {
  const current = ensureWorkflows(userId);
  const index = current.findIndex((item) => item.id === workflow.id);
  if (index === -1) {
    current.push(workflow);
    return workflow;
  }
  current[index] = workflow;
  return workflow;
}

export function addWorkflowRun(userId: string, run: WorkflowRun): WorkflowRun {
  const current = ensureRuns(userId);
  current.unshift(run);
  return run;
}

export function listWorkflowRuns(userId: string): WorkflowRun[] {
  return ensureRuns(userId);
}

export function getWorkflowById(
  userId: string,
  workflowId: string
): WorkflowDefinition | undefined {
  return ensureWorkflows(userId).find((item) => item.id === workflowId);
}
