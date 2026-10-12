# Handover book

Everything someone new needs to own the Client Report dashboard. Read this
first; it links to the detailed docs rather than repeating them:

- [README](../README.md): architecture, repo layout, development, security model
- [DATABASE.md](DATABASE.md): tables, who can see what, stored metric rules, cron jobs, migrations
- [OPERATIONS.md](OPERATIONS.md): step-by-step admin tasks (run a sync, add a lead, rotate secrets, removed clients)

Last reviewed: 25 Sep 2026. Owner: Dani Kimber (Senior Data Analyst).

> **Single point of failure.** As of this review, every account and
> credential the dashboard depends on belongs to one person (Dani): the code,
> hosting, database, Monday and Clockify API keys, Slack webhook and Google
> sign-in setup (section 3). If that account loses access, the syncs stop and
> nobody else can fix them. Adding a second admin to Supabase, Vercel and
> GitHub is the most valuable step in this book (section 11). The plan to
> move ownership to a shared StudioHawk account (e.g. `data@`) is in
> [ACCOUNT_MIGRATION.md](ACCOUNT_MIGRATION.md).

---

## 1. What it is

An internal web app for StudioHawk's Digital PR team. For every DPR client it
shows the quarterly sprints, links (KPIs) achieved against target, hours logged
against the budget, the actual billable rate, and a health status. Each DPR
lead sees their own dashboard; admins see everyone's plus Analytics and
Settings.

The app only **reads and summarises** data. The sources of truth are:

| Data | Source of truth | How it arrives |
|------|-----------------|----------------|
| Clients, sprints, KPI targets/achieved, rates, DPR lead | Monday.com (AU, US, UK boards; sprints are sub-items) | `sync-monday`, daily |
| Time entries | Clockify | `sync-clockify`, daily (last 7 days) |
| Billable rate, hours used, health, tracking status | Calculated | `calculate-all-metrics`, twice daily |
| Who can sign in, who is admin / DPR lead | The `users` table + Supabase Auth | By hand (OPERATIONS.md) |

So "the dashboard is wrong" almost always means the data in Monday or
Clockify is wrong, a sync failed, or a name doesn't match (section 7).

Size today: 125 clients (35 active), 250 sprints, ~27k time entries, 14 users,
6 active DPR leads, 3 admins.

## 2. At a glance

| Thing | Where |
|-------|-------|
| Live site | https://clientreport.vercel.app (Google sign-in, `@studiohawk.com.au` only) |
| Code | GitHub `dani-studiohawk/ClientMonitoringDashboard`, branch `main` |
| Hosting (website) | Vercel project `clientreport` in team `dani-studiohawks-projects`; root directory `my-website` |
| Database, auth, sync functions, schedules | Supabase project `ylnrkfpchrzvuhqrnwco` ("Client Monitoring", eu-west-1) |
| Slack alerts (removed clients) | Incoming webhook to the `#client-monitoring-tool` channel |
| Admin pages in the app | Analytics (`/dashboard/reports`), Settings (`/dashboard/settings`) |

## 3. Accounts and access to transfer

A new owner needs all of these. Several integrations run on **someone's
personal credentials**; if that person leaves or loses access, that sync stops.
Moving them to shared/service accounts is recommended (section 11).

| Access | What it's for | Current holder | How to hand over |
|--------|---------------|----------------|------------------|
| GitHub repo (admin) | Code, CI, repository secrets | Dani | Repo Settings → Collaborators, or transfer to a StudioHawk org |
| Vercel project | Website hosting, env vars, deploy logs | Dani's Vercel team | Invite to the team (or transfer the project) |
| Supabase project (owner/admin) | Database, SQL editor, secrets, logs | Dani (only member of the organisation) | Organization → Team → invite |
| Monday API token (`MONDAY_API_KEY`) | Read the 3 boards | Dani's Monday account | New owner creates a token (Monday → Developers → My access tokens), sets it as the edge function secret |
| Clockify API key (`CLOCKIFY_API_KEY`) | Read time entries for the workspace | Dani's Clockify account | New owner creates a key (Clockify → Profile settings → API), sets the secret; needs access to all users' entries (workspace admin) |
| Slack webhook (`SLACK_WEBHOOK_URL`) | Removed-client alerts to `#client-monitoring-tool` | Installed by Dani | Create a new incoming webhook, set the secret |
| Google OAuth client | "Sign in with Google" | Dani's Google Cloud project | Supabase → Authentication → Providers → Google shows the client ID in use |
| GitHub secret `SUPABASE_ACCESS_TOKEN` | Automatic edge function deploys | Dani (expires 10 Jan 2027) | Replace with the new owner's token (OPERATIONS.md, "Renew the deploy token") |
| App admin rights | Analytics, Settings, all dashboards | Dani, Georgia Anderson, Jinoo Nam | `users.is_admin` (OPERATIONS.md) |

