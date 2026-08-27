# #1176 Operating Workspace journey screenshots

Synthetic / fixture data only — Ada Lead Rescue (`syn-772-lr-ada`) and related Company Master `cmp_ada_spa_synthetic`. No real client data.

Current-main started from: `b731411734edb01b7dbb8d7e20247c5a7805983a`

## Route sequence

| Step | Route | Viewport files |
|------|--------|----------------|
| 1 Overview | `/app/core?proof=1` | `01-overview-desktop.png` · `01-overview-mobile.png` |
| 2 Prospect | `/app/prospects/syn-772-lr-ada?proof=1` | `02-prospect-desktop.png` · `02-prospect-mobile.png` |
| 3 Client | `/app/clients/cmp_ada_spa_synthetic?proof=1` | `03-client-desktop.png` · `03-client-mobile.png` |
| 4 Commercial | `/app/commercial?proof=1&filter=all` | `04-commercial-desktop.png` · `04-commercial-mobile.png` |
| 5 Quotation evidence | `/app/commercial/syn-772-lr-ada?proof=1` | `05-quotation-desktop.png` · `05-quotation-mobile.png` |
| 6 Delivery | `/app/delivery?proof=1&filter=all` | `06-delivery-desktop.png` · `06-delivery-mobile.png` |
| 7 Tenant fail-closed | `/app/tenant?proof=1` | `07-tenant-fail-closed-desktop.png` · `07-tenant-fail-closed-mobile.png` |

Desktop 1440×900. Mobile 390×844.

## Capture

```bash
npx next dev --webpack -p 3000
NEXT_ORIGIN=http://127.0.0.1:3000 node scripts/issue-1176-local-proof-proxy.mjs
JOURNEY_SHA=$(git rev-parse HEAD) node scripts/issue-1176-capture-journey.mjs
```

The proxy exists because Vercel rewrites `/api/*` to `api/factory_router.js`; local `next dev` does not. It does not change production routing.

## Continuity observed

- Ada owner stays `anton` on Prospect, Client, Commercial, and Delivery.
- Prospect blocker / next action: overdue “Book discovery”.
- Commercial quotation `SAL-QTN-2026-00001` opens the existing evidence surface.
- Delivery evidence links return to shared prospect / client / Change Console.
- Tenant Workspace has Requests & Progress + Service & change only — no staff Overview / Commercial / Delivery nav.
