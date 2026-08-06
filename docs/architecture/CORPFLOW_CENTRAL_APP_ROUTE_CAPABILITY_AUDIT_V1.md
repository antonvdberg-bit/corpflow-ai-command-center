# CorpFlowAI central application — route / capability audit v1

**Issue:** [#773](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/773)  
**Packet:** Audit only (first required packet)  
**Status:** COMPLETE for audit scope — **NO IMPLEMENTATION AUTHORIZED** beyond this documentation  
**Branch / agent:** `cursor/dispatcher-issue-773-1446` · cloud agent `bc-2f850ef7-c4ac-4462-a90c-2aa5b6eb5fd0`  
**Environment class:** CorpFlowAI-hosted surfaces are `corpflow_test` (see `docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md`)  
**Live probe date (UTC):** 2026-08-06 — floor URLs returned HTTP 200 (see §8)

**Related canon (do not replace):**

| Doc | Role |
|-----|------|
| `docs/CORE/TENANT_BOUNDARIES_AND_ADMIN_RULES.md` | Core vs tenant host rules |
| `docs/operations/TENANT_CLIENT_LOGIN.md` | Login / host / tenancy |
| `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` | Membership + acting tenant |
| `docs/operations/MULTI_TENANT_CONTAINMENT_AND_VISUAL_SEPARATION_AUDIT.md` | Visual separation + Core Capability vocabulary |
| `docs/ROUTE_GOVERNANCE.md` | `/change` ownership |
| `docs/operations/PROSPECT_OPERATIONS_V1.md` | #721 inventory |
| `docs/operations/CMP_CLIENT_VISIBILITY_AFTER_APPROVE.md` | What clients see after approve |
| `lib/cmp/README.md` | CMP API surface |
| `lib/cmp/_lib/change-workflow-state.js` | Client workflow derivation |

---

## 0. Executive outcome (what is true after this audit)

1. **There is one production app and one Postgres today** — correct foundation for #773. Do not create a second app/DB/CRM.
2. **There is no unified Core/Tenant application shell.** Operators and clients share `/change` plus scattered admin/factory/static tools. Scope is mostly **host-derived** (`core` vs `tenant`), not an explicit in-app Core / Tenant — CorpFlowAI / Tenant — Lux picker experience.
3. **`/change` owns delivery requests (CMP tickets)** — create, list, progress, estimate, approve-build, preview review, Lux/CIPC panels. It is the de-facto hub, not the long-term navigation model #773 wants.
4. **Client-safe progress already has a governed projection path** via `console_json.client_view` + `ticket-get` → `ticket_progress`. It is **not** yet a Requests & Progress product with component milestones, expose-for-review comments, or a Core dual view.
5. **#721 Prospect Ops** has Slice 1 (view-model) only. Live desks remain separate factory-admin surfaces under `/admin/*` and `/change/revenue`.
6. **Schema change is not required for the first visible slice.** Use synthetic records + existing session/membership/`client_view` conventions.
7. **Smallest safe visible slice** is defined in §10 — shell + synthetic Tenant/Core request views only; draft PR; no merge/deploy without Anton.

**Anton action from this audit:** NONE for protected gates. Next executor packet may implement §10 after ChatGPT acceptance review of this matrix.

---

## 1. Explicit answers (issue questions)

### 1. What currently functions as Core?

**Core today** = host plane `surface: 'core'` (canonical `core.corpflowai.com` via `CORPFLOW_CORE_HOSTS`) + operator session (`typ: 'admin'`) + factory/membership APIs + scattered desks.

| Layer | What |
|-------|------|
| Hub | `/change` on Core (unscoped / factory queue + `CoreTenantPicker`) |
| Product desks | `/admin/lead-rescue`, `/admin/rapid-delivery`, `/factory/living-word-workflows` |
| Factory HTML tools | `/factory/approvals`, `/factory/auth-users`, `/admin_onboarding.html`, repair helpers |
| APIs | `/api/factory/*`, Core-host `/api/membership/*`, factory-only CMP actions |
| Context | `GET /api/ui/context` (`surface`, `acting_tenant_id`, memberships) |

There is **no** left-nav Core app with My Work / Tenants / Requests / Delivery / Products / Approvals / Releases / Operations / Administration as first-class routes.

### 2. What currently functions as Tenant?

**Tenant today** = host → `tenant_id` → login (`login_route: client`) → `/change` as operating hub, plus host-branded marketing/public pages.

| Standing test tenants | Hosts (corpflow_test) | Ops hub |
|-----------------------|------------------------|---------|
| `luxe-maurice` | `lux.corpflowai.com` (+ optional `luxe.*`) | `/change` + Lux CRM/panels + marketing |
| `cipc-desk` | `cipc.corpflowai.com`, `cipc-desk.corpflowai.com` | `/change` + CIPC panel + `/annual-returns` |
| Apex / marketing | `corpflowai.com` (often mapped as `corpflowai`) | Marketing; not a full Tenant OS shell |
| Other product hosts | e.g. AI Lead Rescue, Living Word preview | Separate lanes |

**Gap vs #773:** CorpFlowAI as **permanent reference tenant** with a first-class Tenant — CorpFlowAI scope (capability nav including Requests & Progress) does **not** exist as a dedicated operating shell. Apex marketing ≠ Tenant OS.

### 3. What exactly does `/change` own today?

Canonical route: `pages/change.js` (~8k+ LOC). Owned behaviors:

- CMP ticket create / list / get / withdraw / activity
- Workflow progress (`client_view.workflow_state`, next action, progress message)
- Estimate → approve-build → automation/preview → promote path (operator-gated)
- Client decisions + preview review
- Attachments / Lux media (Lux-heavy)
- Lux concierge CRM panels (Lux-only)
- CIPC desk panel (CIPC-only)
- Core workspace picker when `surface=core`
- Links out to factory approvals, Lux feedback, properties admin, revenue cockpit

**Does not own (long-term #773 nav):** Products & Capabilities catalogue, Releases desk, Administration IA, Prospect Ops package, client-safe component milestone board as a separate product surface.

Compatibility note (`docs/ROUTE_GOVERNANCE.md`): `/change` remains canonical until progressive redirects land; `/change-v2` is experimental; `public/change.html` is legacy.

### 4. Which client-progress capabilities already exist?

| Capability | Exists? | Where |
|------------|---------|-------|
| Plain workflow state + next action | Yes | `ticket_progress.client_view` via `change-workflow-state.js` |
| Progress message | Yes | `client_view.progress_message` |
| Timeline / itinerary | Yes | `ticket-get` itinerary |
| Estimate / cost display | Yes | `costing-preview` → `client_view` |
| Approve build | Yes | `approve-build` |
| Preview approve / request changes | Yes | `preview-review` |
| Programme decisions form | Yes | `/client/change-decisions` + magic links |
| Delivery verdict (PR/preview signals) | Yes (operator-oriented) | `client_view.delivery_verdict` — **must not leak raw eng detail to tenants** |
| Component / milestone roll-up | **No** | Heuristic `operator_escalation…components[]` only |
| Expose-for-review comments/approvals per component | **No** | Transcript `messages[]` + preview-review only |
| Deterministic % progress | **No** | Discrete states only (correct direction) |
| Client-safe blocker reasons (governed) | Partial | `workflow_next_action` / progress copy; not a structured field set |
| Core dual view of same request with internal evidence | Partial | Admin gets full `console_json` on `ticket-get`; no dedicated Core UI |

### 5. Which #721 surfaces exist, and are they shared or tenant-specific?

| #721 view | Closest live surface | Shared package? | Audience |
|-----------|----------------------|-----------------|----------|
| Action Queue | `/admin/rapid-delivery` | No (product desk) | Factory admin |
| Workbench | `/admin/lead-rescue` (+ `[id]`) | No (Lead Rescue branded) | Factory admin |
| Pipeline Kanban | `/change/revenue` | No (localStorage checklist) | Factory operator |
| Shared detail drawer | `components/prospect-ops/*` | **Missing** | — |
| Canonical view-model | `lib/cmp/_lib/prospect-operations-view-model.js` | Yes (Slice 1) | Library only |

**Not tenant-facing.** Integrate into Tenant scope only after #773 shell exists (issue delivery sequence step 7).

### 6. Which Lux/CIPC components are reusable versus custom?

**Reusable platform**

- Host → tenant resolution, sessions, `/change` CMP spine, `client_view` workflow, `/api/ui/context`, `/api/tenant/site` + `tenant-chrome.js`, magic decision links, generic `TenantSite` fallback, photo+glass marketing primitives (CIPC pattern)

**Lux-custom (do not treat as Core defaults)**

- Rare & Exclusive ivory shell, properties CMS, concierge, Lux CRM on `/change`, lux-feedback queue, recovery roadmap, `/client/luxe-maurice-ai/*`, Lux theme helpers under `lib/client/lux-*` / `lib/cmp/_lib/lux-*`

**CIPC-custom**

- `CipcDeskLanding`, `/annual-returns`, email-intake, `cipc_desk` panel on `/change`, standing-host runtime

### 7. What records can link request → components → work → evidence today?

```text
CmpTicket (request hub)
  ├─ console_json.brief / messages / client_decisions
  ├─ console_json.client_view.*          → client progress projection
  ├─ soft links: parent_programme_ticket / parent_sprint_ticket / lux_request_meta
  ├─ operator_escalation…components[]   → heuristic strings only (not WBS)
  ├─ status/stage + workflow_state      → work stage
  ├─ automation / promotion             → build/ship work (internal)
  ├─ CmpTicketAttachment                → file evidence
  ├─ TechnicalLeadAudit                 → factory evidence/gaps
  ├─ delivery_verdict / integrity       → delivery evidence (internal-heavy)
  └─ TelemetryEvent / AutomationEvent   → audit trail
```

No Prisma `Project` / `Task` / `Milestone` / `Comment` models for CMP. Living Word `Workflow*` tables are a separate chat follow-up system.

### 8. What can be achieved with existing fields/JSON?

Without schema change:

- Authenticated Core vs Tenant host contexts + membership switching (existing)
- Client-safe progress from `workflow_state` / next action / progress message / itinerary
- Soft related-request trees (Lux parent programme pattern)
- Optional **new JSON convention** inside `console_json` (e.g. `client_progress.components[]` with milestone enum + `exposed_for_client_review`) for the synthetic first slice — **document first, no migration**
- Core admin view of the same ticket via existing `ticket-get` (full `console_json` when admin)

Cannot cleanly do yet without conventions/UI:

- Weighted % roll-ups with explainable rules (design-only until needed)
- First-class expose-for-review comment/approval persistence beyond synthetic/in-memory or JSON append
- Unified application IA (needs new shell routes)

### 9. Is any schema change genuinely required?

**No for the first visible slice.**

If a later slice needs indexed querying of milestones across many tickets, **stop and propose** a minimum additive table (e.g. `cmp_ticket_milestones`) — not authorized now.

### 10. What is the smallest safe visible slice?

See **§10** below (definition of done aligned to issue #773).

---

## 2. Auth, users, roles, tenant resolution (summary)

| Concern | Current model | Key paths |
|---------|---------------|-----------|
| Users | `auth_users` — `level` `admin` \| `tenant`; optional `factory_master` | `lib/server/auth.js`, Prisma |
| Memberships | `user_tenant_memberships` (+ factory_master expands to all Active) | `lib/server/effective-memberships.js` |
| Session | Cookie `corpflow_session` (HMAC JWT); admin vs tenant payload; `acting_tenant_id` | `lib/server/session.js` |
| Host → surface | `CORPFLOW_CORE_HOSTS` → `surface=core`, `tenant_id=null`; else tenant map / subdomain / `tenant_hostnames` | `lib/server/host-tenant-context.js` |
| UI context | `/api/ui/context` — surface, session, acting tenant, membership count, login_route | `api/factory_router.js` |
| CMP gates | Dormant Gate; factory-master-only; factory-only-on-tenant-host reject; membership enforcement | `lib/cmp/router.js` |
| Page SSR | `requireAdminPageSession` for `/admin/*` desks | admin pages |

**Implication for #773 scope selection:** membership + Core picker already support multi-tenant operators. Missing piece is a **persistent, visually distinct scope chrome** (Core vs Tenant — X) with role always visible — specified partly in multi-tenant visual audit §6, not fully shipped.

---

## 3. Progress model recommendation (deterministic)

Do **not** invent free-typed percentages.

| Milestone (proposed for client projection) | Maps from today (approx.) |
|--------------------------------------------|---------------------------|
| `not_started` | ticket created, no refine |
| `defined` | brief sufficient / ready_for_estimate |
| `in_progress` | refining / estimated / approved_for_build / building |
| `preview_ready` | `preview_ready` |
| `client_review` | `in_review` / awaiting client decisions / exposed component |
| `approved` | `client_approved` / preview approve |
| `live_verified` | `published` / `closed` with live verification discipline |

Any numeric progress = count(components in terminal milestones) / count(components), or explicit weights documented in the projection module — never operator free-type.

---

## 4. Route / capability matrix

Legend for deployment columns (corpflow_test, probed 2026-08-06):

- **implemented** — code present in repo
- **merged** — on `main` (current production spine)
- **deployed** — served by Production for these hosts (assumed when live GET 200 on Production hosts)
- **live URL** — HTTP status from operator probe

### 4.1 Primary shells and hubs

| route | page/component | scope | purpose | record type | data source/API | role and tenant boundary | implemented | merged | deployed | live URL | reusable | known defects | recommended disposition |
|-------|----------------|-------|---------|-------------|-----------------|--------------------------|-------------|--------|----------|----------|----------|---------------|-------------------------|
| `/change` | `pages/change.js`, `CoreTenantPicker` | shared | Delivery / CMP console; Core picker on core host | `cmp_tickets` | `/api/cmp?action=*`, `/api/ui/context`, membership APIs | Session + dormant gate; Core unscoped vs tenant-scoped | Y | Y | Y | `https://core.corpflowai.com/change` 200; `https://lux.corpflowai.com/change` 200; `https://cipc.corpflowai.com/change` 200 | Shared shell; Lux/CIPC panels custom | Monolith; dual role as everything-hub | **Keep as compatibility hub**; progressive redirect into central app later |
| `/change-v2` | `pages/change-v2.js` | shared / experimental | Stage-governed console experiment | `cmp_tickets` | `/api/cmp` | Same CMP gates | partial | Y | Y (route exists) | not floor-probed | Experiment | Not canonical | Do not promote; retire or fold |
| `public/change.html` | static | legacy | Older Change Console | `cmp_tickets` | CMP APIs | Client-side | partial | Y | Y | legacy | No | Drift vs Next page | **Legacy — do not dual-maintain** |
| `/login` | `public/login.html` | shared | Auth entry | sessions | `/api/auth/*`, ui/context, tenant-chrome | Host-driven login_route | Y | Y | Y | host-dependent | Shared | Theme fights mitigated | Keep |
| `/` (host-resolved) | `pages/index.js` + Lux/CIPC/generic | Tenant / public | Marketing homepage | website_draft / persona | SSR host map | Host → tenant | Y | Y | Y | lux/ 200; cipc/ 200 | Dispatch reusable; presentations custom | Lux rewrite dual-path | Keep marketing; not Tenant OS |
| Central app shell (`/app` or `/workspace` — **does not exist**) | — | Core + Tenant | Explicit scope chrome + nav | session + synthetic | ui/context + future APIs | Membership + role | **N** | N | N | — | Target reusable | Gap | **First implementation target (§10)** |

### 4.2 Core / factory desks

| route | page/component | scope | purpose | record type | data source/API | role and tenant boundary | implemented | merged | deployed | live URL | reusable | known defects | recommended disposition |
|-------|----------------|-------|---------|-------------|-----------------|--------------------------|-------------|--------|----------|----------|----------|---------------|-------------------------|
| `/admin/lead-rescue` | `AiLeadRescueAdminList` | Core | Lead Rescue workbench | `leads` | `/api/factory/lead-rescue/*` | admin session + factory master APIs | Y | Y | Y | core …/admin/lead-rescue 200 | Extract later → #721 | Product-branded | Keep Core; feed #721 |
| `/admin/lead-rescue/[id]` | `AiLeadRescueAdminDetail` | Core | Prospect detail | `leads` | factory lead-rescue get/patch | same | Y | Y | Y | (detail) | Detail pattern | No shared drawer | Keep; generalize in #721 |
| `/admin/rapid-delivery` | `RapidDeliveryRevenueDesk` | Core | Action Queue closest | `leads` | `/api/factory/rapid-delivery/*` | admin + factory master | Y | Y | Y | core …/admin/rapid-delivery 200 | Extract later → #721 | Product-specific | Keep Core; feed #721 |
| `/change/revenue` | `pages/change/revenue.js` | Core | Revenue checklist / pseudo-kanban | localStorage | local + links to admin desks | Operator intent; weak page gate | partial | Y | Y | core …/change/revenue 200 | Process UI | Not Postgres SoR | Evolve in #721 Slice 3; not Tenant |
| `/factory/living-word-workflows` | Living Word operator list | Core (tenant-coupled) | Chat workflow inbox | workflow steps | tenant-workflow operator | admin; LWM hardcoded | Y | Y | Y | not floor-probed | Pattern | Tenant id in page | Keep; generalize before 2nd tenant |
| `/factory/approvals` | `public/factory-approvals.html` | Core | Approvals UI | CMP | CMP + session | admin | Y | Y | Y | not floor-probed | Static tool | Weak shared nav | Absorb into Core chrome later |
| `/factory/auth-users` | `public/factory-auth-users.html` | Core | Staff password break-glass | `auth_users` | factory auth-users APIs | factory master | Y | Y | Y | not floor-probed | Onboarding | — | Keep factory-only |
| `/admin_onboarding.html` | static | Core | Tenant bootstrap | tenants, hostnames | factory bootstrap APIs | factory master | Y | Y | Y | not floor-probed | One-shot | Not Next | Keep until Next desk |
| `/growth` | `public/growth.html` | Core | Growth ABM UI | growth_* | `/api/growth/*` | factory/admin | partial | Y | Y | not floor-probed | Schema good | Chrome incomplete | Keep under Core CRM; out of #721 |
| Legacy `/master-control.html`, `/control-room.html`, `/admin.html` | static | legacy | Demo skins | demo | weak APIs | weak | legacy | Y | Y | ignore | No | Stale | **Archive / do not use as Core** |

### 4.3 Tenant / client surfaces

| route | page/component | scope | purpose | record type | data source/API | role and tenant boundary | implemented | merged | deployed | live URL | reusable | known defects | recommended disposition |
|-------|----------------|-------|---------|-------------|-----------------|--------------------------|-------------|--------|----------|----------|----------|---------------|-------------------------|
| Lux marketing suite | Rare Exclusive shell / properties / concierge / etc. | Tenant Lux | Public brand + inventory | listings, leads | Lux SSR + APIs | Lux host gates | Y | Y | Y | lux/ 200 | Lux-custom | — | Keep custom; not Core |
| `/properties/admin` | Lux properties admin | Tenant Lux | Listing CMS | lux_listings | Lux CMP/admin | Lux/admin allowlist | Y | Y | Y | not floor-probed | Lux-custom | — | Tenant surface |
| `/change/lux-feedback` | lux-feedback page | Tenant-coupled ops | Static feedback queue | static module | `lux-owner-feedback-queue.js` | operator | Y (static) | Y | Y | not floor-probed | Lux-only | Not DB-backed | Defer / replace |
| CIPC `/` + `/annual-returns` | `CipcDeskLanding`, Annual Returns review | Tenant CIPC | Marketing + specialist review | content + intake | CIPC runtime + email-intake | CIPC host | Y | Y | Y | cipc/ 200 | Glass shell reusable; content custom | noindex | Keep CIPC lane |
| `/client/change-decisions` | client decisions page | shared client-progress | Pre-build decisions | ticket decisions | CMP client-decisions + magic | magic or session | Y | Y | Y | not floor-probed | Shared pattern | Ticket-specific | Keep; feed Requests & Progress |
| `/client/recovery-roadmap` | Lux recovery | Tenant Lux | Programme confirmation | ticket + static | magic/session | Lux programme | Y | Y | Y | not floor-probed | Lux-only | — | Keep |
| `/client/luxe-maurice-ai/*` | AI preview shell | Tenant Lux preview | Multi-channel demo | demo + private API | lux AI APIs | preview | partial | Y | Y | not floor-probed | Lux-only | Demo/API mix | Keep separate from #721/#773 progress |
| Tenant Requests & Progress | **missing** | Tenant | Client-safe request board | synthetic → later CMP | future projection API | tenant session | **N** | N | N | — | Target | Gap | **§10 first slice** |

### 4.4 #721 Prospect Operations

| route | page/component | scope | purpose | record type | data source/API | role and tenant boundary | implemented | merged | deployed | live URL | reusable | known defects | recommended disposition |
|-------|----------------|-------|---------|-------------|-----------------|--------------------------|-------------|--------|----------|----------|----------|---------------|-------------------------|
| (library) | `prospect-operations-view-model.js` | shared | Canonical stages/signals | adapter over leads | pure JS | N/A | Slice 1 Y | Y | N/A | N/A | **Yes** | Not wired to UI | Keep; drive #721 Slices 2–4 |
| `components/prospect-ops/*` | planned | shared | Queue/workbench/drawer | leads | planned | factory first | **N** | N | N | — | Planned | Largest #721 gap | Implement under #721 after #773 shell |
| Closest desks | see §4.2 admin + revenue | Core | Interim | leads / localStorage | factory APIs | factory admin | Y/partial | Y | Y | 200s above | Extract | Fragmented | Do not call “Tenant Prospects” yet |

### 4.5 Key APIs / data contracts (not pages)

| route | handler | scope | purpose | record type | boundary | implemented | disposition |
|-------|---------|-------|---------|-------------|----------|-------------|-------------|
| `/api/ui/context` | factory_router | shared | Surface + session + acting tenant | derived | host + cookie | Y | **Foundation for scope chrome** |
| `/api/auth/*` | auth.js | shared | Login/logout/me | auth_users | level + host | Y | Keep |
| `/api/membership/*` | membership APIs | Core-host | Picker / acting tenant | memberships | requireCoreHost + CSRF | Y | Keep |
| `/api/cmp?action=ticket-*` | cmp/router | shared | Ticket spine | cmp_tickets | dormant + membership | Y | Keep; add client-progress projection later |
| `/api/cmp?action=preview-review` | cmp/router | shared | Client preview decision | console_json | tenant/admin | Y | Pattern for expose-for-review |
| `/api/cmp?action=client-decisions-*` | cmp/router | shared | Decision gate | console_json | magic/session | Y | Keep |
| `/api/factory/lead-rescue/*`, `rapid-delivery/*` | admin APIs | Core | Product desks | leads | factory master | Y | Keep; #721 sources |
| `/api/tenant/site` | factory_router | Tenant | Chrome / site draft | personas | host tenant | Y | Keep |
| Client-progress projection API | **missing** | Tenant + Core | Governed client vs internal views | console_json / synthetic | role filters | **N** | **§10 / step 3** |

---

## 5. Navigation and visual context tokens (inventory)

| Token / mechanism | Where | Notes |
|-------------------|-------|-------|
| `surface`: `core` \| `tenant` | ui/context | Host plane |
| `acting_tenant_id` | session + ui/context | Operator workspace |
| `effective_memberships_count` | ui/context | Switch workspace affordance |
| `login_route` | ui/context | operator / client / onboarding |
| CSS `--cf-accent`, `--cf-tenant-*` | `tenant-chrome.js` | Tenant theme |
| `data-cf-core-tenant-picker*` | CoreTenantPicker | Picker DOM |
| `data-cf-switch-workspace` | tenant `/change` | Link back to Core |
| Sticky “Acting as … in …” banner | multi-tenant visual audit §6 | **Not fully shipped** |

**Gap:** No persistent scope chip that always shows **Scope · Tenant · Role** across Core and Tenant OS routes.

---

## 6. Reusable vs duplicated vs abandoned / legacy

| Class | Examples | Disposition |
|-------|----------|-------------|
| Reusable platform | CMP router, workflow-state, ui/context, membership switch, tenant-chrome, prospect-ops view-model | Build #773 on these |
| Duplicated / fragmented | Lead Rescue vs Rapid Delivery desks; `/change` vs `change.html` vs `/change-v2`; Lux CRM vs #721 | Consolidate via #721 + central shell; don't expand duplicates |
| Tenant-coupled transitional | `lib/cmp/_lib/lux-*`, CIPC panels in `change.js` | Keep as Tenant Overrides; promote patterns only via packet |
| Abandoned / legacy | master-control / control-room / admin.html demo skins | Do not revive as Core |
| Missing | Central shell, Requests & Progress, expose-for-review, CorpFlowAI reference Tenant OS | #773 sequence |

---

## 7. Route compatibility requirements

1. **`/change` must keep working** on Core + Lux + CIPC during transition (live 200 today).
2. New central routes must **not** break host tenancy or cookie domain sharing (`.corpflowai.com`).
3. Compatibility redirects (later): `/change` → central Delivery / Requests views by scope — only after shell verified.
4. `#721` desks stay on Core until explicitly moved under Tenant nav (sequence step 7).
5. `#766` controlled-pilot rehearsal waits until navigation exists (issue constraint).

---

## 8. Live probe evidence (corpflow_test, 2026-08-06)

| URL | HTTP |
|-----|------|
| `https://core.corpflowai.com/api/factory/health` | 200 |
| `https://core.corpflowai.com/change` | 200 |
| `https://core.corpflowai.com/admin/lead-rescue` | 200 |
| `https://core.corpflowai.com/admin/rapid-delivery` | 200 |
| `https://core.corpflowai.com/change/revenue` | 200 |
| `https://lux.corpflowai.com/` | 200 |
| `https://lux.corpflowai.com/change` | 200 |
| `https://cipc.corpflowai.com/` | 200 |
| `https://cipc.corpflowai.com/change` | 200 |

Delivery Reality note: this audit packet is **docs-only**. Live probes validate baseline inventory only. Verdict for #773 product outcome remains **not COMPLETE** until later implementation packets are live-verified.

---

## 9. Delivery sequence (confirmed from issue — unchanged)

1. Central application shell + explicit Core/Tenant scope context  
2. Tenant Requests & Progress (synthetic)  
3. Core request/work-package view + governed client projection  
4. Expose-for-review comments/approvals  
5. CorpFlowAI reference-tenant proof  
6. Lux client-progress pilot (synthetic/redacted first)  
7. Integrate #721 into Tenant scope  
8. Progressive legacy-route redirects  
9. Resume #766 only after verified navigation  

---

## 10. Smallest safe visible slice (bounded recommendation)

**Packet name (suggested):** `Central-App-First-Slice-Shell-And-Synthetic-Progress-1`  
**Authorization required before coding:** ChatGPT acceptance of this audit + normal draft-PR flow; **Anton** only if a protected gate appears (none expected if constraints below hold).

### In scope

Using **synthetic records only** (fixture JSON in-repo or memory; no real client rows):

1. One authenticated path into **Core** and **Tenant — CorpFlowAI** where authorised (reuse admin/tenant session + membership; may use Core host + acting tenant, or a dedicated preview route behind auth).
2. Persistent visible chrome: **Scope · Tenant · Role** (visually distinct Core vs Tenant).
3. Tenant — CorpFlowAI: one request with component progress; **no** GitHub/CI/agent/internal notes.
4. One component `exposed_for_client_review=true` accepts synthetic client comment/approval.
5. One ordinary internal component remains view-only on tenant side.
6. Core shows the same request with internal work/evidence **references** (synthetic).
7. Tenant isolation + role unit tests pass.
8. Preview/runtime screenshots + tests in PR.

### Out of scope / hard exclusions

- No production deploy, merge without Anton, env/secrets, schema/DB, payment, external send, outreach, DNS, real client-private data  
- No second app/DB/CRM  
- No `/change` rewrite as everything-dashboard  
- No #721 UI merge in the first slice  
- No #766 rehearsal  
- No broad analytics / messaging / AI receptionist / OpenHands expansion  

### Suggested owned paths for next packet (not this audit PR)

| Path | Role |
|------|------|
| `pages/app/**` or `pages/workspace/**` (exact prefix TBD in packet) | Shell routes |
| `components/app-shell/**` | Scope chrome + nav |
| `lib/app-shell/**` or `lib/client-progress/**` | Scope context + synthetic projection |
| `fixtures/client-progress/**` or `lib/.../synthetic-*.json` | Synthetic records |
| `node-tests/*app-shell*`, `node-tests/*client-progress*` | Isolation / projection tests |

Exact prefix chosen in the implementation packet to avoid colliding with marketing `/` and Lux `/client/*`.

### Schema

**None.** Optional `console_json.client_progress` convention may be introduced in code comments + fixture only.

### Success criteria

Matches issue #773 “First visible slice definition of done.” Draft PR only.

---

## 11. Cursor claim record (this audit packet)

```text
Agent / run ID: bc-2f850ef7-c4ac-4462-a90c-2aa5b6eb5fd0
Branch: cursor/dispatcher-issue-773-1446
Owned paths: docs/architecture/**, docs/decisions/JOURNAL.md (JE row), light index links
Exclusions: no runtime/app implementation; no #721 UI; no schema/env/deploy/merge
Overlap: cites multi-tenant + #721 docs; does not rewrite them
Blocker: NONE
Note: GitHub issue comment API unavailable to this agent (read-only gh); claim mirrored here + PR body
```

---

## 12. Promptfoo / AI eval evidence

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: docs-only architecture audit; no AI behaviour, prompts, drafting, Lead Rescue AI, chatbot, model routing, or protected-action AI handling changed
- cases affected: none
- new cases added: none
- artifact path, if generated: n/a
- live-model eval used: NO
```
