# Slice 1 (#778) runtime screenshots

Captured against local proof server with **separate** Core / Tenant entry paths:

```bash
node scripts/slice1-local-proof-server.mjs
node scripts/slice1-capture-screenshots.mjs
```

| File | Viewport | Environment |
| ---- | -------- | ----------- |
| `tenant-desktop.png` | 1440×900 | `/app/tenant?proof=1` |
| `tenant-mobile.png` | 390×844 | `/app/tenant?proof=1` |
| `core-desktop.png` | 1440×900 | `/app/core?proof=1` |
| `core-mobile.png` | 390×844 | `/app/core?proof=1` |

Expected: Environment/Tenant/Role chrome; Core menu (All requests / Tenant · CorpFlowAI / Request · work); Tenant menu (Requests & Progress); no ScopeSwitcher; Tenant shows Approve/Amend/Reject on exposed component only; Core shows internal evidence + exposure controls.
