# #1006 Tenant Workspace simplification — local evidence

Local `next start` screenshots. Unauthenticated `/app/tenant` shows Tenant chrome **without** Choose workspace. `/app` remains the staff chooser after the tenant-session check.

`shell_404` on local `/app/tenant` is the unauthenticated API probe against this standalone server; corpflow_test `/api/app/shell` is live after merge. Chrome identity is the #1006 proof.

| File | Viewport | What it shows |
| --- | --- | --- |
| `tenant-desktop-signin.png` | 1440×900 | Tenant Workspace chrome, no Choose workspace |
| `tenant-mobile-signin.png` | 390×844 | Same chips wrap; no Choose workspace |
| `chooser-desktop-staff.png` | 1440×900 | Staff `/app` chooser still offers Operating Workspace |
| `chooser-mobile-staff.png` | 390×844 | Staff chooser wraps on narrow viewport |

Exact corpflow_test URLs after merge:

- `https://core.corpflowai.com/app/tenant`
- `https://core.corpflowai.com/app`
- `https://core.corpflowai.com/change`
- `https://lux.corpflowai.com/change`
