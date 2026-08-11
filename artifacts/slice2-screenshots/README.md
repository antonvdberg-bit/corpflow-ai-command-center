# Slice 2 runtime evidence (#877)

Local authenticated-session evidence for Core / Tenant workspaces (no `?proof=1` required on the operator path).

## How to regenerate

```bash
node scripts/slice2-local-auth-server.mjs &
node scripts/slice2-probe-evidence.mjs
node scripts/slice2-capture-screenshots.mjs
```

| Artifact | Description |
| -------- | ----------- |
| `core-desktop-session.png` | Core `/app/core` session · 1440×900 |
| `core-mobile-session.png` | Core `/app/core` session · 390×844 |
| `tenant-desktop-session.png` | Tenant `/app/tenant` session · 1440×900 |
| `tenant-mobile-session.png` | Tenant `/app/tenant` session · 390×844 |
| `core-desktop-proof.png` | Proof harness still works |
| `tenant-desktop-proof.png` | Proof harness still works |
| `runtime-evidence-877.json` | API probe summary |

Local server injects a simulated session for evidence only. After merge, Anton tests real Core/Tenant login on `corpflow_test`.
