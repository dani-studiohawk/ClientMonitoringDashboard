# Operations runbook

Everyday tasks, mostly done in the Supabase dashboard (project "Client
Monitoring"). SQL goes in **SQL Editor → New query → Run**.

## Run a sync now

Each of these makes the same call the scheduled job makes, using the secret in
Vault. The call returns a request number straight away; the sync itself takes
up to ~2 minutes. Check the result in `sync_logs` (below).

Monday (clients, sprints, DPR leads):

```sql
select net.http_post(
  url := 'https://ylnrkfpchrzvuhqrnwco.supabase.co/functions/v1/sync-monday',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
);
```

Clockify (last 7 days of time entries):

```sql
select net.http_post(
  url := 'https://ylnrkfpchrzvuhqrnwco.supabase.co/functions/v1/sync-clockify',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
    'Content-Type', 'application/json'
  ),
  body := '{"days_back": 7}'::jsonb
);
```

Recalculate metrics (hours, billable rates, health):

```sql
select net.http_post(
  url := 'https://ylnrkfpchrzvuhqrnwco.supabase.co/functions/v1/calculate-all-metrics',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
    'Content-Type', 'application/json'
  ),
  body := '{"trigger": "manual", "skipReports": true}'::jsonb
);
```

## Check that syncs are working

```sql
select source, status, records_synced, created_at, error_message
from sync_logs
order by created_at desc
limit 10;
```

A normal day has `success` rows for `monday` (~338 records), `clockify`
(~300) and two `calculate-metrics` runs.

## Add a new DPR lead

1. Make sure they're set as **DPR Lead** on their clients in Monday.com.
2. Find their Monday person ID (Monday → Teams, or ask Claude to look it up).
3. Add them to the dashboard:

   ```sql
   insert into public.users (email, name, is_dpr_lead, is_active, monday_person_id)
   values ('first.last@studiohawk.com.au', 'First Last', true, true, 12345678)
   on conflict (email) do update
     set is_dpr_lead = true, is_active = true, monday_person_id = excluded.monday_person_id;
   ```

4. Run the Monday sync (above) so their clients link to them.
5. Let them sign in: **Authentication → Users → Add user → Send invitation**
   with their StudioHawk email (sign-ups are disabled, so an invite is needed).

Clockify time entries link to them automatically by email.

## When someone leaves

In **Table Editor → users**, set `is_active` (and `is_admin`, `is_dpr_lead`)
to false. Reassign their clients in Monday; the next Monday sync moves them.
Optionally delete their login under **Authentication → Users**.

## Make someone an admin

Set `is_admin = true` on their row in **Table Editor → users**. Admins see the
Analytics page, every DPR lead's dashboard, and all time entries.

## Test a PR's preview with sign-in

Vercel builds each PR at a preview URL. Sign-in only works on URLs listed in
**Authentication → URL Configuration → Redirect URLs**. The branch Claude uses
(`claude/exciting-davinci-zdbk0m`) is already listed:
`https://clientreport-git-claude-exciti-fd61ce-dani-studiohawks-projects.vercel.app/**`.
For another branch, add its preview URL (from the Vercel comment on the PR)
the same way. Use a private window so you aren't redirected to the live site.

## Rotate the cron secret

If the `CRON_SECRET` might have leaked:

1. Generate a new random value.
2. Set it as the `CRON_SECRET` edge function secret (**Edge Functions →
   Secrets**).
3. Update Vault in the SQL editor:
   `select vault.update_secret((select id from vault.secrets where name = 'cron_secret'), '<new value>');`
4. Run a sync (above) and check `sync_logs`.

Do steps 2 and 3 together; between them, scheduled syncs will be rejected.

## Renew the deploy token

GitHub deploys the edge functions (`.github/workflows/deploy-functions.yml`)
with a Supabase access token stored as the `SUPABASE_ACCESS_TOKEN` repository
secret. It lasts 90 days (current one expires on 10 Jan 2027). When it
expires the live syncs keep running, but changes to them stop deploying.

1. Supabase → **Account → Access Tokens** → Generate new token, with the same
   permissions: Project Settings read, Edge Functions read-write, 90 days.
2. GitHub → repository **Settings → Secrets and variables → Actions** →
   `SUPABASE_ACCESS_TOKEN` → Update, and paste the new token.
3. Delete the old token in Supabase.

## Clients removed from Monday

Each Monday sync records which clients it saw. When a board is read in full,
any client from that region that wasn't on it is flagged `monday_removed_at`
(its data and time entries are kept) and a Slack message is sent once, with
the DPR lead and any hours logged: time on a client removed during the
cooldown period may be unbilled.

Review them in **Settings → Removed clients** (admins; Settings is at the bottom
of the sidebar), or from the banner
on the admin dashboard:

- **Move to inactive**: marks the client inactive.
- **Keep active**: leaves it as is (for deliberate removals).
- **Delete**: permanently removes the client and its (empty) sprints. Only
  offered when it has no time logged and no KPI results, e.g. test items.
- **Merge into new copy**: when the item was deleted and re-created in Monday,
  moves all its time entries to the live copy, puts each in the right sprint
  by date, deletes the old copy and recalculates metrics straight away.

Delete and merge can't be undone. Every decision (inactive, keep, delete,
merge) is recorded in the **Log** on the same page (who, when, hours moved);
a client moved to inactive can still be deleted or merged from its Log row. Clients with KPI results can only
be moved to inactive.

The removal date is the sync that first noticed it, so it's accurate to a
day. Clients already gone when tracking started (25 Sep 2026) show "before
25 Sep 2026"; if syncs were failing, a date range is shown instead.

If the item reappears in Monday, the next sync clears the flag. When a client
was deleted and re-created in Monday, the page links the new copy, and the
Clockify sync assigns new time to the live copy.

Slack setup: create an incoming webhook for the channel or DM you want
(Slack → Apps → Incoming Webhooks), then add it as the `SLACK_WEBHOOK_URL`
edge function secret (**Edge Functions → Secrets**). Without it, clients are
still flagged, just not announced.
