# Concourse

Concourse tracks job applications, cold outreach, replies, and follow-ups.

## Environments

The same client, API contract, validation, and feature behavior run in both
environments. Only the runtime, database adapter, authentication, and data are
different.

| Environment | Client | API | Database | Data |
|---|---|---|---|---|
| Local | Vite | Express | MySQL | Local test data |
| Production | Cloudflare Static Assets | Cloudflare Worker | Supabase PostgreSQL | Production data |

Both runtimes use Supabase Auth for sign-in. Local development should use a
separate development Supabase project: put the same development URL and
publishable key in `client/.env.local` and `server/.env`. Production uses
its own URL and key in Cloudflare. The MySQL and production PostgreSQL data
stores remain separate even if Auth is temporarily shared, but a shared Auth
project also shares user identities and sessions. Do not put a service-role
key in browser configuration. When switching the local Auth project, grant
the new user ID local admin access and deliberately reassign legacy rows;
Supabase user IDs differ between projects.

## Structure

```text
client/
  src/
    api/                 Browser API client
    features/            Feature-owned UI
    lib/                 Shared platform clients
server/
  db/                    Local MySQL connection and schema
  modules/               Shared rules and runtime adapters
  index.js               Local Express entry point
  worker.js              Cloudflare Worker entry point
supabase/
  migrations/            Ordered PostgreSQL schema changes
extension/               Chrome/Edge application and outreach capture
docs/                    Architecture and milestone records
wrangler.jsonc           Cloudflare deployment configuration
```

Application requests follow one of these paths:

```text
Local:       React -> Express -> MySQL
Production:  React -> Cloudflare Worker -> Supabase REST -> PostgreSQL/RLS
```

The application service owns shared validation and business rules. A MySQL
repository handles local data and a Supabase repository handles production
data. This keeps behavior aligned without mixing credentials or records.

## Local configuration

Copy `client/.env.example` to `client/.env.local` and `server/.env.example` to
`server/.env`. Add your local MySQL credentials to `server/.env`.

```powershell
npm --prefix client install
npm --prefix server install
npm --prefix client run dev
npm --prefix server run dev
```

Keep the API terminal open while using the local client. `server run dev` uses
Node watch mode, which restarts the API when server files change; for a stable
manual test without restarts, use `npm --prefix server start` instead. Check
`http://localhost:4000/api/health` if the client says it cannot reach the API.
The dashboard makes one load request and only retries when you press its
Refresh or Try again button.

After pulling a schema change, run the new files in `server/db/migrations`
against local MySQL in filename order. Apply the matching files in
`supabase/migrations` through the Supabase SQL editor before deploying.
The manual interview stage, interview date, and rejection reason fields need
`server/db/migrations/006_application_outcomes.sql` locally and
`supabase/migrations/007_application_outcomes.sql` in production. Run the local
file with a MySQL account allowed to alter tables; `concourse_app` cannot.
Stage history also needs `server/db/migrations/007_application_updates.sql`
locally and `supabase/migrations/008_application_updates.sql` in production.
Run the local file in MySQL Workbench with an account that can create tables;
the API's `concourse_app` account cannot.

The admin dashboard needs `server/db/migrations/008_admin_dashboard.sql`
locally and `supabase/migrations/009_admin_dashboard.sql` in production. The
admin-only user directory also needs `supabase/migrations/010_admin_users.sql`
in production; local MySQL uses the existing `profiles` table.
To make local applications and outreach private to their owner, run
`server/db/migrations/009_local_ownership.sql` **once** in MySQL Workbench
using the privileged connection. It expects exactly one local
`admin_memberships` row and assigns every existing application and outreach
row to that admin account, then requires an owner for new rows. Verify before
and after with:

```sql
select user_id from admin_memberships;
select count(*) from applications where user_id is null;
select count(*) from outreach where user_id is null;
```

