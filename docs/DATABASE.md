# Database

Supabase project `ylnrkfpchrzvuhqrnwco` ("Client Monitoring", eu-west-1). The
authoritative column list is the generated `my-website/src/types/supabase.ts`;
this page covers what the types don't: where data comes from, who can see it,
and what runs on a schedule. Checked against the live database on 2026-09-25.

## Tables

| Table | Rows (approx.) | Written by | Notes |
|-------|----------------|------------|-------|
| `users` | 13 | sign-up trigger, admins | `is_admin`, `is_dpr_lead`, `is_active`; `monday_person_id` links Monday "DPR Lead" people, email links Clockify users |
| `clients` | 130 | `sync-monday`, `calculate-all-metrics` | One row per Monday item. `dpr_lead_id` → `users`. Metric columns are filled by the metrics job. `monday_last_seen_at` / `monday_removed_at` / `removal_*` track items that left Monday (see OPERATIONS.md) |
| `sprints` | 250 | `sync-monday`, `calculate-all-metrics` | Quarterly sprints (Monday sub-items). Stored `health_status`, `tracking_status`, `billable_rate`, `hours_used/allocated` |
| `time_entries` | 27k | `sync-clockify` | Clockify entries matched to a client/sprint |
| `sync_logs` | growing | all three functions | One row per run: `source`, `status`, `records_synced`, `error_message` |
| `client_admin_actions` | few | `delete_removed_client`, `merge_removed_client` | Log of admin decisions on removed clients: inactive, keep, deleted, merged |

### Stored sprint values

- **hours_allocated** = client `monthly_hours` × 3.
- **sprint revenue** = sprint `monthly_rate` (falling back to the client's) × 3,
  or the rate as-is when the client has `is_quarterly_rate`.
- **billable_rate** = revenue ÷ hours used (null until hours are logged).
- **health_status**: `not-started`, `on-track`, `ahead`, `needs-attention`,
  `kpi-complete`, `completed`.
- **tracking_status** (enum `tracking_status_type`): `pending` (future),
  `legacy` (ended before Clockify, no data), `partial` (started before
  1 Feb 2025), `fully_tracked`, `kpi_only`, `hours_only`, `untracked`.

The formulas live in `supabase/functions/calculate-all-metrics/sprint-formulas.ts`
and `tracking-calculator.ts`, with tests in `my-website/src/lib/sprint-formulas.test.ts`.

## Access (row-level security)

All tables have RLS on. `anon` has no table privileges, `authenticated` has
`SELECT` only, and `service_role` (the edge functions' secret key) can write.
There are only `SELECT` policies, so nothing signed-in can write. The
`clients`/`sprints` policies also require a `@studiohawk.com.au` address
(migration `20261012120000_security_hardening.sql`).

| Table | Admins | Other signed-in staff |
|-------|--------|-----------------------|
| `clients`, `sprints` | all rows | all rows |
| `time_entries` | all rows | their own entries, and entries on sprints for clients they lead |
| `users` | all rows | their own row |
| `sync_logs`, `client_admin_actions` | all rows | none |

Helper functions, all `SECURITY DEFINER` with a pinned `search_path`:

| Function | Callable by | Purpose |
|----------|-------------|---------|
| `auth_email()` | signed-in | current user's email (used by policies) |
| `is_current_user_admin()` | signed-in | admin flag for policies and the Reports page |
| `get_sprint_hours(uuid[])` | signed-in | total hours per sprint (Sprints page) |
| `get_time_tracking_analytics()` | signed-in, returns rows to admins only | hours by task category per client's DPR lead (no longer used by the website) |
| `get_time_tracking_by_person()` | signed-in, returns rows to admins only | each person's own hours by task category, averaged over the completed sprints where they logged more than 5 hours (Reports > Time Tracking table and cards) |
| `get_removed_clients()` | signed-in, returns rows to admins (and the service role) | clients removed from Monday, with hours and any re-created copy |
| `review_removed_client(uuid, text)` | signed-in, admins only | record `inactive` / `keep` for a removed client (and log it) |
| `delete_removed_client(uuid)` | signed-in, admins only | delete a removed client with no time entries or KPI results |
| `merge_removed_client(uuid, uuid)` | signed-in, admins only | move a removed client's time entries to its same-named live copy, re-match sprints, delete it |

`sprint_for_entry(uuid, date)` (the sprint an entry belongs to, same rule as
`sync-clockify`) is internal: only the merge function and the service role use it.

No other `public` function is executable by `anon` or `authenticated`, and new
functions don't get `anon` access by default.

Triggers on `auth.users`: `check_email_domain_trigger` rejects non-StudioHawk
emails; `on_auth_user_created` creates the matching `users` row.

## Scheduled jobs (pg_cron)

| Job | Schedule (UTC) | What |
|-----|----------------|------|
| `update-sprint-statuses-daily` | 00:05 | SQL: set sprint `status` from its dates |
| `sync-monday-daily` | 03:00 | POST `sync-monday` |
| `calculate-all-metrics-morning` | 06:00 | POST `calculate-all-metrics` (`skipReports`) |
| `sync-clockify-daily` | 18:00 | POST `sync-clockify` (`days_back: 7`) |
| `calculate-all-metrics-evening` | 18:15 | POST `calculate-all-metrics` (`skipReports`), after the Clockify sync |

The HTTP jobs send `Authorization: Bearer <Vault secret cron_secret>`; no key
is stored in `cron.job`.

## Migrations

`supabase/migrations/20260925160000_baseline.sql` is the complete public schema
as of 25 Sep 2026 (tables, constraints, indexes, functions, triggers, RLS,
grants and cron jobs), rebuilt from the live catalogs by
`supabase/tools/schema_snapshot.py`. It was verified by loading it into an
empty Postgres and regenerating: the result matched the live database exactly.
To stand up a new project: apply the baseline, create the Vault secret
`cron_secret`, set the edge function secrets, then apply later migrations.

Every schema change since goes in a new, later-dated file in
`supabase/migrations/`, applied in the SQL editor. Migrations from before the
baseline are folded into it.

To check the live schema against the repo, regenerate and diff:

```bash
SUPABASE_ACCESS_TOKEN=... python3 supabase/tools/schema_snapshot.py > /tmp/live.sql
```
