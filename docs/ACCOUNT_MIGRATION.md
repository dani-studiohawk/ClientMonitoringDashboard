# Account migration plan: personal → shared StudioHawk account

**Goal:** nothing the dashboard needs depends on one person's login. Every
account, project and API key is owned by a shared StudioHawk account (below,
**the shared account**). At least two named people keep admin access through
their own accounts.

**Shared account address:** `____________@studiohawk.com.au` *(to confirm:
check which shared address StudioHawk uses, e.g. `data@`; record it here)*

**Status:** planned. As of 25 Sep 2026 everything is on Dani's personal work
accounts (HANDOVER.md, section 3).

**Downtime:** none expected. Each step adds the new owner first, switches
over, checks, and only then removes the old one. The syncs keep running
throughout.

---

## Principles

1. **The shared account owns; people work.** The shared account is the owner of each organisation and
   holds the API keys. Day to day, people use their own named accounts with
   admin roles, so the logs show who did what and leavers can be removed
   individually. Only sign in as the shared account to create keys or manage ownership.
2. **Two-factor on the shared account, recoverable by more than one person.** Store its
   password, 2FA seed and recovery codes in a shared password-manager vault
   that at least two people can open (e.g. Dani and a manager).
3. **One change at a time, verified.** After each credential swap, run that
   sync by hand and check `sync_logs` (OPERATIONS.md) before moving on.
4. **Never paste a secret** into chat, email, tickets or docs. Copy from the
   service straight into the destination field.

## Before you start (decisions and prerequisites)

Check with whoever manages StudioHawk's software licences:

| Question | Why it matters |
|----------|----------------|
| Does the shared account exist as a Google Workspace mailbox (not just a group alias)? | Every service below needs to sign in and receive email as the shared account |
| Does StudioHawk already have a GitHub organisation? | The repo should move into it (or create one owned by the shared account) |
| Is the Vercel account on Hobby or Pro? | Vercel's Hobby plan is for personal, non-commercial use; a company team needs Pro (per-seat cost) |
| Can the shared account have a Monday seat with view access to the AU, US and UK client boards? | Monday API tokens act as the user who created them; there is no separate service account |
| Can the shared account be a Clockify workspace admin? | The sync reads every user's time entries, which needs admin access |
| Does the shared account need a Slack account, or can the Slack app be managed by workspace admins? | An incoming webhook stops working if the person who installed it is deactivated |
| Who is the second named admin? | Georgia Anderson and Jinoo Nam are already admins in the app |

Also set up the shared password-manager entry for the shared account first.

## Step 0: give the shared account its own login on each service

The shared account can't be invited or made an owner until it has an account
on each service. Sign up with the shared address, turn on two-factor, and
store the login in the shared vault. Nothing here affects the dashboard.

| Service | Sign up at | Needs | Notes |
|---------|-----------|-------|-------|
| Google Workspace | (IT) | A real mailbox that can sign in, not a group alias | Everything else uses this address and "Sign in with Google" where offered |
| Supabase | supabase.com → Sign in with Google (or email) | Free | Joins Dani's organisation in phase 1 |
| GitHub | github.com/signup with the shared address | Free | Machine/shared accounts are allowed; turn on 2FA (required for org owners) |
| Vercel | vercel.com → Continue with Google | Pro seat if the team is on Pro | Creates or joins the StudioHawk team |
| Google Cloud | console.cloud.google.com, signed in as the shared account | Free | Only needs to be granted access (phase 1) |
| Slack | Invited to the StudioHawk workspace by a Slack admin | Possibly a paid seat | Needed to own the Slack app and webhook |
| Monday.com | Invited to the StudioHawk account by a Monday admin | A seat | Must be able to view the AU, US and UK client boards (and their sub-items) |
| Clockify | Invited to the StudioHawk workspace | Workspace admin role | Needed to read everyone's time entries |

## Order of work

Do these in order; each phase is safe to pause after.

