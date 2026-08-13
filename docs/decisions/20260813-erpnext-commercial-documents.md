# ERPNext commercial documents — standard first (#882)

**Date:** 2026-08-13  
**Status:** accepted for sandbox/test proof; READY blocked on **one** Currency Exchange USD→MUR rate  
**Issue:** [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882)  
**Prerequisite cleared:** [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881) / PR #915 — Standard Selling USD + canonical Item Prices live

## Context

CorpFlowAI needs paying-client quotations/invoices from ERPNext Customer + Item masters, including MUR and USD, without duplicating commercial data and without custom DocTypes. Company base currency is MUR. Legal identifiers are already on Company (`tax_id=28466939`, `registration_details` contains `C25228280`).

## Decision

Use **standard** ERPNext only: Quotation, Sales Invoice (draft), Letter Head, Terms and Conditions, Print Format Standard, Price List / Item Price from #881. Keep the #714 financial approval-to-build gate **outside** ERPNext.

Do **not** create a Currency Exchange row with an invented rate. `allow_stale=1` would reuse it. USD Sales Invoice already fail-closes (HTTP 417) when the row is missing; that is the correct accounting-truth behaviour.

## Consequences

- Positive: MUR quote/invoice path proven from #880/#881 masters with Item Prices; USD quotation binds Standard Selling USD Item Prices; PDFs carry finance@ identity and legal IDs in Terms.
- Negative / follow-ups: USD documents currently default `conversion_rate=1.0` and must not be submitted until an Anton-approved USD→MUR Currency Exchange exists. USD Sales Invoice create correctly rejects without that row.
- Custom Print Designer remains a separate proposal only if standard output is rejected on presentation grounds.
- Do **not** re-request the #881 Item Price / Price List permission — that grant is complete.

## Links

- `docs/erpnext/ERPNEXT_COMMERCIAL_DOCUMENTS_V1.md`
- `config/erpnext-commercial-documents.v1.json`
- `docs/erpnext/ERPNEXT_PRODUCT_CATALOGUE_V1.md`
- `docs/revenue/COMMERCIAL_APPROVAL_RAIL_V1.md`