The new local API requires a Supabase bearer token for applications,
outreach, and live application events. Reconnect the unpacked extension to
Local after updating it; old local connections without a token are rejected.
Apply `supabase/migrations/011_applications_page.sql` and
`supabase/migrations/012_user_dashboard_stats.sql`, then
`supabase/migrations/013_application_dashboard.sql` in order before deploying
the matching production API/client. These migrations add bounded application
pages and an application-only dashboard summary. Local dashboard reads need no
new migration. They do not move local rows to production.
Apply `supabase/migrations/014_admin_application_sources.sql`,
`supabase/migrations/015_dashboard_source_groups.sql`, and
`supabase/migrations/016_admin_source_comparison.sql`, and
`supabase/migrations/017_normalize_company_sources.sql`, and
`supabase/migrations/018_group_application_source_filters.sql`, and
`supabase/migrations/019_label_manual_source.sql`, and
`supabase/migrations/020_recent_applications_first.sql` in order after migration 013,
before deploying the updated dashboards and Applications filter. Admin source counts include every tracked role and the
subset marked applied (records with an application date); the source-group migrations also update the user dashboard. Local MySQL
needs `server/db/migrations/010_application_recent_order.sql` after migration 009 for the recent-first list index. The list sorts by the latest application change, so marking a saved role Applied moves it to the top.
The source charts are built from saved application records. Recognized job
boards keep their own names, employer career and ATS links (including legacy `company_portal` values) use Company portal,
and records without a source or link use Manual. A custom, plain-text
source label creates its own category without adding a database column. The
Applications source filter uses these categories, while each row and edit form retain the captured source value. The
admin chart retains sources with zero sent applications so saved roles remain
visible, and compares sent counts with tracked counts.
Localhost uses **MySQL for application data and admin membership**; Supabase
provides sign-in identity. Production uses Supabase for both. An admin grant in
one environment does not grant access in the other.

For local testing, first run `server/db/migrations/008_admin_dashboard.sql` in
MySQL Workbench using a connection allowed to create tables. Then run **only**
this grant query, replacing the email with your signed-in email:

```sql
-- Local MySQL: grant admin access
insert ignore into admin_memberships (user_id)
select user_id from profiles where lower(email) = lower('you@example.com');
```

Check that the grant inserted a row:

```sql
select a.user_id from admin_memberships a
join profiles p on p.user_id = a.user_id
where lower(p.email) = lower('you@example.com');
```

For production, apply `supabase/migrations/009_admin_dashboard.sql` first, then
run **only** this grant query in the Supabase SQL editor:

```sql
-- Production Supabase: grant admin access
insert into public.admin_memberships (user_id)
select id from auth.users where lower(email) = lower('you@example.com')
on conflict (user_id) do nothing;
```

If the local `profiles` lookup returns no rows, that email has no local profile;
the query grants nothing. Create the profile by signing in and completing
onboarding, or find the account UUID in Supabase Authentication and insert that
UUID into `admin_memberships` using an administrator connection. Do not use a
display name as the role check.

To remove local admin access later, run this **separately** in MySQL Workbench.
The primary-key condition also works with Workbench Safe Updates enabled:

```sql
delete from admin_memberships
where user_id = (select user_id from profiles where email = 'you@example.com');
```

The email is used only to find the account ID when granting or revoking access.
Concourse verifies the signed-in ID and checks its current membership on every
admin API request. Revoking membership does not change the user's profile or
their applications and outreach records. Navigate or reload Concourse after a
membership change to update the sidebar. **Admin** appears in the navigation;
**Back to user dashboard** returns to your regular view. The admin page shows
real account and application totals, a current-stage chart, recent
members, and API performance. **View all users** opens `/admin-view-all-users`,
where admins can search and page through onboarding profiles. The admin API
checks membership on every request and returns profile data with `no-store`.
Local API metrics cover the last 60 minutes in server memory and reset on
restart. Production writes API measurements to Cloudflare Analytics Engine and
queries them using the `analytics` binding in `wrangler.jsonc`; deploy with
Wrangler 4.145.0 or later and an account with Analytics Engine access. If the
binding or dataset is unavailable, the dashboard says so. The health panel
shows the database check, API telemetry state, and the measured server error
rate when request data exists. It does not invent background job activity.

