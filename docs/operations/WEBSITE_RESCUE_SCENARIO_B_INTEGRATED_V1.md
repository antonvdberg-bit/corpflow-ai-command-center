# Website Rescue — Scenario B integrated proof v1 (#926 / #716)

**Status:** Synthetic integrated-gate evidence for WS5. **No real DNS. No client_production deploy. No schema/env. No external send.**

**Issue:** #926 (continuation) · Parent #716 (WS5) · Programme #711 Scenario B · Controller #710  
**Reason:** #716 historical Cursor metadata fail-closes as `completed_agent_present`; this is a clean execution packet, not a duplicate workstream.

**Anchor sentinel:** `<!-- WEBSITE_RESCUE_SCENARIO_B_INTEGRATED_V1 -->`

<!-- WEBSITE_RESCUE_SCENARIO_B_INTEGRATED_V1 -->

**Audience:** Operator / ChatGPT service-design reviewer verifying that a financially approved Website Rescue client can be onboarded and delivered through handover on synthetic data.

**Machine runner:** `lib/website-rescue/scenario-b-integrated.js` → `runWebsiteRescueScenarioBIntegrated()`  
**Reuses (do not rebuild):** `lib/gtm/integrated-scenarios-711.js` → `runScenarioBWebsiteRescue()`  
**Unit contract:** `lib/website-rescue/onboarding-delivery.js` (merged PR #732)  
**System-proof:** `lib/website-rescue/system-proof.js` (merged PR #742 — not re-implemented here)  
**Commercial rail:** `lib/revenue/commercial-approval.js` (merged #714 — consumed via Scenario B)  
**Tests:** `node-tests/website-rescue-scenario-b-integrated.test.mjs`  
**Evidence artifact:** `artifacts/website-rescue-scenario-b-integrated/latest-run.json`

---

## 0. Outcome

Prove **#711 Scenario B** through handover / `acceptance_ready` as the WS5 integrated gate, without redesigning Website Rescue and without real DNS or client_production cutover.

This packet **composes** merged capabilities. It does **not** rebuild the 7 Aug unit slice or the 12 Aug independent system-proof slice.

**Final verdict language:** `WEBSITE RESCUE SCENARIO B INTEGRATED READY FOR REVIEW` or `NOT READY` — one blocker.

---

## 1. Boundaries

| In lane | Out of lane |
| ------- | ----------- |
| Re-run Scenario B on current `main` capabilities | Rebuild unit validators / fixtures (#732) |
| Handover + maintenance-boundary evidence evaluation | Rebuild independent system-proof CLI (#742) |
| Fail-closed proof for missing FA / content-assets / access | Real DNS / domain action |
| Synthetic IDs only | client_production deploy |
| | Prospect UI / Kanban (#721) |
| | Proposal / payment rail ownership (#714) |
| | Lead Rescue Scenario A (#715 / #711A) |
| | CMS, SEO, gateway, analytics, schema, env, secrets |

**Do not rebuild** already-completed unit/system slices.

---

## 2. Path exercised (Scenario B)

```text
fresh synthetic locked-offer enquiry (premium-landing-page-rescue)
  → acknowledgement draft (send=false)
  → maturation walk → proposal_ready
  → #714 handoff (financially_approved)
  → missing FA / content-assets / approved access fail-closed
  → onboarding complete
  → build → preview → revision
  → deploy_approval_simulated
  → dns_cutover_gated (authorization simulated)
  → live_validation_simulated
  → accepted → handover_complete → acceptance_ready
```

Scenario B IDs remain the #711 integrated identities (`INT-SYN-711B-20260805-001` / `OPP-SYN-711B-WR-20260805-001`). This WS5 packet’s run id is `WS5-926-SCENARIO-B-20260813`.

---

## 3. Evidence packets required

| Packet | Required for close |
| ------ | ------------------ |
| preview | yes |
| revision | yes |
| deploy_approval | yes — `simulation_only=true` |
| dns_cutover | yes — `simulation_only=true` |
| live_validation | yes — simulated checks only |
| acceptance | yes |
| handover | yes — synthetic/draft channels only |
| maintenance_boundary | yes |

**Handover channels must be synthetic/draft labels.** Real email/WhatsApp/SMS send is forbidden (`external_sends_executed: []`).  
**Real DNS / client_production flags must remain false.**

---

## 4. How to re-run

```bash
node --test node-tests/website-rescue-scenario-b-integrated.test.mjs
node --test node-tests/website-rescue-onboarding-delivery.test.mjs
node --test node-tests/website-rescue-system-proof.test.mjs
node --test node-tests/gtm-integrated-scenarios-711.test.mjs
node scripts/website-rescue-scenario-b-integrated.mjs
git diff --check
```

The script writes `artifacts/website-rescue-scenario-b-integrated/latest-run.json` with `ok: true` when Scenario B reaches `acceptance_ready` with complete handover evidence.

---

## 5. Integrated-gate checklist (14 Aug / WS5)

- [x] Reuse merged #732 unit contract (not rebuilt)
- [x] Reuse merged #742 system-proof (not rebuilt)
- [x] Reuse merged #714 financial-approval handoff via Scenario B
- [x] Scenario B locked-offer market → maturation → FA → onboarding → `acceptance_ready`
- [x] Preview / revision / deploy-approval / DNS / live-validation / acceptance / handover / maintenance-boundary packets
- [x] Missing FA / content-assets / approved access remain fail-closed
- [x] Deploy/DNS approval simulated only; `real_dns_cutover_executed: false`; `real_client_production_deploy: false`
- [x] `external_sends_executed: []`
- [x] Exact remaining protected blocker for closing #926 / #716: **none in lane**

---

## 6. Exact remaining protected blocker

**In-lane blockers for this packet:** none (`remaining_in_lane_blockers: []`).

**Out-of-lane Anton gates (not required to close WS5 synthetic Scenario B):**

| Gate | Required to close #926 / #716? | Note |
| ---- | ------------------------------ | ---- |
| Real DNS / domain action | No | Separate Anton-protected gate before any registrar or DNS change |
| client_production deploy | No | Not in WS5 synthetic scope |
| External email / WhatsApp / SMS | No | Separate Anton-protected gate |
| Merge of this PR | Ordinary merge | Does not authorize DNS, deploy, or sends |

ANTON ACTION for this packet: merge decision only. No DNS, deploy, schema, env, secrets, payment, or send action.

---

## 7. Delivery Reality note

This is **local / PR** integrated-gate evidence for WS5. It is **not** operational COMPLETE for a live client. Live verification, real DNS, and client_production deploy remain separate Anton-protected gates per `.cursor/rules/delivery-reality.mdc`.
