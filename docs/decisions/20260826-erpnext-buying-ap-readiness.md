# ERPNext Buying / AP readiness uses standard DocTypes only

**Date:** 2026-08-26  
**Status:** accepted for the bounded onboarding D packet (#1098)  
**Issue:** [#1098](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1098)

## Context

CorpFlowAI needs a payable path for operating suppliers (hosting, software, licences, professional fees) without a second procurement system and without inventing accounting policy. Packet D may map and prove standard capability now; accounting-bearing configuration waits on [#1055](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1055).

## Decision

- **ERPNext Supplier + Purchase Invoice** is the Buying/AP path. CorpFlowAI does not grow a second supplier ledger.
- **Purchase Order is deferred** for initial operations (`po_required = No`; invoice-first opex).
- **Invoice existence never authorizes payment.** Payment Entry stays a separate protected action.
- **AI cannot approve suppliers.** Anton approves real suppliers.
- Standard ERPNext only. No custom DocType. Tax ID and VAT templates stay blank/unused until the accountant writes.

## Consequences

- Positive: a bounded operator runbook exists before books are posted.
- Follow-ups: Anton Role Permissions Manager grant so the integration identity can create Supplier; accountant answers on payable, expense structure, VAT, cost centre; no PI submit until then.

## Links

- Canonical: `docs/erpnext/ERPNEXT_BUYING_AP_READINESS_V1.md`
- Runbook: `docs/runbooks/ERPNEXT_BUYING_AP_OPERATOR_RUNBOOK_V1.md`
- Strategy: `docs/governance/erpnext/VISION_AND_INTENDED_USE.md`
