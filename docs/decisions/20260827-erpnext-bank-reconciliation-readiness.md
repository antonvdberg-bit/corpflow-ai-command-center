# ERPNext bank / reconciliation readiness — manual/import-first (#1139)

**Date:** 2026-08-27  
**Status:** accepted (packet F operating model; posting still gated)  
**Issue:** [#1139](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1139)

## Context

CorpFlowAI needs a minimum bank/reconciliation path for ERPNext onboarding without creating live bank or accounting truth while the accountant Chart of Accounts (#1055) is still pending.

## Decision

Use **standard ERPNext only**, **manual/import-first**:

- Operator collects payment evidence (#551 / #714). That rail is a **build gate**, not Payment Entry authority.
- Later accountant-approved Payment Entry posting waits on #1055 bank/cash ledgers plus exact Anton approval.
- Bank statements enter via CSV/Excel import or manual Bank Transaction capture. Direct bank-feed is **NOT REQUIRED** for initial operation.
- Prove matching with an **offline synthetic** reuse of Phase C arithmetic. Do not manufacture a live bank transaction to pass a test.
- Record Bank Account / GL presence only. Never store private numbering or credentials in GitHub.

## Consequences

- Positive: onboarding can proceed without guessing CoA or connecting a bank.
- Negative / follow-ups: real Bank Account configuration, Payment Entry submit, redacted-real statement UI cycle (HB-4), and opening balances remain protected.

## Links

- Canonical: `docs/erpnext/ERPNEXT_BANK_RECONCILIATION_READINESS_V1.md`
- Runbook: `docs/runbooks/ERPNEXT_BANK_RECONCILIATION_OPERATOR_RUNBOOK_V1.md`
- Helper: `lib/erpnext/bank-reconciliation-readiness.js`
