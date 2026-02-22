# OAuth Tunnel Setup (Cloudflare)

Use this to expose your local API for Slack/Gmail OAuth callbacks.

## 0. Add OAuth env vars (if missing)

Add to `apps/api/.env`:

```
OAUTH_APP_CALLBACK_URL=marvin://oauth/callback
OAUTH_ENCRYPTION_KEY=<64 hex chars, e.g. run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

## 1. Install cloudflared

**Windows (winget):**
```bash
winget install --id Cloudflare.cloudflared
```

**Or download:** [cloudflared releases](https://github.com/cloudflare/cloudflared/releases) — use `cloudflared-windows-amd64.exe`.

## 2. Start your API

In one terminal:
```bash
npm run -w @pia/api dev
```

## 3. Start the tunnel

In a **second** terminal (from project root):
```bash
npm run -w @pia/api tunnel
```
Or directly: `cloudflared tunnel --url http://localhost:4000`

You'll see output like:
```
Your quick Tunnel has been created! Visit it at:
https://abc-xyz-123.trycloudflare.com
```

Copy that URL (e.g. `https://abc-xyz-123.trycloudflare.com`).

## 4. Update `.env`

In `apps/api/.env`, replace the tunnel host in each redirect URI (e.g. `abc-xyz-123.trycloudflare.com`):

```
SLACK_REDIRECT_URI=https://abc-xyz-123.trycloudflare.com/v1/integrations/slack/callback
GOOGLE_REDIRECT_URI=https://abc-xyz-123.trycloudflare.com
```

**Google note:** Google Cloud only accepts redirect URIs with the full URL ending in `.com` (the domain). Use the root URL (no path) for `GOOGLE_REDIRECT_URI`. The API handles the callback at `/`.

Also ensure these exist (add if missing):

```
OAUTH_APP_CALLBACK_URL=marvin://oauth/callback
OAUTH_ENCRYPTION_KEY=<64-char-hex-from-step-0>
```

**Important:** The redirect URIs in `.env` must match *exactly* what you configure in Slack and Google Cloud. Any mismatch will cause OAuth to fail.

## 5. Update Slack app

In [Slack API](https://api.slack.com/apps) → Your app → **OAuth & Permissions**:

- **Redirect URLs:** add `https://abc-xyz-123.trycloudflare.com/v1/integrations/slack/callback`
- **User Token Scopes:** add `channels:history`, `users:read`

## 6. Update Google Cloud (Gmail, Drive, Calendar)

In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services**:

- **Enable APIs:** Gmail API, Google Drive API, Google Calendar API
- **Credentials** → Your OAuth client:
  - **Authorized redirect URIs:** add `https://abc-xyz-123.trycloudflare.com` (root URL only—no path)
  - Google requires the redirect URI to end in `.com`; the API handles the callback at the root path.
  - Ensure `GOOGLE_REDIRECT_URI` in `.env` matches this value exactly.

**Scopes used:** read (gmail.readonly, drive.metadata.readonly, calendar.readonly) and write (gmail.send, gmail.compose, drive.file, calendar.events). Users must reconnect Google after adding new scopes.

## 7. Restart API

Restart the API so it picks up the new `.env` values.

## 8. Use tunnel for mobile app (recommended for physical device)

To avoid "network request failed" on a physical device, use the tunnel URL for the mobile app:

In `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://YOUR-TUNNEL-HOST.trycloudflare.com
```

Use the same tunnel host as in `apps/api/.env` (e.g. from `SLACK_REDIRECT_URI`). Restart Expo with `--clear` after changing.

## 9. Test

In the app, tap **Connect** for Slack or Gmail. You should be sent to authorize, then back to the app.

---

**Note:** The tunnel URL changes each time you run `cloudflared tunnel`. If you restart the tunnel, update both `.env` files, Slack, and Google Cloud with the new URL.
