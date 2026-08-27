# Tenant Workspace simplification v1

**Issue:** [#1006](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1006)
**Parent:** [#772](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/772)
**Related:** [#1073](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1073) continuity · [#884](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/884) expose-for-review · `/change`
**Environment:** `corpflow_test` after merge/deploy. This packet does not authorize `client_production`.
**No schema. No env/secrets. No deploy. No external send. No auth-model replacement.**

<!-- TENANT_WORKSPACE_SIMPLIFICATION_V1 -->

## 0. What is true when this slice is done

A synthetic tenant user lands in a tenant-only workspace:

- Chrome shows **Tenant Workspace** plus the bound tenant name and role.
- Nav is **Requests & Progress** plus **Service & change** (`/change`).
- There is no **Choose workspace** chip, no staff chooser on tenant sign-in, no proof-harness advertising, and no Core / Operating Workspace / cross-client controls.
- A live Tenant session that opens `/app` continues at `/app/tenant` instead of the staff chooser.
- Staff still open `/app` deliberately and sign into Tenant with tenant credentials (no Core bypass).
- Operating Workspace routes stay fail-closed (403) for tenant sessions.
- #884 review remains: only deliberately exposed components can be commented / approved.

## 1. Route / navigation matrix

Machine copy: `TENANT_WORKSPACE_ROUTE_MATRIX` in `lib/app/tenant-workspace.js`.

| Route or nav | Disposition | Reason |
| --- | --- | --- |
| `/app/tenant` | **RETAINED** | Canonical Tenant Workspace shell |
| `/change` | **RETAINED** | Existing tenant request/service surface |
| nav: Requests & Progress | **RETAINED** | Client review / status / evidence |
| nav: Service & change | **RETAINED** | In-nav link to `/change`; no new page |
| nav: Home / Overview | **RETIRED** | #1073; duplicated requests |
| nav: My Work | **RETIRED** | #1073; Operating Workspace concept |
| nav: Documents / Reports / Support | **RETIRED** | #1073; placeholders |
| chrome: Choose workspace | **RETIRED** | Hidden on Tenant chrome |
| `/app` | **REDIRECT** | Tenant session → `/app/tenant`; staff still use chooser |
| `/app/core`, `/app/today`, `/app/prospects`, `/app/workbench`, `/app/pipeline`, `/app/queue`, `/app/clients`, `/app/commercial`, `/app/delivery` | **STAFF_ONLY_FAIL_CLOSED** | Tenant session 403 or unrouted |

## 2. Explicit non-actions

- No client portal redesign
- No new auth / tenant model
- No messaging automation
- No broad design-system rewrite
- No schema / migration
- No replacement of `/change`

## 3. Verification

```bash
node --test \
  node-tests/tenant-workspace-simplification.test.mjs \
  node-tests/tenant-client-journey-acceptance.test.mjs \
  node-tests/tenant-journey-continuity.test.mjs \
  node-tests/workspace-context.test.mjs \
  node-tests/app-slice1-handlers.test.mjs \
  node-tests/app-slice1-access.test.mjs \
  node-tests/app-slice1-review.test.mjs \
  node-tests/app-slice3-review-persistence.test.mjs \
  node-tests/app-today-my-work.test.mjs
```

Promptfoo / AI eval: **NOT APPLICABLE** — nav/chrome/copy and fail-closed staff routes only.

## 4. corpflow_test URLs

- `https://core.corpflowai.com/app/tenant`
- `https://core.corpflowai.com/app` (tenant session redirects after publish)
- `https://core.corpflowai.com/change`
- `https://lux.corpflowai.com/change`
