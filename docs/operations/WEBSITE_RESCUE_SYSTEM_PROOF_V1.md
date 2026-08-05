# Website Rescue — System Proof v1 (#716)

**Status:** Synthetic system-run evidence for the 12 Aug system gate. **No DNS action. No production deploy. No credentials. No schema/env.**

**Issue:** #716 (WS5) · Parent #711 · Controller #710 · Commercial rail #714 · Unit baseline PR #732

**Anchor sentinel:** `<!-- WEBSITE_RESCUE_SYSTEM_PROOF_V1 -->`

<!-- WEBSITE_RESCUE_SYSTEM_PROOF_V1 -->

**Audience:** Operator / ChatGPT service-design reviewer verifying that a financially approved Website Rescue client can be onboarded and delivered end-to-end on synthetic data.

**Machine runner:** `lib/website-rescue/system-proof.js` → `runWebsiteRescueSystemProof()`  
**Commercial consumer:** `lib/revenue/commercial-approval.js` → `toOnboardingHandoff()`  
**Unit contract:** `config/website-rescue-onboarding-delivery.v1.json` / `lib/website-rescue/onboarding-delivery.js`  
**Tests:** `node-tests/website-rescue-system-proof.test.mjs`  
**Fresh opportunity:** `fixtures/website-rescue-onboarding/system-proof-commercial-opportunity.json`  
**Evidence artifact:** `artifacts/website-rescue-system-proof/latest-run.json`

---

## 0. Outcome

Prove **one complete synthetic Website Rescue path** from financially approved → `acceptance_ready`, without redesigning the service and without real cutover.

This packet **consumes** the merged #714 commercial approval rail and the merged #732 onboarding/delivery contract. It does **not** own proposal/payment UX (#714) or prospect UI (#721).

---

## 1. Boundaries

| In lane | Out of lane |
| ------- | ----------- |
| Fresh synthetic financially approved opportunity | Real client data / credentials |
| Onboarding intake completion + delivery issue evidence | CMS platform / SEO campaigns |
| State walk: kickoff → inputs → build sim → preview → revision → deploy-approval sim → DNS/cutover gate sim → live-validation sim → acceptance → handover → maintenance | Real DNS / client_production deploy |
| Gate-block proof (missing FA / content-assets / access) | Paid design tooling / gateway redesign |
| Artifact JSON for system-gate evidence | Messaging runtime / Lead Rescue stream (#715) |

**Credentials** appear only as `approved_access_confirmed=true` after an approved secret-channel confirmation. No passwords, OTPs, API keys, or registrar secrets in fixtures, docs, issues, or artifacts.

**Deploy / DNS** remain `*_simulated` flags only.

---

## 2. Synthetic opportunity (fresh)

| Field | Value |
| ----- | ----- |
| Opportunity | `OPP-SYN-WR-SYS-716-001` |
| Financial approval ref | `FA-SYN-WR-SYS-716-001` |
| Product | `website-rescue` (Premium Landing Page Rescue) |
| Case type | `rebuild` (T3) |
| Currency / setup | MUR 95,000 (50% deposit evidenced — synthetic) |
| DNS cutover | In scope for **simulation** only |

Handoff is produced by `toOnboardingHandoff(commercial)` and must yield `financially_approved === true` before onboarding seeds.

---

## 3. Path exercised

```text
#714 handoff (financially_approved)
  → approved_to_onboard
  → onboarding_in_progress
  → onboarding_complete          (intake + shared checklist + content/assets + access flags)
  → build_started                (canStartBuild gate)
  → preview_evidence
  → revision_cycle
  → deploy_approval_pending
  → deploy_approved_simulated    (deploy_approval_simulated=true)
  → dns_cutover_gated
  → live_validation_simulated    (dns_cutover_authorized_simulated=true)
  → accepted
  → handover_complete
  → acceptance_ready             (all evidence packets; real cutover flags false)
```

Intake capture includes: current site, domain/hosting facts, brand/assets, pages/services, content ownership, enquiry destination, preferences, revision authority, acceptance measures, maintenance boundary.

---

## 4. Gate-block proof (required)

The runner records that build **cannot** progress when:

| Missing condition | Expected reason |
| ----------------- | --------------- |
| Financial approval | `MISSING_FINANCIAL_APPROVAL` |
| Content / assets | `MISSING_CONTENT_OR_ASSETS` |
| Approved access | `MISSING_APPROVED_ACCESS` |

Both `canStartBuild()` and `transitionDeliveryState(..., 'build_started')` must fail for each case.

---

## 5. How to re-run

```bash
node --test node-tests/website-rescue-system-proof.test.mjs
node --test node-tests/website-rescue-onboarding-delivery.test.mjs
node scripts/website-rescue-system-proof.mjs
git diff --check
```

The script writes `artifacts/website-rescue-system-proof/latest-run.json` with `ok: true` when the path succeeds.

---

## 6. System-gate checklist (12 Aug)

- [x] Fresh synthetic financially approved opportunity (fixture)
- [x] Onboarding inputs complete for rebuild case
- [x] Bounded delivery issue evidence object (template pointer; simulation_only)
- [x] Full state walk to `acceptance_ready`
- [x] Preview / revision / deploy-approval / DNS / live-validation / handover / maintenance evidence
- [x] Gate-block proofs for FA / content-assets / access
- [x] No real DNS, deploy, secrets, schema, env, or client sends

**Integrated Scenario B (#711 / 14 Aug)** remains a later programme step; this packet is the **independent** Website Rescue system proof.

---

## 7. Delivery Reality note

This is **local / PR** system-gate evidence for WS5. It is **not** operational COMPLETE for a live client. Live verification, real DNS, and client_production deploy remain separate Anton-protected gates per `.cursor/rules/delivery-reality.mdc`.
