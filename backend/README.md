# Backend — Personal Finance API

Cloudflare Worker (Hono) + D1 (SQLite) + Drizzle ORM. Single-user API secured
with a shared bearer token.

## Setup

```bash
pnpm install

# Create the D1 database (first time only)
npx wrangler d1 create personal-finance
# Copy the returned database_id into wrangler.toml ([[d1_databases]] database_id)

# Apply migrations
pnpm run db:migrate:local    # for local dev
pnpm run db:migrate:remote   # for the deployed Worker

# Local secret (create backend/.dev.vars, gitignored):
echo "API_SECRET=your-shared-secret" > .dev.vars
```

## Dev

```bash
pnpm dev
```

Runs at `http://localhost:8787`. Try:

```bash
curl http://localhost:8787/health

curl -X POST http://localhost:8787/expenses \
  -H "Authorization: Bearer your-shared-secret" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "description": "Coffee", "source": "web"}'

curl http://localhost:8787/analytics/summary \
  -H "Authorization: Bearer your-shared-secret"
```

## Deploy

```bash
npx wrangler secret put API_SECRET   # set the real secret in production
pnpm deploy
```

See [../DEPLOYMENT.md](../DEPLOYMENT.md) for the full walkthrough — ordering
across all three packages, wiring the frontend/bot to this Worker, and
locking down CORS once the frontend is deployed.

## Auth model

There's no per-user login — one shared secret (`API_SECRET`), checked as a
plain bearer token, gates every route but `/health`. That's intentional for a
single-user app the bot and frontend both call server-to-server. The one place
it's weaker than it looks: the frontend is a static site, so its copy of the
secret (`VITE_API_SECRET`) ends up readable in the shipped JS bundle — anyone
who opens dev tools on the deployed site can extract it. If that's not an
acceptable tradeoff, put the frontend behind
[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
instead of relying on the token for real protection.

## API

All routes except `/health` require `Authorization: Bearer <API_SECRET>`.

- `GET /expenses?from=&to=&categoryId=&limit=`
- `GET /expenses/:id`
- `POST /expenses` `{ amount, description, currency?, categoryId?, occurredAt?, source }`
- `PATCH /expenses/:id`
- `DELETE /expenses/:id`
- `GET /categories`
- `POST /categories` `{ name, icon? }`
- `DELETE /categories/:id`
- `GET /analytics/summary?month=YYYY-MM`
- `GET /analytics/trends?months=6`

## Extending with AI

[src/lib/ai/categorize.ts](src/lib/ai/categorize.ts) is a stubbed extension point for
LLM-assisted category suggestions — not implemented yet. Wire it into
`POST /expenses` when ready (call it when `categoryId` is omitted).
