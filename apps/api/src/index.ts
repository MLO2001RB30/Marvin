import express from "express";
import {
  mockContextInputs,
  type AssistantQueryRequest,
  type BuildContextRequest,
  type UpsertConsentRequest,
  type UpsertWorkflowRequest
} from "@pia/shared";

import { env } from "./config/env";
import { upsertConsent, logRecommendationAudit } from "./services/auditService";
import { answerAssistantQuestion } from "./services/assistantService";
import { buildContextResult } from "./services/contextEngine";
import { buildOutstandingDigest } from "./services/digestService";
import {
  connectIntegration,
  listExternalItems,
  listIntegrationAccounts
} from "./services/integrationService";
import { buildMorningBrief, ingestSignals } from "./services/orchestrationService";
import { addWorkflowRun, getWorkflowById, listWorkflowRuns, listWorkflows, upsertWorkflow } from "./services/workflowService";
import { executeWorkflow } from "./services/orchestrationService";
import { computeProductMetrics } from "./services/metricsService";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pia-api" });
});

app.get("/v1/context/:userId", async (req, res) => {
  const { userId } = req.params;
  const inputs = await ingestSignals(userId);
  const result = buildContextResult(inputs);
  await logRecommendationAudit(userId, result);
  res.json({ result });
});

app.post("/v1/context/build", async (req, res) => {
  const payload = req.body as BuildContextRequest;
  const inputs = payload.inputs ?? mockContextInputs;
  const result = buildContextResult(inputs);
  await logRecommendationAudit(payload.userId, result);
  res.json({ result });
});

app.get("/v1/brief/:userId", async (req, res) => {
  const brief = await buildMorningBrief(req.params.userId);
  res.json({ brief });
});

app.post("/v1/privacy/consent", async (req, res) => {
  const payload = req.body as UpsertConsentRequest;
  await upsertConsent(payload.userId, payload.consent);
  res.json({ success: true });
});

app.get("/v1/integrations/:userId", async (req, res) => {
  const integrations = await listIntegrationAccounts(req.params.userId);
  res.json({ integrations });
});

app.post("/v1/integrations/:userId/connect/:provider", async (req, res) => {
  const userId = req.params.userId;
  const provider = req.params.provider as UpsertConsentRequest["consent"]["provider"];
  const integrations = await connectIntegration(userId, provider);
  res.json({ integrations });
});

app.get("/v1/items/:userId", async (req, res) => {
  const items = await listExternalItems(req.params.userId);
  res.json({ items });
});

app.get("/v1/workflows/:userId", (req, res) => {
  const workflows = listWorkflows(req.params.userId);
  res.json({ workflows });
});

app.post("/v1/workflows/:userId", (req, res) => {
  const payload = req.body as UpsertWorkflowRequest;
  const workflow = upsertWorkflow(req.params.userId, payload.workflow);
  res.json({ workflow });
});

app.post("/v1/workflows/:userId/:workflowId/run", async (req, res) => {
  const { userId, workflowId } = req.params;
  const workflow = getWorkflowById(userId, workflowId);
  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }
  const run = await executeWorkflow(userId, workflow);
  addWorkflowRun(userId, run);
  res.json({ run });
});

app.get("/v1/history/:userId", (req, res) => {
  const runs = listWorkflowRuns(req.params.userId);
  res.json({ runs });
});

app.get("/v1/metrics/:userId", (req, res) => {
  const runs = listWorkflowRuns(req.params.userId);
  const metrics = computeProductMetrics(runs);
  res.json({ metrics });
});

app.get("/v1/digest/:userId", async (req, res) => {
  const items = await listExternalItems(req.params.userId);
  const digest = buildOutstandingDigest(items);
  res.json({ digest });
});

app.post("/v1/assistant/:userId/query", async (req, res) => {
  const payload = req.body as AssistantQueryRequest;
  const items = await listExternalItems(req.params.userId);
  const digest = buildOutstandingDigest(items);
  const response = answerAssistantQuestion(payload.question, digest);
  res.json({ response });
});

app.listen(env.PORT, () => {
  // Keep startup logging simple for local development.
  console.log(`PIA API listening on port ${env.PORT}`);
});
