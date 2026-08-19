# Operating Workspace + Tenant Workspace consolidation v1

**Issue:** [#772](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/772)  
**Related:** [#721](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/721) Prospect Operations · [#773](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/773) / [#778](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/778) Core/Tenant shell  
**Status:** Phase 1 audit + Prospect Operations list + Today / My Work + shared detail **shipped**. This packet adds the next no-schema slice: **Postgres-backed Prospect Pipeline** at `/app/pipeline` (#997 / #721 Kanban).
**Environment:** `corpflow_test` after merge/deploy; this packet does not authorize `client_production`
**No schema. No env/secrets. No deploy. No external send.**

<!-- OPERATING_TENANT_WORKSPACE_CONSOLIDATION_V1 -->

## 0. What is true when this slice is done

An authorised staff user can:

1. Open `/app` and deliberately choose **CorpFlowAI Operating Workspace** or **Tenant Workspace**.
2. Always see workspace name, tenant/business context, and role in the chrome.
3. Reach shared **Prospect Operations** at `/app/prospects` from the Operating Workspace.
4. Open **Today / My Work** at `/app/today` and see only items that need attention now (overdue, due today, missing next action, or waiting on the operator).
5. Open one **shared Prospect detail** from Prospect Operations, Today / My Work, or Pipeline, see identity / qualification / history, and save owner, stage, next action, due date, urgency, and an operator note.
6. Open **Prospect Pipeline** at `/app/pipeline` and see the same records in canonical-stage lanes; stage moves persist through the shared write path.
7. Not see Prospect Operations, Today / My Work, shared detail, Pipeline, or other internal commercial desks inside the Tenant Workspace.

Existing Core/Tenant **authentication remains separate**. Choosing the other workspace returns to `/app` and uses the matching sign-in. A Core session still cannot enter Tenant; a Tenant session still cannot enter Core. That #778 rule is unchanged.

## 1. Claim packet (#772 first packet)

| Item | Result |
| ---- | ------ |
| Agent / run | Cursor Factory Automation `bc-92c367af-b5c1-4d63-b144-005bef7de891` |
| Branch | `cursor/corpflowai-worker-protocol-4e2c` |
| Owned paths | `docs/architecture/OPERATING_TENANT_WORKSPACE_CONSOLIDATION_V1.md`, `lib/app/workspace-context.js`, `lib/app/prospect-operations-workspace.js`, `lib/app/prospect-operations-list.js`, `pages/app/prospects.js`, `components/app/ProspectOperationsList.js`, chrome/nav/shell wiring, focused tests |
| Excluded paths | Prisma schema / migrations, `.env*`, `/change` expansion, Lead Rescue / Rapid Delivery rewrite, Company Master rewrite, ERPNext, messaging/payment/deploy |
| Overlap vs #721 | Reuses `lib/cmp/_lib/prospect-operations-view-model.js`. Does **not** implement #721 Slices 2–4 (shared drawer, workbench extract, Postgres Kanban). |
| Overlap vs #773/#778 | Reuses `/app`, `/app/core`, `/app/tenant`, `/api/app/shell`. Adds product names + `/app/prospects`. Does **not** restore a shared ScopeSwitcher. |
| Active PR overlap | Open draft PR #944 is ERPNext/#920 — no file overlap intended. |
| Definition of done (this slice) | Audit matrix + plan recorded; workspace chrome uses product names; first staff-only Prospect Operations route exists; Tenant nav/API denied; focused tests pass. |
| Tests / evidence | `node --test` on workspace + prospect-ops + existing app access/handler tests |
| Exact blocker | None for this slice. Live `corpflow_test` URL proof waits for merge + Vercel Production deploy (protected). |
| Anton needed | **NO** for this slice. |
| Higher-priority displacement | At claim time, GitHub had **no open P0 or P1 issues**. Factory handoff selected #772. |

## 2. Route / capability matrix

Machine copy: `WORKSPACE_SURFACE_MATRIX` in `lib/app/workspace-context.js`.

| Path | Record | Data source | Auth | Disposition | Reuse / defect |
| ---- | ------ | ----------- | ---- | ----------- | -------------- |
| `/app` | none | none | chooser | **CANONICAL** | Deliberate workspace entry |
| `/app/core` | `cmp_tickets` | fixture / `cmp_tickets_read` | Core `typ=admin` | **CANONICAL** | Operating Workspace shell already live from #778/#877 |
| `/app/tenant` | `cmp_tickets` (client-safe) | fixture / `cmp_tickets_read` | Tenant `typ=tenant` | **CANONICAL** | Tenant Workspace shell; CorpFlowAI is a normal tenant |
| `/app/prospects` | `leads` | fixture / `leads_read` | Core only | **CANONICAL** | First shared Prospect Operations route |
| `/api/app/prospects` | `leads` | same | Core only | **CANONICAL** | Tenant → 403 |
| `/app/today` | `leads` | same + `matchesMyWorkTodayFilter` | Core only | **CANONICAL** | Today / My Work landing |
| `/api/app/today` | `leads` | same | Core only | **CANONICAL** | Tenant → 403 |
| `/app/prospects/[id]` | `leads` | fixture / `leads_read` + JSON patch | Core only | **CANONICAL** | Shared detail / actions / history |
| `/app/pipeline` | `leads` | same + `canonical_stage` lanes | Core only | **CANONICAL** | Postgres Pipeline; `/change/revenue` is checklist only |
| `/api/app/pipeline` | `leads` | same | Core only | **CANONICAL** | Tenant → 403 |
| `/api/app/prospect` | `leads` | same | Core only | **CANONICAL** | GET + PATCH; Tenant → 403 |
| `/admin/rapid-delivery` | `leads` (rapid-delivery) | `admin-rapid-delivery-api` | `requireAdminPageSession` | **MIGRATE** | REUSE desk + API; long-term Action Queue |
| `/admin/lead-rescue` + `/[id]` | `leads` (lead-rescue) | `admin-lead-rescue-api` | admin session | **MIGRATE** | REUSE list/detail; extract Workbench from product brand |
| `/change/revenue` | localStorage cards | `corpflow.revenue.cockpit.v1` | change session | **MIGRATE** | Optional checklist only. Canonical pipeline is `/app/pipeline` |
| `/change` | `cmp_tickets` | Postgres + `console_json` | tenant or admin | **CANONICAL** | Tenant service/change. Do not absorb into Operating Workspace |
| `/change/lux-feedback` | static queue | Lux feedback module | operator | **TEMPORARY** | Lux-specific; classify per capability |
| `/admin/company-master` | companies | Company Master | admin session | **REUSE** | Future Clients summary |
| Lux `/change` CRM / advisor | tenant Lux workflow | tenant APIs | tenant host | **REUSE** (tenant) | Do not copy internal operator load into Tenant Workspace |

### Authentication / navigation (current)

| Concern | Current truth |
| ------- | ------------- |
| Sessions | Separate `typ=admin` (Core / Operating Workspace) and `typ=tenant` (Tenant Workspace) |
| Staff gate | `requireAdminPageSession` on `/admin/*`; `assertEnvironmentAccess(..., 'core')` on `/api/app/*` Core routes |
| Tenant gate | Host + session tenant id; fail-closed; no admin bypass for CorpFlowAI |
| Shell chrome | Workspace · Tenant · Role (this slice) |
| Switch | `/app` chooser only — **not** a shared session switcher |
| `#721` view-model | `lib/cmp/_lib/prospect-operations-view-model.js` — merged, no schema |

### Live / partial / missing

| Surface | Live on `main` | Partial | Missing |
| ------- | -------------- | ------- | ------- |
| Core/Tenant shells | Yes (`/app/core`, `/app/tenant`) | Chrome used technical “Core/Tenant” names | Product workspace names (this slice) |
| Prospect Ops shared UI | No | View-model + docs only (#721 Slice 1) | Shared queue/workbench/Kanban |
| Action Queue | Yes as Rapid Delivery desk | Product-filtered | Cross-product queue |
| Workbench | Yes as Lead Rescue | Product-branded | Extracted Prospect Workbench |
| Pipeline Kanban | Yes (`/app/pipeline`) | Same `leads` + `canonical_stage` | `/change/revenue` remains optional localStorage checklist |
| Today / My Work landing | Yes (`/app/today`, staff-only) | Uses #721 `matchesMyWorkTodayFilter` | — |
| Shared Prospect detail | Yes (`/app/prospects/[id]`) | JSON owner/stage/next-action/due/note | Connecting the three product views (#721 Slice 3) |
| Clients / commercial / delivery summaries | No as workspace modules | Company Master + ERPNext + product desks exist | Later slices |

## 3. Smallest no-schema implementation plan

### Already shipped (Today / My Work)

1. Dedicated Operating Workspace route `/app/today` + `GET /api/app/today`.
2. Reuse existing Prospect Operations list + #721 `matchesMyWorkTodayFilter`.
3. Core nav **My Work** links to `/app/today` (no longer an unfiltered Requests alias).
4. Staff-only; Tenant 403; Tenant **My Work** stays an in-shell placeholder.
5. Temporary product desks remain at `/admin/lead-rescue` and `/admin/rapid-delivery`.

This slice replaces the fragmented “My Work is just another Requests list” behaviour on `/app/core`. It does **not** retire product desks or `/change/revenue`.

### This slice (shared Prospect detail — #994)

1. Dedicated Operating Workspace route `/app/prospects/[id]` + `GET`/`PATCH` `/api/app/prospect`.
2. Reuse `#721` view-model plus existing Lead Rescue / Rapid Delivery JSON merge helpers.
3. Reachable from Prospect Operations and Today / My Work. Product desks stay as temporary links.
4. Staff-only; Tenant 403; no schema; no external send.

This slice does **not** connect all three prospect views, rebuild CRM, or retire `/admin/lead-rescue` or `/admin/rapid-delivery`.

### This slice (Postgres Pipeline — #997)

1. Dedicated Operating Workspace route `/app/pipeline` + `GET /api/app/pipeline`.
2. Lanes from `#721` `canonical_stage`. Cards open `/app/prospects/[id]`. Stage movement reuses `PATCH /api/app/prospect`.
3. `/change/revenue` localStorage is reduced to an optional personal checklist; it is not canonical.
4. Staff-only; Tenant 403; no schema; no external send.

This slice does **not** retire product desks or `/change/revenue`, and does not add a forecasting engine.

### Later spare-capacity slices (do not build in this PR)

1. Canonical Action Queue replacing `/admin/rapid-delivery` as the UX owner.
2. Prospect Workbench extracted from Lead Rescue branding.
3. Clients summary from Company Master.
4. Commercial summary from ERPNext rails (read-only first).
5. Delivery summary from Lead Rescue / Website Rescue contracts.
6. Tenant Workspace simplification (remove internal cognitive load).
7. Redirects/retirement only after live verification of replacements.

## 4. Architecture boundaries (unchanged)

- One production app, one Postgres.
- No second CRM, tenant model, or auth system.
- CorpFlowAI remains a normal reference tenant.
- `/change` stays ticket/change/service-request oriented.
- Operating Workspace holds prospects, clients, commercial, delivery, oversight.
- Opening tenant support from oversight must land in Tenant Workspace context (later slice; this slice only links via `/app`).
- Protected actions stay gated: deploy, schema, secrets, payment, live send, public launch.

## 5. Verification

```bash
node --test \
  node-tests/workspace-context.test.mjs \
  node-tests/prospect-operations-workspace.test.mjs \
  node-tests/app-prospect-operations-handlers.test.mjs \
  node-tests/app-today-my-work.test.mjs \
  node-tests/app-prospect-detail.test.mjs \
  node-tests/app-slice1-access.test.mjs \
  node-tests/app-slice1-handlers.test.mjs \
  node-tests/prospect-operations-view-model.test.mjs
```

Promptfoo / AI eval: **NOT APPLICABLE** — no AI behaviour, prompts, drafting, model routing, or protected-action AI handling changed.

## 6. Delivery Reality (this packet)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a (awaiting review + merge + deploy)
- Commit deployed: n/a
- Live URLs tested: n/a this run — requires corpflow_test after Production deploy
- Expected vs actual result: Shared Prospect detail opens Lead Rescue and Website Rescue records; safe JSON edits persist; Tenant denied
- Client-facing flow usable: n/a (operator workspace; Tenant Workspace unchanged)
- Final verdict: PARTIAL (implementation PR; not live-verified)
```
