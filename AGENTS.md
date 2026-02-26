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

### Testing authenticated API endpoints

To test `/v1/*` endpoints, obtain a bearer token via Supabase auth:
```
curl -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${EXPO_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"<user-email>","password":"<password>"}'
```
Use the `access_token` from the response as `Authorization: Bearer <token>`. The `user.id` field must match the `:userId` param in API routes.

### LLM provider configuration

The LLM client (`apps/api/src/ai/llm/client.ts`) supports any OpenAI-compatible API:
- `OPENAI_BASE_URL` — defaults to `https://api.openai.com/v1`. Set to `https://openrouter.ai/api/v1` for OpenRouter.
- `OPENAI_API_KEY` — the API key for the configured provider.
- `OPENAI_MODEL` — the model name (e.g. `gpt-5.2`, `anthropic/claude-sonnet-4.5`).

Tool calling loop: the model may make up to 3 iterations of tool calls per request. Each iteration is a separate LLM API call. Most of the assistant endpoint latency comes from this loop (typically 2-3 iterations × model inference time).

### dotenv behavior

The API loads `apps/api/.env` via dotenv, which does **not** override existing environment variables by default. When secrets are injected into the environment (e.g. via Cursor Cloud secrets), dotenv only fills in vars not already set. This is correct behavior — no need to override.

### Lint / typecheck / test

Standard commands from `README.md`:
- `npm run typecheck` — runs `tsc --noEmit` across all workspaces
- `npm run lint` — currently placeholder echoes in all workspaces
- `npm run test` — currently placeholder echoes in all workspaces
