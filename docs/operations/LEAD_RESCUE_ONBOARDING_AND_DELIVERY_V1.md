# Lead Rescue — Onboarding and Delivery Readiness v1

**Status:** Process contract + templates + pure validators. **No messaging runtime. No schema/env. No deploy.**

**Issue:** #715 (WS4) · Parent #711 · Controller #710 · Source #550

**Anchor sentinel:** `<!-- LEAD_RESCUE_ONBOARDING_AND_DELIVERY_V1 -->`

<!-- LEAD_RESCUE_ONBOARDING_AND_DELIVERY_V1 -->

**Audience:** Operator delivering a financially approved Lead Rescue client from onboarding through acceptance-ready evidence.

**Machine contract:** `config/lead-rescue-onboarding-delivery.v1.json`
**Validators:** `lib/lead-rescue/onboarding-delivery.js`
**Unit tests:** `node-tests/lead-rescue-onboarding-delivery.test.mjs`
**System-proof (12 Aug gate):** `docs/operations/LEAD_RESCUE_SYSTEM_PROOF_V1.md` · `lib/lead-rescue/system-proof.js`
**Scenario A integrated (14 Aug gate):** `docs/operations/LEAD_RESCUE_SCENARIO_A_INTEGRATED_V1.md` · `lib/lead-rescue/scenario-a-integrated.js`

**Outcome:** Prove a financially approved Lead Rescue client can be onboarded and delivered **without redesigning the service**.

---

## 0. Boundaries (anti-sidetrack)

