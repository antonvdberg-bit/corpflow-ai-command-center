# Operating Workspace cross-view evidence (#1219)

Proof harness / in-process handler evidence for staff continuity:

`/app/core` → `/app/queue` → `/app/clients/[id]` → `/app/commercial` → `/app/delivery` → canonical next action

## Files

- `probe.json` — route/identifier matrix, tenant fail-closed, failed-load panel kind
- `live-unauth.json` — corpflow_test unauthenticated GETs
- Desktop 1440×900 / mobile 390×844 screenshots from the local proof harness:

| File | Surface |
| --- | --- |
| `overview-desktop.png` / `overview-mobile.png` | `/app/core` exceptions |
| `overview-error-desktop.png` / `overview-error-mobile.png` | failed overview is error, not empty |
| `queue-desktop.png` / `queue-mobile.png` | Action Queue |
| `client-desktop.png` / `client-mobile.png` | Client `cmp_ada_spa_synthetic` |
| `commercial-desktop.png` / `commercial-mobile.png` | Commercial needs-attention |
| `delivery-desktop.png` / `delivery-mobile.png` | Delivery |

## Synthetic ids (no data mutation)

| Role | Recorded id |
| --- | --- |
| Prospect | `syn-772-lr-ada` |
| Client | `cmp_ada_spa_synthetic` |
| Commercial | `syn-772-lr-ada` |
| Delivery source | `syn-772-lr-ada` |
