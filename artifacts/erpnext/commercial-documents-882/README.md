# #882 commercial-document evidence (synthetic)

Hosted ERPNext test, finalized 2026-08-13 after Anton added Currency Exchange **USD→MUR = 47.15**. All documents `docstatus=0`. Do not send.

| File | What it shows |
| --- | --- |
| `lead-rescue-usd-SAL-QTN-2026-00001.pdf` (+ pages) | USD Lead Rescue quotation on **Standard Selling USD** Item Prices 150+99. `conversion_rate=47.15` from Currency Exchange. Base MUR 11,740. |
| `lead-rescue-usd-invoice-draft-ACC-SINV-2026-00002.pdf` (+ pages) | Matching USD Sales Invoice **draft** on `Debtors USD - CFAI`, same FX/rates. Not submitted. |
| `website-rescue-mur-SAL-QTN-2026-00003.pdf` (+ pages) | MUR Website Rescue quotation from Item Price 45,000. |
| `website-rescue-invoice-draft-ACC-SINV-2026-00001.pdf` (+ pages) | Matching MUR Sales Invoice draft. |
| `pdf-text-extract.txt` | Tax ID `28466939`, Company No `C25228280`, `finance@corpflowai.com`, #714 wording. |
| `apply-log.json` / `fx-reprove-summary.json` | Sanitized HTTP evidence. No secrets. |

Canonical write-up: `docs/erpnext/ERPNEXT_COMMERCIAL_DOCUMENTS_V1.md`.

**Verdict: ERPNext Commercial Documents READY** (synthetic drafts only; no client send; no submit).
