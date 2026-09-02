# Personal Finance

A personal expense tracker in three parts, all TypeScript, all deployable to
Cloudflare:

- **[backend/](backend)** — Cloudflare Worker API (Hono + D1 + Drizzle), single-user,
  shared-secret auth. Has a stubbed extension point for AI-assisted categorization.
- **[telegram-bot/](telegram-bot)** — Cloudflare Worker running a Telegram bot
  (grammY, webhook mode). Send free-text expenses like `50k coffee` to log them.
- **[frontend/](frontend)** — Vite + React + Tailwind + shadcn/ui dashboard.
  Charts (category breakdown, monthly trend), full expense list with filters,
  and manual expense entry.

## Setup order

1. **backend** — create the D1 database, run migrations, start it locally.
   See [backend/README.md](backend/README.md).
2. **frontend** — point `VITE_API_URL` / `VITE_API_SECRET` at the backend and run it.
   See [frontend/README.md](frontend/README.md).
3. **telegram-bot** — create a bot via BotFather, point it at the backend,
   deploy, register the webhook. See [telegram-bot/README.md](telegram-bot/README.md).

All three share one contract: the backend's `API_SECRET` must match
`BACKEND_API_SECRET` (bot) and `VITE_API_SECRET` (frontend).

## Local dev quick start

```bash
# Terminal 1 — backend
cd backend
pnpm install
npx wrangler d1 create personal-finance   # copy database_id into wrangler.toml
pnpm run db:migrate:local
echo "API_SECRET=devsecret" > .dev.vars
pnpm dev                                   # http://localhost:8787

# Terminal 2 — frontend
cd frontend
pnpm install
cp .env.example .env.local                 # VITE_API_SECRET should match API_SECRET above
pnpm dev                                   # http://localhost:5173
```

The Telegram bot needs a real bot token and a public webhook URL, so it's set
up separately once the backend is deployed — see its README.

## Deploying

Each package deploys independently via `wrangler deploy` (backend, bot) or a
static build to Cloudflare Pages (frontend). Nothing is deployed automatically —
see **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full walkthrough (order,
cross-service config, CORS, webhook registration).
