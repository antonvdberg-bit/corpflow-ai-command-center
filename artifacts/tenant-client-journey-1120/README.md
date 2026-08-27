# #1120 Reference-tenant client journey — local evidence

Local Next.js (`next dev --webpack`) screenshots of the real Tenant Workspace pages. `/api/app/*` is intercepted with the same handlers Vercel serves via `api/factory_router.js` (local Next does not apply `vercel.json` rewrites).

| File | Viewport | What it shows |
| --- | --- | --- |
| `tenant-unauth-desktop.png` | 1440×900 | Tenant sign-in only. No Choose workspace, no staff chooser, no proof harness |
| `tenant-unauth-mobile.png` | 390×844 | Same chrome wraps on a phone-width viewport |
| `chooser-staff-desktop.png` | 1440×900 | Staff `/app` chooser still exists for operators without a tenant session |
| `tenant-session-desktop.png` | 1440×900 | Requests & Progress, exposed Landing copy review, Internal wiring view-only |
| `tenant-session-mobile.png` | 390×844 | Same journey on a phone-width viewport |
| `tenant-review-desktop.png` | 1440×900 | Approve + comment persisted on the exposed component |
| `core-decision-desktop.png` | 1440×900 | Core sees `approve · tenant_member — Please publish this copy.` |
| `change-desktop-handoff.png` | 1440×900 | Service & change continuity banner; no Core/admin entry |
| `change-mobile-handoff.png` | 390×844 | Same handoff wraps |
| `tenant-return-desktop.png` | 1440×900 | Return to Tenant Workspace; identity unchanged |
| `tenant-return-mobile.png` | 390×844 | Same return on a phone-width viewport |
| `probe.json` | n/a | Expected vs actual + verdict |

Exact corpflow_test URLs after merge/publish:

- `https://core.corpflowai.com/app/tenant`
- `https://core.corpflowai.com/app` (tenant session continues at `/app/tenant`)
- `https://core.corpflowai.com/change?from=tenant-workspace`
- `https://lux.corpflowai.com/change`
