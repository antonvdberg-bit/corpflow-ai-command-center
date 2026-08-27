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

Staff Delivery summary (`/app/delivery`, #1005) reads the same boolean. It does not infer quotation, acceptance, payment evidence, or financial-approver clearance, and it does not keep a second commercial ledger.

## 4. Operator procedure (manual)

Canonical operator surface: **`/app/prospects/[id]`** commercial clearance panel (#551). Proof harness: `/app/prospects/syn-772-lr-ada?proof=1`.

1. Qualified opportunity (Prospect Ops / intake).
2. Select product and commercial option (pilot vs standard; WR case type).
3. Prepare proposal from the product template (draft in repo/docs or operator files).
4. Operator review (completeness, exclusions, no unsupported guarantees).
5. **Provide or copy** the proposal to the client manually (email/WhatsApp/PDF).  
   **Preparing or copying a draft is not the same as “sent” in an automated system.** Record status `provided_to_client` only when the operator actually delivered it.
6. Record the ERPNext quotation / pro-forma name (`erpnext_quotation`, also stored as `proposal_version`).
7. Record acceptance on the same Prospect detail panel (`COMMERCIAL_ACCEPTANCE_RECORD.md` remains the paper template).
8. Record payment evidence **or** approved payment exception (reference only — no bank secrets).
9. Tick **Record financial approval now**. The #714 gate still decides `financially_approved`; incomplete evidence stays **NOT CLEARED**.
10. If the panel shows **CLEARED TO BUILD**, delivery/onboarding may proceed (#715 / #716).
11. If not won, record lost reason from the bounded vocabulary.

Storage: existing `leads.qualification_json.commercial_approval`. No new table.

ERPNext Quotation / Sales Invoice names are **references**. ERPNext never sets `financially_approved`.

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
| `templates/LEAD_RESCUE_PROPOSAL_TEMPLATE.md` | LR quotation/proposal |
| `templates/WEBSITE_RESCUE_PROPOSAL_TEMPLATE.md` | WR quotation/proposal |
| `templates/COMMERCIAL_ACCEPTANCE_RECORD.md` | Acceptance |
| `templates/PAYMENT_EVIDENCE_RECORD.md` | Payment / exception evidence |
| `PRICING_RECOMMENDATION_PACKET.md` | Operator price bands (recommendation ≠ Anton-approved final) |

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

## 9. Change log

- **2026-08-24** — #551: operator records the rail on existing Prospect detail (`/app/prospects/[id]`), stored in `qualification_json.commercial_approval`. ERPNext names remain references. No payment execution.
- **2026-08-13** — #882: ERPNext Quotation/Sales Invoice names may fill `proposal_version`; they never set `financially_approved`. See `docs/erpnext/ERPNEXT_COMMERCIAL_DOCUMENTS_V1.md`.
- **2026-08-04** — Initial rail for #714 (contract, validator, templates, tests).
