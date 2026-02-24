# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Marvin is an AI Personal Intelligence App (npm workspaces monorepo):
- `apps/api` — Node/Express API on port 4000 (TypeScript via `tsx`)
- `apps/mobile` — Expo/React Native mobile client (iOS, Android, Web on port 8081)
- `packages/shared` — Shared TypeScript contracts and types

### Running services

- **API**: `npm run -w @pia/api dev` — starts on port 4000 with hot-reload (`tsx watch`). Requires `apps/api/.env` (copy from `.env.example`).
- **Mobile (web)**: `npx expo start --web --port 8081` (from workspace root) — Expo web on port 8081.
- **Health check**: `curl http://localhost:4000/health` returns `{"ok":true,"service":"pia-api"}`.

### Key caveats

- All `/v1/*` API endpoints require Supabase-based bearer auth. Without `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured, authenticated routes return 500. The `/health` and `/` endpoints work without Supabase.
- `OPENAI_API_KEY` is optional; without it the API starts but logs a warning and uses template answers for assistant queries.
- OAuth integrations (Google, Slack, Microsoft, Dropbox) are all optional and only needed for their respective sync features.
- The `env.ts` Zod schema marks `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as optional, so the server starts without them.
- Expo `--non-interactive` flag is not supported; use `CI=1` environment variable instead if needed.
- The package manager is **npm** (lockfile: `package-lock.json`). Do not use pnpm or yarn.

### Lint / typecheck / test

Standard commands from `README.md`:
- `npm run typecheck` — runs `tsc --noEmit` across all workspaces
- `npm run lint` — currently placeholder echoes in all workspaces
- `npm run test` — currently placeholder echoes in all workspaces
