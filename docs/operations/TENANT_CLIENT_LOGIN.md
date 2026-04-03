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

## Factory-only: why won’t this email log in?

Call **`POST /api/factory/tenant-login-debug`** with **`Authorization: Bearer <MASTER_ADMIN_KEY>`** and JSON body **`{ "email": "the@address.com" }`**.  
It returns a **checklist** (session secret set, Postgres set, user row, hash/salt present) and a **short hint** — no passwords, no hashes.

## Password and email (what usually goes wrong)

- **Session cookie:** Login needs **`SOVEREIGN_SESSION_SECRET`** set on Vercel. If it’s missing, the API returns **`SESSION_SECRET_MISSING`** and **no cookie** — the form will look “broken” even with the right password.
- **One database:** Tenant email/password lives in Postgres table **`auth_users`**. The live site reads the same DB via **`POSTGRES_URL`** on Vercel. If you provision locally against a different connection string than production, the password will never work on the real site.
- **Email is case-insensitive:** Logins now match **`you@company.com`** the same as **`You@company.com`** (aligned with the provision script, which stores lowercase).
- **Reset the password cleanly:** Run the provision script again with the **same** `--username=` and a **new** `--password=` or **`--gen-password`** — do not paste hashes by hand.
- **PIN vs password:** PIN checks **`tenants.sovereign_pin_hash`**; password checks **`auth_users`**. You can use either; provisioning PIN does not set an email password unless you also pass **`--username`**.

## Common errors

| Error | Meaning |
|-------|---------|
| **`TENANT_PIN_NOT_PROVISIONED`** | No PIN hash on `tenants` — run provision with `--pin`. |
| **`INVALID_PIN` / `INVALID_CREDENTIALS`** | Wrong PIN or password. |
| **`USER_NOT_FOUND`** | No row in **`auth_users`** for that email — run provision with **`--username=`** or fix typo. |
| **`TENANT_MISMATCH`** | Email user’s `auth_users.tenant_id` ≠ submitted tenant (usually fixed by host lock + correct id). |
| **`TENANT_ID_HOST_MISMATCH`** | Host map says tenant A; form said B — use **`expected_tenant_id`** from the JSON response. |
| **`POSTGRES_URL_MISSING`** | Prod cannot verify PIN/users — fix env. |

## Subdomain without DB row

If **`lux.corpflowai.com`** is **not** in `tenant_hostnames`, the system may infer a tenant id **`lux`** from the subdomain. That **will not** match **`luxe-maurice`** users. **Fix:** add the hostname row; do not rely on subdomain guessing for production clients.
