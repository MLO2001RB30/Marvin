# Personal Intelligence App (MVP)

Implementation aligned to the PRD and Elegant Luxury design direction:

- `apps/mobile`: Expo/React Native client with MVP modules.
- `apps/api`: Node/Express orchestration API with context engine and privacy endpoints.
- `packages/shared`: shared contracts, types, and deterministic mock fixtures.

## Ambitious V1 Features Implemented

- Settings with integration health and connect/disconnect controls
- Workflow builder surface with scheduled templates and manual run trigger
- Digest intelligence for outstanding item detection with explainability signals
- Assistant surface with context-grounded responses
- History timeline for workflow run logs and delivery outcomes
- Legacy Morning Intelligence surfaces retained in codebase for reference

## Local Run

1. Install dependencies:
   - `npm install`
2. Start API:
   - `npm run -w @pia/api dev`
3. Start mobile:
   - `npm run -w @pia/mobile start`

## API Endpoints (Current)

- `GET /health`
- `GET /v1/integrations/:userId`
- `POST /v1/integrations/:userId/connect/:provider`
- `GET /v1/items/:userId`
- `GET /v1/workflows/:userId`
- `POST /v1/workflows/:userId`
- `POST /v1/workflows/:userId/:workflowId/run`
- `GET /v1/history/:userId`
- `GET /v1/metrics/:userId`
- `GET /v1/digest/:userId`
- `POST /v1/assistant/:userId/query`
- `GET /v1/context/:userId`
- `GET /v1/brief/:userId`
- `POST /v1/privacy/consent`

## QA / Launch Readiness Checklist

- [ ] API health endpoint responds (`GET /health`)
- [ ] Integrations endpoint returns provider health states (`GET /v1/integrations/:userId`)
- [ ] Workflow CRUD/runtime endpoints produce run history (`GET/POST /v1/workflows/:userId`)
- [ ] Digest endpoint returns ranked outstanding items + signals (`GET /v1/digest/:userId`)
- [ ] Assistant endpoint returns answer + citations (`POST /v1/assistant/:userId/query`)
- [ ] Mobile can navigate Home/Workflows/Assistant/History/Settings
- [ ] Settings screen toggles integration connection state
- [ ] Workflows screen can create run entries in local timeline
- [ ] History screen reflects latest run status and channels

### Verification Run (This Implementation)

- [x] Workspace dependencies installed (`npm install`)
- [x] Typecheck passes in all workspaces (`npm run -ws typecheck`)
- [x] Lint scripts executed (`npm run -ws lint`)
- [x] Test scripts executed (`npm run -ws test`)
- [x] New API + shared contracts compile under strict TypeScript
- [ ] Manual API endpoint smoke checks
- [ ] Manual mobile interaction smoke checks

## Privacy Model

- Sensitive integration payloads are modeled as local-first signals.
- The cloud orchestration boundary expects metadata/embeddings only.
- Consent is explicit per integration with revocation support.
