# Slice 1 screenshots (#778 / refresh #868)

Synthetic / fixture data only — no real client data.

| File | Viewport |
|------|----------|
| `core-desktop.png` | Core `/app/core?proof=1` · 1440×900 |
| `core-mobile.png` | Core · 390×844 |
| `tenant-desktop.png` | Tenant `/app/tenant?proof=1` · 1440×900 |
| `tenant-mobile.png` | Tenant · 390×844 |
| `runtime-evidence-868.json` | Local proof API probe after #868 rebase onto current `main` |

Capture:

```bash
node scripts/slice1-local-proof-server.mjs &
node scripts/slice1-capture-screenshots.mjs
```

Evidence covers: separate Core/Tenant auth entry paths; Core request queue + filters + detail/expose; Tenant request list + progress + exposed review + view-only component; no shared `ScopeSwitcher`.