| In lane | Out of lane |
| ------- | ----------- |
| Shared onboarding checklist + Lead Rescue intake | WhatsApp / email / SMS **runtime** |
| Required-input completeness + build gate | Prospect workbench / Kanban UI (#721 — see `docs/operations/PROSPECT_OPERATIONS_V1.md`) |
| Bounded delivery issue + state model | Proposal / payment / financial-approval rail (#714 owns; we consume `financially_approved`) |
| Preview → verification → review → acceptance → handover evidence | Analytics infrastructure |
| Support-boundary documentation | Product redesign / feature expansion |
| Synthetic complete / incomplete / blocked tests | Client_production deploy or DNS |

**Messaging runtime** is a **separate Anton-protected gate** (`messaging_runtime_authorized`). Synthetic onboarding/delivery proofs must finish with that flag **false**.

---

## 1. Entry condition — approved to onboard

Onboarding opens only when:

1. **`financially_approved === true`** (published by #714 `docs/revenue/COMMERCIAL_APPROVAL_RAIL_V1.md` / `canMarkFinanciallyApproved` → `toOnboardingHandoff`; same boolean semantics for build gate).
2. Product is Lead Rescue (`ai-lead-rescue`).
3. Operator has capacity for the 48-hour setup window (see `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`).

If financial approval is missing → **do not start build**. Validator reason: `MISSING_FINANCIAL_APPROVAL`.

Deep payment/POP procedure remains in the paid-pilot onboarding runbook and #714. This lane only **consumes** the approval boolean.

---

## 2. Shared onboarding checklist

Shared across CorpFlow commercial products (Lead Rescue uses the same spine as Website Rescue where applicable):

| ID | Item |
| -- | ---- |
| `shared.business_identity` | Business identity confirmed |
| `shared.primary_contact` | Primary contact + working channels confirmed |
| `shared.financial_approval` | `financially_approved=true` recorded |
| `shared.named_approver` | Named client approver for acceptance |
| `shared.client_responsibilities_ack` | Client responsibilities acknowledged |
| `shared.exclusions_ack` | Exclusions acknowledged |
| `shared.acceptance_measures` | Acceptance measures agreed |
| `shared.review_cadence` | Review cadence agreed |

Template tick-list: `docs/operations/templates/lead-rescue-onboarding-intake.md` § Shared.

Companion (Mauritius all-tiers intake): `docs/operations/MAURITIUS_CLIENT_ONBOARDING_CHECKLIST_V1.md` § 1.

---

## 3. Lead Rescue–specific intake (required capture)

Operator captures **all** of the following before `onboarding_complete` / build start. Machine field ids match `config/lead-rescue-onboarding-delivery.v1.json` → `lead_rescue_intake_fields`.

| Field | What to capture |
| ----- | --------------- |
| `enquiry_sources` | All enquiry channels in use |
| `primary_leaky_source` | **One** source for the pilot (must be in `enquiry_sources`) |
| `current_process_summary` | Who replies today, how fast, tools used |
| `users_operators` | Named day-to-day handlers |
| `lead_stages` | Board stages (≥3; defaults provided) |
| `escalation_rules` | When / to whom when SLA slips or owner unavailable |
| `approved_response_rules` | Tone, what not to promise, who may speak as the business |
| `test_scenarios` | Verification scenarios (e.g. marked test enquiry) |
| `reporting_requirements` | Daily summary + one workflow metric for the pilot week |
| Contact / timezone / approver | Working WhatsApp, email, timezone, named approver |
| Responsibilities / exclusions / acceptance / cadence | Accepted lists (defaults in config; confirm with client) |

**Never collect:** passwords, OTPs, card data, bank account numbers, government ID, full CRM exports, health data. Presence of forbidden fields → `BLOCKED_CLIENT_INPUTS`.

---

## 4. Client responsibilities, exclusions, acceptance, review cadence

### Client responsibilities (default)

- Provide one named leaky enquiry source and keep it available during the pilot window.
- Name one working WhatsApp and one working email the owner monitors.
- Reply to customers — CorpFlow surfaces and follows the agreed process; it does not auto-reply as the business.
- Provide feedback on preview/verification within the agreed review cadence.
- Escalate blockers within one business day.

### Exclusions (default)

- No automated messaging runtime without separate authorisation.
- No second lead source during the 48-hour setup window.
- No revenue or lead-volume guarantees.
- No full CRM migration / historical import.
- No secrets in chat or tickets.
- No client_production deploy or DNS as part of the wedge pilot.

### Acceptance measures (default)

- One lead source connected; marked test enquiry visible in the lead log.
- Operator alert path verified on the test enquiry.
- Buyer can receive the agreed daily summary channel(s).
- Lead stages + escalation rules documented and usable.
- Handover note delivered with support boundary + monitoring window dates.

### Review cadence (default)

- Preview / verification: client responds within **2 business days**.
- During 7-day monitoring: day-1 check-in, day-3 pulse, day-7 recap.
- Extra revision rounds after included reviews require written change order.

---

## 5. Delivery state model

Ordered operating states (config `delivery_states`):

```text
approved_to_onboard
  → onboarding_in_progress
      ⇄ onboarding_blocked
      → onboarding_complete
          → build_blocked | build_started
              → preview_evidence
                  → verification_evidence
                      → client_review
                          ⇄ preview_evidence (revision)
                          → accepted
                              → handover_complete
                                  → acceptance_ready
```

**Rules enforced in code:**

- Transition must be listed in `delivery_transitions`.
- `onboarding_complete` requires complete intake and no blocked inputs.
- `build_started` requires `canStartBuild()` → financial approval + complete intake + no blocked inputs.
- `messaging_runtime_authorized` is **never** set by a delivery transition.

---

## 6. Bounded delivery issue template

When onboarding is complete and build may start, open **one** bounded delivery issue using:

`docs/operations/templates/lead-rescue-delivery-issue.md`

The issue must state:

- Synthetic or real client label (no secrets).
- `financially_approved` evidence pointer (link/ref only — no bank detail).
- Primary leaky source + stages + escalation summary.
- Current `delivery_state`.
- Evidence packet checklist (preview → support boundary).
- Explicit **messaging runtime: NOT authorized** unless Anton flips the gate.

Do not turn the delivery issue into a CRM, analytics programme, or messaging-runtime build.

---

## 7. Evidence packets

| Packet | Required fields (summary) |
| ------ | ------------------------- |
| `preview` | artefact/URL, captured_at, operator_note |
| `verification` | test_scenario_ids, pass_fail, captured_at, operator_note |
| `client_review` | reviewer, reviewed_at, decision, feedback_summary |
| `acceptance` | accepted_by, accepted_at, acceptance_measures_met |
| `handover` | handover_sent_at, channels, support_boundary_summary, monitoring_window |
| `support_boundary` | in_scope, out_of_scope, escalation_contact, review_cadence |

For #711 Scenario A integrated test, evidence may be **synthetic** (fixture files / activity-log-shaped notes). Real client sends are out of scope.

---

## 8. Messaging runtime gate (separate)

| Flag | Meaning |
| ---- | ------- |
| `messaging_runtime_authorized=false` (default) | Drafts and synthetic evidence only; **no** real WhatsApp/email/SMS send |
| `messaging_runtime_authorized=true` | Anton-protected; required before any real client send |

`canUseMessagingRuntime()` is independent of `canStartBuild()`. Build/setup evidence can reach `acceptance_ready` with messaging still unauthorized.

---

## 9. Build-start gate (unit-gate proof)

`canStartBuild(record)` fails when:

| Reason | Cause |
| ------ | ----- |
| `MISSING_FINANCIAL_APPROVAL` | `financially_approved !== true` |
| `MISSING_REQUIRED_CLIENT_INPUTS` | Required intake fields incomplete |
| `BLOCKED_CLIENT_INPUTS` | `blocked_inputs` set or forbidden fields present |

Only when the gate returns `{ ok: true }` may `delivery_state` move to `build_started`.

---

## 10. Synthetic records and test gates

| Gate | Date | What this lane provides |
| ---- | ---- | ----------------------- |
| Unit | 7 Aug 2026 | Completeness tests, synthetic complete/incomplete/blocked fixtures, transition + build-gate tests (merged PR #724) |
| System | 12 Aug 2026 | Independent path `approved_to_onboard` → `acceptance_ready` on synthetic data (`fixtures/lead-rescue-onboarding/`; merged PR #745) |
| Integrated | 14 Aug 2026 | Scenario A (#711) through handover evidence — **no** real messaging runtime, **no** client_production deploy (`docs/operations/LEAD_RESCUE_SCENARIO_A_INTEGRATED_V1.md`) |

Fixtures:

- `fixtures/lead-rescue-onboarding/complete.json`
- `fixtures/lead-rescue-onboarding/incomplete.json`
- `fixtures/lead-rescue-onboarding/blocked-input.json`
- `fixtures/lead-rescue-onboarding/acceptance-ready.json`

---

## 11. Operator procedure (short)

1. Confirm `financially_approved=true` (from #714 evidence or synthetic for tests).
2. Fill intake template; tick shared checklist.
3. If inputs blocked → `onboarding_blocked`; chase; do not start build.
4. When complete → open bounded delivery issue; transition to `build_started` only if gate passes.
5. Capture preview → verification → client review → acceptance → handover → support boundary.
6. Leave messaging runtime unauthorized unless Anton opens that gate.
7. Mark `acceptance_ready` when evidence packets are complete.

Deep 48-hour setup actions remain in `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` (sheet, alerts, hand-over wording). This doc owns **readiness gates and evidence shape**.

---

## 12. Cross-references

| Topic | Doc |
| ----- | --- |
| 48h setup runbook | `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` |
| Sales → delivery boundary | `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` |
| Mauritius shared intake | `docs/operations/MAURITIUS_CLIENT_ONBOARDING_CHECKLIST_V1.md` |
| Fulfilment evidence (pilot proof) | `docs/lead-rescue/FIRST_PAID_PILOT_FULFILMENT_EVIDENCE_CHECKLIST.md` |
| Operator pack | `docs/lead-rescue/FIRST_PAID_PILOT_OPERATOR_PACK.md` |
| Commercial playbook | `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` |
| Financial approval lane | GitHub #714 |
| Prospect UI lane | GitHub #721 · `docs/operations/PROSPECT_OPERATIONS_V1.md` |
| Scenario A integrated (14 Aug) | `docs/operations/LEAD_RESCUE_SCENARIO_A_INTEGRATED_V1.md` |

---

## 13. Delivery Reality note

This packet is **local / PR** readiness for WS4. Operational **COMPLETE** for a live client still requires live verification per `.cursor/rules/delivery-reality.mdc` when a real pilot is delivered — and still does **not** authorize messaging runtime or client_production deploy without separate Anton gates.
