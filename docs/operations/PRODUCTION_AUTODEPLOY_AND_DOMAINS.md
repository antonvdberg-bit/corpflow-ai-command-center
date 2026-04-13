# Production autodeploy and custom domains (single spine)

**Audience:** operators and technical leads. **End users** should only need stable URLs (e.g. `https://lux.corpflowai.com`); they must not depend on knowing which Vercel deployment or Git branch is “current.”

## The contract (one spine)

| Layer | Rule |
|--------|------|
| **Git** | `main` is the only branch that defines **Production** behavior for customer-facing hosts. |
| **Vercel** | **One** project (e.g. `corpflow-ai-command-center`) builds from Git. **Production** environment is tied to **`main`**. |
| **Customer URLs** | `lux.corpflowai.com`, `corpflowai.com`, `core.corpflowai.com`, etc. must be attached under **Project → Settings → Domains** to **this** project and must resolve to the **Production** deployment — not a Preview alias, not another project, not a deleted deployment. |
| **Preview** | `*.vercel.app` URLs are **ephemeral** (per branch/build). They are for **sandbox review**, not the canonical product. Client links that need a stable hostname use **Production** after merge. |

If a customer hostname returns Vercel **`404: NOT_FOUND`** with an id like `sin1::…`, that almost always means **no live Production deployment serves that hostname** (wrong project, domain removed, DNS pointing elsewhere, or last Production build failed). The app’s Node/Next code is not consulted yet — **fix Vercel + DNS first**.

## Autodeploy loop (expected)

1. Merge to **`main`** (via PR).
2. Vercel builds **Production** from `main` (Git integration or deploy hook — see `docs/VERCEL_DEPLOYMENT.md`).
3. **Domains** tab shows **Valid** for each custom host assigned to Production.
4. Optional: **GitHub Actions** ping health and tenant surfaces (below) so a broken deploy or routing drift fails CI on a schedule.

## Operator checklist when “production is 404”

1. **Vercel → Deployments** — filter **Production**. Is the latest deployment **Ready**? If **Error**, open the build log and fix (often env, cron config, or `npm run build`).
2. **Vercel → Settings → Domains** — confirm `lux.corpflowai.com` (and apex/core as needed) is listed on **this** project and shows **Valid**.
3. **DNS** at the registrar — match Vercel’s required records (CNAME to `cname.vercel-dns.com` or the A/ALIAS set Vercel shows). Stale A records to old IPs cause NOT_FOUND or wrong project.
4. **`GET /api/factory/health`** on the **same origin** the customer uses — if this is 404, the hostname is not hitting this app’s Production deployment.
5. After DNS or domain changes, wait for TTL propagation (minutes to hours).

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
- **After merge to `main`**, canonical review for Luxe is **`https://lux.corpflowai.com`** on **Production**.
- **Refresh preview link** in the Change Console only refreshes what Vercel reports for the **sandbox branch**; it does not repair Production domain wiring.

## Related docs

- `docs/VERCEL_DEPLOYMENT.md` — env, crons, Technical Lead, preview secrets.
- `docs/operations/TENANT_CLIENT_LOGIN.md` — hostname map, `cf_preview`, client links.
- `docs/EXECUTION_BRAIN_VS_HANDS.md` — factory health URL when splitting apex vs core.