The browser reuses identical signed-in workspace GET results for 10 seconds
and shares simultaneous requests. Admin reads only share simultaneous requests;
their results are not retained. Saves and live application changes invalidate
workspace results, so a route change does not repeatedly read the database
while a browser reload still fetches current data. Local and production API
responses remain `no-store` at the HTTP layer. Both APIs limit each access token to
180 requests per minute and return HTTP 429 with `Retry-After` when exceeded.
Production uses the Cloudflare Worker `API_RATE_LIMIT` binding in
`wrangler.jsonc`; its namespace ID must be unique within the Cloudflare
account. The Worker rate limit is an approximate, per-location load guard.

## Extension

Load `extension/` as an unpacked extension from `chrome://extensions` or
`edge://extensions`. It adds a compact review card to job pages and Gmail,
keeps a selected LinkedIn contact for the next outreach, and saves through the
detected Local or Production API. The local web tab must stay open while the
extension captures jobs; production uses its own extension session. Job capture prefers structured
`JobPosting` data, then supported-site selectors, semantic labels, and visible
text fallbacks. Email message bodies are never read or stored.

For job applications, review the card on the job-description page, correct any
details, and save once. Concourse locks that reviewed record through later form
steps and reduces the card to a small icon. Apply on the job site, then check
the tracker status. Concourse updates it when it recognizes a confirmation;
otherwise open the icon and select **I applied — mark Applied** after submitting.
For unusual job sites where the card does not appear, use **No review card?
Open it here** on a specific job description or application page and complete
the missing details before saving.
When an application is marked Applied on a distinct application page, the saved
link points to that page so you can return to it from the tracker when the site
permits it.

Production application updates use Supabase Realtime so every signed-in
tracker tab receives inserts, edits, and deletes across browsers. Local MySQL
development uses the Express application's server-sent event stream, so tracker
rows update without page refreshes or polling. Apply
`supabase/migrations/006_application_realtime.sql` before testing production
synchronization.

In Applications, click the colored status for a role to open its
`/interview-status` page. Choose a stage, enter what happened and when, then
save. Keep the same stage to record another interview round or other update;
there is no limit to the number of updates at a stage. The Applications row
shows the current status and color. Mark Applied only after sending the
application. Application sent date is shown read-only. Updates can be edited
or deleted. Rejected asks for the employer's reason before saving, with a
"Reason not shared" option. Ghosted, Rejected, and Withdrawn end the journey.
The table keeps only the current status instead of adding a column per step.
These updates are manual; Gmail and LLM status detection are not connected yet.

The web app uses Supabase Auth to persist and refresh browser sessions. It does
not impose a separate client-side inactivity timer; users can sign out from the
sidebar. If a fixed inactivity policy is required and supported by the Supabase
plan, configure it in Supabase Auth session settings so the same policy applies
to local and production sign-in.
The API verifies ES256 access tokens against Supabase's cached signing keys, so
ordinary authenticated requests do not call Supabase Auth each time. A new
process needs one key fetch, and profile saves still check the current user
record to confirm the email. If that connection fails, the API returns 503.
The production extension has a separate session; the local extension reads the
active local web session without copying its refresh token.

For production, Cloudflare uses `/api` with Supabase authentication. The
Worker receives `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; the browser
receives the matching `VITE_` values. Privileged Supabase keys are never sent
to the browser.

Run `npm run lint --prefix client`, `npm run build --prefix client`,
`npm test --prefix server`, and `node --test extension/*.test.mjs` before
shipping. GitHub Actions runs the same checks on pushes and pull requests.
