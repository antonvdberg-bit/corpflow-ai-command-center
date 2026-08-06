# #778 Slice 1 — runtime evidence

**Date:** 2026-08-06  
**Branch:** `cursor/dispatcher-issue-778-7cf4`  
**Agent / run:** `bc-454508b6-2860-497c-b9c2-db796d038587`  
**Draft PR:** https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/779  
**Head SHA:** `c324e752872b9d39a019cac7f2bd85ce85cbd27c`

## Local runtime

| Check | Result |
| ----- | ------ |
| `node --test node-tests/app-slice1-*.test.mjs` | **14/14 PASS** |
| `npm test` | **PASS** (exit 0) |
| `npm run build` | **PASS** — routes `/app`, `/app/requests`, `/app/core/requests/[id]` present |
| GitHub `test` / `vercel-env` on PR #779 | **PASS** |
| Vercel Preview deploy | Ignored build step (no preview URL); local runtime used instead |
| Local server | `npx next start -p 3010` |
| `GET /app?demo=slice1` | **200** |
| `GET /app/requests?demo=slice1` | **200** |
| `GET /app/core/requests/req_slice1_corpflowai_progress_001?demo=slice1` | **200** |

## Expected vs actual

| Expectation | Actual |
| ----------- | ------ |
| Enter Core and Tenant — CorpFlowAI | Scope page shows both options; chrome persists scope/tenant/role |
| Visually distinct contexts | Core teal / Tenant warm amber themes |
| Tenant client-safe progress | 50% deterministic roll-up; components; blocker; attention; next action |
| No GitHub/CI/agent on tenant | Tenant panel + projection JSON omit internals |
| Exposed component review | Landing copy: comment + approve/amend/reject |
| Ordinary component view-only | Internal API wiring view-only |
| Core twin + exposure | Same request id; evidence refs; expose toggles; client preview |
| Isolation tests | Core deny for tenant-only; cross-tenant 404; non-exposed 403 |

## Screenshots

- `desktop-scope.png`
- `desktop-tenant-requests.png`
- `desktop-core-request.png`
- `mobile-scope.png`
- `mobile-tenant-requests.png`
- `mobile-core-request.png`

## Remaining limitations

1. Synthetic in-memory store only (not written to `cmp_tickets.console_json` yet).
2. Live cookie-auth path works via `/api/app/*` but local evidence used `?demo=slice1` (same pure modules + access rules).
3. No Vercel preview URL claimed in this packet until preview deploy is Ready.
4. `/change` left operational; not redirected.
5. Not production-deployed; draft PR only — verdict **PARTIAL**.
