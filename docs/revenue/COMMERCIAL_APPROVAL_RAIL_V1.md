# Commercial approval rail v1 (WS3 / #714)

**Status:** v1 — manual-first commercial control package
**Issue:** [#714](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/714)
**Parent:** #711 · **Controller:** #710
**Consumers:** Lead Rescue onboarding (#715), Website Rescue onboarding (#716)
**Machine contract:** `config/commercial-approval-rail.v1.json`
**Validator:** `lib/revenue/commercial-approval.js`

<!-- COMMERCIAL_APPROVAL_RAIL_V1 -->

## 1. Purpose

Move a **qualified opportunity** to **`financially_approved = true`** (approved for onboarding/build) for:

- Lead Rescue (`lead-rescue` → onboarding product `ai-lead-rescue`);
- Website Rescue (`website-rescue`).

This rail makes it practical to prepare a commercial offer, record acceptance and payment evidence, and **prove** whether a job may proceed into onboarding.

It does **not** collect payments, send proposals, or change production.

## 2. What “financially approved” means

`financially_approved` may be `true` **only** when `canMarkFinanciallyApproved(record).ok === true`.

Mandatory evidence:

| Requirement | Blocker if missing |
|---|---|
| Valid proposal/quotation (status + version) | `MISSING_PROPOSAL` |
| Confirmed product + scope summary | `INVALID_PRODUCT` / `MISSING_SCOPE` |
| Price + currency | `MISSING_PRICE` |
| Payment terms | `MISSING_PAYMENT_TERMS` |
| Client acceptance (accepted_by + timestamp) | `MISSING_ACCEPTANCE` |
| Payment evidence **or** complete deferred-payment exception | `MISSING_PAYMENT_EVIDENCE` / `PAYMENT_EXCEPTION_INCOMPLETE` |
| Named financial approver | `MISSING_FINANCIAL_APPROVER` |
| Approval timestamp | `MISSING_APPROVAL_TIMESTAMP` |
| No unresolved commercial blockers | `UNRESOLVED_COMMERCIAL_BLOCKER` |
| Not rejected / not lost | `PROPOSAL_REJECTED` / `OPPORTUNITY_LOST` |

**Acceptance alone is insufficient. Payment evidence alone is insufficient.**

## 3. Handoff to #715 / #716

```js
import { toOnboardingHandoff } from '../lib/revenue/commercial-approval.js';

const handoff = toOnboardingHandoff(commercialRecord);
// handoff.financially_approved === true | false  (strict boolean)
// handoff.product === 'ai-lead-rescue' | 'website-rescue'
// handoff.protected_actions_executed === false
```

Sibling onboarding `canStartBuild` continues to require `record.financially_approved === true`. This rail **publishes** that boolean; it does not redesign onboarding.

## 4. Operator procedure (manual)

1. Qualified opportunity (Prospect Ops / intake — not this PR’s UI).
2. Complete **discovery / qualification summary** (`templates/DISCOVERY_QUALIFICATION_SUMMARY.md`) until `proposal_ready`.
3. Select product and commercial option (pilot vs standard; WR case type).
4. Prepare proposal from the product template (draft in repo/docs or operator files).
5. Confirm product pack completeness (`PRODUCT_PACK_COMPLETENESS_CHECKLISTS.md` / `evaluateProductPackCompleteness`).
6. Operator review (completeness, exclusions, no unsupported guarantees).
7. **Provide or copy** the proposal to the client manually (email/WhatsApp/PDF).
   **Preparing or copying a draft is not the same as “sent” in an automated system.** Record status `provided_to_client` only when the operator actually delivered it.
8. Record proposal version (`proposal_version`).
9. Record acceptance (`COMMERCIAL_ACCEPTANCE_RECORD.md`).
10. Record payment evidence **or** approved payment exception (`PAYMENT_EVIDENCE_RECORD.md`).
11. Store/link refs per `templates/COMMERCIAL_STORAGE_AND_LINKING.md` (existing systems only).
12. Run financial approval gate: `canMarkFinanciallyApproved(record)`.
13. If `ok`, mark approved-to-onboard (`financially_approved` via handoff) and set won reason.
14. Link to Lead Rescue (#715) or Website Rescue (#716) onboarding path.
15. If not won, record lost reason from the bounded vocabulary.

## 5. Won / lost vocabulary

**Won:** `accepted_standard_offer`, `accepted_pilot`, `approved_deferred_payment`, `returning_client`, `scope_reduced_and_accepted`

**Lost:** `price`, `timing`, `no_decision`, `no_response`, `competitor`, `unsuitable_scope`, `insufficient_evidence`, `client_cancelled`, `internal_capacity`, `compliance_or_risk`

Operator notes are allowed; free-form text is **not** a substitute for the vocabulary code.

## 6. Explicit non-actions

- no payment execution / bank action
- no invoice sending automation
- no external email / WhatsApp / SMS automation
- no production deploy / DNS
- no DB/schema / env/secrets
- no real client private financial data in fixtures
- no second CRM / Prospect Ops UI (#721)

## 7. Templates and pricing

| Doc | Role |
|---|---|
| `templates/DISCOVERY_QUALIFICATION_SUMMARY.md` | Discovery / qualification → proposal-ready |
| `templates/LEAD_RESCUE_PROPOSAL_TEMPLATE.md` | LR quotation/proposal |
| `templates/WEBSITE_RESCUE_PROPOSAL_TEMPLATE.md` | WR quotation/proposal |
| `templates/COMMERCIAL_ACCEPTANCE_RECORD.md` | Acceptance |
| `templates/PAYMENT_EVIDENCE_RECORD.md` | Payment / exception evidence |
| `templates/COMMERCIAL_STORAGE_AND_LINKING.md` | Where evidence lives + how refs link |
| `PRODUCT_PACK_COMPLETENESS_CHECKLISTS.md` | Shared + product pack checklists |
| `PRICING_RECOMMENDATION_PACKET.md` | Operator price bands (recommendation ≠ Anton-approved final) |
| `COMMERCIAL_APPROVAL_SYSTEM_PROOF_V1.md` | Synthetic system-gate evidence |

Existing guides remain canonical for detailed inclusions:
`docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`, `docs/sales/WEBSITE_RESCUE_PRICING_GUIDE.md`.

## 8. Fixtures

Under `fixtures/commercial-approval/`:

- `lead-rescue-accepted-approved.json`
- `website-rescue-accepted-approved.json`
- `lead-rescue-accepted-payment-pending.json`
- `lead-rescue-rejected.json`
- `website-rescue-incomplete-proposal.json`
- `lead-rescue-payment-exception-approved.json`
- `system-proof-lead-rescue.json`
- `system-proof-website-rescue.json`

## 9. System proof

Independent LR + WR commercial paths (qualification → approved-to-onboard) plus fail-closed proofs:

```bash
node --test node-tests/commercial-approval-system-proof.test.mjs
node scripts/commercial-approval-system-proof.mjs
```

Artifact: `artifacts/commercial-approval-system-proof/latest-run.json`

## 10. Change log

- **2026-08-04** — Initial rail for #714 (contract, validator, templates, tests).
- **2026-08-10** — Qualification summary, storage/linking, pack completeness checklists, system-proof runner + evidence (#714 unit/system gate closure).