When someone leaves: revoke their tokens above, replace each secret they
owned, remove them from GitHub/Vercel/Supabase, and follow "When someone
leaves" in OPERATIONS.md for the app itself.

## 4. How it works

```
Monday.com (AU/US/UK boards) ─┐
                              ├─► Supabase Edge Functions ─► Postgres ─► Next.js app (Vercel)
Clockify (time entries) ──────┘    (scheduled by pg_cron)      (RLS)      (reads with the user's session)
```

Daily schedule (UTC; Sydney is +10, or +11 in daylight saving):

| UTC | Sydney (AEST / AEDT) | Job |
|-----|----------------------|-----|
| 00:05 | 10:05 / 11:05 | `update-sprint-statuses-daily`: SQL, sets sprint status from dates |
| 03:00 | 13:00 / 14:00 | `sync-monday`: clients, sprints, DPR leads; flags clients missing from Monday |
| 06:00 | 16:00 / 17:00 | `calculate-all-metrics` |
| 18:00 | 04:00 / 05:00 | `sync-clockify`: last 7 days of time entries |
| 18:15 | 04:15 / 05:15 | `calculate-all-metrics` again, after the Clockify sync |

Each job is a pg_cron entry that POSTs to the function with
`Authorization: Bearer <cron_secret from Vault>`. The functions reject any
other caller, so a signed-in user can't trigger a sync; admins run one by
hand from the SQL editor (OPERATIONS.md, "Run a sync now"). Every run writes a
row to `sync_logs`.

### What each sync does

**sync-monday** (`supabase/functions/sync-monday/`)
- Reads every item on the three boards (IDs in the `MONDAY_BOARD_ID_*`
  secrets). Items become `clients`, sub-items become `sprints`.
- Columns are matched **by title**, e.g. "DPR Lead", "Monthly Rate",
  "Campaign Start Date", and on sub-items "Start Date", "End Date",
  "Link KPI Per Quarter", "Links Achieved Per Quarter". **Renaming a Monday
  column breaks that field silently.** The full list is in
  `sync-monday/index.ts` (`parseClientItem` / `parseSprintSubitem`).
- "DPR Lead" (a person column) links to `users.monday_person_id`. A lead not
  in `users` with their Monday person ID shows as "Not assigned".
- Items with "test company" in the name are skipped. Other test items (e.g.
  "ZZ Test …") sync like real clients; delete them in Settings → Removed
  clients once they're gone from Monday. After a board is read completely, clients from that
  region that weren't on it are flagged as removed and announced in Slack
  (OPERATIONS.md, "Clients removed from Monday").

**sync-clockify** (`supabase/functions/sync-clockify/`)
- For each Clockify user whose **email matches a row in `users`**, fetches
  their entries for the last 7 days. Users not in `users` are skipped entirely.
- The Clockify **project name** is matched to a client name: first
  `MANUAL_PROJECT_MAPPINGS` at the top of the file, then an exact
  (case-insensitive) match, then a loose "one name contains the other" match.
  Where several clients share a name (item re-created in Monday), the one
  still on Monday wins.
- Each entry is placed in the sprint covering its date; entries up to 14 days
  before the first sprint (and not before the campaign start) count as
  pre-sprint prep for sprint 1.
- Entries are upserted by Clockify ID, so edits within the 7-day window are
  picked up; older edits are not (widen `days_back` in a manual run).

**calculate-all-metrics** (`supabase/functions/calculate-all-metrics/`)
- Recalculates and stores hours used, hours allocated (monthly hours × 3),
  revenue, billable rate, health and tracking status for every sprint and
  client. Formulas: `sprint-formulas.ts` (tested), explained in DATABASE.md.

### The website

`my-website/` (Next.js 16, React 19, Tailwind, shadcn/Radix). It reads the
stored values with the signed-in user's session; Postgres row-level security
decides what each person sees (DATABASE.md, "Access"). Sign-in is Google via
Supabase Auth, restricted to `@studiohawk.com.au` three times over (Google
hint, sign-up disabled + database trigger, app check).

