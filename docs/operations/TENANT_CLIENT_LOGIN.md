# Tenant client login (e.g. LuxeMaurice)

## Expected behavior

On a hostname **mapped in `tenant_hostnames`**, `/login` loads tenant chrome from `GET /api/tenant/site`, locks **Tenant ID** to the mapped value, and **`POST /api/auth/login`** accepts an **empty** Tenant ID (server fills it from the host map).

If the user enters a **different** Tenant ID than the host map, the API returns **`TENANT_ID_HOST_MISMATCH`** with **`expected_tenant_id`** (and a short hint).

## LuxeMaurice checklist

| Step | Action |
|------|--------|
| 1 | **`POSTGRES_URL`** set on Vercel (same DB you use locally). |
| 2 | Run **`POST /api/factory/postgres/ensure-schema`** once if tables are missing (`docs/operations/ENSURE_POSTGRES_SCHEMA.md`). |
| 3 | Ensure **`tenant_hostnames`** has **`lux.corpflowai.com`** → **`luxe-maurice`**, `enabled = true` (factory **`tenant-hostname-upsert`** or `admin_onboarding.html`). |
| 4 | Provision access: `node scripts/provision-tenant-test-access.mjs --tenant=luxe-maurice --pin` and/or `--username=... --gen-password` (requires `POSTGRES_URL`). |
| 5 | Open **`https://lux.corpflowai.com/login`** (or your resolved tenant URL), **Client / Tenant**, PIN or email/password. |

## Common errors

| Error | Meaning |
|-------|---------|
| **`TENANT_PIN_NOT_PROVISIONED`** | No PIN hash on `tenants` — run provision with `--pin`. |
| **`INVALID_PIN` / `INVALID_CREDENTIALS`** | Wrong PIN or password. |
| **`TENANT_MISMATCH`** | Email user’s `auth_users.tenant_id` ≠ submitted tenant (usually fixed by host lock + correct id). |
| **`TENANT_ID_HOST_MISMATCH`** | Host map says tenant A; form said B — use **`expected_tenant_id`** from the JSON response. |
| **`POSTGRES_URL_MISSING`** | Prod cannot verify PIN/users — fix env. |

## Subdomain without DB row

If **`lux.corpflowai.com`** is **not** in `tenant_hostnames`, the system may infer a tenant id **`lux`** from the subdomain. That **will not** match **`luxe-maurice`** users. **Fix:** add the hostname row; do not rely on subdomain guessing for production clients.
