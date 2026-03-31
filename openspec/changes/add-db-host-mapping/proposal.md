# Change: DB-backed host → tenant_id/mode mapping (automated onboarding)

## Why
On Hobby tier, we run a single Vercel project and want onboarding to be inexpensive and low-touch. Updating Vercel env vars for every new client host is operationally brittle. With wildcard `*.corpflowai.com` routed to the same project, onboarding should be **pure DB writes**: add a hostname mapping row and the system routes automatically.

## What Changes
- Add Postgres table/model for **host → tenant_id + mode** mapping.
- Update request tenancy resolution to consult Postgres first, then fall back to the existing env/subdomain rules.
- Add a secured API endpoint for operators/automation to upsert mappings.

## Impact
- Affected code: `api/factory_router.js`, `lib/server/host-tenant-context.js` (kept sync fallback), UI context endpoint.
- Data: new table `tenant_hostnames`.
- Security: mapping writes require factory master auth (or admin session).

