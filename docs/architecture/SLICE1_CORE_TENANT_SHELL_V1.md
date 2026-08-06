# Slice 1 — Separate Core / Tenant auth + Requests & Progress (runtime)

**Issue:** [#778](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/778) (implements first runtime slice of [#773](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/773))  
**Audit parent:** PR [#774](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/774) route/capability matrix  
**Status:** Runtime slice reworked — **separately authenticated** Core and Tenant entry paths  
**Date:** 2026-08-06

## Authoritative correction

- Core and Tenant use **different** credentials and session protocols (`typ=admin` vs `typ=tenant`).
- A Core session **must never** enter Tenant.
- A Tenant session **must never** enter Core.
- CorpFlowAI Tenant uses **normal tenant authentication** (not admin privilege).
- One production app, one Postgres — no second identity system.
- **Removed:** shared-auth `ScopeSwitcher` architecture.

## What shipped

| Surface | Path | Auth |
| ------- | ---- | ---- |
| Entry chooser | `/app` | Links only — no shared session switch |
| Core app | `/app/core` | Existing Core/admin session (`typ=admin`) |
| Tenant app | `/app/tenant` | Existing tenant session (`typ=tenant`, CorpFlowAI) |
| Core menu | All requests / Tenant · CorpFlowAI / Request · work | Within Core only |
| Tenant menu | Requests & Progress | Within Tenant only |
| APIs | `/api/app/shell`, `/requests`, `/request`, `/component-review`, `/component-expose` | Environment-gated |

## Reuse

- Auth/session (`/api/auth/login` levels `admin` \| `tenant`, cookie `corpflow_session`)
- Deterministic progress roll-up, tenant-safe projection, expose/review gates
- Visual Core vs Tenant themes

## Explicit non-actions

- No schema/DB, env/secrets, production deploy, merge, client sends
- `/change` not expanded
- No #721 Prospect Ops, no Lux product work

## Proof mode

`?proof=1` on `/app/core` or `/app/tenant` mints a **single-environment** proof actor (Preview / local only). Denied when `VERCEL_ENV=production`. Proof Core cannot call Tenant APIs and vice versa.

## Remaining limitations

- Synthetic in-memory store only (resets on cold start)
- Not wired to live `cmp_tickets` rows
- `/change` remains the operational hub until later slices
- Preview URLs may be SSO-gated for the team
