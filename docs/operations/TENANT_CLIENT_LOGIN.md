# Tenant client login (e.g. LuxeMaurice)

**Canonical tenancy + host doc for this repo.** Agents and humans should treat this file as the **first** read for hostname / apex / login-route work — not only `artifacts/` (those are background and proposals).

**Extended narrative / staged path:** `artifacts/firm_request_db-driven-staged-path.md` (factory vs brain, Luxe ops) — use after this page.

---

## Tenancy model (apex vs clients) — implemented in code

| Rule | Detail |
|------|--------|
| **Apex** | `CORPFLOW_ROOT_DOMAIN` (e.g. `corpflowai.com`) = **CorpFlow marketing company**. It must resolve to a **real** row in Postgres **`tenants`** (e.g. `tenant_id` `corpflowai`), via **`CORPFLOW_TENANT_HOST_MAP`** / defaults — not a client tenant by mistake. |
| **Clients** | e.g. **Luxe-Maurice** = separate **`tenants`** row; **`tenant_hostnames`** maps a hostname to that row. **Canonical for new clients:** **`{tenant_id}.<CORPFLOW_ROOT_DOMAIN>`** (subdomain label = workspace id, e.g. `acme-corp.corpflowai.com`). Legacy aliases (prefix ≠ `tenant_id`, e.g. `lux.…` → `luxe-maurice`) stay valid but may require **`CORPFLOW_TENANT_HOSTNAME_ONBOARDING_EXEMPT`** or bypass when strict envs are on. |
| **Onboarding host policy** | Prefer **`tenant_id.corpflowai.com`** until DNS cutover. **`CORPFLOW_ENFORCE_CORPFLOW_SUBDOMAIN_ONBOARDING=true`** rejects hostnames not under **`CORPFLOW_ROOT_DOMAIN`** (unless exempt / bypass). **`CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID=true`** additionally requires on-stack hosts to match **`{tenant_id}.<root>`** (prefix equals workspace id). Exempt: `localhost`, `*.vercel.app`, **`CORPFLOW_TENANT_HOSTNAME_ONBOARDING_EXEMPT`**, or **`bypass_client_hostname_policy: true`** (factory **master** on HTTP bootstrap / upsert only — not bootstrap-secret or ingest). **Customer-owned domains** = **Change Console ticket**, not onboarding. See `lib/server/tenant-hostname-policy.js`. |
| **Apex vs DB map** | By default, **`tenant_hostnames` does not override apex** (prevents wrong client branding on apex). Opt-in: `CORPFLOW_APEX_ALLOW_DB_HOST_OVERRIDE=true`. See `api/factory_router.js` (`attachTenantFromHostPg`). |
| **No ghost tenant** | **`GET /api/ui/context`** returns **`login_route`**: `operator` (core host), `client` (tenant surface **and** `tenants` row exists), or **`onboarding`** (resolved id but **no** row). **`GET /api/tenant/site`** returns no `site` if there is no **`tenants`** row (`TENANT_NOT_REGISTERED`). |
| **Login UI** | `/login` shows **client** email/password only when `login_route === 'client'`; otherwise **onboarding** or **factory** chrome. See `public/login.html` + `public/assets/corpflow/tenant-chrome.js`. |

Env reference: `.env.template` § **CORE vs TENANT — host boundary**.

**Apex login (e.g. `https://corpflowai.com/login?next=/change`):** Not gated by `lib/server/tenant-hostname-policy.js`. That module only runs on factory hostname provisioning APIs. Apex resolution still uses `CORPFLOW_TENANT_HOST_MAP` / `CORPFLOW_DEFAULT_TENANT_ID` and intentionally does not apply `tenant_hostnames` to the apex host unless `CORPFLOW_APEX_ALLOW_DB_HOST_OVERRIDE=true` (`attachTenantFromHostPg` in `api/factory_router.js`). With `CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID=true`, the apex host is excluded from the “prefix must equal `tenant_id`” check because it has no subdomain label.

---

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

## Factory-only: list users & set passwords (no “view password”)

- **Page:** `/factory/auth-users` (requires `MASTER_ADMIN_KEY` or factory admin session).
- Lists `auth_users` (username, level, tenant, whether a password is **saved** — never readable).
- **Generate new password** per row; copy once and hand to the client (same idea as the provision script).

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
| **`ONBOARDING_HOSTNAME_TENANT_ID_MISMATCH`** | Host is on-stack but DNS prefix ≠ `tenant_id` while **`CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID=true`** — use **`tenant_id.<root>`**, add host to **`CORPFLOW_TENANT_HOSTNAME_ONBOARDING_EXEMPT`**, or factory-master **`bypass_client_hostname_policy`**. |
| **`POSTGRES_URL_MISSING`** | Prod cannot verify PIN/users — fix env. |

## Subdomain without DB row

If **`lux.corpflowai.com`** is **not** in `tenant_hostnames`, the system may infer a tenant id **`lux`** from the subdomain. That **will not** match **`luxe-maurice`** users. **Fix:** add the hostname row; do not rely on subdomain guessing for production clients.
