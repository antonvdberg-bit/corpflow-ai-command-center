# Run `ensure-schema` on production (once per database)

Creates missing CorpFlow tables in Postgres (`automation_events`, `automation_playbooks`, and the rest). **Idempotent** — safe to run again; existing tables are left as-is.

## Endpoint

- **Method:** `POST`
- **URL:** `https://corpflowai.com/api/factory/postgres/ensure-schema`  
  (or your prod host, e.g. `https://core.corpflowai.com/...` — same deployment is fine.)

## Auth (pick one)

The handler uses [`verifyFactoryMasterAuth`](../../lib/server/factory-master-auth.js):

1. **Bearer token** — same value as Vercel env `MASTER_ADMIN_KEY` (or `ADMIN_PIN` if that’s what you use).
2. **Header** `x-session-token: <same master value>`.
3. **Admin browser session** — if you’re logged in at `/login` as factory admin, a same-origin POST from the browser can work with cookies (less convenient for one-off ops).

Do **not** paste the master key into tickets, chat, or committed files.

## Examples

### curl (macOS / Linux / Git Bash)

```bash
curl -sS -X POST "https://corpflowai.com/api/factory/postgres/ensure-schema" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_ADMIN_KEY" \
  -d "{}"
```

### PowerShell

```powershell
$base = "https://corpflowai.com"
$key = $env:MASTER_ADMIN_KEY   # or paste in a secure local-only session
Invoke-RestMethod -Method Post -Uri "$base/api/factory/postgres/ensure-schema" `
  -Headers @{ "Authorization" = "Bearer $key"; "Content-Type" = "application/json" } `
  -Body "{}"
```

## Success response

HTTP **200** and JSON like:

```json
{
  "ok": true,
  "statements_executed": <number>,
  "tables": [
    "tenants",
    "auth_users",
    "cmp_tickets",
    "...",
    "automation_events",
    "automation_playbooks"
  ]
}
```

## Errors

| HTTP | Meaning |
|------|--------|
| **403** | `Factory master authentication required` — wrong/missing token. |
| **503** | `POSTGRES_URL_MISSING` — Vercel env not set for this deployment. |
| **500** | `ENSURE_SCHEMA_FAILED` — Postgres permission/connectivity; read `detail` and fix, then retry. |

## Prisma client note

`ensure-schema` updates the **database** only. Vercel builds already run `prisma generate` on deploy. No extra step unless you run custom jobs against new models locally.
