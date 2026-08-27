# #1196 MUR quotation client-document evidence (synthetic, GET-only)

Hosted ERPNext test, 2026-08-27. Reused `SAL-QTN-2026-00005`. Do not send. Do not write.

| File | What it shows |
| --- | --- |
| `accept-log.json` | Auth as `integrations@corpflowai.com`. GET Company/Quotation/Terms/Item. Duplicate count 1. `quotation.terms` empty. No secrets. |
| `cf1018-mur-SAL-QTN-2026-00005.pdf` | Live print, identical to the 2026-08-26 artefact (36,114 bytes, sha256 prefix `299ad3c9d8c4582a`). |
| `pdf-text-extract.txt` | One-page extract: identity/amount/validity present; Terms/Assumptions/Exclusions absent. |

Canonical write-up: `docs/erpnext/ERPNEXT_MUR_QUOTATION_CLIENT_DOCUMENT_V1.md`.

**Verdict: NOT READY — quotation.terms empty on SAL-QTN-2026-00005 (Quotation Standard PDF omits CF882 terms/seller identity).**
