# #1056 selling / quote-to-cash evidence (synthetic)

Hosted ERPNext test, 2026-08-26. Draft Quotation only. Do not send. Do not submit a Sales Invoice. Do not create a Payment Entry.

| File | What it shows |
| --- | --- |
| `apply-log.json` | Auth as `integrations@corpflowai.com`. CREATE then UPDATE `SAL-QTN-2026-00005`. Duplicate count 1. No secrets. |
| `cf1018-mur-SAL-QTN-2026-00005.pdf` | Standard Quotation PDF (36,114 bytes, Quotation Standard). |

Canonical write-up: `docs/erpnext/ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md`.

**Verdict: NOT READY — BLOCKED BY ACCOUNTANT FOUNDATION** (selling quotation path proven; posting waits on #1055).
