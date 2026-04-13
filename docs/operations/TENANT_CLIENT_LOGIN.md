# Tenant client login (e.g. LuxeMaurice)

**Canonical tenancy + host doc for this repo.** Agents and humans should treat this file as the **first** read for hostname / apex / login-route work — not only `artifacts/` (those are background and proposals).

**Extended narrative / staged path:** `artifacts/firm_request_db-driven-staged-path.md` (factory vs brain, Luxe ops) — use after this page.

---

## Tenancy model (apex vs clients) — implemented in code


| Rule                       | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Apex**                   | `CORPFLOW_ROOT_DOMAIN` (e.g. `corpflowai.com`) = **CorpFlow marketing company**. It must resolve to a **real** row in Postgres `**tenants`** (e.g. `tenant_id` `corpflowai`), via `**CORPFLOW_TENANT_HOST_MAP**` / defaults — not a client tenant by mistake.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Clients**                | e.g. **Luxe-Maurice** = separate `**tenants`** row; `**tenant_hostnames**` maps a hostname to that row. **Canonical for new clients:** `**{tenant_id}.<CORPFLOW_ROOT_DOMAIN>`** (subdomain label = workspace id, e.g. `acme-corp.corpflowai.com`). Legacy aliases (prefix ≠ `tenant_id`, e.g. `lux.…` → `luxe-maurice`) stay valid but may require `**CORPFLOW_TENANT_HOSTNAME_ONBOARDING_EXEMPT**` or bypass when strict envs are on.                                                                                                                                                                                                                                                                         |
| **Onboarding host policy** | Prefer `**tenant_id.corpflowai.com`** until DNS cutover. `**CORPFLOW_ENFORCE_CORPFLOW_SUBDOMAIN_ONBOARDING=true**` rejects hostnames not under `**CORPFLOW_ROOT_DOMAIN**` (unless exempt / bypass). `**CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID=true**` additionally requires on-stack hosts to match `**{tenant_id}.<root>**` (prefix equals workspace id). Exempt: `localhost`, `*.vercel.app`, `**CORPFLOW_TENANT_HOSTNAME_ONBOARDING_EXEMPT**`, or `**bypass_client_hostname_policy: true**` (factory **master** on HTTP bootstrap / upsert only — not bootstrap-secret or ingest). **Customer-owned domains** = **Change Console ticket**, not onboarding. See `lib/server/tenant-hostname-policy.js`. |
| **Apex vs DB map**         | By default, `**tenant_hostnames` does not override apex** (prevents wrong client branding on apex). Opt-in: `CORPFLOW_APEX_ALLOW_DB_HOST_OVERRIDE=true`. See `api/factory_router.js` (`attachTenantFromHostPg`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **No ghost tenant**        | `**GET /api/ui/context`** returns `**login_route**`: `operator` (core host), `client` (tenant surface **and** `tenants` row exists), or `**onboarding`** (resolved id but **no** row). `**GET /api/tenant/site`** returns no `site` if there is no `**tenants**` row (`TENANT_NOT_REGISTERED`).                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Login UI**               | `/login` shows **client** email/password only when `login_route === 'client'`; otherwise **onboarding** or **factory** chrome. See `public/login.html` + `public/assets/corpflow/tenant-chrome.js`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |


Env reference: `.env.template` § **CORE vs TENANT — host boundary**.

**Apex login (e.g. `https://corpflowai.com/login?next=/change`):** Not gated by `lib/server/tenant-hostname-policy.js`. That module only runs on factory hostname provisioning APIs. Apex resolution still uses `CORPFLOW_TENANT_HOST_MAP` / `CORPFLOW_DEFAULT_TENANT_ID` and intentionally does not apply `tenant_hostnames` to the apex host unless `CORPFLOW_APEX_ALLOW_DB_HOST_OVERRIDE=true` (`attachTenantFromHostPg` in `api/factory_router.js`). With `CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID=true`, the apex host is excluded from the “prefix must equal `tenant_id`” check because it has no subdomain label.

---

## Expected behavior

### `/login` is transient; `/change` is the stable hub (implemented UX)

- After a successful login, the browser is expected to move to `**/change`** (often immediately via `next=/change`).
- Operator tools must not rely on `/login` being visible after authentication.
- **Factory approvals** are accessible at `**/factory/approvals`** and should be linked from `**/change**` (operator/admin session) so operators can always reach it even when `/login` is skipped.

On a hostname **mapped in `tenant_hostnames`**, `/login` loads tenant chrome from `GET /api/tenant/site`, locks **Tenant ID** to the mapped value, and `**POST /api/auth/login`** accepts an **empty** Tenant ID (server fills it from the host map).

If the user enters a **different** Tenant ID than the host map, the API returns `**TENANT_ID_HOST_MISMATCH`** with `**expected_tenant_id**` (and a short hint).

### Client viewing link for Vercel preview deployments (`*.vercel.app`)

The marketing homepage `**/**` is `**pages/index.js**`: tenant comes from `**tenant_hostnames**` by **Host**, or from signed `**cf_preview`** on `***.vercel.app**`. (Legacy static Lux HTML is `**/lux-landing-static**` only.)

When `**CORPFLOW_TENANT_PREVIEW_SECRET**` is set to the **same value on Production and on Preview** (the signing step often runs on Production via CMP; **verification** runs on whichever deployment serves the client’s `*.vercel.app` URL — if Preview env omits the secret, `**cf_preview**` fails and you see the “not mapped to a tenant” fallback):

- **Factory health** (`**/api/factory/health**`): `**tenancy_boundary.tenant_preview_secret_configured**` shows whether **this** deployment has the secret (check on a Preview deployment URL if needed).
- **Diagnostics:** set `**CORPFLOW_TENANT_SITE_DEBUG=true**` and open the preview link with `**&cf_debug=1**`; `**GET /api/tenant/site**` includes `**tenant_resolution**` (host, whether `cf_preview` was present, whether the secret exists on that deployment, and a short fallback reason). The Lux static page shows the same JSON when the API returns it.

- The Change Console stores `**client_view.automation.client_site_preview_url**` on the ticket: the usual preview URL plus a signed `**cf_preview=**` query parameter.
- `**GET /api/tenant/site**` verifies the same `**cf_preview**` query when hostname mapping does not yield a tenant (parity with `**pages/index.js**`). `**/lux-landing-static**`, `**/login**`, `**/change**`, etc. pass `**cf_preview**` (and Vercel bypass params when present) from `**window.location**` into that API call.
- **Vercel Deployment Protection:** if **Vercel Authentication** is enabled for **Preview**, visitors see **“Log in to Vercel”** before CorpFlow runs. **Mitigation in app:** add **Protection bypass for automation** in Vercel (project settings); deployments receive `**VERCEL_AUTOMATION_BYPASS_SECRET`**, and `**client_site_preview_url**` for `***.vercel.app**` automatically includes `**x-vercel-protection-bypass**` + `**x-vercel-set-bypass-cookie=true**`. Re-sync the ticket preview URL after creating or rotating the bypass. Alternatively, relax **Deployment Protection** or use Vercel **shareable links**. See `**docs/VERCEL_DEPLOYMENT.md`** § *Client-facing preview URLs vs Vercel Deployment Protection*.
- Clients open **that** link in a normal browser — no **CorpFlow** login for the public marketing preview page; they must also **not** be blocked by **Vercel** login. The token is short-lived (default **14 days**); refresh via **promote-status** (admin “refresh promotion” on `/change`) or wait for cmp-monitor to backfill if the field was missing.
- **Production** review for Luxe remains `**https://lux.corpflowai.com*`* after merge; the signed link is for **branch / preview** hosts only.
- On `**/change`**, logged-in **tenant** clients can use **Refresh preview link** (same server action as operator “Refresh promotion”) to pull `**promotion`** + `**preview_url**` from GitHub/Vercel into the ticket when automation has already run.

## LuxeMaurice checklist


| Step | Action                                                                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `**POSTGRES_URL**` set on Vercel (same DB you use locally).                                                                                                          |
| 2    | Run `**POST /api/factory/postgres/ensure-schema**` once if tables are missing (`docs/operations/ENSURE_POSTGRES_SCHEMA.md`).                                         |
| 3    | Ensure `**tenant_hostnames**` has `**lux.corpflowai.com**` → `**luxe-maurice**`, `enabled = true` (factory `**tenant-hostname-upsert**` or `admin_onboarding.html`). |
| 4    | Provision access: `node scripts/provision-tenant-test-access.mjs --tenant=luxe-maurice --pin` and/or `--username=... --gen-password` (requires `POSTGRES_URL`).      |
| 5    | Open `**https://lux.corpflowai.com/login**` (or your resolved tenant URL), **Client / Tenant**, PIN or email/password.                                               |


## Factory-only: list users & set passwords (no “view password”)

- **Page:** `/factory/auth-users` (requires `MASTER_ADMIN_KEY` or factory admin session).
- Lists `auth_users` (username, level, tenant, whether a password is **saved** — never readable).
- **Generate new password** per row; copy once and hand to the client (same idea as the provision script).

## Factory-only: why won’t this email log in?

Call `**POST /api/factory/tenant-login-debug`** with `**Authorization: Bearer <MASTER_ADMIN_KEY>**` and JSON body `**{ "email": "the@address.com" }**`.  
It returns a **checklist** (session secret set, Postgres set, user row, hash/salt present) and a **short hint** — no passwords, no hashes.

## Password and email (what usually goes wrong)

- **Session cookie:** Login needs `**SOVEREIGN_SESSION_SECRET`** set on Vercel. If it’s missing, the API returns `**SESSION_SECRET_MISSING**` and **no cookie** — the form will look “broken” even with the right password.
- **One database:** Tenant email/password lives in Postgres table `**auth_users`**. The live site reads the same DB via `**POSTGRES_URL**` on Vercel. If you provision locally against a different connection string than production, the password will never work on the real site.
- **Email is case-insensitive:** Logins now match `**you@company.com`** the same as `**You@company.com**` (aligned with the provision script, which stores lowercase).
- **Reset the password cleanly:** Run the provision script again with the **same** `--username=` and a **new** `--password=` or `**--gen-password`** — do not paste hashes by hand.
- **PIN vs password:** PIN checks `**tenants.sovereign_pin_hash`**; password checks `**auth_users**`. You can use either; provisioning PIN does not set an email password unless you also pass `**--username**`.

## Common errors


| Error                                           | Meaning                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**TENANT_PIN_NOT_PROVISIONED**`                | No PIN hash on `tenants` — run provision with `--pin`.                                                                                                                                                                                                                                                            |
| `**INVALID_PIN` / `INVALID_CREDENTIALS**`       | Wrong PIN or password.                                                                                                                                                                                                                                                                                            |
| `**USER_NOT_FOUND**`                            | No row in `**auth_users**` for that email — run provision with `**--username=**` or fix typo.                                                                                                                                                                                                                     |
| `**TENANT_MISMATCH**`                           | Email user’s `auth_users.tenant_id` ≠ submitted tenant (usually fixed by host lock + correct id).                                                                                                                                                                                                                 |
| `**TENANT_ID_HOST_MISMATCH**`                   | Host map says tenant A; form said B — use `**expected_tenant_id**` from the JSON response.                                                                                                                                                                                                                        |
| `**ONBOARDING_HOSTNAME_TENANT_ID_MISMATCH**`    | Host is on-stack but DNS prefix ≠ `tenant_id` while `**CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID=true**` — use `**tenant_id.<root>**`, add host to `**CORPFLOW_TENANT_HOSTNAME_ONBOARDING_EXEMPT**`, or factory-master `**bypass_client_hostname_policy**`.                                                     |
| `**POSTGRES_URL_MISSING**`                      | Prod cannot verify PIN/users — fix env.                                                                                                                                                                                                                                                                           |
| **402 / insufficient credits on Approve build** | `**tenant_personas`**: **$0** balance and `**billing_exempt`** false and not in env exempt list — set `**billing_exempt**` in DB (e.g. `**scripts/set-luxe-maurice-billing-exempt.mjs**` for Lux), `**CORPFLOW_BILLING_EXEMPT_TENANT_IDS**`, or top up: `**docs/operations/TOKEN_CREDITS_AND_APPROVE_BUILD.md**`. |


## Subdomain without DB row

If `**lux.corpflowai.com**` is **not** in `tenant_hostnames`, the system may infer a tenant id `**lux`** from the subdomain. That **will not** match `**luxe-maurice`** users. **Fix:** add the hostname row; do not rely on subdomain guessing for production clients.