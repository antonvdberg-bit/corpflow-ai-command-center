# #1201 Tenant delivery progress journey evidence

Fresh Generation-4 capture on current `main` `eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751`. Synthetic tenant `corpflowai` only. No production data write.

Route: `/app/tenant` → Lead Rescue `syn_lr_delivery_corpflowai_001` → `/change?from=tenant-workspace&tenant_id=corpflowai` → `/app/tenant?from=change&tenant_id=corpflowai` → Website Rescue `syn-1151-wr-tenant-progress` → `/change` → return.

| File | What it shows |
| --- | --- |
| `lr-list-desktop.png` / `lr-list-mobile.png` | Both launch products listed with stage and next action · 1440×900 / 390×844 |
| `lr-detail-desktop.png` / `lr-detail-mobile.png` | Lead Rescue · Ready for your review · exposed preview review |
| `wr-detail-desktop.png` / `wr-detail-mobile.png` | Website Rescue · Preview ready · exposed preview link, view-only |
| `change-desktop.png` / `change-mobile.png` | Continuity banner; opening `/change` does not create a ticket |
| `return-desktop.png` / `return-mobile.png` | Return with Tenant · CorpFlowAI identity unchanged |
| `empty-desktop.png` | True empty list: “no authorised requests yet”, not completion |
| `list-error-desktop.png` / `list-error-mobile.png` | Failed load: retry/error panel, not the empty/no-work panel |
| `commercial-denied-desktop.png` | Tenant 403 on Commercial |
| `delivery-denied-desktop.png` | Tenant 403 on Delivery |
| `prospects-denied-desktop.png` | Tenant 403 on Prospect Operations |
| `live-core-tenant-unauth-desktop.png` | Live `https://core.corpflowai.com/app/tenant` sign-in only |
| `live-lux-tenant-unauth-mobile.png` | Live `https://lux.corpflowai.com/app/tenant` sign-in only |
| `live-change-from-tenant-desktop.png` | Live `/change?from=tenant-workspace` continuity banner |
| `probe.json` | In-process fixture probe; verdict `TENANT DELIVERY PROGRESS JOURNEY USABLE` |
| `live-unauth.json` | Live GET statuses |

Authenticated synthetic journey is local (`next start` + proof handlers). Proof harness is off on Vercel Production. Live unauthenticated Tenant sign-in and `/change` continuity are already on the Production spine serving current `main`.
