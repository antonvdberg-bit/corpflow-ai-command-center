# Prospect Operations v1 — shared package contract (#721)

**Status:** Slice 1 shipped. Slice 2 shared detail/action layer shipped in Operating Workspace (`/app/prospects/[id]`, #994). **No schema. No env. No deploy. No external send.**

**Issue:** #721 · Parent doctrine #720 · Revenue programme #710–#716 · Baseline PR #708

**Machine contract:** `lib/cmp/_lib/prospect-operations-view-model.js`  
**Unit tests:** `node-tests/prospect-operations-view-model.test.mjs`

**Outcome:** One reusable CorpFlowAI Prospect Operations package with three coordinated views over the same `leads` records and one workflow model — without building a second CRM.

**Operator CRM overlay (#701):** `docs/operations/CRM_OPERATING_BASELINE_V1.md` — everyday pipeline names, qualification templates, daily/weekly runbook, and gap matrix mapped onto this view-model. Does not replace this contract.

**ANTON ACTION:** NONE for Slice 1. Schema/protected decisions only if a later slice proves a Prisma column or external-send gate is required (none proven yet).

---

## 0. Executive packet (required first return)

| Item | Result |
| ---- | ------ |
| Three current views | Mapped below (§1) |
| Shared fields/actions | Mapped below (§2–§3) |
| Differences / duplication | §4 |
| Canonical prospect view model | §5 + executable module |
| Smallest no-schema plan | §6 |
| PR slicing + file-overlap risk | §7 |
| #711 test-date impact | §8 |
| Anton blocker | **None** |

---

## 1. Exact routes / components / APIs (inventory)

### A. Action Queue / Discovery Desk (closest live surface)

| Layer | Path |
| ----- | ---- |
| Route | `/admin/rapid-delivery` |
| Page | `pages/admin/rapid-delivery/index.js` |
| UI | `components/RapidDeliveryRevenueDesk.js` (`RapidDeliveryRevenueDesk`) |
| List API | `GET /api/factory/rapid-delivery/list` |
| Detail API | `GET /api/factory/rapid-delivery/get?id=` |
| Patch API | `PATCH /api/factory/rapid-delivery/patch` |
| Proposal copy | `GET /api/factory/rapid-delivery/proposal?id=` |
| Server | `lib/server/admin-rapid-delivery-api.js` |
| Domain | `lib/cmp/_lib/rapid-delivery-operator.js` |
| Auth | `requireAdminPageSession` (admin session) + factory master on APIs |
| Record filter | `leads` where `qualificationJson.intake_meta.product = corpflow-rapid-delivery` |

**Primary question today:** What new / reviewing / discovery / proposal work needs attention for rapid-delivery offers (incl. Website Rescue landing path)?

### B. Prospect Workbench (closest live surface)

| Layer | Path |
| ----- | ---- |
| List route | `/admin/lead-rescue` |
| Detail route | `/admin/lead-rescue/[id]` |
| Pages | `pages/admin/lead-rescue/index.js`, `pages/admin/lead-rescue/[id].js` |
| UI | `components/AiLeadRescueAdminList.js`, `components/AiLeadRescueAdminDetail.js` |
| List API | `GET /api/factory/lead-rescue/list` |
| Detail API | `GET /api/factory/lead-rescue/get?id=` |
| Patch API | `PATCH /api/factory/lead-rescue/patch` |
| Server | `lib/server/admin-lead-rescue-api.js` |
| Domain | `lib/cmp/_lib/ai-lead-rescue-operator.js` |
| Auth | Same admin / factory-master pattern |
| Record filter | `leads` where product = `ai-lead-rescue` |

**Primary question today:** How do I process many Lead Rescue intakes in a grid and maintain owner / status / next action / commercial fields?

### C. Pipeline Kanban / Revenue Cockpit (closest live surface)

| Layer | Path |
| ----- | ---- |
| Route | `/change/revenue` |
| Page / UI | `pages/change/revenue.js` (`RevenueOperatorCockpit`, page-local) |
| Persistence | Browser `localStorage` key `corpflow.revenue.cockpit.v1` |
| Live desk links | Points operators to `/admin/rapid-delivery` and `/admin/lead-rescue` |
| Authoritative DB | **Not wired** — sample/manual cards only |

**Primary question today:** Where is the sell→deliver lane checklist? (Not yet the same Postgres records.)

### Related surfaces (out of shared package unless later approved)

| Surface | Why excluded from P0 package |
| ------- | ---------------------------- |
| Lux `/change` CRM | Tenant Lux workflow (`lux_operator_workflow`) — different product boundary |
| `growth_*` APIs (`lib/server/growth-pipeline.js`) | Separate ABM tables; not the three desks |
| Public intakes | Feeders only (`DiscoveryIntakeForm`, `/lead-rescue`, offers) |

---

## 2. Existing shared fields (prefer JSON — no schema change)

### Prisma `Lead` columns (shared physical row)

`id`, `tenantId`, `name`, `email`, `contact`, `message`, `phone`, `intent`, `market`, `listing`, `status`, `qualificationJson`, `score`, `createdAt`, `updatedAt`.

### Discriminator

`qualificationJson.intake_meta.product`:

- `ai-lead-rescue`
- `corpflow-rapid-delivery` (Website Rescue / landing rescue offers use this product + offer slug)

### Product JSON namespaces (not unified today)

| Concern | Lead Rescue (`ai_lead_rescue_operator`) | Rapid Delivery (`rapid_delivery_operator`) |
| ------- | ---------------------------------------- | ------------------------------------------ |
| Status | 13 values on `Lead.status` + JSON | 7(+legacy) in JSON; `Lead.status` often `NEW`/`CLOSED` |
| Owner | `owner` string | **Missing** |
| Next action | `next_action` | Computed `recommended_next_action` only |
| Next-action due | On **activity** entries (`next_action_date`), not top-level | **Missing** |
| Notes | `notes` + `internal_notes[]` | `notes` |
| Activity | Rich typed timeline | Thin status audit |
| Value / currency | `setup_price`, `currency`, payment fields | Offer `starting_price_mur` |
| Consent | Not first-class on operator blob | `intake_meta.consent_contact` |
| Urgency | Not first-class | `intake_meta.urgency` |
| Closure reason | Implicit via `LOST` / notes | `not_fit` / `won` without structured reason |

---

## 3. Existing actions

### Rapid Delivery desk

- Change operator status (inline)
- Open inline detail panel
- Prepare/copy proposal summary + response draft (**no send**)
- Refresh + summary count cards

### Lead Rescue workbench / detail

- Filter list (status, region, payment, text)
- Open full detail page
- Change status (UI forward-only)
- Edit owner, next action, last contacted, notes
- Append activity (channel/type/note/next_action/next_action_date)
- Commercial / payment fields + setup checklist (post-paid)

### Revenue cockpit

- Add local card, move ±1 stage, reset board
- **Does not** patch Postgres leads

---

## 4. Differences and duplication

| Gap | Impact |
| --- | ------ |
| Two product pipelines on one table | Different status enums and JSON keys |
| No shared detail surface | Lead Rescue has a page; Rapid Delivery has a side panel; Kanban has cards only |
| Kanban not on same records | Largest consistency gap |
| Workbench branded Lead Rescue | Must be extracted before “Prospect Workbench” is reusable |
| No shared exception vocabulary | Overdue / due today / stale not computed consistently |
| No Operating Workspace shell | Doctrine #720 only — desks hand-roll dark panels |
| Owner / next-action due incomplete on Rapid Delivery | Blocks true Action Queue parity without JSON field adoption |

---

## 5. Canonical prospect view model (no new tables)

Executable source: `lib/cmp/_lib/prospect-operations-view-model.js`.

### Identity fields (every view)

| Field | Source strategy |
| ----- | --------------- |
| `id` / `reference` | `leads.id` + product reference helper |
| `tenant_id` | `leads.tenantId` |
| `person_name` / `organisation_name` | row + `intake_meta.business_name` |
| `source` | `intake_meta.source/page/host` |
| `product` / `product_service_path` | `intake_meta.product` + service/offer path |
| `owner` | product JSON (`owner`; Rapid Delivery adopts same key in JSON) |
| `native_status` | Product-authoritative status |
| `canonical_stage` | Mapped presentation stage (below) |
| `priority` / `urgency` | JSON keys when present |
| `next_action` / `next_action_due` | JSON + latest activity due fallback |
| `last_meaningful_activity_at` | Latest activity / last_contacted / updated |
| `qualification_complete` | Deterministic minimum fields |
| `estimated_value` / `currency` | Commercial / offer price |
| `expected_close_date` | Optional JSON |
| `consent_contact` | Intake meta when present |
| `related_refs` | Proposal / payment / delivery / invoice pointers (strings) |
| `closure_reason` | Optional JSON on closure |
| `exception_signals[]` | Shared vocabulary |
| `waiting_on` | Optional JSON (`prospect` / `operator` / `protected`) |

### Canonical stages

`new` → `qualifying` → `discovery_booked` → `proposal_ready` → `proposal_sent` → `awaiting_payment` → `won` → `delivery`, plus `stalled` / `lost` / `not_fit`.

**Persistence rule:** product-native statuses remain written to existing fields/JSON. Canonical stages are for shared UI, Kanban lanes, filters, and transition checks.

### Exception signals (shared vocabulary)

`overdue_action`, `due_today`, `future_action_scheduled`, `no_next_action`, `new_unreviewed`, `high_urgency`, `stalled_no_activity`, `missing_qualification`, `awaiting_prospect`, `awaiting_operator`, `awaiting_protected_approval`.

Default Action Queue order: overdue → due today → no next action → remainder.

### My Work / Today

Saved filter over Action Queue (`matchesMyWorkTodayFilter`) — not a fourth full UI in P0.

### Safe vs protected interventions

Safe: change stage, assign owner, set next action/due, priority, note, activity, open detail, mark closure, prepare/copy draft, correct classification.

Protected (blocked in shared helper): external send, authoritative payment mark, commercial proposal approval, production deploy, client_production mutation.

---

## 6. Smallest no-schema implementation plan

### Slice 1 (this PR) — DONE scope

1. Inventory three surfaces (this doc).
2. Define canonical view model + transitions + exception helpers in pure JS.
3. Unit tests for mapping, exceptions, queue sort, safe-action gate, synthetic LR + RD rows.
4. OpenSpec proposal for remaining slices.
5. **No UI merge of the three views yet.**

### Slice 2 — shared detail/action layer

**Shipped in Operating Workspace (#994):** `/app/prospects/[id]` + `GET`/`PATCH` `/api/app/prospect`.

- Shared detail page consumes the view model for Lead Rescue and Website Rescue / Rapid Delivery records.
- Rapid Delivery operator JSON adopts `owner`, `next_action`, `next_action_due`, `priority`, `urgency`, `waiting_on` via existing PATCH merge — **no Prisma migration**.
- Lead Rescue operator JSON writes top-level `next_action_due`, `priority`, `urgency`, `waiting_on` when set from the shared form.
- Unified note/activity append adapter delegates to product merge helpers.
- Audit entries remain inside product `activity[]` / notes, stamped with actor + time.
- Does **not** connect Action Queue + Workbench + Kanban in this slice. Product desks remain temporary.

### Slice 3 — connect three views

- Action Queue: evolve `/admin/rapid-delivery` (or `/admin/prospects/queue`) to render shared queue using view-model sort/filters for **both** products where auth allows.
- Prospect Workbench: extract grid from `AiLeadRescueAdminList` into `components/prospect-ops/ProspectWorkbench.js` (remove Lead Rescue-only ownership of the reusable shell).
- Kanban: replace `/change/revenue` localStorage authoritative cards with Postgres-backed lanes using `canonical_stage`, keeping localStorage only as optional personal checklist if still useful.
- All three call the same patch adapters → same `leads` rows.

### Slice 4 — exceptions + cross-view verification

- Wire signal chips in all three UIs.
- Role/tenant checks reuse factory-admin gate; document client-admin visibility as later if needed (today both desks are factory admin).
- Cross-view tests: patch in one adapter → view-model identity stable for queue/workbench/kanban projections.
- Desktop/mobile smoke screenshots for evidence.

### Explicit non-goals (all slices)

- No new CRM / DB / schema without Anton.
- No frontend framework replatform.
- No forecasting analytics, bulk messaging, automated sequences, or payment/deploy automation.
- Do not derail #711 gates with non-blocking polish.

---

## 7. PR slicing and file-overlap risk

| PR | Focus | Hot files (overlap risk) |
| -- | ----- | ------------------------ |
| **PR-A (this)** | Docs + view-model + tests + OpenSpec | Low overlap — new files + this doc |
| **PR-B** | Shared detail drawer + RD JSON field adoption via existing patch | `rapid-delivery-operator.js`, `admin-rapid-delivery-api.js`, `RapidDeliveryRevenueDesk.js`, Lead Rescue detail only if wiring shared drawer |
| **PR-C** | Workbench extract + Action Queue shared list | `AiLeadRescueAdminList.js`, `RapidDeliveryRevenueDesk.js`, new `components/prospect-ops/*` |
| **PR-D** | Kanban on Postgres + signals + cross-view tests | `pages/change/revenue.js`, factory router only if shared list endpoint added |

**Overlap discipline:** Prefer additive `components/prospect-ops/` + adapters; avoid drive-by refactors of Lead Rescue cold-start / checklist code (`admin-lead-rescue-api.js` is high-risk — touch only with focused tests).

**#715 / onboarding:** Keep out of lane — see `docs/operations/LEAD_RESCUE_ONBOARDING_AND_DELIVERY_V1.md` (Prospect UI → #721).

---

## 8. Test impact on #711 dates

| Gate | Date (Mauritius) | #721 impact |
| ---- | ---------------- | ----------- |
| Unit testing complete | Fri 7 Aug 2026 | Slice 1 unit tests **help** #711 WS2 (owner/stage/next action/due/stale visibility) without blocking WS1/WS3–WS5 |
| System testing | Wed 12 Aug 2026 | Slice 2–3 should land only as they strengthen CRM/nurture system proof; treat UI unification polish as non-blocker if commercial path already works on existing desks |
| Integrated testing | Fri 14 Aug 2026 | Cross-view consistency supports Scenario A/B operator-queue steps; **do not** expand into analytics/CRM rebuild |

**Classification rule (from #711):** Missing shared Kanban-on-Postgres is an **important non-blocker** if `/admin/rapid-delivery` + `/admin/lead-rescue` already prove the commercial path. Treat as release blocker only if operators cannot set owner/stage/next action/due on synthetic prospects.

---

## 9. Design-system / shell note (#720)

P0 applies the **smallest shared semantic tokens** (status/priority labels, signal names, action patterns) via the view-model + thin CSS variables in `components/prospect-ops/` in later slices. Full CorpFlowAI Operating Workspace shell is doctrine-owned by #720 / #772 and must not delay function.

**#772 first visible route:** `/app/prospects` (Operating Workspace, staff-only) reuses this view-model. **#772 Today / My Work:** `/app/today` applies `matchesMyWorkTodayFilter` to the same list. **#994 shared detail:** `/app/prospects/[id]`. **#995 Action Queue:** `/app/queue` is the canonical cross-product queue (Rapid Delivery desk remains temporary). See `docs/architecture/OPERATING_TENANT_WORKSPACE_CONSOLIDATION_V1.md`.

---

## 9b. Maturation and nurture layer (#713)

See **`docs/operations/PROSPECT_MATURATION_AND_NURTURE_V1.md`** for the complete maturation/nurture unit gate: lifecycle entry/exit criteria, required-field validation, qualification gates (Lead Rescue + Website Rescue), draft-only message templates, overdue/stale/reactivation detection, daily operator procedure, weekly pipeline procedure, and 8 synthetic test scenarios.

Machine contract: `lib/prospects/maturation.js` · Config: `config/prospect-maturation.v1.json` · Draft assets: `config/prospect-draft-assets.v1.json`

---

## 10. Verification commands (Slice 1)

```bash
node --test node-tests/prospect-operations-view-model.test.mjs
npm test
git diff --check
```

Promptfoo / AI eval: **NOT APPLICABLE** for Slice 1 (no AI behaviour, prompts, drafting, or model routing changed).

---

## 11. Delivery Reality (this packet)

```text
Delivery Reality Audit:
- Local fix exists: YES (docs + view-model + tests)
- Merged to main: NO (PR only)
- Production deployment ID: n/a (docs/contract; no deploy)
- Commit deployed: n/a
- Live URLs tested: n/a for Slice 1 contract
- Expected vs actual result: Slice 1 packet returned; Anton action none
- Client-facing flow usable: n/a (operator package; no public surface change)
- Final verdict: PARTIAL (Slice 1 only; views not yet unified on live hosts)
```
