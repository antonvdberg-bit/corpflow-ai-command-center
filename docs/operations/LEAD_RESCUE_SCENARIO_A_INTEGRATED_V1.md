# Lead Rescue — Scenario A integrated proof v1 (#715)

**Status:** Synthetic integrated-gate evidence for WS4. **No messaging runtime. No client_production deploy. No schema/env.**

**Issue:** #715 (WS4) · Parent #711 Scenario A · Controller #710
**Requeue (generation 3):** continue from merged unit/system proof into outstanding Scenario A handover evidence.

**Anchor sentinel:** `<!-- LEAD_RESCUE_SCENARIO_A_INTEGRATED_V1 -->`

<!-- LEAD_RESCUE_SCENARIO_A_INTEGRATED_V1 -->

**Audience:** Operator / ChatGPT service-design reviewer verifying that a financially approved Lead Rescue client can be onboarded and delivered through handover on synthetic data.

**Machine runner:** `lib/lead-rescue/scenario-a-integrated.js` → `runLeadRescueScenarioAIntegrated()`
**Reuses (do not rebuild):** `lib/gtm/integrated-scenarios-711.js` → `runScenarioALeadRescue()`
**Unit contract:** `lib/lead-rescue/onboarding-delivery.js` (merged PR #724)
**System-proof:** `lib/lead-rescue/system-proof.js` (merged PR #745 — not re-implemented here)
**Commercial rail:** `lib/revenue/commercial-approval.js` (merged #714 — consumed via Scenario A)
**Tests:** `node-tests/lead-rescue-scenario-a-integrated.test.mjs`
**Evidence artifact:** `artifacts/lead-rescue-scenario-a-integrated/latest-run.json`

---

## 0. Outcome

Prove **#711 Scenario A** through handover / `acceptance_ready` as the WS4 integrated gate, without redesigning Lead Rescue and without enabling messaging runtime.

This packet **composes** merged capabilities. It does **not** rebuild the 7 Aug unit slice or the 12 Aug independent system-proof slice.

---

## 1. Boundaries

| In lane | Out of lane |
| ------- | ----------- |
| Re-run Scenario A on current `main` capabilities | Rebuild unit validators / fixtures (#724) |
| Handover + support-boundary evidence evaluation | Rebuild independent system-proof CLI (#745) |
| Explicit remaining-protected-blocker statement | WhatsApp / email / SMS **runtime** |
| Synthetic IDs only | Prospect UI / Kanban (#721) |
| | Proposal / payment rail ownership (#714) |
| | Website Rescue Scenario B (#716 / #711B) |
| | Analytics, CRM, schema, env, secrets |

**Do not rebuild** already-completed unit/system slices.

---

## 2. Path exercised (Scenario A)

```text
fresh synthetic market enquiry (buyer_need=losing-enquiries)
  → acknowledgement draft (send=false)
  → owner gate blocks qualifying
  → maturation walk → proposal_sent
  → #714 handoff (financially_approved)
  → onboarding complete + delivery gate blocks proven
  → build → preview → verification → client review (with agreed-change loop)
  → accepted → handover_complete → acceptance_ready
```

Scenario A IDs remain the #711 integrated identities (`INT-SYN-711A-20260805-001` / `OPP-SYN-711A-LR-20260805-001`). This WS4 packet’s run id is `WS4-715-SCENARIO-A-20260813`.

---

## 3. Evidence packets required

| Packet | Required for close |
| ------ | ------------------ |
| preview | yes |
| verification | yes |
| client_review | yes |
| acceptance | yes |
| handover | yes — synthetic/draft channels only |
| support_boundary | yes |

**Handover channels must be synthetic/draft labels.** Real WhatsApp/email/SMS send is forbidden on this path (`messaging_runtime_authorized=false`).

---

## 4. How to re-run

```bash
node --test node-tests/lead-rescue-scenario-a-integrated.test.mjs
node --test node-tests/lead-rescue-onboarding-delivery.test.mjs
node --test node-tests/lead-rescue-system-proof.test.mjs
node --test node-tests/gtm-integrated-scenarios-711.test.mjs
node scripts/lead-rescue-scenario-a-integrated.mjs
git diff --check
```

The script writes `artifacts/lead-rescue-scenario-a-integrated/latest-run.json` with `ok: true` when Scenario A reaches `acceptance_ready` with complete handover evidence.

---

## 5. Integrated-gate checklist (14 Aug / WS4)

- [x] Reuse merged #724 unit contract (not rebuilt)
- [x] Reuse merged #745 system-proof (not rebuilt)
- [x] Reuse merged #714 financial-approval handoff via Scenario A
- [x] Scenario A market → maturation → FA → onboarding → `acceptance_ready`
- [x] Preview / verification / client-review / acceptance / handover / support-boundary packets
- [x] Messaging runtime remains unauthorized; `external_sends_executed: []`
- [x] No client_production deploy / DNS
- [x] Exact remaining protected blocker for closing #715: **none in lane**

---

## 6. Exact remaining protected blocker

**In-lane blockers for this packet:** none (`remaining_in_lane_blockers: []`).

**Out-of-lane Anton gates (not required to close WS4 synthetic Scenario A):**

| Gate | Required to close #715? | Note |
| ---- | ----------------------- | ---- |
| Messaging runtime | No | Separate Anton-protected gate before any real client send |
| client_production deploy | No | Not in WS4 scope |
| Merge of this PR | Ordinary merge | Does not authorize messaging or client_production |

ANTON ACTION for this packet: merge decision only. No messaging, deploy, schema, env, or secrets action.

---

## 7. Delivery Reality note

This is **local / PR** integrated-gate evidence for WS4. It is **not** operational COMPLETE for a live client. Live verification and messaging-runtime authorisation remain separate Anton-protected gates per `.cursor/rules/delivery-reality.mdc`.
