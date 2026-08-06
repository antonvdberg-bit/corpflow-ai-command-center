# Slice 1 (#778) runtime screenshots

Captured 2026-08-06 against local proof server:

```bash
node scripts/slice1-local-proof-server.mjs
node scripts/slice1-capture-screenshots.mjs
```

| File | Viewport | Scope |
| ---- | -------- | ----- |
| `tenant-desktop.png` | 1440×900 | Tenant — CorpFlowAI |
| `tenant-mobile.png` | 390×844 | Tenant — CorpFlowAI |
| `core-desktop.png` | 1440×900 | Core |
| `core-mobile.png` | 390×844 | Core |

Expected: Scope/Tenant/Role chrome visible; Tenant shows Approve/Amend/Reject on exposed component and view-only on internal; Core shows same request id with GitHub/evidence refs and exposure controls.
