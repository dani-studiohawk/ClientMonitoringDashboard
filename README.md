# Client Report Dashboard

StudioHawk's internal dashboard for DPR client sprints: KPI progress, hours
used vs allocated, billable rates and sprint health, per DPR lead.

Live: https://clientreport.vercel.app (Google sign-in, `@studiohawk.com.au` only)

Taking over the dashboard? Start with the [handover book](docs/HANDOVER.md).

## How it works

```
Monday.com (AU/US/UK boards) ─┐
                              ├─► Supabase Edge Functions ─► Postgres ─► Next.js app (Vercel)
Clockify (time entries) ──────┘    (scheduled by pg_cron)
```

1. **Sync.** `sync-monday` pulls clients and sprints from the three Monday boards;
   `sync-clockify` pulls the last 7 days of time entries.
2. **Calculate.** `calculate-all-metrics` works out hours, billable rate, KPI
   progress, health and tracking status for every sprint and client, and stores
   them on the rows.
3. **Display.** The app reads those stored values with the signed-in user's
   session; Postgres row-level security decides what each user can see.

Schedule (UTC; Sydney is +10, or +11 in daylight saving):

| Time  | Job |
|-------|-----|
| 00:05 | `update-sprint-statuses-daily` (SQL: pending → active → completed by date) |
| 03:00 | `sync-monday` |
| 06:00 | `calculate-all-metrics` |
| 18:00 | `sync-clockify` |
| 18:15 | `calculate-all-metrics` |

## Repository layout

| Path | What |
|------|------|
| `my-website/` | Next.js 16 app (App Router, React 19, Tailwind 4, shadcn/Radix, Recharts). Vercel's root directory. |
| `my-website/src/app/dashboard/` | Pages: dashboard (per DPR lead), `sprints/`, `clients/`, `reports/` (admin-only Analytics), `settings/` (admin-only, incl. removed clients) |
| `my-website/src/lib/dashboard/` | Dashboard data: fetch, then a pure `buildDprDashboard()` step (tested) |
| `my-website/src/components/dashboard/dpr/` | Dashboard sections: overview stats, active sprints, clients, completed sprints |
| `my-website/src/lib/sprint-health.ts` | Sprint health rules (the UI's single copy) |
| `my-website/src/lib/sprint-metrics.ts` | KPI/hours performance buckets, average billable rate, hit rate |
| `my-website/src/types/supabase.ts` | Types generated from the live schema |
| `supabase/functions/` | Edge functions; `_shared/auth.ts` holds the caller check |
| `supabase/functions/calculate-all-metrics/sprint-formulas.ts` | Stored-metric formulas (billable rate, hours, health, tracking) |
| `supabase/migrations/` | Baseline schema plus later migrations, applied by hand in the Supabase SQL editor |
| `supabase/tools/schema_snapshot.py` | Regenerates the schema baseline from the live database |
| `docs/` | [Handover book](docs/HANDOVER.md) (start here), [Account migration plan](docs/ACCOUNT_MIGRATION.md), [Database](docs/DATABASE.md), [Operations runbook](docs/OPERATIONS.md) |

## Development

```bash
cd my-website
cp .env.example .env.local   # fill in the publishable key
npm ci
npm run dev                  # http://localhost:3000
```

Before pushing, run what CI runs:

```bash
npm run lint        # eslint, zero warnings allowed
npm run typecheck   # tsc
npm test            # vitest
npm run build
```

After a schema change, regenerate the types:

```bash
npx supabase gen types typescript --project-id ylnrkfpchrzvuhqrnwco --schema public > src/types/supabase.ts
```

## Deploying

- **Website:** merging to `main` deploys to production on Vercel. Every PR gets
  a preview deployment; sign-in works there because the branch preview URL is in
  Supabase's redirect allow list.
- **CI:** `.github/workflows/ci.yml` runs lint, typecheck, tests and build for the
  website and `deno check` for the edge functions on every PR.
- **Edge functions:** deployed automatically by `.github/workflows/deploy-functions.yml`
  when a change under `supabase/functions/` reaches `main` (needs the
  `SUPABASE_ACCESS_TOKEN` repository secret). Apply any related migration first.
- **Database changes:** add a later-dated file to `supabase/migrations/` and run
  it in the Supabase SQL editor. See [docs/DATABASE.md](docs/DATABASE.md#migrations).

## Security model

- Only `@studiohawk.com.au` Google accounts can sign in (Supabase sign-ups are
  disabled, a trigger rejects other domains, and the app checks again).
- The browser only holds the publishable key. All data access goes through RLS;
  staff can read all clients and sprints, time entries are limited to admins, a
  user's own entries, and entries on their clients.
- Database functions are not callable without signing in; the time-tracking
  analytics function returns data to admins only.
- Edge functions reject any caller without the `CRON_SECRET` bearer token, which
  the cron jobs read from Supabase Vault. The functions use the platform's secret
  API key; the legacy JWT secret was revoked on 2026-09-25.
- The app sends a CSP and the usual security headers (`next.config.ts`).
