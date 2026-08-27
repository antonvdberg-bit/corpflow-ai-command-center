# #1149 Current-main application journey — evidence

Current `main` SHA: `70dadee1034a283b3f8241b3f647e0679df31b4c`  
Production GitHub deployment: `6117822038` (success)  
Environment: `corpflow_test`  
Verdict: **CORPFLOWAI CURRENT-MAIN APPLICATION JOURNEY USABLE**

No application defect blocked the coherent journey. This packet is runtime/user-journey evidence only. No schema, env, deploy, send, or second tenant/client model.

## Live corpflow_test (unauthenticated + fail-closed)

| File | Viewport | What it shows |
| --- | --- | --- |
| `live-tenant-unauth-desktop.png` | 1440×900 | Tenant sign-in only. No Choose workspace, no proof harness |
| `live-tenant-unauth-mobile.png` | 390×844 | Same tenant sign-in wraps |
| `live-commercial-unauth-desktop.png` | 1440×900 | Commercial is staff-only; Operating Workspace sign-in |
| `live-commercial-unauth-mobile.png` | 390×844 | Same staff gate wraps |
| `live-delivery-unauth-desktop.png` | 1440×900 | Delivery is staff-only; Operating Workspace sign-in |
| `live-delivery-unauth-mobile.png` | 390×844 | Same staff gate wraps |
| `live-chooser-desktop.png` | 1440×900 | Staff `/app` chooser still exists |
| `live-chooser-mobile.png` | 390×844 | Chooser wraps |
| `live-change-handoff-desktop.png` | 1440×900 | `/change?from=tenant-workspace` continuity banner; canonical service surface |
| `live-change-handoff-mobile.png` | 390×844 | Same handoff wraps |
| `live-lux-change-desktop.png` | 1440×900 | `https://lux.corpflowai.com/change` 200 |
| `live-proof-rejected-desktop.png` | 1440×900 | Production `?proof=1` still requires Tenant sign-in |

## Local proof fixtures (existing synthetic identities only)

| File | Viewport | What it shows |
| --- | --- | --- |
| `local-tenant-session-desktop.png` | 1440×900 | Requests & Progress, exposed Landing copy review, Internal wiring view-only |
| `local-tenant-session-mobile.png` | 390×844 | Same tenant journey; page overflow 0px |
| `local-commercial-session-desktop.png` | 1440×900 | Staff Commercial over Ada Spa / Wren Workshop existing records |
| `local-commercial-session-mobile.png` | 390×844 | Same Commercial; page overflow 0px |
| `local-delivery-session-desktop.png` | 1440×900 | Staff Delivery with Change / Clients / prospect evidence links |
| `local-delivery-session-mobile.png` | 390×844 | Same Delivery; page overflow 0px |
| `local-change-handoff-desktop.png` | 1440×900 | Service & change continuity |
| `local-change-handoff-mobile.png` | 390×844 | Same handoff |
| `local-tenant-return-desktop.png` | 1440×900 | Return to Tenant Workspace; identity unchanged |
| `local-clients-session-desktop.png` | 1440×900 | Clients summary links Commercial, Delivery, Change |

## Authenticated live boundary

Production (`VERCEL_ENV=production`) rejects `?proof=1` with `401 authentication_required`. This runner has no existing safe Tenant/Core session cookie. Credentials were not invented. Authenticated live exercise remains: operator signs in with an already-provisioned test identity.

Exact corpflow_test URLs:

- `https://core.corpflowai.com/app/tenant`
- `https://core.corpflowai.com/change?from=tenant-workspace`
- `https://core.corpflowai.com/app/commercial`
- `https://core.corpflowai.com/app/delivery`
- `https://lux.corpflowai.com/change`