| Phase | What | Risk if interrupted |
|-------|------|---------------------|
| 0 | Create the shared account's login on each service (above) | None |
| 1 | Add the shared account + second admin everywhere, as extra owners | None (only additions) |
| 2 | Swap API keys to ones created by the shared account | Low: one sync at a time, verified |
| 3 | Transfer ownership of repo, Vercel project, Google Cloud project | Low: follow the checks after each |
| 4 | Remove Dani's personal credentials; Dani stays as a named admin | None once phase 2–3 checks pass |
| 5 | Update the docs | None |

---

## Phase 1: add owners (no disruption)

### Supabase (database, auth, sync functions, schedules)
1. Sign in to supabase.com as Dani → **Organization settings → Team** →
   invite the shared account with role **Owner**, and the second admin as **Administrator**.
2. Accept the invites (as the shared account, and as the second admin).
3. Optional: rename the organisation to "StudioHawk".

The project stays where it is, so no URLs, keys or schedules change. (Moving
the project to a different organisation is possible but unnecessary once
The shared account owns this one.)

### Vercel (website hosting)
1. Decide the destination: a StudioHawk team owned by the shared account (needs Pro, see
   above).
2. Sign in as the shared account → create the team (or use the existing StudioHawk team) →
   invite Dani and the second admin as Members/Owners.
   The project moves in phase 3.

### GitHub (code, CI, deploy secret)
1. Use StudioHawk's GitHub organisation, or sign up a GitHub account for
   the shared account and create an organisation (e.g. `studiohawk-data`) owned by it.
2. Invite Dani and the second admin as organisation **Owners**.
   The repo moves in phase 3.

### Google Cloud (Sign in with Google)
1. Find the project: Supabase → **Authentication → Providers → Google** shows
   the OAuth client ID; search for it at console.cloud.google.com (signed in
   as Dani) → **APIs & Services → Credentials**.
2. **IAM & Admin → IAM** → grant the shared account and the second admin the **Owner** role.
3. If StudioHawk has a Google Cloud organisation, move the project into it
   (**IAM & Admin → Settings → Migrate**; needs an org admin). Otherwise
   leaving it with the shared account as owner is enough.
4. Check **OAuth consent screen**: user type **Internal** (StudioHawk
   accounts only) is preferable if available.

### Slack (removed-client alerts to #client-monitoring-tool)
1. Find the app at api.slack.com/apps (signed in as Dani) → **Collaborators** →
   add the shared account (and/or the second admin).

## Phase 2: swap API keys (one at a time)

For each key: create the new one **as the shared account**, paste it into **Supabase →
Edge Functions → Secrets** (replacing the value), run that sync by hand
(OPERATIONS.md, "Run a sync now"), check `sync_logs` shows `success` with a
normal record count, then revoke the old key.

| Key | Create as the shared account at | Secret | Verify with |
|-----|--------------------|--------|-------------|
| Monday API token | Monday → avatar → **Developers → My access tokens** | `MONDAY_API_KEY` | Monday sync: `monday` ~338 records; no new removed clients flagged (a sudden batch means the shared account can't see a board: stop and fix its access) |
| Clockify API key | Clockify → **Profile settings → API → Generate** | `CLOCKIFY_API_KEY` | Clockify sync: `clockify` ~300 records; spot-check a client's recent hours |
| Slack webhook | api.slack.com/apps → the app → **Incoming Webhooks → Add New Webhook** → `#client-monitoring-tool` (reinstalling as the shared account) | `SLACK_WEBHOOK_URL` | Send a test message from the webhook page; the next removal will post |
| Supabase deploy token | supabase.com/dashboard/account/tokens as the shared account (Project Settings read, Edge Functions read-write, 90 days) | GitHub repo secret `SUPABASE_ACCESS_TOKEN` | GitHub → Actions → "Deploy edge functions" → **Run workflow**; it must succeed |

Leave `CLOCKIFY_WORKSPACE_ID`, `MONDAY_BOARD_ID_*` and `CRON_SECRET` as they
are; they're not tied to a person. (Rotating `CRON_SECRET` afterwards is
optional; OPERATIONS.md has the steps.)

