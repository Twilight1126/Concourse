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

For production, Cloudflare uses `/api` with `VITE_AUTH_MODE=supabase`. The
Worker receives `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; the browser
receives the matching `VITE_` values. Privileged Supabase keys are never sent
to the browser.
