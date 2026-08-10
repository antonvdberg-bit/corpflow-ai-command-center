# Commercial approval — System Proof v1 (#714)

**Status:** Synthetic system-run evidence for the 12 Aug proposal/financial-control system gate. **No payment collection. No bank action. No client send. No production deploy.**

**Issue:** #714 (WS3) · Parent #711 · Controller #710 · Consumers #715 / #716

**Anchor sentinel:** `<!-- COMMERCIAL_APPROVAL_SYSTEM_PROOF_V1 -->`

<!-- COMMERCIAL_APPROVAL_SYSTEM_PROOF_V1 -->

**Audience:** Operator / ChatGPT commercial reviewer verifying that one Lead Rescue and one Website Rescue synthetic opportunity can progress independently from qualification through financially approved handoff.

**Machine runner:** `lib/revenue/commercial-approval-system-proof.js` → `runCommercialApprovalSystemProof()`
**Unit contract:** `config/commercial-approval-rail.v1.json` / `lib/revenue/commercial-approval.js`
**Tests:** `node-tests/commercial-approval-system-proof.test.mjs`
**Fixtures:**
- `fixtures/commercial-approval/system-proof-lead-rescue.json`
- `fixtures/commercial-approval/system-proof-website-rescue.json`
**Evidence artifact:** `artifacts/commercial-approval-system-proof/latest-run.json`

---

## 0. Outcome

Prove **two independent synthetic commercial paths**:

1. Lead Rescue — qualification → proposal-ready → accepted → payment evidenced → `financially_approved` → onboarding handoff (`ai-lead-rescue`)
2. Website Rescue — same path → onboarding handoff (`website-rescue`)

Also prove pack completeness for both products and fail-closed denial when payment evidence or acceptance is missing.

## 1. Boundaries

| In lane | Out of lane |
| ------- | ----------- |
| Qualification summary + proposal packs | Prospect Ops UI (#721) |
| Acceptance + payment-evidence records | Payment collection / bank action |
| Deterministic financial approval gate | ERPNext customization |
| Storage/linking procedure using existing systems | Automated client send |
| Synthetic fixtures only | Real client private financial data |
| Handoff boolean for #715 / #716 | Redesign of onboarding validators |

## 2. Synthetic opportunities

| Field | Lead Rescue | Website Rescue |
| ----- | ----------- | -------------- |
| Opportunity | `OPP-SYN-LR-SYS-714-001` | `OPP-SYN-WR-SYS-714-001` |
| Financial approval ref | `FA-SYN-LR-SYS-714-001` | `FA-SYN-WR-SYS-714-001` |
| Currency / commercial | USD 150 pilot | MUR 45,000 one-page (50% deposit evidenced) |
| Won reason | `accepted_pilot` | `accepted_standard_offer` |

## 3. Path exercised (each product)

```text
qualification_summary complete + proposal_ready
  → proposal pack ready (scope/price/terms)
  → accepted
  → payment_evidence_recorded (or complete exception)
  → financially_approved (canMarkFinanciallyApproved)
  → approved_to_onboard (toOnboardingHandoff)
```

## 4. Fail-closed proof (required)

| Missing condition | Expected |
| ----------------- | -------- |
| Accepted but payment pending | denied · `MISSING_PAYMENT_EVIDENCE` |
| Acceptance without payment evidence | denied · `MISSING_PAYMENT_EVIDENCE` |
| Rejected / lost | denied · `PROPOSAL_REJECTED` + `OPPORTUNITY_LOST` |
| Incomplete proposal | denied · price/terms/scope blockers |

## 5. How to re-run

```bash
node --test node-tests/commercial-approval-rail.test.mjs
node --test node-tests/commercial-approval-system-proof.test.mjs
node scripts/commercial-approval-system-proof.mjs
```

## 6. Explicit non-actions

- no payment execution / bank transfer
- no invoice send automation
- no email / WhatsApp / SMS automation
- no schema / env / secrets
- no production deploy / public launch
- no Anton external price commitment beyond existing documented floors

## 7. Anton action

`ANTON ACTION: NONE for this system proof.`
Pricing recommendation packet remains available for separate Anton review of non-floor bands.
