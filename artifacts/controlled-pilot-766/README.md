# Controlled-pilot readiness evidence (#766)

**Canonical package:** `docs/execution/CONTROLLED_PILOT_TEST_READINESS_766_V1.md`

## Contents

| Path | Role |
| ---- | ---- |
| `latest-rehearsal.json` | Freshness stamp from `node scripts/controlled-pilot-rehearsal-766.mjs` |
| `defect-register.json` | Release blocker / non-blocker / enhancement register |
| `packet-c-evidence-slots.json` | ERPNext operator evidence slots (empty until Anton fills) |
| `sign-off-record.template.md` | Operator sign-off template |
| `packet-b-access-checklist.json` | Access/boundary ticks (repo checklist; live ticks private) |

## Rules

- Synthetic identities only.
- No passwords, tokens, bank digits, real client PII, or POP images in this folder.
- ERPNext screenshots stay **operator-private**; record only redacted IDs in `packet-c-evidence-slots.json` if committed.
- Reuses #757 ledgers under `artifacts/gtm-integrated-711/` — do not duplicate full ledgers here.

## Re-run

```bash
node scripts/controlled-pilot-rehearsal-766.mjs
```
