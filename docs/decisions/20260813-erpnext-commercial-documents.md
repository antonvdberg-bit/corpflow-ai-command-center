# ERPNext commercial documents — standard first (#882)

**Date:** 2026-08-13  
**Status:** accepted — **READY** on hosted ERPNext synthetic proof  
**Issue:** [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882)  
**Prerequisite cleared:** [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881) / PR #915; Anton Currency Exchange USD→MUR **47.15**

## Context

CorpFlowAI needs paying-client quotations/invoices from ERPNext Customer + Item masters, including MUR and USD, without duplicating commercial data and without custom DocTypes. Company base currency is MUR.

## Decision

Use **standard** ERPNext only: Quotation, Sales Invoice (draft), Letter Head, Terms and Conditions, Print Format Standard, Price List / Item Price, Currency Exchange, and a USD Receivable account (`Debtors USD - CFAI`) for foreign-currency invoices. Keep the #714 financial approval-to-build gate **outside** ERPNext.

## Consequences

- Positive: MUR and USD quote + draft invoice paths proven; PDFs carry finance@ identity and legal IDs; USD `conversion_rate=47.15` and `base_grand_total` are accounting-consistent with Anton's FX row.
- Follow-ups: do not submit/send synthetic drafts; Prestige / live client quotes still need separate commercial decisions; Letter Head write/logo remain optional polish.

## Links

- `docs/erpnext/ERPNEXT_COMMERCIAL_DOCUMENTS_V1.md`
- `config/erpnext-commercial-documents.v1.json`
- `docs/erpnext/ERPNEXT_PRODUCT_CATALOGUE_V1.md`
- `docs/revenue/COMMERCIAL_APPROVAL_RAIL_V1.md`
