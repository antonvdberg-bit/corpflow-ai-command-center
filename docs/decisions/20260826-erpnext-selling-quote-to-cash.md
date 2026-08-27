# ERPNext selling / quote-to-cash uses standard documents and stops at accountant posting

**Date:** 2026-08-26  
**Status:** accepted for synthetic/test ERPNext draft Quotation writes (#1056)  
**Issue:** [#1056](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1056)  
**Current-main continuation:** [#1125](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1125) — lands the proven PR #1101 slice onto current `main`. No second design.

## Context

#1054 work packet C requires a complete synthetic selling path: Lead/Opportunity → Customer → Quotation → accepted commercial record → Sales Invoice/pro-forma → payment evidence → Proceed Approved. WP1/WP2 and #882 already proved the upstream CRM records and draft commercial documents. #1055 (Company & Accounting Foundation) is still open.

## Decision

- Reuse the WP1 Frappe REST client and WP2 Lead/Opportunity/Customer. Do not build a second CRM or integration client.
- Search-before-create one synthetic MUR draft Quotation for the CF1018 Customer. Replay must update, not duplicate.
- Define acceptance as standard ERPNext Quotation submit + Comment (Sales Order optional / not required for services). Do not invent a custom acceptance engine.
- Map Sales Invoice/pro-forma to existing #882 drafts. Do not submit. Do not create a Payment Entry.
- Keep `Proceed Approved` on the #551/#714 rail. ERPNext invoice creation must not set `financially_approved`.
- If invoice posting needs accountant-approved CoA/tax/defaults, classify the packet `NOT READY — BLOCKED BY ACCOUNTANT FOUNDATION`.

## Consequences

- Positive: operators have one documented selling path and a proven CF1018 MUR quotation without duplicating commercial truth.
- Negative / follow-ups: #1055 must approve CoA, VAT/tax, and receivable/income defaults before any Sales Invoice is posted. Live Postgres persist of the quotation pointer remains a later authorized write.

## Links

- Canonical: `docs/erpnext/ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md`
- Current-main continuation: [#1125](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1125)
- Original proof PR: [#1101](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1101)
- WP2: `docs/erpnext/ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md`
- #882: `docs/erpnext/ERPNEXT_COMMERCIAL_DOCUMENTS_V1.md`
- Mapping: `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`
