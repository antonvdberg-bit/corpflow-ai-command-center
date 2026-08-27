# ERPNext Customer / Contact master is ready for quotation and delivery

**Date:** 2026-08-27  
**Status:** accepted for GET/read-only acceptance (#1206)  
**Issue:** [#1206](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1206)

## Context

Merged Client Master, Customer bridge, sales-lifecycle, and Quote-to-Cash packets already created synthetic Customer / Contact / Address records. This packet had to prove those records are operationally usable for quotation and delivery without writing ERPNext or inventing a second customer ledger.

## Decision

- GET the recorded CF1018 Customer / Contact / Address names. Do not create or update.
- Treat search-before-create duplicate count 1 as the idempotency evidence.
- Keep CorpFlowAI to ERPNext **names** on `qualification_json.erpnext`.
- Project that already-recorded Prospect pointer onto Commercial Workspace.
- Do not join Company Master legal names to ERPNext Customers.

## Consequences

- Positive: quotation and delivery can reference one synthetic customer identity.
- Negative / follow-ups: live Postgres persist of the pointer, real Prestige Customer, and send remain separately gated.

## Links

- Canonical: `docs/erpnext/ERPNEXT_CUSTOMER_MASTER_QUOTATION_DELIVERY_ACCEPTANCE_V1.md`
- Live GET log: `artifacts/erpnext/customer-master-acceptance-1206/accept-log.json`
