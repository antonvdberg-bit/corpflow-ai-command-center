# LuxeMaurice — Phase 3 CRM / operator workflow (first slice + 3A.5 hardening)

**Programme ticket (remain open):** `cmo8mjijk0000jl04l1jz0v6d`  
**Tenant:** `luxe-maurice` — operator APIs and `/change` CRM UI only.

## Phase 3 — first slice (summary)

- **`qualification_json.lux_operator_workflow`:** stages, internal notes, follow-up, CRM PATCH action `concierge-lead-operator-patch`.
- **`/change`:** Lux tenant session — lead cards, stage, notes, follow-up, save.

## Phase 3A.5 — operational hardening (this repo slice)

| Area | Behaviour |
|------|-----------|
| **Session — `concierge-leads-list`** | On **`luxe-maurice` host only:** requires **dormant gate** + **authenticated tenant session** scoped to **`luxe-maurice`** (`LUX_LEADS_LIST_SESSION_REQUIRED` otherwise). Other tenant hosts: **unchanged** (still host-scoped list without this gate). |
| **Stage audit** | `lux_operator_workflow.stage_audit[]`: `{ at, operator_label, action: 'stage_changed', previous_stage, new_stage }` (capped). |
| **Activity timeline** | `lux_operator_workflow.activity[]`: `lead_created`, `stage_changed`, `note_added`, `follow_up_updated`, `owner_assigned`, `owner_cleared` with actor label + detail (capped). New Lux leads get **`lead_created`** at concierge create; legacy rows get a synthetic **`lead_created`** in **API list output** from `lead.created_at` when missing in JSON. |
| **Operator identifier** | From tenant session JWT payload: **`username`** preferred; else **`operator_id:`** + `user_id`, **`pin_session:`** + `row_id`, or **`tenant:`** + `tenant_id` fallback (PIN / minimal sessions). |
| **Ownership** | `lux_operator_workflow.owner`: `{ username, assigned_at, assigned_by }`. PATCH field **`assign_owner`** (empty string clears). Displayed on `/change` cards and detail panel. |

## APIs (LuxeMaurice host)

| Action | Notes |
|--------|--------|
| `concierge-lead-create` | Unchanged for clients; seeds workflow including **`lead_created`** for `luxe-maurice`. Response does **not** expose internal workflow JSON. |
| `concierge-leads-list` | **403** without Lux tenant session **on Lux host**; returns `operator_workflow` with **`activity`**, **`stage_audit`**, **`owner`**. |
| `concierge-lead-operator-patch` | Requires Lux tenant session + scope; accepts **`assign_owner`**; appends audit + activity entries. |

## Client visibility

Internal workflow, notes, audit, and activity are **not** rendered on public **`/concierge`** (no fetch of operator payload there).

## Verification checklist

- Unauthenticated **`concierge-leads-list`** on **`lux.corpflowai.com`** → **403**.
- Authenticated Lux operator → list + PATCH succeed; stage change adds **`stage_audit`** and **`stage_changed`** activity.
- **`assign_owner`** persists and appears in activity feed.
- Non-Lux tenant **`concierge-leads-list`** behaviour unchanged vs pre-3A.5.

---

## Phase 3B — CRM maturity (scheduling, health signals, filters, summary strip)

**Programme ticket (remain open):** `cmo8mjijk0000jl04l1jz0v6d`  
**Surfaces:** Lux tenant session + **`/change`** + operator CMP actions only. **Not** on public **`/concierge`** or client-visible payloads.

### Workflow scheduling (`lux_operator_workflow`)

| Field | Purpose |
|--------|---------|
| **`next_action_at`** | Optional ISO datetime for the operator’s next follow-up touch. Cleared with empty / null PATCH. |
| **`next_action_note`** | Optional short note (e.g. “Call back — viewing window”). |

PATCH via existing **`concierge-lead-operator-patch`**. When schedule or note changes, **`activity`** gains **`next_action_updated`** (“Next action scheduled” in UI labels).

### Computed health (not separate tables)

Computed in **`computeLuxLeadCrmSignals`** and exposed on list API / **`luxOperatorWorkflowForApiList`**:

| Signal | Rule (lightweight) |
|--------|---------------------|
| **`overdue_follow_up`** | `next_action_at` is set and is **before** “now”. |
| **`stale_lead`** | Lead is not **Closed** / **Lost**, and **`lead.updatedAt`** is older than **`LUX_CRM_STALE_MS`** (7 days). |
| **`untouched_new`** | Stage is **New** and there are **no** internal operator notes yet. |

### `/change` operator UI

- **Filters:** stage, owner (substring + datalist hints from loaded leads), property (slug / title / listing text), **health** (overdue / stale / untouched new).
- **CRM summary strip:** counts for **New**, **Qualified**, **Viewing Requested**, **Follow-up**, **Closed**, **Lost** (from the same loaded lead set; list fetch may be capped — see programme doc if queues grow).
- **Cards:** owner pill, next-action line, badges for overdue / stale / untouched where applicable; activity feed includes assignment and **`next_action_updated`**.

### Scope exclusions (Phase 3B explicitly out of scope)

- No marketing automation, AI channel, email/SMS sending, exports, reporting suites, Kanban, charts, notifications, or external CRM sync.
- No new large CRM tables — workflow stays in **`qualification_json.lux_operator_workflow`**.

### Phase 3B production verification checklist

- Lux operator session: leads load; set **`next_action_at`** + **`next_action_note`** → save → refresh → values persist.
- Filters: stage, owner, property, health behave as expected; summary strip counts match visible slice.
- Indicators: overdue / stale / untouched appear where rules apply.
- **`GET /concierge`** (and concierge lead create responses): **no** internal workflow JSON or scheduling fields exposed publicly.

---

**Phase 3 demo safe:** Yes — ticket stays open; no marketing automation or external CRM in this slice.
