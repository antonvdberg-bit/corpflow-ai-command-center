# #1201 Tenant delivery progress journey — acceptance evidence

Current-main SHA: `b731411734edb01b7dbb8d7e20247c5a7805983a`  
Environment: `corpflow_test`  
Tenant: `corpflowai`

## Fixtures

| Product | Request id | Authoritative record |
| --- | --- | --- |
| Lead Rescue | `syn_lr_delivery_corpflowai_001` | `#715` `synthetic-lr-client-review` |
| Website Rescue | `syn-1151-wr-tenant-progress` | `qualification_json.website_rescue_delivery` |

## Route sequence

1. `/app/tenant`
2. `/app/tenant?id=syn_lr_delivery_corpflowai_001`
3. `/change?from=tenant-workspace&tenant_id=corpflowai`
4. `/app/tenant?from=change&tenant_id=corpflowai`
5. `/app/tenant?id=syn-1151-wr-tenant-progress`
6. `/change?from=tenant-workspace&tenant_id=corpflowai`
7. `/app/tenant?from=change&tenant_id=corpflowai`

Staff desks (must stay inaccessible): `/app/commercial`, `/app/delivery`, `/app/prospects`.

## What the client sees (synthetic session)

| File | Viewport | What it shows |
| --- | --- | --- |
| `lr-list-desktop.png` / `lr-list-mobile.png` | 1440×900 / 390×844 | Both Lead Rescue and Website Rescue rows in Requests & Progress |
| `lr-detail-desktop.png` / `lr-detail-mobile.png` | 1440×900 / 390×844 | Lead Rescue · Ready for your review · exposed preview review · setup check view-only |
| `wr-detail-desktop.png` / `wr-detail-mobile.png` | 1440×900 / 390×844 | Website Rescue · Preview ready · Open exposed preview · no ticket approve on the WR record |
| `change-desktop.png` / `change-mobile.png` | 1440×900 / 390×844 | Canonical `/change` continuity banner; no Core/admin entry |
| `return-desktop.png` / `return-mobile.png` | 1440×900 / 390×844 | Return to Tenant Workspace — tenant identity unchanged |
| `empty-desktop.png` | 1440×900 | True empty: no work yet, not complete |
| `list-error-desktop.png` / `list-error-mobile.png` | 1440×900 / 390×844 | List-load failure is an error, not empty/complete |
| `commercial-denied-desktop.png` | 1440×900 | Tenant session cannot open Commercial |
| `delivery-denied-desktop.png` | 1440×900 | Tenant session cannot open Delivery |
| `prospects-denied-desktop.png` | 1440×900 | Tenant session cannot open Prospect Operations |
| `live-core-tenant-unauth-desktop.png` | 1440×900 | Live `core.corpflowai.com/app/tenant` sign-in (proof harness off on Production) |
| `live-lux-tenant-unauth-mobile.png` | 390×844 | Live `lux.corpflowai.com/app/tenant` sign-in |
| `live-change-from-tenant-desktop.png` | 1440×900 | Live `/change?from=tenant-workspace` continuity banner |
| `probe.json` | n/a | In-process expected vs actual |
| `live-unauth.json` | n/a | Live unauthenticated GET evidence |

## One client-journey blocker fixed in this packet

A failed Requests & Progress load previously also showed the empty “no authorised requests yet” panel. A client could read that as “nothing to do / complete.” The list-error panel now says the load failed and **does not mean the work is complete**.

## Live note

Vercel Production spine is serving `b731411734edb01b7dbb8d7e20247c5a7805983a`. Proof mode is off on Production, so the authenticated synthetic journey is local. Live unauthenticated `/app/tenant` is tenant sign-in only (no Choose workspace, no false completion).

## Verdict

`TENANT DELIVERY PROGRESS JOURNEY USABLE`
