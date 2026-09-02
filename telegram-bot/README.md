# Telegram Bot — Personal Finance

Cloudflare Worker running a grammY bot in webhook mode. Send it free-text
expenses ("50k coffee") and it logs them to the [backend](../backend) API.

## Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token.
2. Install deps:
   ```bash
   pnpm install
   ```
3. Local secrets (create `telegram-bot/.dev.vars`, gitignored):
   ```
   BOT_TOKEN=123456:your-bot-token
   BACKEND_API_SECRET=your-shared-secret   # must match backend's API_SECRET
   WEBHOOK_SECRET=some-random-string
   ```

## Dev

The backend is reached via a [service binding](wrangler.toml) (`BACKEND`), not
a URL — this avoids Cloudflare error 1042 (Workers can't `fetch()` another
`*.workers.dev` Worker directly). For local dev, run the backend's `wrangler
dev` alongside this one in a separate terminal; wrangler wires bound services
running locally together automatically.

Webhooks also need a public URL, so for local testing either:
- Use `wrangler dev` + a tunnel (e.g. `cloudflared tunnel --url http://localhost:8788`), then register that URL as the webhook, **or**
- Deploy to a dev Worker and test against the real webhook.

```bash
pnpm dev
```

## Deploy & register webhook

```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put BACKEND_API_SECRET
npx wrangler secret put WEBHOOK_SECRET

pnpm deploy
```

Then tell Telegram where to send updates (run once, or whenever the deployed
URL changes):

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<your-worker>.workers.dev",
    "secret_token": "<WEBHOOK_SECRET>"
  }'
```

Verify with:
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

See [../DEPLOYMENT.md](../DEPLOYMENT.md) for the full walkthrough and the
deploy order across all three packages.

## Usage

- Free text like `50k coffee` or `150000 grab food` → logs an expense with a
  best-effort category guess (keyword matching, see [src/parser.ts](src/parser.ts)).
- `/today` — today's expenses
- `/month` — this month's summary by category
- `/categories` — list categories
- `/help` — usage help