## 5. Secrets and configuration (names only)

Never paste a secret value into chat, a ticket, a commit or a doc.

| Where | Name | What |
|-------|------|------|
| Supabase → Edge Functions → Secrets | `MONDAY_API_KEY` | Monday API token |
| | `MONDAY_BOARD_ID_AU`, `_US`, `_UK` | Board IDs |
| | `CLOCKIFY_API_KEY`, `CLOCKIFY_WORKSPACE_ID` | Clockify access |
| | `CRON_SECRET` | Shared secret the cron jobs send; must equal Vault `cron_secret` |
| | `SLACK_WEBHOOK_URL` | Removed-client alerts (optional) |
| | `SUPABASE_*` | Injected by the platform; don't edit. The functions use `SUPABASE_SECRET_KEYS` |
| Supabase → Vault | `cron_secret` | Read by the cron jobs |
| Vercel → Environment Variables | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public; the "anon" variable holds the **publishable** key (`sb_publishable_…`) despite its name |
| GitHub → Actions secrets | `SUPABASE_ACCESS_TOKEN` | Deploys the edge functions |
| Supabase → Authentication → URL Configuration | Site URL + Redirect URLs | Live site and the PR preview URL must be listed for sign-in to work |

Rotation steps: OPERATIONS.md ("Rotate the cron secret", "Renew the deploy
token"). For Monday/Clockify/Slack, set the new value in Edge Functions →
Secrets, run that sync by hand, check `sync_logs`, then revoke the old value.

## 6. Everyday tasks

All in OPERATIONS.md: run a sync now, check syncs are working, add a DPR lead,
when someone leaves, make someone an admin, test a PR preview, rotate the cron
secret, renew the deploy token, review clients removed from Monday.

## 7. Troubleshooting

Start with the last runs (SQL editor):

```sql
select source, status, records_synced, created_at, error_message
from sync_logs order by created_at desc limit 10;
```

A normal day: `monday` ~338 records, `clockify` ~300, two `calculate-metrics`.
Function logs: Supabase → Edge Functions → pick the function → Logs.
Did the schedule fire at all?

```sql
select j.jobname, d.status, d.start_time, d.return_message
from cron.job_run_details d join cron.job j using (jobid)
order by d.start_time desc limit 10;
```

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| No new `sync_logs` rows | Cron didn't fire, or the call was rejected | Check `cron.job_run_details`; check the function log for `401` |
| Function log shows 401 | `CRON_SECRET` and Vault `cron_secret` differ | Set both to the same value (OPERATIONS.md) |
| `monday` row with an error, or far fewer records | Monday token expired/revoked, board ID wrong, Monday API change | Replace `MONDAY_API_KEY`, check board IDs, read the log |
| A field is suddenly blank for every client | A Monday column was renamed | Rename it back, or update the title in `sync-monday/index.ts` |
| Lead shows "Not assigned" | Lead not in `users`, or wrong `monday_person_id` | OPERATIONS.md, "Add a new DPR lead" |
| A client has no or too few hours | Clockify project name doesn't match the Monday name; or the person's email isn't in `users` | Add the project to `MANUAL_PROJECT_MAPPINGS` (PR), or add/fix the user; then run the Clockify sync with a larger `days_back` |
| Hours on a client that was deleted and re-created in Monday | Old entries stayed on the old copy | Settings → Removed clients → Merge into new copy |
| Numbers look stale after a sync | Metrics run failed or hasn't run yet | Check the `calculate-metrics` row; run it by hand |
| Someone can't sign in | Not a StudioHawk Google account, not invited (sign-ups are disabled), or on a URL not in Redirect URLs | Invite them (Authentication → Users); check URL Configuration |
| Signed in but sees nothing | No `users` row / not a lead or admin | Check their `users` row |
| Edge function change didn't go live | Deploy workflow failed (token expired?) | GitHub → Actions → "Deploy edge functions"; renew the token; re-run the workflow |

## 8. Making changes

- **Workflow:** branch → PR → CI (lint, typecheck, tests, build, `deno check`)
  → Vercel preview (sign-in works on the listed preview URL) → merge to
  `main`. Merging deploys the website (Vercel) and, if
  `supabase/functions/` changed, the edge functions (GitHub Actions).
- **Local development:** README, "Development". Run what CI runs before
  pushing.
- **Database changes:** a new, later-dated file in `supabase/migrations/`,
  pasted into the SQL editor **before** merging the code that needs it; then
  regenerate `my-website/src/types/supabase.ts` (README). The full schema
  baseline and how to diff it against live are in DATABASE.md.
- **Tests:** `my-website/src/lib/**/*.test.ts` (vitest) cover the metric
  formulas, sprint health, dashboard building and removed-client rules. Add
  a test with any rule change.
- **Keep docs true:** update this book, README, DATABASE.md or OPERATIONS.md in
  the same PR as the change.

## 9. Known quirks and limitations

- Monday columns are matched by title (section 4).
- Clockify matching is by project name; unusual names need a manual mapping.
  The loose "contains" match takes the first hit, so a short client name can
  catch another client's project; check new clients' hours.
- Only items named "test company" are skipped by the Monday sync; other test
  items appear as clients until removed from Monday.
- Only the last 7 days of Clockify are re-read each night.
- People not in `users` have their Clockify time ignored.
- Sprints that started before 1 Feb 2025 have partial time tracking
  ("partial"/"legacy" tracking status), so their billable rates aren't
  comparable.
- Clients already missing from Monday when removal tracking began show
  "Removed before 25 Sep 2026"; the real deletion dates are unknown.
- The removed-clients check only flags a region after its whole board was
  read; a partly failed read flags nothing (by design).
- Delete and merge on Settings → Removed clients can't be undone (the Log
  records them).

