# Marvin Functionality Model

## Core loops

### Capture loop
- Pull integration state and items from:
  - `GET /v1/integrations/:userId`
  - `GET /v1/items/:userId`
  - `GET /v1/privacy/consent/:userId`
- Triggered through `createApiClient()` methods in `apps/mobile/src/services/apiClient.ts`
- Stored in mobile state by `AppStateProvider`:
  - `integrationAccounts`
  - `externalItems`
  - `consents`

### Reasoning loop
- Build and persist daily context using:
  - `POST /v1/context/:userId/pipeline/run`
  - `GET /v1/context/:userId/latest`
- Backend services:
  - `apps/api/src/services/pipelineService.ts`
  - `apps/api/src/services/contextEngine.ts`
  - `apps/api/src/services/contextSnapshotService.ts`
- Outputs mapped to:
  - `latestContext.summary`
  - `latestContext.outstandingItems`
  - `latestContext.topBlockers`
  - `latestContext.sourceStatuses`

### Execution loop
- Workflow lifecycle:
  - `GET /v1/workflows/:userId`
  - `POST /v1/workflows/:userId`
  - `POST /v1/workflows/:userId/:workflowId/run`
  - `GET /v1/history/:userId`
  - `GET /v1/history/:userId/:runId`
- Assistant workflow:
  - `POST /v1/assistant/:userId/query`
- Mobile surfaces:
  - Workflows tab (create/run)
  - History tab (timeline/run details)
  - Assistant tab (grounded answer)

## First value definition
- First value is reached when user completes one of:
  - Connect one provider and run context pipeline.
  - Skip connections and run demo pipeline.
- Home tab should immediately show:
  - Summary
  - Outstanding items
  - Quick next actions