The Monday check matters most: if the shared account can't see all three boards, the sync
reads fewer items and flags the missing ones as removed from Monday. Nothing
is deleted automatically, but Slack will post a burst of false alarms. If that
happens, put the old token back, fix the shared account's board access, and try again; then
mark any false flags "Keep active" (the next sync that sees them also clears
them).

## Phase 3: transfer ownership

### GitHub repo
1. Repo → **Settings → General → Transfer ownership** → the new organisation.
2. Afterwards:
   - GitHub redirects the old URL, but update anything that names it: in the
     repo, `docs/HANDOVER.md`; local clones (`git remote set-url`).
   - Actions secrets (`SUPABASE_ACCESS_TOKEN`) move with the repo; confirm
     under Settings → Secrets.
   - Re-authorise tools that act on the repo (e.g. the Claude GitHub app) for
     the new organisation.

### Vercel project
1. Project → **Settings → General → Transfer project** → the StudioHawk team.
   Environment variables and the `clientreport.vercel.app` domain move with it.
2. Afterwards:
   - **Git connection:** Project → Settings → Git: reconnect to the
     transferred repo (install the Vercel GitHub app on the new organisation).
     Push a trivial change or redeploy to confirm deploys still trigger.
   - **Preview URLs change** (they include the team name). Update Supabase →
     **Authentication → URL Configuration → Redirect URLs** with the new
     preview pattern, and the example in `docs/OPERATIONS.md` ("Test a PR's
     preview with sign-in"). Remove the old
     `...-dani-studiohawks-projects.vercel.app/**` entry.
   - Sign in on the live site to confirm auth still works.

### Google Cloud project
Done in phase 1 if the shared account is an Owner (and the project was moved into the
StudioHawk organisation, if there is one). Nothing in Supabase changes.

## Phase 4: remove personal dependencies

Only after every check above has passed:

1. Revoke Dani's old Monday token, Clockify key and Supabase access tokens
   (the ones created before phase 2).
2. Slack: remove Dani's original webhook if it's still listed.
3. Keep Dani as a **named admin** (Supabase Administrator/Owner, Vercel team
   member, GitHub org owner), not as the owner of record.
4. App roles are unaffected: `users.is_admin` stays as is. The shared account does not need
   to sign in to the dashboard.
5. Move the deploy-token reminder (3 Jan 2027, then every 90 days) from
   Dani's calendar to a shared calendar or the shared account's.

## Phase 5: update the docs

- `docs/HANDOVER.md` section 2 (GitHub and Vercel names) and section 3
  (owners → the shared account, named admins), the warning at the top, and the
  "Last reviewed" date.
- `docs/OPERATIONS.md`: preview URL example.
- Tick this plan's status as done.

## Final checklist

- [ ] Shared address confirmed and recorded at the top of this plan
- [ ] The shared account has its own login on every service in step 0
- [ ] The shared account has 2FA; password, 2FA seed and recovery codes are in a shared vault
- [ ] Supabase org: the shared account Owner, two named admins
- [ ] GitHub: repo in the StudioHawk organisation; two named owners
- [ ] Vercel: project in the StudioHawk team; Git connected; live site and a PR preview both sign in
- [ ] Google Cloud project: the shared account Owner (in the StudioHawk org if there is one)
- [ ] `MONDAY_API_KEY`, `CLOCKIFY_API_KEY`, `SLACK_WEBHOOK_URL` created by the shared account; syncs verified
- [ ] `SUPABASE_ACCESS_TOKEN` created by the shared account; deploy workflow run succeeded
- [ ] Dani's old keys and tokens revoked
- [ ] Token-renewal reminder on a shared calendar
- [ ] Docs updated
