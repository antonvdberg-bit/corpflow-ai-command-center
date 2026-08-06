# CorpFlowAI central application — route & capability matrix v1

**Issue:** [#773](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/773)  
**Packet:** First required packet — **audit** (PR #774) + **Slice 1 runtime** (issue [#778](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/778))  
**Status:** Audit complete; **Slice 1 implementation in progress / draft PR** — synthetic `/app` shell + Requests & Progress  
**Date:** 2026-08-06  
**Audit branch:** `cursor/dispatcher-issue-773-31d4`  
**Slice 1 branch:** `cursor/dispatcher-issue-778-7cf4`  
**Slice 1 agent / run:** `bc-454508b6-2860-497c-b9c2-db796d038587`

### Slice 1 runtime pointer (#778)

| Surface | Path |
| ------- | ---- |
| Shell / scope entry | `/app` (`pages/app/index.js`) |
| Tenant Requests & Progress | `/app/requests` |
| Core request/work twin | `/app/core/requests/[id]` |
| Thin APIs | `/api/app/context`, `/requests`, `/request`, `/expose`, `/review` |
| Pure modules | `lib/app/**` |
| Preview demo (synthetic only) | append `?demo=slice1` |

Schema gate remains **closed**. `/change` stays operational and is not expanded into the platform shell.

---

## 0. Executive outcome (what is true after this audit)

| Question | Short answer |
| -------- | ------------ |
| Is there already one Core + Tenant product shell? | **No.** Host surfaces and auth exist; navigation is still scattered. |
| What do people use today? | **`/change`** on Core and tenant hosts is the de-facto operating hub. |
| Can client progress reuse existing data? | **Yes** — `cmp_tickets` + `console_json.client_view` + derived workflow. |
| Schema change for first slice? | **No.** |
| Smallest safe next step? | Thin authenticated Core/Tenant shell + **synthetic** Requests & Progress (see §10). |

---

## 1. Explicit answers (required by #773)

### 1. What currently functions as Core?

**Host plane:** hosts listed in `CORPFLOW_CORE_HOSTS` resolve to `surface: 'core'`, `tenant_id: null` (`lib/server/host-tenant-context.js`). Live example: `https://core.corpflowai.com`.

**De-facto Core UX today:**

| Surface | Role |
| ------- | ---- |
| `https://core.corpflowai.com/change` | Primary operator hub (same `pages/change.js` as tenants) |
| `components/CoreTenantPicker.js` | “Your workspaces” / acting-tenant picker on Core `/change` |
| `/admin/rapid-delivery`, `/admin/lead-rescue` | Factory admin desks (prospect / offer ops) |
| `/factory/approvals`, `/factory/auth-users`, `/factory/living-word-workflows` | Factory/admin tools |
| Static HTML (`master-control.html`, `control-room.html`, …) | Legacy/ops shells |
| Factory APIs (`/api/factory/*`) | Health, tenants overview, auth-users, technical-lead, ensure-schema, etc. |

**Missing vs #773 Core nav:** unified My Work / Tenants / Requests / Delivery / Products / Approvals / Releases / Operations / Administration shell.

Canonical boundary doc: `docs/CORE/TENANT_BOUNDARIES_AND_ADMIN_RULES.md`.

### 2. What currently functions as Tenant?

**Host plane:** hostname → `tenant_id` via env map, apex default, CIPC helper, subdomain heuristic, or Postgres `tenant_hostnames`.

**De-facto Tenant UX today:**

| Surface | Role |
| ------- | ---- |
| Tenant-host `/` | Marketing / landing (`pages/index.js` + tenant skins) |
| Tenant-host `/change` | Operating hub (CMP tickets, Lux CRM extras, CIPC panel) |
| `/login` → `public/login.html` | Auth entry + tenant chrome |
| Lux: `/properties`, `/concierge`, `/client/*`, LuxeMaurice AI preview | Tenant product surfaces |
| CIPC: `/`, `/annual-returns` | Tenant product surfaces |
| “Switch workspace” | Link back toward Core (`lib/ui/tenant-host-switch-link.js`) — not a full product scope switcher |

**Missing vs #773 Tenant nav:** capability-aware Home / My Work / Prospects / Requests & Progress / Documents / Reports / Support without Core controls.

**CorpFlowAI as reference tenant:** doctrine says it must follow normal tenant rules (no bypass architecture). Membership APIs (`/api/membership/*`) and `user_tenant_memberships` already support multi-tenant users; a first-class “Tenant — CorpFlowAI” product scope is **not** yet a dedicated shell.

### 3. What exactly does `/change` own today?

**Canonical route:** `pages/change.js` (~8k+ LOC). Helpers under `lib/cmp/_lib/change-*.js`. Governance: `docs/ROUTE_GOVERNANCE.md`.

**Live (probed 2026-08-06):**

- `https://lux.corpflowai.com/change` → **200** (Next HTML)
- `https://core.corpflowai.com/change` → **200** (Next HTML)

**Owns today:**

- CMP ticket queue + detail for the session’s scope
- Workflow / estimate / approve-build / promote / preview-review
- Attachments, refinement chat, client-decisions minting
- Derived `ticket_progress.client_view.workflow_state`
- Lux-local CRM / media / content-sprint / feedback entry points (on Lux host)
- CIPC operator affordances on tickets (on CIPC host)
- Core workspace picker (on Core host)
- Factory oversight panel (Technical Lead latest) for authorised sessions

**Does not own (and must not become):** the long-term Core/Tenant application shell (#773). Temporary compatibility redirect target later — not the everything-dashboard.

**Experimental / legacy peers:** `/change-v2` (experimental); `public/change.html` (legacy static).

### 4. Which client-progress capabilities already exist?

| Capability | Where | Status |
| ---------- | ----- | ------ |
| Plain workflow / progress message / next action | `console_json.client_view` + `ticket-get` → `ticket_progress` | **Exists** |
| Milestone itinerary | `ticket-get` → `itinerary` | **Exists** (still engineering-flavoured in places) |
| Preview approve / request changes | CMP `preview-review` | **Exists** (ticket-level) |
| Programme decisions form | `/client/change-decisions` + magic link | **Exists** |
| Lux recovery roadmap | `/client/recovery-roadmap` | **Partial** (Lux-specific) |
| Lux client request list (safe shape) | `lux-client-requests-list` / `safeLuxRelatedRequestShape` | **Partial** |
| Hide raw `console_json` from non-admin | `ticket-get` | **Exists** |
| Governed component tree + expose-for-review comments | — | **Missing** |
| Dedicated Tenant “Requests & Progress” product page | — | **Missing** |
| Guaranteed absence of GitHub/CI/agent detail on tenant reads | — | **Incomplete** — `itinerary`, `reality_panel`, TL gaps, automation metadata can still surface |

### 5. Which #721 surfaces exist, and are they shared or tenant-specific?

Canonical contract: `docs/operations/PROSPECT_OPERATIONS_V1.md` + `lib/cmp/_lib/prospect-operations-view-model.js` (Slice 1 — view-model; **no** shared UI package yet).

| #721 view | Closest live surface | Scope | Implemented |
| --------- | -------------------- | ----- | ----------- |
| Action Queue | `/admin/rapid-delivery` | **Core/admin shared** | Partial (product-split Rapid Delivery) |
| Workbench | `/admin/lead-rescue` | **Core/admin shared** | Partial (Lead Rescue branded) |
| Pipeline Kanban | `/change/revenue` | **Core/operator** | Partial (localStorage samples; not Postgres `leads`) |
| Shared `components/prospect-ops/*` detail | — | Planned shared | **No** |

**Tenant-specific and out of #721 P0 package:** Lux CRM on `/change`, Living Word workflows, growth ABM tables.

### 6. Which Lux/CIPC components are reusable versus custom?

| | Reusable / shared platform | Tenant-custom |
| - | -------------------------- | ------------- |
| **Lux** | CMP `/change`, `client_view` patterns, Core picker, glass/marketing layout primitives, auth/session | `LuxeMaurice*` / Rare Exclusive brand, properties admin, Lux CRM/media/sprint, lux-feedback, recovery roadmap, LuxeMaurice AI preview |
| **CIPC** | CorpFlow glass landing patterns, CMP ticket path, auth/session | `cipc_desk` JSON lane, email-intake APIs, `/annual-returns`, CIPC panels in `/change` |

**Recommendation:** Central app shell and Requests & Progress must stay **tenant-agnostic**. Lux/CIPC skins plug in as capability modules later — do not hard-wire Lux recovery roadmap as the platform progress UI.

### 7. What records can link request → components → work → evidence today?

| Link | Record / field | Strength |
| ---- | -------------- | -------- |
| Request | `CmpTicket` (`title`, `description`, `brief`, `status`, `stage`) | Strong |
| Client-safe projection bag | `CmpTicket.consoleJson` → `client_view`, `brief`, `client_decisions` | Strong bag; weak structure |
| Components / outcomes | Soft lists in `brief.acceptance_criteria[]`, `intended_outcomes[]`, Lux `lux_programme`; **no** first-class component rows | Weak |
| Work / delivery state | Same ticket: workflow derivation, `promotion`, `client_view.automation`, Lux child tickets via `parent_programme_ticket` | Strong for single-ticket |
| Evidence (Core) | `CmpTicketAttachment`, `TechnicalLeadAudit.evidenceJson`, `TelemetryEvent`, `AutomationEvent`, reality-gate / delivery_integrity JSON | Strong |
| Prospects (separate lane) | `Lead` + `qualificationJson` | Strong for #721; **not** CMP request hierarchy |

There is **no** durable FK chain: request → work package → components → tasks → evidence rows.

### 8. What can be achieved with existing fields/JSON?

Without schema change (synthetic first):

1. One request with plain-language outcome text.
2. Overall status via derived workflow milestone mapping (see §3 progress model).
3. Component list as **new JSON** under e.g. `console_json.client_view.components[]` with milestone + `exposed_for_client_review`.
4. Next action / blocker / latest client-safe update fields on `client_view`.
5. Comment/approval only when `exposed_for_client_review === true` (new narrow handlers or reuse decisions / preview-review patterns).
6. Core view of the same ticket with internal promotion / TL / evidence refs.
7. Scope chrome using `/api/ui/context`, `/api/auth/me`, membership switch APIs.

### 9. Is any schema change genuinely required?

**No — not for the first visible slice.**

Stop condition from #773: if a later real multi-component pilot proves JSON unstable, return a **minimum** proposal such as optional `CmpDeliveryComponent` (`ticket_id`, `key`, `title`, `milestone`, `exposed_for_client_review`, `client_safe_summary`). Do **not** open that gate in the first slice.

Protected: no Prisma migration / ensure-schema expansion for this packet.

### 10. What is the smallest safe visible slice?

See **§6 First-slice recommendation** below.

---

## 2. Progress model audit (deterministic milestones)

### Existing Change Console workflow states

From `lib/cmp/_lib/change-workflow-state.js`:

`intake` → `refining` → `ready_for_estimate` → `estimated` → `approved_for_build` → `awaiting_client_programme_decisions` → `building` → `preview_ready` → `in_review` → `changes_requested` → `client_approved` → `publishing` → `published` / `closed`

### Proposed client-progress roll-up (derive; do not free-type %)

| Client milestone (#773) | Derive from (examples) |
| ----------------------- | ---------------------- |
| not started | `intake` / missing workflow |
| defined | `refining` … `estimated` / brief present |
| in progress | `approved_for_build` … `building` |
| preview ready | `preview_ready` |
| client review | `in_review` / `awaiting_client_programme_decisions` / exposed component |
| approved | `client_approved` |
| live verified | `published` / `closed` with delivery integrity / hard_close |

Numeric progress (if shown) = count of components in terminal milestones ÷ total components (explainable). **No** arbitrary percentage field.

---

## 3. Auth, roles, tenant resolution (summary)

| Concern | Source of truth |
| ------- | --------------- |
| API entry | `api/factory_router.js` (all `/api/*`) |
| Host → Core/Tenant | `lib/server/host-tenant-context.js` |
| Session cookie | `lib/server/session.js` (`corpflow_session`) |
| Login / me / logout | `lib/server/auth.js` |
| Membership matrix | `UserTenantMembership` + `lib/server/effective-memberships.js` + `membership-api.js` |
| CMP gates | `lib/cmp/router.js` — `requireDormantGate`, `requireFactoryMasterOnly`, tenant allowlists, host mismatch |
| UI context | `GET /api/ui/context` |

**Session types (simplified):** admin (DB or env legacy), tenant password (membership-aware), tenant PIN (narrower), factory master token (break-glass).

**Boundary rule for #773:** CorpFlowAI reference tenant uses the same membership + host rules as Lux/CIPC — no special-case bypass.

---

## 4. Route / capability matrix

Legend for **implemented / merged / deployed**:

- **Y** = present on `main` and live-probed where URL listed  
- **partial** = exists but incomplete vs #773 intent  
- **N** = missing  
- **legacy** = keep only until redirects  

Live probes on 2026-08-06 (HTTP): lux `/` and `/change`, core `/change`, `/login`, `/api/factory/health`, cipc `/` — all **200**.

### 4.1 Shared / Core / Tenant operating surfaces

| route | page/component | scope | purpose | record type | data source/API | role and tenant boundary | implemented | merged | deployed | live URL | reusable | known defects | recommended disposition |
| ----- | -------------- | ----- | ------- | ----------- | --------------- | ------------------------ | ----------- | ------ | -------- | -------- | -------- | ------------- | ----------------------- |
| `/change` | `pages/change.js` | shared Core+Tenant | Change Console hub | `cmp_tickets` (+ Lux leads extras) | `/api/cmp/router`, `/api/ui/context`, `/api/auth/me` | Tenant session scoped; admin/core broader; factory-only actions blocked on tenant hosts | Y | Y | Y | `https://lux.corpflowai.com/change`, `https://core.corpflowai.com/change` | high (bloated) | Overloaded “everything” UI; tenant payload not fully client-safe | **Compat hub** → later redirect into central app; do not expand as platform shell |
| `/change-v2` | `pages/change-v2.js` | experimental | stage-governed console experiment | tickets | CMP | same auth model | partial | Y | Y (route exists) | same hosts `/change-v2` | low | Not production control | Keep experimental; do not promote |
| `/change/revenue` | `pages/change/revenue.js` | Core/operator | Revenue kanban checklist | localStorage samples | none authoritative | weak page gate | partial | Y | Y | core `/change/revenue` | low until Postgres | Not wired to `leads` | #721 Slice 3 candidate; out of first #773 slice |
| `/change/lux-feedback` | `pages/change/lux-feedback.js` | Tenant Lux | Owner feedback queue | static/module | `lib/client/lux-owner-feedback-queue.js` | Lux operator | partial | Y | Y | lux `/change/lux-feedback` | Lux-only | Not CMP-backed | Stay Lux-local |
| `/login` | `public/login.html` | shared | Auth entry | `auth_users` | `/api/auth/login`, `/api/ui/context` | client vs operator chrome | Y | Y | Y | `https://core.corpflowai.com/login` (+ tenant hosts) | high | Cross-tenant password-manager risk (documented) | Keep; feed central scope entry |
| `/` | `pages/index.js` + skins | Tenant/public | Marketing by host | site / personas | SSR + host map | host→tenant | Y | Y | Y | lux `/`, cipc `/`, apex | shell yes; skins no | Lux rewrite via middleware for some hosts | Tenant marketing; outside Core ops shell |
| `/admin/rapid-delivery` | `RapidDeliveryRevenueDesk` | Core | Action Queue stand-in (#721 A) | `leads` RD product | `/api/factory/rapid-delivery/*` | admin / factory master | partial | Y | Y | core admin path | medium | Product-split | Evolve under #721; integrate later into Tenant Prospects |
| `/admin/lead-rescue` | `AiLeadRescueAdminList/Detail` | Core | Workbench stand-in (#721 B) | `leads` LR product | `/api/factory/lead-rescue/*` | admin / factory master | partial | Y | Y | core admin path | medium | LR-branded | Extract shared workbench later (#721) |
| `/factory/approvals` | `public/factory-approvals.html` | Core | Factory approvals | factory | factory APIs | admin/master | Y | Y | Y | core `/factory/approvals` | low HTML | Static | Fold into Core Operations later |
| `/factory/auth-users` | `public/factory-auth-users.html` | Core | Auth user admin | `auth_users` | factory auth-users APIs | master | Y | Y | Y | core `/factory/auth-users` | low | Break-glass adjacent | Core Administration later |
| `/factory/living-word-workflows` | `LivingWordWorkflowOperatorList` | Core (tenant data) | LW chatbot steps | workflow runs | tenant-workflow APIs | admin | Y | Y | Y | core factory path | low | Tenant-specific inbox | Tenant override / Core ops link |
| `/client/change-decisions` | `pages/client/change-decisions.js` | Tenant/client-safe | Programme decisions | `console_json.client_decisions` | client-decisions CMP | magic link or session | Y | Y | Y | tenant `/client/change-decisions` | **high pattern** | Not general progress UI | **Seed** for expose-for-review UX |
| `/client/recovery-roadmap` | recovery page | Tenant Lux | Recovery status | content + decisions | CMP decisions | Lux | partial | Y | Y | lux client path | low | Lux-specific | Pilot pattern only |
| `/client/luxe-maurice-ai/*` | `LuxeMauriceAiPreviewShell` | Tenant Lux | AI preview + CRM | private access / listings | Lux APIs | Lux session | partial | Y | Y | lux client paths | shell pattern | Not #721 shared | Tenant product |
| `/properties`, `/properties/admin` | Lux property UI | Tenant Lux | Catalogue + desk | `lux_listings` | listing APIs | Lux editor gate | Y | Y | Y | lux `/properties` | Lux-only | — | Tenant CMS |
| `/annual-returns` | `CipcDeskAnnualReturnsReview` | Tenant CIPC | Specialist review | CIPC content + intake | cipc-desk APIs | cipc-desk host | Y | Y | Y | cipc `/annual-returns` | low | corpflow_test | CIPC capability |
| `/concierge` | concierge page | Tenant Lux | Concierge leads | leads | concierge CMP | tenant-local | Y | Y | Y | lux `/concierge` | low | Feature-gate required | Tenant service |
| `public/change.html` | static | legacy | Old Change Console | tickets | CMP | cookie session | legacy | Y | Y | `/change.html` | no | Superseded by Next | Retire after redirects |
| Static ops HTML (`control-room`, `master-control`, `growth`, …) | public/*.html | legacy/Core ops | Ops shells | mixed | mixed | factory | partial/legacy | Y | Y | core static paths | no | Parallel to Next | Inventory → retire or Core Ops links |
| **Central app shell** (`/app` or equivalent) | — | Core + Tenant | Explicit scope + nav | session + membership | ui/context, auth/me, membership | authorised scopes only | **N** | N | N | — | — | Missing | **First-slice build target** |
| **Tenant Requests & Progress** | — | Tenant | Client-safe request progress | projected ticket JSON | new projection API | tenant role; no engineering leak | **N** | N | N | — | — | Missing | **First-slice build target** (synthetic) |
| **Core request/work view** | — | Core | Internal hierarchy view | same ticket + evidence | admin ticket-get / TL | Core/admin | **N** (partial via `/change`) | — | — | — | — | `/change` too dense | First-slice Core panel (synthetic) |

### 4.2 Key APIs (data contracts)

| API | scope | purpose | client-safe? | disposition |
| --- | ----- | ------- | ------------ | ----------- |
| `GET /api/auth/me` | shared | Session identity | N/A | Keep |
| `GET /api/ui/context` | shared | Host surface + session chrome | N/A | Keep; feed shell |
| `/api/membership/*` | Core host | Effective memberships + switch | N/A | Keep; foundation for scope picker |
| `ticket-list` | Core/Tenant | Ticket summaries | Partial (no console_json; still operator-oriented) | Keep; not Requests & Progress |
| `ticket-get` | Core/Tenant | Ticket detail + `ticket_progress` | **Incomplete** for tenants (itinerary / reality / TL gaps) | Need governed projection for Tenant progress |
| `client-decisions-get/submit` | Tenant/client | Programme Q&A | **Yes** | Pattern to reuse |
| `preview-review` | Tenant/client | Approve / request changes | Mostly | Ticket-level only |
| `lux-client-requests-list` | Tenant Lux | Related requests safe shape | Partial | Lux-local |
| `technical-lead-latest` | Core/Tenant scoped | TL summary + gaps | **No** for client progress UI | Core-only in new shell |
| Factory `/api/factory/*` | Core | Ops | N/A | Stay Core |

---

## 5. Reusable vs duplicated vs abandoned

| Class | Items |
| ----- | ----- |
| **Reusable foundations** | Auth/session, host Core/Tenant resolution, membership switch, `client_view` workflow derivation, client-decisions + preview-review patterns, `CoreTenantPicker`, CMP tenant scoping |
| **Duplicated** | Three #721 desks + Lux CRM + Living Word inboxes — overlapping “work queue” mental models |
| **Overloaded** | `pages/change.js` as shared Core+Tenant+Lux+CIPC surface |
| **Legacy / retire later** | `public/change.html`, scattered static ops HTML, `/change-v2` if never promoted |
| **Abandoned as product shell** | None named “central app”; gap is absence, not a dead route |

---

## 6. First-slice recommendation (bounded)

**Goal:** Prove Core vs Tenant scope chrome + client-safe progress + one expose-for-review interaction using **synthetic records only**.

### In scope (next implementation PR — not this audit)

1. Thin authenticated shell route (suggested: `/app` under existing Next app — **not** a second deployment).
2. Persistent chrome: **Scope · Tenant · Role** always visible; Core vs Tenant visually distinct.
3. Scope options for a dual-authorised test user: **Core** and **Tenant — CorpFlowAI** (normal tenant rules).
4. Tenant → Requests & Progress: one synthetic request with ≥2 components; milestones; complete/remaining; next action; client-safe blocker.
5. One component `exposed_for_client_review=true` accepts comment/approval; one ordinary component view-only.
6. Core view of the **same** synthetic request with internal work/evidence references.
7. Projection module that **cannot** emit GitHub/CI/agent/secret fields to Tenant.
8. Isolation + role tests; preview screenshots; **draft PR only**.

### Explicitly out of scope (first slice)

- Schema / migrations / ensure-schema
- Env/secrets, deploy, merge without Anton
- Real Lux/CIPC client data
- Expanding `/change` into the platform shell
- #721 UI extraction
- Resuming #766 controlled-pilot rehearsal (per #773 sequence step 9)
- Messaging, payments, DNS, ERPNext, OpenHands

### Suggested owned paths for the implementation PR (preview)

```text
pages/app/**                     # or pages/app.js + nested
components/app/**                # shell, scope chrome, progress views
lib/app/**                       # synthetic fixtures + client-safe projection
node-tests/app-*.test.mjs        # isolation / projection tests
docs/architecture/*              # update matrix status after slice
```

Exact paths may be adjusted in the implementation claim; **do not** touch Lux marketing, CIPC annual-returns, or #721 desks in that PR.

### Schema gate

**Closed.** Reopen only with a minimum proposal if synthetic JSON projection fails acceptance.

---

## 7. Delivery sequence after audit (unchanged intent)

1. Central application shell + explicit Core/Tenant scope context  
2. Tenant Requests & Progress (synthetic)  
3. Core request/work-package view + governed client projection  
4. Explicit expose-for-review comments/approvals  
5. CorpFlowAI reference-tenant proof  
6. Lux client-progress pilot (synthetic/redacted first)  
7. Integrate #721 Prospect Operations into Tenant scope  
8. Progressive legacy-route redirects and retirement  
9. Resume #766 controlled-pilot rehearsal only after verified navigation exists  

---

## 8. Overlap check (open work at audit time)

| Open PR / issue | Overlap with this audit |
| --------------- | ----------------------- |
| #766 / PR #771 GTM rehearsal | **Deferred** by #773 until navigation exists — do not block this audit |
| #721 Prospect Ops | Separate lane; contract exists; UI later |
| #767 voice pilots, #770 company-master, #759 lux purchase, #747 OpenHands | **No owned-path overlap** with this docs audit |
| Dispatcher concurrency hold note on #773 | Acknowledged; this packet is **docs-only** |

---

## 9. Claim block (for issue / PR)

```text
Cursor claim — audit packet only (#773)
- agent/run ID: bc-abc34a5e-e5f8-4b5f-8b0f-2b5d3b3a9c49 / run-1f31abd1-c5a4-403d-a374-bbcf67f5220a
- branch: cursor/dispatcher-issue-773-31d4
- owned paths: docs/architecture/** ; light pointers in docs/ROUTE_GOVERNANCE.md and docs/CORPFLOW_SHARED_TODO.md
- exclusions: no app/runtime, schema, secrets, deploy, #721 UI, /change expansion
- plan: durable route/capability matrix + Q1–Q10 + first-slice recommendation
- tests/evidence: live GET probes recorded in matrix; docs-only (no new automated tests)
- blocker: NONE
```

Issue comment posting via `gh` returned `Resource not accessible by integration` in this environment — claim is duplicated here and in the PR body.

---

## 10. Anton action

**NONE** for this audit packet.

Next human/ChatGPT step: accept or adjust the first-slice recommendation in §6, then authorise a **bounded implementation PR** (still draft; still no schema/deploy).
