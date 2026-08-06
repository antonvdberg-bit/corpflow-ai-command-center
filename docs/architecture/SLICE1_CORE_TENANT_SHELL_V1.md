# Slice 1 — Core/Tenant shell + Requests & Progress (runtime)

**Issue:** [#778](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/778) (implements first runtime slice of [#773](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/773))  
**Audit parent:** PR [#774](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/774) route/capability matrix  
**Status:** Runtime slice implemented (draft PR) — synthetic data only  
**Date:** 2026-08-06

## What shipped

| Surface | Path | Notes |
| ------- | ---- | ----- |
| App shell entry | `/app` | Persistent Scope · Tenant · Role chrome |
| Scope entry | Core / Tenant — CorpFlowAI | Visually distinct themes |
| Tenant Requests & Progress | `/app?scope=tenant` | Client-safe projection |
| Core request/work view | `/app?scope=core` | Same request id + internal refs + exposure |
| APIs | `/api/app/shell`, `/requests`, `/request`, `/component-review`, `/component-expose` | Synthetic store; no external send |

## Reuse

- Auth/session (`/api/auth/me`, cookie session)
- Membership/scope ideas from Core picker (not expanded)
- Workflow/progress mindset from `client_view` + deterministic milestone roll-up
- Preview/client decision patterns (approve / amend / reject) at **component** grain for Slice 1

## Explicit non-actions

- No schema/DB, env/secrets, production deploy, merge, client sends
- `/change` not expanded
- No #721 Prospect Ops, no Lux product work

## Proof mode

`?proof=1` (or `x-corpflow-app-proof: 1`) enables a dual-scope synthetic actor on **local / Vercel Preview only**. Denied when `VERCEL_ENV=production`.

## Remaining limitations

- Synthetic in-memory store only (resets on cold start)
- Not wired to live `cmp_tickets` rows
- Scope switch is in-shell (not full membership host switch)
- `/change` remains the operational hub until later slices
