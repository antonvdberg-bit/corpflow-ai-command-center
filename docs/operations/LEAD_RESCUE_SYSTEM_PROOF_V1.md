# Lead Rescue — System Proof v1 (#715)

**Status:** Synthetic system-run evidence for the 12 Aug system gate. **No messaging runtime. No production deploy. No schema/env.**

**Issue:** #715 (WS4) · Parent #711 · Controller #710 · Commercial rail #714 · Unit baseline PR #724

**Anchor sentinel:** `<!-- LEAD_RESCUE_SYSTEM_PROOF_V1 -->`

<!-- LEAD_RESCUE_SYSTEM_PROOF_V1 -->

**Audience:** Operator / ChatGPT service-design reviewer verifying that a financially approved Lead Rescue client can be onboarded and delivered end-to-end on synthetic data.

**Machine runner:** `lib/lead-rescue/system-proof.js` → `runLeadRescueSystemProof()`  
**Commercial consumer:** `lib/revenue/commercial-approval.js` → `toOnboardingHandoff()`  
**Unit contract:** `config/lead-rescue-onboarding-delivery.v1.json` / `lib/lead-rescue/onboarding-delivery.js`  
**Tests:** `node-tests/lead-rescue-system-proof.test.mjs`  
**Fresh opportunity:** `fixtures/lead-rescue-onboarding/system-proof-commercial-opportunity.json`  
**Evidence artifact:** `artifacts/lead-rescue-system-proof/latest-run.json`

---

## 0. Outcome

Prove **one complete synthetic Lead Rescue path** from financially approved → `acceptance_ready`, without redesigning the service and without enabling messaging runtime.

This packet **consumes** the merged #714 commercial approval rail and the merged #724 onboarding/delivery contract. It does **not** own proposal/payment UX (#714), Website Rescue (#716), or prospect UI (#721).

---

## 1. Boundaries

| In lane | Out of lane |
| ------- | ----------- |
| Fresh synthetic financially approved opportunity | Real client data / credentials |
| Onboarding intake completion + delivery issue evidence | WhatsApp / email / SMS **runtime** |
| State walk: kickoff → inputs → build sim → preview → verification → client review → acceptance → handover → support boundary | New Lead Rescue product features |
| Gate-block proof (missing FA / required inputs / blocked inputs) | Broad analytics / CRM / schema |
| Explicit messaging-runtime gate evidence | Production deploy / DNS / paid tools |

**Messaging runtime** remains `messaging_runtime_authorized=false` and `allow_real_client_sends=false` for the entire path. Handover “channels” are **synthetic draft** labels only.

---

## 2. Synthetic opportunity (fresh)

| Field | Value |
| ----- | ----- |
| Opportunity | `OPP-SYN-LR-SYS-715-001` |
| Financial approval ref | `FA-SYN-LR-SYS-715-001` |
| Product | `lead-rescue` (AI Lead Rescue launch pilot) |
| Currency / setup | USD 150 (pilot full upfront — synthetic) |
| Messaging runtime | Disabled for proof |

Handoff is produced by `toOnboardingHandoff(commercial)` and must yield `financially_approved === true` before onboarding seeds.

---

## 3. Path exercised

```text
#714 handoff (financially_approved)
  → approved_to_onboard
  → onboarding_in_progress
  → onboarding_complete          (intake + shared checklist)
  → build_started                (canStartBuild gate)
  → preview_evidence
  → verification_evidence
  → client_review                (changes agreed; optional loop to preview)
  → accepted
  → handover_complete
  → acceptance_ready             (all evidence packets; messaging flags false)
```

Intake capture includes: enquiry sources, primary leaky source, current process, operators/users, stages, escalation rules, approved response rules, test scenarios, reporting, client responsibilities, exclusions, acceptance measures, review cadence.

---

## 4. Gate-block proof (required)

The runner records that build **cannot** progress when:

| Missing condition | Expected reason |
| ----------------- | --------------- |
| Financial approval | `MISSING_FINANCIAL_APPROVAL` |
| Required client inputs | `MISSING_REQUIRED_CLIENT_INPUTS` |
| Blocked client inputs | `BLOCKED_CLIENT_INPUTS` |

Messaging remains blocked via `MESSAGING_RUNTIME_NOT_AUTHORIZED` unless a separate Anton-protected authorisation is set (never set on this path).

Both `canStartBuild()` and `transitionDeliveryState(..., 'build_started')` must fail for FA / missing-input cases.

---

## 5. How to re-run

```bash
node --test node-tests/lead-rescue-system-proof.test.mjs
node --test node-tests/lead-rescue-onboarding-delivery.test.mjs
node --test node-tests/commercial-approval-rail.test.mjs
node scripts/lead-rescue-system-proof.mjs
git diff --check
```

The script writes `artifacts/lead-rescue-system-proof/latest-run.json` with `ok: true` when the path succeeds.

---

## 6. System-gate checklist (12 Aug)

- [x] Fresh synthetic financially approved opportunity (fixture)
- [x] Onboarding inputs complete (enquiry source + process + operators + stages + rules + scenarios + reporting + responsibilities + exclusions + acceptance + cadence)
- [x] Bounded delivery issue evidence object (template pointer; simulation_only)
- [x] Full state walk to `acceptance_ready`
- [x] Preview / verification / client-review / acceptance / handover / support-boundary evidence
- [x] Gate-block proofs for FA / missing inputs / blocked inputs
- [x] Messaging-runtime gate remains closed; `external_sends_executed: []`
- [x] No real client sends, deploy, secrets, schema, or env changes

**Integrated Scenario A (#711 / 14 Aug)** is owned by `docs/operations/LEAD_RESCUE_SCENARIO_A_INTEGRATED_V1.md` (composes merged #711 Scenario A; does not rebuild this system-proof slice).

---

## 7. Delivery Reality note

This is **local / PR** system-gate evidence for WS4. It is **not** operational COMPLETE for a live client. Live verification and messaging-runtime authorisation remain separate Anton-protected gates per `.cursor/rules/delivery-reality.mdc`.
