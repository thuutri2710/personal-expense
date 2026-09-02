# Deployment Guide

All three parts deploy to Cloudflare. Order matters: **backend first** (the
frontend needs its URL, and the bot's service binding needs it to already
exist), then frontend and the bot in either order.

```
Telegram ──webhook──▶ telegram-bot (Worker) ──service binding + Bearer──▶ backend (Worker) ──▶ D1
                                                                                ▲
Browser ─────────────────────────────────▶ frontend (Pages) ──HTTPS + Bearer──┘
```

The bot never touches the database directly — it only calls the backend's
REST API, same as the frontend does. The bot reaches the backend via a
Cloudflare [service binding](telegram-bot/wrangler.toml) (Worker-to-Worker,
inside Cloudflare's network) rather than a public HTTPS URL — a direct
`fetch()` from one `*.workers.dev` Worker to another is blocked by Cloudflare
(error 1042).

## Prerequisites

- A Cloudflare account.
- Wrangler logged in: `npx wrangler login` (run once, from any of the three folders).
- A Telegram bot token from [@BotFather](https://t.me/BotFather) (only needed for step 3).
- Pick one strong random string to use as the shared API secret — e.g.
  `openssl rand -hex 32`. The same value goes into the backend, the bot, and
  the frontend (see the table at the bottom).

---

## 1. Backend (Cloudflare Worker + D1)

```bash
cd backend
pnpm install
```

**Create the D1 database** (first deploy only):
```bash
npx wrangler d1 create personal-finance
```
Copy the `database_id` it prints into [wrangler.toml](backend/wrangler.toml) under
`[[d1_databases]]`.

**Apply migrations to the remote database:**
```bash
npm run db:migrate:remote
```

**Workers AI:** no setup needed — the `[ai]` binding in
[wrangler.toml](backend/wrangler.toml) gives the Worker access to
[Workers AI](https://developers.cloudflare.com/workers-ai/) automatically,
no API key required. It's used to categorize expenses parsed from free text
(`POST /expenses/parse`), with an `AI_MODEL` var picking the model — change it
there if you want a different one from the
[model catalog](https://developers.cloudflare.com/workers-ai/models/). If the
AI call fails, times out, or is unavailable, categorization silently falls
back to keyword matching — nothing breaks.

**Set the shared secret:**
```bash
npx wrangler secret put API_SECRET
# paste the random string you generated above
```

**Deploy:**
```bash
pnpm deploy
```
Wrangler prints the Worker's URL, e.g. `https://personal-finance-backend.<your-subdomain>.workers.dev`.
**Save this URL** — the frontend and bot both need it.

**Verify:**
```bash
curl https://personal-finance-backend.<your-subdomain>.workers.dev/health
# {"ok":true}
```

You'll come back to this package once more after step 2, to restrict CORS to
the deployed frontend URL.

---

## 2. Frontend (Cloudflare Pages)

```bash
cd frontend
pnpm install
```

Build with the deployed backend URL and the shared secret baked in (Vite
inlines `VITE_*` vars at build time):

```bash
VITE_API_URL=https://personal-finance-backend.<your-subdomain>.workers.dev \
VITE_API_SECRET=<the-same-shared-secret> \
pnpm build
```

> **Security note:** `VITE_API_SECRET` ends up readable in the shipped JS
> bundle — anyone who opens dev tools on your deployed site can extract it.
> For a single-user app that's a conscious tradeoff (see [backend/README.md](backend/README.md)),
> not an oversight. If you want the frontend genuinely gated, put the Pages
> site behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
> rather than relying on the bearer token — ask if you want that wired up.

**Deploy the build:**
```bash
npx wrangler pages deploy dist --project-name personal-finance-frontend
```
First run will prompt to create the Pages project — accept the defaults.
Wrangler prints the site URL, e.g. `https://personal-finance-frontend.pages.dev`.

**Alternative: git-connected Pages project.** If you push this repo to
GitHub, you can instead connect it in the Cloudflare dashboard (Pages → Create
project → connect to Git) for auto-deploy on push. Set:
- Root directory: `frontend`
- Build command: `pnpm build`
- Output directory: `dist`
- Environment variables: `VITE_API_URL`, `VITE_API_SECRET` (same values as above)

**Now go back and lock down CORS on the backend:**
```bash
cd ../backend
```
Edit [wrangler.toml](backend/wrangler.toml), set:
```toml
CORS_ORIGINS = "https://personal-finance-frontend.pages.dev"
```
(comma-separate if you also want to keep `http://localhost:5173` for local dev), then redeploy:
```bash
pnpm deploy
```

---

## 3. Telegram bot (Cloudflare Worker, calls the backend API)

```bash
cd telegram-bot
pnpm install
```

**Set secrets:**
```bash
npx wrangler secret put BOT_TOKEN           # from @BotFather
npx wrangler secret put BACKEND_API_SECRET  # same shared secret as above
npx wrangler secret put WEBHOOK_SECRET      # another random string, e.g. openssl rand -hex 32
```

**Deploy:**
```bash
pnpm deploy
```
Note the printed Worker URL, e.g. `https://personal-finance-telegram-bot.<your-subdomain>.workers.dev`.

**Register the webhook with Telegram** (tells Telegram where to send updates):
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://personal-finance-telegram-bot.<your-subdomain>.workers.dev",
    "secret_token": "<WEBHOOK_SECRET>"
  }'
```

**Verify:**
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```
`url` should match your Worker, and `last_error_message` should be empty.

**Test it:** message your bot on Telegram with `/start`, then send `50k coffee`
and confirm it replies and the expense shows up on the frontend dashboard.

---

## Shared configuration reference

| Value | Backend | Frontend | Bot |
|---|---|---|---|
| Shared API secret | `API_SECRET` (wrangler secret) | `VITE_API_SECRET` (build-time env) | `BACKEND_API_SECRET` (wrangler secret) |
| Backend URL | — | `VITE_API_URL` | — (reached via `BACKEND` service binding, see [telegram-bot/wrangler.toml](telegram-bot/wrangler.toml)) |
| Bot token | — | — | `BOT_TOKEN` (wrangler secret, from BotFather) |
| Webhook secret | — | — | `WEBHOOK_SECRET` (wrangler secret, your choice) |

## Redeploying after code changes

```bash
cd backend && pnpm deploy
cd frontend && VITE_API_URL=... VITE_API_SECRET=... pnpm build && npx wrangler pages deploy dist --project-name personal-finance-frontend
cd telegram-bot && pnpm deploy
```

Database schema changes need a new migration (`pnpm exec drizzle-kit generate`
in `backend/`) applied with `npm run db:migrate:remote` before redeploying.
