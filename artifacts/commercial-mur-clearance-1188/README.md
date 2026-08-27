# #1188 Commercial journey evidence

Operator path from the already-recorded synthetic MUR ERPNext Quotation to the existing #551/#714 financial-clearance decision.

- Current `main` SHA: `b731411734edb01b7dbb8d7e20247c5a7805983a`
- Quotation: `SAL-QTN-2026-00005` (MUR 45,000, Draft)
- Prospect / Commercial id: `cf1018-synthetic-sales-lifecycle`

## Route sequence

1. `/app/commercial?proof=1&filter=all`
2. `/app/commercial/cf1018-synthetic-sales-lifecycle?proof=1`
3. `/app/prospects/cf1018-synthetic-sales-lifecycle?proof=1`

## Screenshots

| File | Viewport | What it shows |
|------|----------|----------------|
| `commercial-desktop.png` | 1440×900 | CF1018 row with `SAL-QTN-2026-00005`, awaiting acceptance |
| `commercial-mobile.png` | 390×844 | same Commercial list |
| `quotation-desktop.png` | 1440×900 | Draft MUR 45,000 evidence + PDF control |
| `quotation-mobile.png` | 390×844 | same quotation evidence |
| `clearance-desktop.png` | 1440×900 | `NOT CLEARED` and exact missing #714 evidence |
| `clearance-mobile.png` | 390×844 | same clearance panel |

Machine-readable copy: `evidence.json`.

Proof harness only. No ERPNext write, no Sales Invoice, no payment, no Postgres mutation.
