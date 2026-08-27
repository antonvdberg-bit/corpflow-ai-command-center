# ERPNext MUR quotation client-document acceptance is GET-only and stops on empty terms

**Date:** 2026-08-27  
**Status:** accepted for #1196 inspection; live quotation remains not client-document ready  
**Issue:** [#1196](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1196)

## Context

#882 proved standard Quotation PDFs for MUR `SAL-QTN-2026-00003` with CF882 terms printed. #1056/#1166 reused that terms **name** on `SAL-QTN-2026-00005` but created the row via REST with `tc_name` only.

## Decision

- Reuse `SAL-QTN-2026-00005`. GET/read-only only. Do not create a second quotation.
- Treat empty `quotation.terms` as the one document-quality blocker. Standard print does not fetch the Terms master body when the document field is empty.
- Record the approved CF882 HTML in repo config so a later **authorized** selling apply can stamp `terms`. Do not PUT the live row from this packet.
- Do not invent tax, payment, or acceptance status. Do not submit or send.

## Consequences

- Positive: operators have a durable GET-only acceptance harness and a precise blocker.
- Negative / follow-up: an authorized ERPNext update (or Desk reload of terms) is required before the PDF is client-presentable. Accountant posting remains #1055.

## Links

- Canonical: `docs/erpnext/ERPNEXT_MUR_QUOTATION_CLIENT_DOCUMENT_V1.md`
- #882: `docs/erpnext/ERPNEXT_COMMERCIAL_DOCUMENTS_V1.md`
- Selling path: `docs/erpnext/ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md`