## 10. Maintenance calendar

| When | What |
|------|------|
| Daily (glance) | `sync_logs` has today's rows; `#client-monitoring-tool` for removed clients |
| When prompted in Slack / banner | Review removed clients (Settings) |
| ~3 Jan 2027, then every 90 days | Renew the GitHub deploy token (expires 10 Jan 2027; reminder set for 3 Jan) |
| When someone joins/leaves the DPR team | OPERATIONS.md: add lead / when someone leaves |
| Quarterly | Review app admins, Supabase/Vercel/GitHub members, and who owns each API key (section 3) |
| When Monday or Clockify change their setup | Check the next sync's records count and a few clients |

## 11. Recommended follow-ups

- **Add a second admin now**, before anyone needs to take over: invite a
  trusted colleague to the Supabase organisation, the Vercel team and the
  GitHub repo, and share this book. Without it, losing Dani's access means
  losing control of the dashboard.
- Move ownership of every account and API key to a shared StudioHawk account,
  and the repo and Vercel project into StudioHawk organisations:
  [ACCOUNT_MIGRATION.md](ACCOUNT_MIGRATION.md).
- Delete two unused Vault entries, `anon_key` and `project_url` (left from the
  old cron setup; the `anon_key` value is a revoked legacy key, so harmless).
- Remove the duplicate foreign key on `clients.dpr_lead_id`
  (`clients_dpr_lead_id_fkey` and `fk_clients_dpr_lead`; keep one).
- Split the client detail page (~520 lines) and sprint detail page (~375
  lines), as was done for the dashboard.
- Rename the Vercel variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` to
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (code and Vercel together).

## 12. History

The app was built in 2025 with Python/Node scripts (since deleted). A clean-up in September 2026 made it
secure and maintainable:

| PR | Change |
|----|--------|
| #2 | Security patch: Next.js upgrade, open-redirect fix, security headers |
| #3 | Locked down database functions; fixed the metrics job |
| #4 | Sync functions require a cron secret; new secret API keys |
| #5 | One sprint-health implementation; DPR leads from the `users` table |
| #6 | Retired the leaked legacy key (legacy JWT secret revoked 25 Sep 2026) |
| #7 | Typed queries, zero lint warnings, tests and CI |
| #8 | Repo clean-up, accurate docs, schema baseline, evening metrics at 18:15 |
| #9 | Dashboard page split into data, logic and components |
| #10 | Clients removed from Monday: detection, Slack alert, review page; Clockify prefers the live copy; automatic function deploys |
| #11 | Delete / merge / Log for removed clients; Settings area |

## 13. First-day checklist for a new owner

1. Get every access in section 3; confirm you can open the Supabase SQL
   editor, Vercel project, GitHub repo settings and Actions.
2. Run the `sync_logs` query (section 7) and read the last day's rows.
3. Run a Monday sync by hand (OPERATIONS.md) and watch it succeed.
4. Sign in to the live site and check your own `users` row is admin.
5. Replace any credentials that belonged to the previous owner (section 3),
   one at a time, checking `sync_logs` after each.
6. Update this book: owners in section 3, and the "Last reviewed" date.
