# Concourse

Concourse tracks job applications, cold outreach, email replies, and follow-ups.

## Current architecture

- Frontend: React and Vite, deployed as Cloudflare Worker static assets
- API: Cloudflare Worker routes under `/api`
- Database and authentication: Supabase PostgreSQL and Supabase Auth
- Database changes: versioned SQL migrations in `supabase/migrations`
- Source and deployment: GitHub with Cloudflare Builds

The earlier Express and MySQL implementation remains in `server/` while its
application endpoints are migrated checkpoint by checkpoint to the Cloudflare
Worker and Supabase. `server/worker.js` is the production Worker entry point;
`server/index.js` is the existing local Express entry point.

## Repository structure

```text
client/                 React application
server/                 API code and runtime entry points
  modules/              Feature modules
  worker.js             Cloudflare Worker entry point
supabase/migrations/    Versioned PostgreSQL schema changes
docs/                   Architecture and milestone records
wrangler.jsonc          Cloudflare deployment configuration
```
