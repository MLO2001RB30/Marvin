# Marvin
AI Personal Intelligence

Implementation aligned to the PRD and Elegant Luxury design direction:

- `apps/mobile`: Expo/React Native client with MVP modules.
- `apps/api`: Node/Express orchestration API with context engine and privacy endpoints.
- `packages/shared`: shared contracts, types, and deterministic mock fixtures.

## Context-Engine First Architecture

- Daily context snapshot persistence (`daily_context_snapshots`) as the shared product state
- Context pipeline endpoint + optional scheduler for background snapshot generation
- Workflow execution with stage results, artifact references, and run-to-context linkage
- Assistant answers grounded in stored snapshots and run artifacts
- Settings/History/Home now consume persisted context outcomes instead of only local mocks
- Assistant screen now includes a multimodal chat composer (text + image upload + voice note)
- Audio attachments can be transcribed server-side before grounded reasoning

## Local Run

1. Install dependencies:
   - `npm install`
2. Start API:
   - `npm run -w @pia/api dev`
   - requires bearer auth for all `/v1/*` endpoints
   - apply Supabase schema in `apps/api/supabase-schema.sql`
3. Start mobile:
   - `npm run -w @pia/mobile start`
4. Optional scheduled pipeline:
   - set `PIPELINE_AUTO_RUN=true` and tune `PIPELINE_TICK_MS`

## API Endpoints (Current)

- `GET /health`
- `GET /v1/integrations/:userId`
- `POST /v1/integrations/:userId/connect/:provider`
- `GET /v1/items/:userId`
- `GET /v1/context/:userId/latest`
- `POST /v1/context/:userId/pipeline/run`
- `GET /v1/workflows/:userId`
- `POST /v1/workflows/:userId`
- `POST /v1/workflows/:userId/:workflowId/run`
- `GET /v1/history/:userId`
- `GET /v1/history/:userId/:runId`
- `GET /v1/metrics/:userId`
- `GET /v1/digest/:userId`
- `POST /v1/assistant/:userId/query`
- `GET /v1/context/:userId`
- `GET /v1/brief/:userId`
- `POST /v1/privacy/consent`

## QA / Launch Readiness Checklist

- [ ] API health endpoint responds (`GET /health`)
- [ ] Context snapshot endpoint returns latest persisted brief (`GET /v1/context/:userId/latest`)
- [ ] Manual pipeline run writes snapshot + traces (`POST /v1/context/:userId/pipeline/run`)
- [ ] Integrations endpoint returns provider health states (`GET /v1/integrations/:userId`)
- [ ] Workflow CRUD/runtime endpoints produce run history (`GET/POST /v1/workflows/:userId`)
- [ ] Workflow run detail endpoint returns stages + artifacts (`GET /v1/history/:userId/:runId`)
- [ ] Digest endpoint returns ranked outstanding items + signals (`GET /v1/digest/:userId`)
- [ ] Assistant endpoint returns grounded answer + context references (`POST /v1/assistant/:userId/query`)
- [ ] Assistant endpoint accepts multimodal payloads (`question` + optional `attachments`)
- [ ] Mobile can navigate Home/Workflows/Assistant/History/Settings
- [ ] Home renders persisted context summary and pipeline timestamp
- [ ] Settings screen shows integration freshness/activity
- [ ] History screen reflects run stages and integrations used
- [ ] Assistant screen can upload an image and record/send a voice note

### Verification Run (This Implementation)

- [x] Workspace dependencies installed (`npm install`)
- [x] Typecheck passes in all workspaces (`npm run -ws typecheck`)
- [x] Lint scripts executed (`npm run -ws lint`)
- [x] Test scripts executed (`npm run -ws test`)
- [x] New API + shared contracts compile under strict TypeScript
- [x] Context engine services compile (snapshot/pipeline/assistant grounding)
- [ ] Manual API endpoint smoke checks
- [ ] Manual mobile interaction smoke checks

## Privacy Model

- Sensitive integration payloads are modeled as local-first signals.
- The cloud orchestration boundary expects metadata/embeddings only.
- Consent is explicit per integration with revocation support.
