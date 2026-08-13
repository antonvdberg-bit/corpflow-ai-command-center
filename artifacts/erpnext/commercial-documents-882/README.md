# #882 commercial-document evidence (synthetic)

Hosted ERPNext test, 2026-08-13. All documents `docstatus=0`. Do not send.

| File | What it shows |
| --- | --- |
| `lead-rescue-usd-SAL-QTN-2026-00001.pdf` (+ `*-p1.png` / `*-p2.png`) | Synthetic Lead Rescue quotation from Customer + Items `LR-SETUP-USD-150` / `LR-REC-USD-99`. USD 249. **`conversion_rate=1.0` is not accounting truth — do not submit.** |
| `website-rescue-mur-SAL-QTN-2026-00003.pdf` (+ pages) | Synthetic Website Rescue quotation: `CF880 Synthetic Website Rescue Ltd` + `CF-RD-LANDING-RESCUE` MUR 45,000. Paying-client-shaped standard PDF with terms. |
| `website-rescue-invoice-draft-ACC-SINV-2026-00001.pdf` (+ pages) | Matching MUR Sales Invoice **draft** (not submitted). Pro-forma/invoice route using the same masters. |
| `pdf-text-extract.txt` | Text of the PDFs: Tax ID `28466939`, Company No `C25228280`, `finance@corpflowai.com`, #714 wording. |
| `apply-log.json` | Sanitized HTTP evidence (Company identity PUT, Terms create, USD invoice HTTP 417). No secrets, no host URL. |

Canonical write-up: `docs/erpnext/ERPNEXT_COMMERCIAL_DOCUMENTS_V1.md`.
