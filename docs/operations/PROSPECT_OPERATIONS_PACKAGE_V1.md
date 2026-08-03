# Prospect Operations package v1 — Slice 1 audit and canonical contract

**Status:** Slice 1 complete (docs-only audit + contract). Runtime slices 2–4 not authorised by this document alone.  
**Issue:** [#721](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/721)  
**Parent doctrine:** [#720](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/720) (Operating Workspace)  
**Revenue programme:** [#710](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/710)–[#716](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/716); integrated test dates in [#711](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/711)  
**Baseline:** PR [#708](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/708) (market gateway) merged  
**Date:** 2026-08-03  
**Owner (audit):** Cursor · **Product acceptance:** ChatGPT · **Protected / schema:** Anton only if proven necessary  

**ANTON ACTION: NONE** for Slice 1. No schema change is required to start Slices 2–3 on the path below.

**NO IMPLEMENTATION AUTHORIZED** by this Slice 1 PR beyond recording the contract. Slices 2–4 are separate implementation PRs.

Anchor: `<!-- PROSPECT_OPERATIONS_PACKAGE_V1 -->`

<!-- PROSPECT_OPERATIONS_PACKAGE_V1 -->

---

## 1. Executive outcome (what “done” means for #721)

One reusable **CorpFlowAI Prospect Operations** package with three complementary views over the **same** prospect/opportunity records and workflow:

| View | Primary question | Closest live surface today |
| ---- | ---------------- | -------------------------- |
| **A. Action Queue / Discovery Desk** | What needs action now? | `/admin/rapid-delivery` |
| **B. Prospect Workbench** | How do I process many records efficiently? | `/admin/lead-rescue` (+ detail page) |
| **C. Pipeline Kanban / Revenue Cockpit** | Where is the pipeline, what is stuck, where intervene? | `/change/revenue` |

**Shared operating principle:** one record identity, one workflow model, one detail/action layer. A change in any view must update the same underlying `leads` row and appear in the others after refresh.

**Hard limits (unchanged):** no new CRM/database; no schema without Anton approval; no frontend replatform; no external send; no payment automation; no messaging automation; no forecasting programme.

---

## 2. Inventory — exact routes, components, APIs

### 2.A Action Queue / Discovery Desk → Rapid-delivery discovery desk

| Layer | Path |
| ----- | ---- |
| Route | `/admin/rapid-delivery` |
| Page | `pages/admin/rapid-delivery/index.js` |
| UI | `components/RapidDeliveryRevenueDesk.js` (“Rapid-delivery discovery desk”) |
| Domain helpers | `lib/cmp/_lib/rapid-delivery-operator.js` |
| API handler | `lib/server/admin-rapid-delivery-api.js` |
| Router | `api/factory_router.js` → `factory/rapid-delivery/*` |
| Intake | `POST /api/tenant/intake` → `lib/server/tenant-intake.js` (`intake_meta.product = corpflow-rapid-delivery`) |
| Auth (page) | `requireAdminPageSession` (`lib/server/admin-page-gate.js`) |
| Auth (API) | `verifyFactoryMasterAuth` |

| API | Method | Purpose |
| --- | ------ | ------- |
| `/api/factory/rapid-delivery/list` | GET | List discovery prospects |
| `/api/factory/rapid-delivery/get?id=` | GET | Detail payload |
| `/api/factory/rapid-delivery/proposal?id=` | GET | Proposal markdown (copy; no send) |
| `/api/factory/rapid-delivery/patch` | PATCH/POST | Status + notes |

**Manual intervention today:** status change (inline); prepare/copy response draft + proposal; open inline detail panel. **Missing:** owner, editable next action / due date, activity timeline UI, notes edit in UI (API accepts notes), won/lost/stalled vocabulary beyond `won`/`not_fit`, bulk edits.

**Store:** Postgres `leads` filtered by `qualificationJson.intake_meta.product === 'corpflow-rapid-delivery'`. Operator status in **JSON** (`rapid_delivery_operator.status`), not the 13-step Lead Rescue column enum. `Lead.status` stays mostly `NEW_INTAKE`; set `CLOSED` on won/closed.

---

### 2.B Prospect Workbench → AI Lead Rescue admin list + detail

| Layer | Path |
| ----- | ---- |
| List route | `/admin/lead-rescue` |
| Detail route | `/admin/lead-rescue/[id]` |
| Pages | `pages/admin/lead-rescue/index.js`, `pages/admin/lead-rescue/[id].js` |
| UI | `components/AiLeadRescueAdminList.js`, `components/AiLeadRescueAdminDetail.js` |
| Domain helpers | `lib/cmp/_lib/ai-lead-rescue-operator.js` |
| API handler | `lib/server/admin-lead-rescue-api.js` |
| Router | `api/factory_router.js` → `factory/lead-rescue/*` |
| Intake | `POST /api/tenant/intake` (`intake_meta.product = ai-lead-rescue`) |
| Auth | Same admin page + factory-master pattern as rapid-delivery |

| API | Method | Purpose |
| --- | ------ | ------- |
| `/api/factory/lead-rescue/list` | GET | Workbench grid |
| `/api/factory/lead-rescue/get?id=` | GET | Full detail |
| `/api/factory/lead-rescue/patch` | PATCH/POST | Status, owner, next_action, commercial, notes, `activity_append`, checklist |
| `/api/factory/lead-rescue/close-test-intakes` | POST | Test-data cleanup |

**Manual intervention today:** rich on **detail page** (status, owner, next_action, notes, activity log, commercial, setup checklist). List is largely **display-only** (Open → detail). Still branded “AI Lead Rescue pipeline” — not a reusable Prospect Workbench.

**Store:** same `leads` table, product `ai-lead-rescue`. Workflow status lives on **`leads.status`** column (13 values). Operations fields in `qualificationJson.ai_lead_rescue_operator` (owner, next_action, activity[], etc.).

---

### 2.C Pipeline Kanban / Revenue Cockpit → `/change/revenue`

| Layer | Path |
| ----- | ---- |
| Route | `/change/revenue` |
| Page | `pages/change/revenue.js` (inline Kanban; no separate component file) |
| APIs | **None** |
| Persistence | Browser `localStorage` key `corpflow.revenue.cockpit.v1` |
| Auth | **None** (`getStaticProps`; public URL with `noindex`) |
| Links out | `/admin/rapid-delivery`, `/admin/lead-rescue` |

**Manual intervention today:** add local card; move ←/→ between 11 checklist lanes; reset sample board. **Does not** read or write `leads`. Sample cards only (`DEFAULT_PROSPECTS`). Documented intentionally as optional checklist, not SoR — but #721 requires a true Kanban over shared records.

**Canonical process docs:** `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md`, templates under `docs/revenue/templates/`.

---

### 2.D Related surfaces (out of package scope unless explicitly pulled in)

| Surface | Why not a #721 view |
| ------- | ------------------- |
| Public intakes (`/`, `/contact`, `/offers/*`, `/lead-rescue`) | Capture only; feed desks |
| `/demo/website-rescue` | Sales demo; Website Rescue enquiries land on rapid-delivery desk |
| Lux `/change` lead ops (`lib/cmp/_lib/lux-lead-*`) | Tenant CMP change console — different product |
| `growth_*` tables / `lib/server/growth-pipeline.js` | Outbound ABM research — separate SoR |
| Google Sheets prospect lists | Pre-intake sales tracking (runbooks) |
| ERPNext | Commercial SoR for quotes/invoices — keep; do not replace |

---

## 3. Existing shared fields and actions

### 3.1 Shared physical store

Both live desks already use **`leads`** (`prisma/schema.prisma` model `Lead`):

`id`, `tenantId`, `name`, `email`, `contact`, `message`, `phone`, `intent`, `market`, `listing`, `status`, `qualificationJson`, `score`, `createdAt`, `updatedAt`

Product branch: `qualificationJson.intake_meta.product`.

### 3.2 Field coverage vs #721 canonical identity

| #721 field | Rapid-delivery desk | Lead Rescue workbench | Revenue cockpit |
| ---------- | ------------------- | --------------------- | --------------- |
| reference/id | `id` + `CF-…` reference | `id` | local string id |
| tenant/business boundary | `tenant_id` | `tenant_id` | no |
| person + organisation | name/email/phone + `business_name` | contact + `business_name` | name only |
| source | `source` / host / page | host / page / region | no |
| product/service path | `service_path`, `offer_slug` | product fixed + region | `offer` slug on sample |
| owner | **missing** | `owner` (JSON) | no |
| stage/status | JSON `operator_status` (7+legacy) | `leads.status` (13) | local lane id (11) |
| priority/urgency | `urgency` (intake) | not first-class | no |
| next action | **computed** only | `next_action` (JSON) | no |
| next-action due | **missing** | via activity `next_action_date`; not always top-level | no |
| last meaningful activity | weak (`updated_at` / op notes) | `last_contacted` + activity[] | no |
| qualification completeness | partial (pain, channels, consent) | intake fields + checklist later | no |
| estimated value/currency | offer starting MUR | setup/monthly prices | no |
| expected close date | **missing** | **missing** | no |
| consent/contact preference | `consent_contact` | preferred payment path (related) | no |
| proposal / financial / delivery refs | proposal summary API; ERPNext manual | invoice_reference, payment_* | template names only |
| lost/stalled reason | `not_fit` status; no structured reason | `LOST` / `PAUSED`; activity `bad_fit` | no |

### 3.3 Shared / overlapping actions today

| Action | Rapid-delivery | Lead Rescue | Cockpit |
| ------ | -------------- | ----------- | ------- |
| Change stage/status | Yes (PATCH) | Yes (detail PATCH) | Local only |
| Assign owner | No | Yes (detail) | No |
| Edit next action / due | No (computed) | next_action yes; due via activity | No |
| Operator note | API yes / UI display | Yes | No |
| Record activity | Appended on patch; **no UI** | Full activity log UI | No |
| Open detail | Inline panel | Dedicated page | No |
| Won / lost / not fit | `won` / `not_fit` | `LOST` / `PAUSED` / delivery statuses | No |
| Prepare/copy draft or proposal | Yes (no send) | Manual pro-forma path in runbooks | Template path labels |
| Correct classification | Limited (status) | Limited | N/A |

---

## 4. Differences and duplication (the real blockers)

1. **Not three views over one record** — two product-filtered slices of `leads` plus a third non-persisted board.
2. **Three status vocabularies** — rapid JSON enum ≠ Lead Rescue column enum ≠ cockpit lane ids.
3. **Status storage inconsistency** — Lead Rescue writes `leads.status`; rapid-delivery writes JSON and largely leaves the column alone.
4. **Owner / next action** first-class only on Lead Rescue; rapid-delivery computes next action and has no owner.
5. **Detail/activity** — only Lead Rescue has a real timeline UI; rapid-delivery has thinner inline detail; cockpit has none. **Largest P0 gap** (matches issue #721).
6. **Workbench branding/ownership** — list UI is Lead Rescue–specific; #721 requires extraction to a reusable Prospect Workbench.
7. **Auth gap** — cockpit has no session gate; desks require admin/factory-master.
8. **No cross-view tests** — edits cannot appear across views because views do not share a write path.

**Configuration-only reuse (low risk):** factory-master auth helpers, admin page gate, intake → `leads` path, proposal/draft “copy only” pattern, existing JSON activity arrays.

**True blockers for “same record everywhere” (code, not schema):** (a) Kanban not wired to `leads`; (b) no shared view-model adapter; (c) no common detail surface; (d) product-specific PATCH APIs with different payloads.

---

## 5. Proposed canonical prospect view model (no schema)

### 5.1 Design choice (Slice 1 decision — Cursor/product; Anton not required)

Introduce a **read/write adapter layer** in JS that:

- Reads any in-scope `leads` row (by product marker) into one **ProspectViewModel**.
- Writes safe interventions back through product-aware mappers into **existing** `qualificationJson` (+ Lead Rescue `leads.status` where that product already uses it).
- Does **not** add Prisma columns, migrations, or a second table.

Suggested module (Slice 2+): `lib/cmp/_lib/prospect-operations-view-model.js` (+ small exception helpers).

### 5.2 Canonical stage vocabulary (display + transition graph)

Product-specific statuses remain persisted. The package exposes a **canonical stage** for queue/Kanban/workbench:

| Canonical stage | Meaning | Maps from rapid-delivery | Maps from Lead Rescue |
| --------------- | ------- | ------------------------ | --------------------- |
| `new` | Unreviewed / new intake | `new_intake` | `NEW_INTAKE` |
| `qualifying` | Operator reviewing / qualifying | `reviewing` | `QUALIFYING` |
| `discovery` | Discovery booked / demo path | `discovery_booked` (+ legacy `qualified`) | `DEMO_OFFERED`, `DEMO_BOOKED` |
| `proposal` | Quote/proposal in motion | `quote_ready`, `proposal_sent` | `QUOTE_SENT`, `PAYMENT_PENDING` |
| `delivery` | Paid / setup / live delivery | — (won often jumps) | `PAID_SETUP` → `LIVE_PILOT` (+ monitoring) |
| `won` | Closed won | `won`, legacy `closed` | `MONTHLY_ACTIVE` (commercial success) / treat delivery live as won for revenue lanes when configured |
| `lost` | Not proceeding / lost | `not_fit` | `LOST` |
| `stalled` | Explicit pause / reactivation due | — (derive from signals if no status) | `PAUSED` |
| `reactivation_due` | Closure discipline flag | derived signal + note | derived from `PAUSED`/`LOST` + next_action |

**Persistence rule:** never invent a new DB enum. Persist product-native status; expose canonical stage via mapper. Kanban lanes = canonical stages (or a configured subset). Delivery-heavy Lead Rescue statuses stay visible as **substage** / `status_native` on the card/detail.

**Allowed transitions (P0):** forward along the table above within a product; terminal `won`/`lost`/`stalled` require explicit user action + optional reason string in JSON; reactivation from `lost`/`stalled` → `qualifying` only. Invalid transitions rejected server-side (mirror Lead Rescue forward-status discipline where present).

### 5.3 ProspectViewModel shape (API/UI contract)

```text
ProspectViewModel {
  id, reference, tenant_id,
  person: { name, email, phone },
  organisation: { business_name, website },
  source: { product, host, page, label },
  service: { path, offer_slug, offer_title },
  owner,                          // string | null  → JSON
  stage_canonical,                // enum above
  status_native, status_native_label,
  priority,                       // from urgency or explicit JSON
  next_action, next_action_due,   // ISO date | null
  last_activity_at,
  qualification: { completeness_score, missing: string[], consent_contact, … },
  value: { amount, currency } | null,
  expected_close_at | null,
  links: { proposal_ref, invoice_ref, delivery_ref, detail_path },
  closure: { kind: won|lost|stalled|null, reason },
  exceptions: ExceptionSignal[],  // §5.4
  activity: ActivityEntry[],      // normalised
  permissions: { can_edit_*, can_close, can_prepare_draft },
}
```

**JSON write targets (no schema):**

| Field | Rapid-delivery key | Lead Rescue key |
| ----- | ------------------ | --------------- |
| owner | `rapid_delivery_operator.owner` (add; unused today) | `ai_lead_rescue_operator.owner` |
| next_action | `rapid_delivery_operator.next_action` | existing |
| next_action_due | `rapid_delivery_operator.next_action_due` | top-level under operator object (add) + keep activity dates |
| notes / activity | existing `notes` + `activity[]` | existing |
| closure reason | `rapid_delivery_operator.closure_reason` | `ai_lead_rescue_operator.closure_reason` |
| stage | `rapid_delivery_operator.status` | `leads.status` (+ operator mirror if useful) |

Adding keys inside existing JSON objects is **not** a Prisma migration.

### 5.4 Exception / action signals (shared vocabulary)

Deterministic defaults (tunable constants in the view-model module):

| Signal | Rule (P0 default) |
| ------ | ----------------- |
| `overdue` | `next_action_due` &lt; start of today (operator TZ or UTC) |
| `due_today` | due date = today |
| `future_action` | due date &gt; today |
| `no_next_action` | next_action empty |
| `new_unreviewed` | stage `new` |
| `high_urgency` | urgency high / priority high |
| `stale` | no meaningful activity ≥ **7 days** (default) while not terminal |
| `missing_qualification` | required intake fields incomplete |
| `awaiting_prospect` | next_action text/status implies waiting on client |
| `awaiting_operator` | waiting on CorpFlowAI operator |
| `awaiting_protected` | waiting on Anton / protected approval |

**Default sort:** overdue → due today → no next action → high urgency → stale → others (then updated_at).

### 5.5 Shared interventions (every view)

Same PATCH contract (thin facade or shared helper calling product mappers):

- change stage (validated transition)
- assign owner
- set next action + due date
- set priority/urgency (where present)
- add operator note
- append activity/outcome
- mark won / lost / stalled / reactivation_due (+ reason)
- prepare/copy draft or proposal (existing no-send paths)
- open common detail surface

**Forbidden without separate Anton approval:** external send, payment mark as received automation, proposal approval automation, production deploy/mutation, protected commercial commitments.

### 5.6 Common detail surface

One component (Slice 2), opened from all three views (drawer preferred; Lead Rescue full page can wrap the same body):

- contact + business
- qualification summary + missing fields
- activity/note timeline (actor + timestamp) — generalise Lead Rescue activity log
- stage history / time in stage (from activity + status changes)
- drafts / recorded outcomes
- linked proposal/payment/delivery evidence fields
- blockers + recommended next action
- audit of manual interventions (activity entries)

Do **not** keep three detail implementations.

### 5.7 Role / tenant boundary (P0 posture)

| Role | Visibility (P0) |
| ---- | --------------- |
| CorpFlowAI factory master / admin session | All CorpFlowAI market products in package (`corpflow-rapid-delivery`, `ai-lead-rescue`; Website Rescue via rapid-delivery offers) |
| Client admin / client operator | **Out of Slice 2–3** unless a tenant product marker already scopes rows — do not widen to client sessions without a separate packet |
| Unauthenticated | Must not use Kanban write UI; Slice 3 adds the same admin gate as desks to `/change/revenue` (or moves Kanban under `/admin/…`) |

---

## 6. Smallest no-schema implementation plan

### Slice 1 — this document (audit + contract) ✅

Docs-only. No runtime.

### Slice 2 — shared detail/action layer

**Files (expected):**

- `lib/cmp/_lib/prospect-operations-view-model.js` (new)
- `lib/cmp/_lib/prospect-operations-exceptions.js` (new; or same file)
- `lib/cmp/_lib/prospect-operations-transitions.js` (new)
- `components/ProspectDetailPanel.js` (new; shared)
- Thin shared patch helper used by both admin APIs **or** a single `/api/factory/prospect-ops/patch` that delegates to existing product patchers without deleting them
- Unit tests: view model, transitions, exceptions, permissions, no-external-send

**Behaviour:** open detail from rapid-delivery + Lead Rescue; owner/status/next action/due/note/activity; audit via activity; no send.

### Slice 3 — connect the three views

1. **Action Queue** — evolve `RapidDeliveryRevenueDesk` (and optionally a product filter that can include Lead Rescue rows) to consume ProspectViewModel + shared interventions; add My Work / Today as a saved filter (`overdue|due_today|no_next_action|awaiting_operator`).
2. **Prospect Workbench** — extract grid concerns from `AiLeadRescueAdminList` into `components/ProspectWorkbench.js` (product-agnostic props); keep Lead Rescue route as a thin wrapper; add safe inline edits + standard filters.
3. **Kanban** — replace localStorage authoritative board with live `leads` via list APIs + view model; keep optional checklist templates as side rail; add session gate; cards show owner, value, next action, exceptions; move via validated transition.

### Slice 4 — exceptions + cross-view verification

- Signal chips everywhere; stale thresholds; role checks
- Tests: edit in A visible in B and C; invalid transition; missing action; synthetic Lead Rescue + Website Rescue (rapid-delivery offer) + general discovery rows
- Desktop/mobile smoke + screenshots
- Integrated scenario evidence linked to #711 WS2

### What we deliberately defer (P1)

Configurable layouts, forecasting, velocity analytics, full calendar UI, AI auto-scoring, sequences, bulk comms, chart-heavy cockpit, dashboard designer.

### AI role (bounded; later slice if needed)

Summarise, recommend next action, flag missing qualification / duplicates / stale — **never** send, approve, mark paid, or close without explicit user action.

---

## 7. PR slicing and file-overlap risk

| PR | Focus | High-overlap files | Risk |
| -- | ----- | ------------------ | ---- |
| **PR-A (this)** | Slice 1 docs | `docs/operations/PROSPECT_OPERATIONS_PACKAGE_V1.md`, JE pointer | Low |
| **PR-B** | Slice 2 view-model + detail + shared patch | new `lib/cmp/_lib/prospect-operations-*.js`; `AiLeadRescueAdminDetail.js`; `RapidDeliveryRevenueDesk.js`; both admin `*-api.js`; `factory_router.js` | **Medium–high** — coordinate with any Lead Rescue admin PRs |
| **PR-C** | Slice 3 workbench extract | `AiLeadRescueAdminList.js` → new workbench; Lead Rescue pages | **High** with Lead Rescue UI work |
| **PR-D** | Slice 3 Kanban rewire | `pages/change/revenue.js` (large rewrite); auth gate | Medium — isolated page but UX-visible |
| **PR-E** | Slice 4 tests + signals polish | `node-tests/*prospect*`; light UI chip wiring | Medium — depends on B–D |

**Overlap with #711 programme:** prefer PR-B/E to land **before** unit-test gate (7 Aug) for WS2 fields (owner, stage, next action, due, stale). Kanban visual polish can slip as non-blocker if Action Queue + detail already expose the same fields.

**Do not** open parallel PRs that both rewrite `ai-lead-rescue-operator.js` merge/patch paths without sequencing.

---

## 8. Test impact on #711 dates

|#711 gate | Date (Mauritius) | Impact of #721 |
| -------- | ---------------- | -------------- |
| Unit testing complete | Fri 7 Aug 2026 | Slice 2 unit tests (view model, transitions, exceptions, permissions) **support** WS2; docs-only Slice 1 has **zero** schedule impact |
| System testing | Wed 12 Aug 2026 | Cross-view consistency + synthetic records needed for WS2; treat missing Kanban live-wiring as **important non-blocker** if Action Queue + Workbench detail already share records |
| Integrated testing complete | Fri 14 Aug 2026 | Full three-view proof is ideal for WS2; if time-boxed, prove **same record + same interventions** on two views + detail, and record Kanban as follow-up enhancement |

**Scope-control rule from #711:** do not derail test gates with P1 polish. #721 P0 that blocks WS2 (“every synthetic prospect has owner, stage, next action, due date; stale visible; drafts only”) is **release-relevant**; advanced Kanban charts are not.

---

## 9. Anton blocker check

| Question | Answer |
| -------- | ------ |
| Schema / migration required for Slices 2–3? | **No** — JSON keys + adapter layer suffice |
| New env / secrets? | **No** |
| Protected commercial / send / payment change? | **No** in this package path |
| Unify persisted status into one DB enum now? | **Not required**; mapper approach avoids Anton decision. Revisit only if dual-write becomes error-prone in production |
| Client-role access to these desks? | **Deferred** — factory-master only for P0; widening needs Anton |
| Force Kanban auth + retire localStorage SoR? | Product-consistent with #721; **no Anton blocker** (security improvement). Keep templates rail. |

**ANTON ACTION: NONE** unless a later slice proves a Prisma column is required (e.g. indexed due-date query at volume). Until then, filter/sort in application code on loaded lists (same pattern as today’s desks).

---

## 10. Definition of Done — Slice 1

- [x] Exact routes/components/APIs for the three current views documented
- [x] Existing shared fields/actions documented
- [x] Differences and duplication called out
- [x] Canonical ProspectViewModel + stage map + transitions proposed
- [x] Smallest no-schema implementation plan (Slices 2–4)
- [x] PR slicing + file-overlap risk
- [x] #711 test-date impact assessed
- [x] Anton blocker: **none**

---

## 11. References

- Issue #721 (this package), #720 (doctrine), #711 (test dates), #710 (programme controller)
- PR #708 market gateway baseline
- `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md`
- `docs/revenue/CORPFLOWAI_PUBLIC_CTA_AND_INTAKE_MAP.md`
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`
- `lib/cmp/_lib/rapid-delivery-operator.js`
- `lib/cmp/_lib/ai-lead-rescue-operator.js`
- `pages/change/revenue.js`
