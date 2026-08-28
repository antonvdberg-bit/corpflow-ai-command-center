# #1201 Tenant delivery progress journey — acceptance evidence

Current-main SHA exercised: `be671871f2bc2b5c7545d5379ff2be2caf2284d5`  
PR head: this branch. Environment: `corpflow_test`.

## Fixtures

| Kind | Identifier |
| --- | --- |
| Tenant | `corpflowai` |
| Lead Rescue request | `syn_lr_delivery_corpflowai_001` |
| Lead Rescue delivery record | `synthetic-lr-client-review` |
| Website Rescue request | `syn-1151-wr-tenant-progress` |

## Route sequence

`/app/tenant` → `/app/tenant?id=syn_lr_delivery_corpflowai_001` → `/change?from=tenant-workspace&tenant_id=corpflowai` → `/app/tenant?from=change&tenant_id=corpflowai` → `/app/tenant?id=syn-1151-wr-tenant-progress` → `/change` → return.

## What the screenshots show

- `lr-list-*` — Lead Rescue and Website Rescue rows with service name, stage, next action.
- `lr-detail-*` — Lead Rescue · Ready for your review · preview **Review open**; setup check view-only.
- `wr-detail-*` — Website Rescue · Preview ready · exposed preview link, view-only; Service & change CTA.
- `change-*` — Continuity banner: still in the CorpFlowAI tenant journey; opening `/change` does not create a ticket.
- `return-*` — Back in Tenant Workspace — CorpFlowAI; tenant chip unchanged.
- `empty-desktop.png` — Genuine empty list: “no authorised requests yet”, not completion.
- `list-error-*` — Failed load is an error + Retry; copy says this does **not** mean work is complete.
- `*-denied-desktop.png` — Tenant session cannot open Commercial / Delivery / Prospects.
- `live-*` — Live unauthenticated Tenant sign-in on `core` and `lux`, and live `/change` continuity.

Authenticated synthetic journey is local (proof harness is off on the live Production spine). Live unauthenticated Tenant sign-in and `/change` continuity are already on the spine serving current `main`.

## Verdict

`TENANT DELIVERY PROGRESS JOURNEY USABLE`
