# Slice 3 runtime evidence (#883)

Local authenticated harness (reuses Slice 2 auth server + fixture repository).

```bash
node scripts/slice2-local-auth-server.mjs &
node scripts/slice3-probe-evidence.mjs
node scripts/slice3-capture-screenshots.mjs
```

| Artifact | Meaning |
| -------- | ------- |
| `runtime-evidence.json` | API probe: expose → tenant amend → core sees decision; internal blocked |
| `core-desktop-expose.png` | Core `/app/core` · 1440×900 · expose controls |
| `core-mobile-expose.png` | Core · 390×844 |
| `tenant-desktop-review.png` | Tenant review controls on exposed component · 1440×900 |
| `tenant-mobile-review.png` | Tenant · 390×844 |
| `core-desktop-after-client-decision.png` | Core shows latest client decision |
| `tenant-desktop-after-decision.png` | Tenant after amend (mobile viewport) |

**Persistence path:** `fixture_store.console_json` in this harness; production authenticated path uses existing `cmp_tickets.console_json` (no schema).
