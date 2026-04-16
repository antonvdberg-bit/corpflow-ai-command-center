# Production autodeploy and custom domains (single spine)

**Audience:** operators and technical leads. **End users** should only need stable URLs (e.g. `https://lux.corpflowai.com/`); they must not depend on knowing which Vercel deployment or Git branch is “current.”

## Luxe Mauritius — official URL vs optional alias

| Role | Hostname |
|------|----------|
| **Official production site (canonical)** | **`https://lux.corpflowai.com/`** — use this in contracts, email footers, and all operator docs. Maps to tenant `luxe-maurice` via Postgres `tenant_hostnames`. |
| **Optional alias** | **`https://luxe.corpflowai.com/`** — same tenant when both are in `tenant_hostnames` **and** both domains are attached to **this** Vercel project (Production). Run `node scripts/upsert-luxe-maurice-hostnames.mjs` after `POSTGRES_URL` is set. |

## The contract (one spine)

| Layer | Rule |
|--------|------|
| **Git** | `main` is the only branch that defines **Production** behavior for customer-facing hosts. |
| **Vercel** | **One** project (e.g. `corpflow-ai-command-center`) builds from Git. **Production** environment is tied to **`main`**. |
| **Customer URLs** | **`lux.corpflowai.com`** (official Luxe), optional **`luxe.corpflowai.com`** (alias), `corpflowai.com`, `core.corpflowai.com`, etc. must be attached under **Project → Settings → Domains** to **this** project and must resolve to the **Production** deployment — not a Preview alias, not another project, not a deleted deployment. |
| **Preview** | `*.vercel.app` URLs are **ephemeral** (per branch/build). They are for **sandbox review**, not the canonical product. Client links that need a stable hostname use **Production** after merge. |

If a customer hostname returns Vercel **`404: NOT_FOUND`** with an id like `sin1::…`, that almost always means **no live Production deployment serves that hostname** (wrong project, domain removed, DNS pointing elsewhere, or last Production build failed). The app’s Node/Next code is not consulted yet — **fix Vercel + DNS first**.

## Special case: only `/` is `NOT_FOUND` but `/change` + `/api/*` work

**Symptom (real prod failure mode):**

- `GET https://lux.corpflowai.com/` returns **Vercel** `404: NOT_FOUND` (plain text, header `X-Vercel-Error: NOT_FOUND`, id like `sin1::…`)
- But these all return **200** on the same host:
  - `/change` (static HTML)
  - `/login` (static HTML)
  - `/lux-landing-static` (static HTML)
  - `/api/factory/health` (serverless)
  - `/api/tenant/site` (serverless)

**Meaning:** the hostname is reaching **a** deployment, but **`/` is not being handled** the same way as other routes — often a **Vercel / Next routing** mismatch (wrong framework preset, custom output dir, or edge id mismatch) *or* the platform failing before the Next handler runs.

**In-repo mitigation (Lux hosts only):** root **`middleware.js`** rewrites **`/`** on **`lux.corpflowai.com`** and **`luxe.corpflowai.com`** (and `www` variants) to **`/lux-landing-static.html`**, the same static Lux landing used when preview roots 404. Deploy this app to Production so the middleware ships.

**Fix (Vercel project settings) — still required if `/` stays broken *after* middleware deploy:**

1. Vercel → **Project → Settings → Build & Development Settings**
2. Ensure:
   - **Framework Preset** = **Next.js**
   - **Output Directory** is **blank** (do not set it to `public`)
   - **Build Command** is the default (or `npm run vercel-build`)
3. **Domains:** both **`lux.corpflowai.com`** and (if used) **`luxe.corpflowai.com`** point at **this** project’s **Production** deployment.
4. Redeploy **Production**.

**Verify:** `GET /` should return **200** with HTML (Lux landing after middleware) or your intended marketing page. If **every** path on the hostname returns Vercel `NOT_FOUND`, fix **domain assignment + DNS** first (hostname not on this project).
## Autodeploy loop (expected)

1. Merge to **`main`** (via PR).
2. Vercel builds **Production** from `main` (Git integration or deploy hook — see `docs/VERCEL_DEPLOYMENT.md`).
3. **Domains** tab shows **Valid** for each custom host assigned to Production.
4. Optional: **GitHub Actions** ping health and tenant surfaces (below) so a broken deploy or routing drift fails CI on a schedule.

## Operator checklist when “production is 404”

1. **Vercel → Deployments** — filter **Production**. Is the latest deployment **Ready**? If **Error**, open the build log and fix (often env, cron config, or `npm run build`).
2. **Vercel → Settings → Domains** — confirm **`lux.corpflowai.com`** (official Luxe) and, if used, **`luxe.corpflowai.com`** (alias) plus apex/core as needed are listed on **this** project and show **Valid**.
3. **DNS** at the registrar — match Vercel’s required records (CNAME to `cname.vercel-dns.com` or the A/ALIAS set Vercel shows). Stale A records to old IPs cause NOT_FOUND or wrong project.
4. **`GET /api/factory/health`** on the **same origin** the customer uses — if this is 404, the hostname is not hitting this app’s Production deployment.
5. If **only `/`** is 404 but `/change` + `/api/*` are 200, follow **Special case** above (Vercel framework/output settings).
6. After DNS or domain changes, wait for TTL propagation (minutes to hours).

## Automated guards (GitHub Actions)

| Workflow | Secret | Purpose |
|----------|--------|---------|
| **Domain routing guard** | `CORPFLOW_CORE_BASE_URL` | Core/factory HTML + health routes. |
| **Domain routing guard** | `CORPFLOW_APEX_BASE_URL` (optional) | Apex `/login`, `/change`. |
| **Domain routing guard** | `CORPFLOW_TENANT_CLIENT_BASE_URL` (optional) | Primary tenant client origin (e.g. `https://lux.corpflowai.com`) — `/`, `/change`, `/login`, `/api/factory/health`, `/api/tenant/site`. |
| **Factory health ping** | `CORPFLOW_FACTORY_HEALTH_URL` | Full health URL (weekly; can be apex or core — must match where you want observability). |

Set secrets in **GitHub → Settings → Secrets and variables → Actions**. If a secret is unset, that step is **skipped** (forks stay green).

## CMP / Preview vs Production (no user confusion)

- **Signed preview links** (`*.vercel.app` + `cf_preview`) are generated for **branch review**; see `docs/operations/TENANT_CLIENT_LOGIN.md`.
- **After merge to `main`**, canonical review for Luxe is **`https://lux.corpflowai.com/`** on **Production** (optional alias: **`https://luxe.corpflowai.com/`** when mapped in Vercel + `tenant_hostnames`).
- **Refresh preview link** in the Change Console only refreshes what Vercel reports for the **sandbox branch**; it does not repair Production domain wiring.

## Related docs

- `docs/VERCEL_DEPLOYMENT.md` — env, crons, Technical Lead, preview secrets.
- `docs/operations/TENANT_CLIENT_LOGIN.md` — hostname map, `cf_preview`, client links.
- `docs/EXECUTION_BRAIN_VS_HANDS.md` — factory health URL when splitting apex vs core.
