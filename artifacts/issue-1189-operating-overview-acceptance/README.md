# #1189 Operating Workspace action overview acceptance

Synthetic / fixture data only. Started from current `main` `b731411734edb01b7dbb8d7e20247c5a7805983a`.

Capture:

```bash
NEXT_PORT=3050 npx next dev --hostname 127.0.0.1 --port 3050 --webpack
NEXT_PORT=3050 node scripts/operating-overview-acceptance-1189.mjs
```

## Verdict

`OPERATING WORKSPACE ACTION OVERVIEW USABLE`

One operator-journey defect was fixed in this PR: an overview load failure previously rendered the empty “nothing needs attention” panel. It now shows **Could not load what needs attention** plus **Retry**.

## Exact route sequence (proof harness)

1. `/app/core?proof=1` — action overview
2. `/app/delivery?filter=protected_deploy_approval_required&proof=1` — Next destination (protected gates)
3. `/app/queue?filter=overdue&proof=1` — overdue prospects
4. `/app/workbench?filter=stalled&proof=1` — stalled prospects
5. `/app/clients?proof=1` — client exceptions
6. `/app/commercial?filter=needs_attention&proof=1` — commercial blockers
7. `/app/delivery?filter=blocked&proof=1` — delivery blockers
8. `/app/delivery?filter=client_review_pending&proof=1` — delivery review
9. `/app/prospects/syn-772-lr-ada?proof=1` — Ada Spa (overdue / commercial underlying record)
10. `/app/clients/cmp_pilot_client_synthetic?proof=1` — Pilot Clients Trading Co
11. `/app/prospects/syn-995-lr-prot?proof=1` — Pat Partners protected delivery
12. `/change?proof=1` — Change Console (general delivery ticket; staff session required on that surface)

## Tenant boundary

- Unauthenticated `/app/core` → Sign in to Core
- Tenant session / Tenant proof on `GET /api/app/overview` → **403** `core_access_denied`
- UI: **Core access denied** — “A Tenant session cannot enter Core.”

## Screenshots

| File | What it shows |
|------|----------------|
| `core-overview-desktop.png` | Desktop 1440×900 `/app/core?proof=1` |
| `core-overview-mobile.png` | Mobile 390×844, overflow 0px |
| `next_destination_delivery_protected.png` | Delivery protected-gate filter |
| `count_card_overview-count-*.png` | Count cards into Prospect / Client / Commercial / Delivery lists |
| `item_*.png` | Underlying records from exception rows |
| `mobile-commercial-destination.png` / `mobile-clients-destination.png` | Mobile card landings |
| `core-unauth-desktop.png` | Sign-in required |
| `core-tenant-denied-desktop.png` | Tenant fail-closed |
| `core-overview-empty.png` | True empty (0 exceptions) |
| `core-overview-error.png` | Overview error + Retry (not empty) |
| `core-overview-loading.png` | Loading Operating Workspace |
| `acceptance-evidence.json` | Machine evidence |

Counts and reasons are fixture list lengths (`data_source: fixture`). `fabricated: false`. No KPI store.
