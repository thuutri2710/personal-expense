# Frontend — Personal Finance

Vite + React + TypeScript + Tailwind + shadcn/ui + Recharts + TanStack Query.

## Setup

```bash
pnpm install
cp .env.example .env.local
# edit .env.local: VITE_API_URL (backend URL) and VITE_API_SECRET (must match
# the backend's API_SECRET)
```

## Dev

```bash
pnpm dev
```

Runs at `http://localhost:5173`. Requires the [backend](../backend) to be running.

## Build & deploy

```bash
pnpm build      # outputs to dist/
```

Deploy `dist/` to Cloudflare Pages (or any static host):

```bash
npx wrangler pages deploy dist --project-name personal-finance-frontend
```

See [../DEPLOYMENT.md](../DEPLOYMENT.md) for the full walkthrough — setting
`VITE_API_URL`/`VITE_API_SECRET` at build time, and looping back to lock down
the backend's CORS once this is deployed.

## Structure

- `src/pages` — Dashboard, Expenses, Analytics, Settings
- `src/components/charts` — category breakdown, monthly trend, stat cards
- `src/components/expenses` — add/edit dialog, table, delete confirmation
- `src/hooks` — TanStack Query hooks wrapping `src/lib/api.ts`
- `src/lib/chart-colors.ts` — fixed categorical color mapping per category id
