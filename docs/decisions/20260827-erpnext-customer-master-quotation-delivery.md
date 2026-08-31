# ERPNext Customer / Contact master is ready for quotation and delivery

**Date:** 2026-08-28 (current-main re-land; original GET 2026-08-27 on closed PR #1211)
**Status:** accepted for GET/read-only acceptance (#1206)
**Issue:** [#1206](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1206)

## Context

Merged Client Master, Customer bridge, sales-lifecycle, Quote-to-Cash, Commercial quotation evidence, Operating Workspace continuity, and buyer-naming packets already exist on current `main`. Closed PR #1211 proved the Customer/Contact/Address path once, then `main` moved. This packet re-lands that acceptance without writing ERPNext or inventing a second customer ledger.

## Decision

- GET the recorded CF1018 Customer / Contact / Address names from exact current `main` (`eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751`). Do not create or update.
- Treat search-before-create duplicate count 1 as the idempotency evidence.
- Keep CorpFlowAI to ERPNext **names** on `qualification_json.erpnext`.
- Project that already-recorded Prospect pointer onto Commercial Workspace.
- Do not join Company Master legal names to ERPNext Customers.
- Do not revive closed PR #1211.

## Consequences

- Positive: quotation and delivery can reference one synthetic customer identity on current `main`.
- Negative / follow-ups: live Postgres persist of the pointer, real Prestige Customer, and send remain separately gated.

## Links

- Canonical: `docs/erpnext/ERPNEXT_CUSTOMER_MASTER_QUOTATION_DELIVERY_ACCEPTANCE_V1.md`
- Live GET log: `artifacts/erpnext/customer-master-acceptance-1206/accept-log.json`
