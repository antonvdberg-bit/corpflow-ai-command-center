# Operating Workspace + Tenant Workspace consolidation v1

**Issue:** [#772](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/772)  
**Related:** [#721](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/721) Prospect Operations · [#773](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/773) / [#778](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/778) Core/Tenant shell  
**Status:** Phase 1 audit + Prospect Operations list + Today / My Work **shipped**. Shared Prospect detail / actions / history shipped at `/app/prospects/[id]` (#994). Shared Prospect Workbench shipped at `/app/workbench` (#996). Postgres-backed Prospect Pipeline shipped at `/app/pipeline` (#997). Canonical Prospect Action Queue shipped at `/app/queue` (#995). Clients summary shipped at `/app/clients` (#999). This packet adds the next no-schema slice: **Commercial summary** at `/app/commercial` (#1004).
**Environment:** `corpflow_test` after merge/deploy; this packet does not authorize `client_production`
**No schema. No env/secrets. No deploy. No external send.**

<!-- OPERATING_TENANT_WORKSPACE_CONSOLIDATION_V1 -->

## 0. What is true when this slice is done

An authorised staff user can:

1. Open `/app` and deliberately choose **CorpFlowAI Operating Workspace** or **Tenant Workspace**.
2. Always see workspace name, tenant/business context, and role in the chrome.
3. Reach shared **Prospect Operations** at `/app/prospects` from the Operating Workspace.
4. Open **Today / My Work** at `/app/today` and see only items that need attention now (overdue, due today, missing next action, or waiting on the operator).
5. Open one **shared Prospect detail** from Prospect Operations, Today / My Work, the Workbench, or Pipeline, see identity / qualification / history, and save owner, stage, next action, due date, urgency, and an operator note.
6. Open the **Prospect Workbench** at `/app/workbench` to process Lead Rescue, Website Rescue, and general prospects in one reusable grid (sort, filter, exception signals, safe inline edits).
7. Open **Prospect Pipeline** at `/app/pipeline` and see the same records in canonical-stage lanes; stage moves persist through the shared write path.
8. Open the **Prospect Action Queue** at `/app/queue` to see what needs action now (overdue, due today, no next action, new/unreviewed, high urgency, stalled, awaiting operator).
9. Open **Clients** at `/app/clients` and see existing Company Master client/business records, a summary, and links to related prospect / commercial / delivery surfaces — without a second customer model.
10. Open **Commercial** at `/app/commercial` and see current quotation, acceptance, payment-evidence and financial-approval state for existing prospect/client records, with blockers and next action.
11. Not see Prospect Operations, Today / My Work, shared detail, Workbench, Pipeline, Action Queue, Clients, Commercial, or other internal commercial desks inside the Tenant Workspace.

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
| `/app/workbench` | `leads` | fixture / `leads_read` + JSON patch | Core only | **CANONICAL** | Shared Prospect Workbench |
| `/api/app/workbench` | `leads` | same | Core only | **CANONICAL** | Tenant → 403 |
| `/app/queue` | `leads` | fixture / `leads_read` via `matchesActionQueueFilter` | Core only | **CANONICAL** | Prospect Action Queue |
| `/api/app/queue` | `leads` | same | Core only | **CANONICAL** | Tenant → 403 |
| `/app/clients` | `company_master` | fixture / `company_master_read` + related leads | Core only | **CANONICAL** | Clients summary (#999) |
| `/app/clients/[id]` | `company_master` | same | Core only | **CANONICAL** | Client summary / detail |
| `/api/app/clients` | `company_master` | same | Core only | **CANONICAL** | Tenant → 403 |
| `/api/app/client` | `company_master` | same | Core only | **CANONICAL** | Tenant → 403 |
| `/app/commercial` | commercial rail + company_master refs | fixture / existing #714 records + leads identity | Core only | **CANONICAL** | Staff Commercial summary (#1004) |
| `/api/app/commercial` | same | same | Core only | **CANONICAL** | Tenant → 403 |
| `/admin/rapid-delivery` | `leads` (rapid-delivery) | `admin-rapid-delivery-api` | `requireAdminPageSession` | **MIGRATE** | Temporary Rapid Delivery desk; UX owner is `/app/queue` |
| `/admin/lead-rescue` + `/[id]` | `leads` (lead-rescue) | `admin-lead-rescue-api` | admin session | **MIGRATE** | REUSE list/detail; extract Workbench from product brand |
| `/change/revenue` | localStorage cards | `corpflow.revenue.cockpit.v1` | change session | **MIGRATE** | Optional checklist only. Canonical pipeline is `/app/pipeline` |
| `/change` | `cmp_tickets` | Postgres + `console_json` | tenant or admin | **CANONICAL** | Tenant service/change. Do not absorb into Operating Workspace |
| `/change/lux-feedback` | static queue | Lux feedback module | operator | **TEMPORARY** | Lux-specific; classify per capability |
| `/admin/company-master` | companies | Company Master | admin session | **REUSE** | Identity source for #999 Clients and #1004 Commercial |
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
| Action Queue | Yes (`/app/queue`) | Cross-product queue; `/admin/rapid-delivery` temporary | Product-desk retirement after live verification |
| Workbench | Yes (`/app/workbench`) | Cross-product grid; `/admin/lead-rescue` temporary | Product-desk retirement after live verification |
| Pipeline Kanban | Yes (`/app/pipeline`) | Same `leads` + `canonical_stage` | `/change/revenue` remains optional localStorage checklist |
| Today / My Work landing | Yes (`/app/today`, staff-only) | Uses #721 `matchesMyWorkTodayFilter` | — |
| Shared Prospect detail | Yes (`/app/prospects/[id]`) | JSON owner/stage/next-action/due/note | Connecting the three product views (#721 Slice 3) |
| Clients / commercial / delivery summaries | Clients yes (`/app/clients`); Commercial yes (`/app/commercial`) | Delivery (#1005) remains later | Company Master editor stays at `/admin/company-master` |

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

### Already shipped (shared Prospect Workbench — #996)

1. Dedicated Operating Workspace route `/app/workbench` + `GET /api/app/workbench`.
2. Reuse `#721` view-model, `#994` shared detail, and existing `PATCH /api/app/prospect` write paths.
3. Lead Rescue, Website Rescue, and general prospects in one reusable grid with sort, standard filters, exception signals, and safe inline edits.
4. Staff-only; Tenant 403; no schema; no external send; `/admin/lead-rescue` remains a temporary product desk.

### Already shipped (Postgres Pipeline — #997)

1. Dedicated Operating Workspace route `/app/pipeline` + `GET /api/app/pipeline`.
2. Lanes from `#721` `canonical_stage`. Cards open `/app/prospects/[id]`. Stage movement reuses `PATCH /api/app/prospect`.
3. `/change/revenue` localStorage is reduced to an optional personal checklist; it is not canonical.
4. Staff-only; Tenant 403; no schema; no external send.

### Already shipped (canonical Prospect Action Queue — #995)

1. Dedicated Operating Workspace route `/app/queue` + `GET /api/app/queue`.
2. Reuse the merged `#994` shared detail, `#996` Workbench lead set, and `#997` Pipeline. Safe edits stay on `PATCH /api/app/prospect`.
3. Default filter answers “what needs action now?” Named filters cover new, overdue, due today, no next action, awaiting prospect/client, awaiting CorpFlowAI, and awaiting protected approval.
4. Staff-only; Tenant 403; no schema; no external send; `/admin/rapid-delivery` remains a temporary product desk.

### Already shipped (Clients summary — #999)

1. Dedicated Operating Workspace route `/app/clients` + `/app/clients/[id]` with `GET /api/app/clients` and `GET /api/app/client`.
2. Reuse Company Master identity (`listCompanies` / `getCompany`) and already-recorded prospect references. No second Client table.
3. Show available identity, contact, owner, onboarding/delivery status, services, next action, and links to Prospects / Pipeline / Company Master / `/change`.
4. Staff-only; Tenant 403; no schema; no ERPNext write; `/admin/company-master` remains the evidence/asset editor.

This slice does **not** retire Company Master, product desks, or `/change/revenue`.

### This slice (Commercial summary — #1004)

1. Dedicated Operating Workspace route `/app/commercial` + `GET /api/app/commercial`.
2. Reuse the existing #714 commercial-approval rail, Company Master identity (`cmp_ada_spa_synthetic` / `/admin/company-master`), and #999 Clients path `/app/clients`. Do not invent a second client or billing model.
3. Present quotation / acceptance / payment-evidence / financial-approval state, blockers, owner, and next action. ERPNext names are read-only references already stored on the prospect rail JSON.
4. Staff-only; Tenant 403; no schema; no payment execution; no ERPNext mutation; no external send.

This slice does **not** replace the Clients page, Delivery summary, invoice generation, or product-desk retirement.

### Later spare-capacity slices (do not build in this PR)

1. Product-desk retirement after live verification of Workbench, Pipeline, and Action Queue replacements.
2. Delivery summary from Lead Rescue / Website Rescue contracts (#1005).
3. Tenant Workspace simplification (remove internal cognitive load).
4. Redirects/retirement only after live verification of replacements.

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
  node-tests/app-prospect-workbench.test.mjs \
  node-tests/app-prospect-pipeline.test.mjs \
  node-tests/app-action-queue.test.mjs \
  node-tests/app-clients.test.mjs \
  node-tests/app-commercial-summary.test.mjs \
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
