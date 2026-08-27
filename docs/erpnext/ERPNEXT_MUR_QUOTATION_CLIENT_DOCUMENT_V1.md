# ERPNext MUR quotation client-document acceptance v1

**Status:** Live GET/read-only acceptance on hosted ERPNext. **No ERPNext write. No Sales Invoice. No send.**  
**Issue:** [#1196](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1196)  
**Reuse:** [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882) commercial documents; [#1056](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1056) / [#1166](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1166) selling quotation `SAL-QTN-2026-00005`  
**Environment:** `corpflow_test` + hosted ERPNext GET/read-only. Not `client_production`.  
**Machine contract:** `config/erpnext-selling-quote-to-cash.v1.json` + `config/erpnext-commercial-documents.v1.json`  
**Accept:** `node scripts/erpnext/accept-mur-quotation-client-document.mjs`  
**Evidence:** `artifacts/erpnext/mur-quotation-client-document-1196/`

**Anchor:** `<!-- ERPNEXT_MUR_QUOTATION_CLIENT_DOCUMENT_V1 -->`

<!-- ERPNEXT_MUR_QUOTATION_CLIENT_DOCUMENT_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1196
```

## Verdict

```text
NOT READY — quotation.terms empty on SAL-QTN-2026-00005 (Quotation Standard PDF omits CF882 terms/seller identity)
```

The synthetic MUR quotation is **not** commercially presentable as a client document yet. Company identity, MUR 45,000, Website Rescue line description, validity date, and idempotent reuse are proven by GET. The printable PDF is still a **one-page** draft that does not print the approved CF882 terms, assumptions, exclusions, Tax ID, Company No, or `finance@corpflowai.com`.

This packet does **not** stamp terms onto the live quotation. REST create with `tc_name` alone does not copy the Terms and Conditions body. Stamping `terms` remains an ERPNext write, which #1196 forbids.

## Required return

```text
Quotation: SAL-QTN-2026-00005
Current main: b731411734edb01b7dbb8d7e20247c5a7805983a
PDF: Quotation Standard, 36,114 bytes, sha256 prefix 299ad3c9d8c4582a, identical to the 2026-08-26 #1056 artefact
Read-only: GET Company / Quotation / Terms / Item / list / print PDF; duplicate keyed quotations = 1; no create/update
Idempotency: existing title key corpflow.selling_q2c.v1:lead=cf1018-synthetic-sales-lifecycle still unique
Verdict: NOT READY — quotation.terms empty on SAL-QTN-2026-00005 (Quotation Standard PDF omits CF882 terms/seller identity)
```

## Live GET (2026-08-27 UTC)

Ran as `integrations@corpflowai.com`. Secret values not printed. Postgres not written.

| Check | Result |
| --- | --- |
| Auth | HTTP 200, `integrations@corpflowai.com` |
| Company | Tax ID `28466939`, Company No `C25228280`, MUR, `finance@corpflowai.com` |
| Quotation | `SAL-QTN-2026-00005`, Draft `docstatus=0`, MUR 45,000, conversion_rate 1, valid till 2026-09-09 |
| Line | `CF-RD-LANDING-RESCUE` / Premium Landing Page Rescue + catalogue commercial description |
| `tc_name` | `CF882 CorpFlowAI Commercial Terms` |
| `quotation.terms` | **empty** |
| Terms master | GET HTTP 200; body includes Validity, Scope, Assumptions, Exclusions, seller identity |
| Contrast | `SAL-QTN-2026-00003` and `SAL-QTN-2026-00001` have terms body length 2106 |
| Duplicate keyed quotations | **1** |
| PDF | 36,114 bytes, `%PDF-1.4`, sha256 prefix `299ad3c9d8c4582a` (unchanged since 2026-08-26) |
| Taxes / payment / acceptance | none invented; tax template empty; status remains Draft |

## What this packet fixed without ERPNext mutation

REST create of the #1056 quotation set `tc_name` but not `terms`. The approved CF882 HTML now lives in `config/erpnext-commercial-documents.v1.json` `print.terms_html`. Future authorized selling apply payloads include that body, and `terms` is an allowed quotation update field. This packet does **not** PUT the live row.

Bounded Commercial Workspace evidence now surfaces valid-till, item, description, and whether the terms body is present, so operators can see this blocker without a second ledger.

## Explicit non-actions

No ERPNext write. No Sales Invoice submit. No tax/accounting mutation. No payment. No send. No env/secrets. No schema. No new billing model.

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES — payload/terms HTML + GET-only acceptance harness
- Merged to main: NO
- Production deployment ID: n/a — ERPNext sandbox/test read; no Vercel customer surface
- Commit deployed: n/a until merge
- Live URLs tested: hosted ERPNext Frappe REST GET + print PDF (URL not recorded)
- Expected vs actual result: identity/amount/line/validity proven; printable terms/seller identity missing because quotation.terms is empty
- Client-facing flow usable: NO — synthetic draft; PDF not client-presentable; no external send
- Final verdict: PARTIAL — inspection complete; live quotation NOT READY for client document use
```
