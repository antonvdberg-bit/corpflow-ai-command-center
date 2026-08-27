# #1175 Lead + Website Rescue Tenant progress — local evidence

Synthetic Tenant Workspace journey (proof harness). Not a live client login.

Current-main SHA at capture: `b731411734edb01b7dbb8d7e20247c5a7805983a`

| File | Viewport | What it shows |
| --- | --- | --- |
| `list-desktop.png` | 1440×900 | Requests & Progress includes Lead Rescue and Website Rescue |
| `list-mobile.png` | 390×844 | Same list on a phone-width viewport |
| `lead-rescue-detail-desktop.png` | 1440×900 | Ready for your review; exposed preview; setup check view-only |
| `lead-rescue-detail-mobile.png` | 390×844 | Same Lead Rescue detail on mobile |
| `lead-rescue-review-desktop.png` | 1440×900 | Approve on the exposed Lead Rescue preview |
| `website-rescue-detail-desktop.png` | 1440×900 | Preview ready; exposed preview link; view-only |
| `website-rescue-detail-mobile.png` | 390×844 | Same Website Rescue detail on mobile |
| `change-desktop.png` | 1440×900 | Canonical `/change?from=tenant-workspace` continuity |
| `change-mobile.png` | 390×844 | Same handoff on mobile |
| `return-desktop.png` | 1440×900 | Return to Tenant Workspace |
| `return-mobile.png` | 390×844 | Same return on mobile |
| `probe.json` | n/a | In-process expected vs actual + verdict |

Exact corpflow_test URLs (current-main Production already serving this SHA):

- `https://core.corpflowai.com/app/tenant`
- `https://lux.corpflowai.com/app/tenant`
- `https://core.corpflowai.com/change?from=tenant-workspace`
- `https://lux.corpflowai.com/change`
