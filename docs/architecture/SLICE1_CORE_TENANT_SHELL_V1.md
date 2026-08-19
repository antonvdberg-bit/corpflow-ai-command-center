# Slice 1 — Separate Core / Tenant auth + production-shaped Requests foundation

**Issue:** [#778](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/778) (implements first runtime slice of [#773](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/773))  
**Audit parent:** PR [#774](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/774) route/capability matrix  
**Status:** Runtime foundation — separately authenticated Core/Tenant + production-shaped request adapters  
**Date:** 2026-08-07

## Authoritative correction (accepted)

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
| Core app | `/app/core` | Existing Core/admin session (`typ=admin`). Product name: Operating Workspace (#772). |
| Tenant app | `/app/tenant` | Existing tenant session (`typ=tenant`, CorpFlowAI). Product name: Tenant Workspace (#772). |
| Prospect Operations | `/app/prospects` | Operating Workspace / Core session only (#772 first slice) |
| Today / My Work | `/app/today` | Operating Workspace / Core session only (#772 next slice) |
| Core nav | My Work (`/app/today`) · Tenants · Requests · Prospects · Delivery · Approvals · Releases · Operations | Within Core; Delivery/Operations link to `/change` |
| Tenant nav | Home · My Work · Requests & Progress · Documents · Reports · Support | Within Tenant only |
| APIs | `/api/app/shell`, `/requests`, `/request`, `/component-review`, `/component-expose` | Environment-gated |

## Request data contract

- Adapters normalize **cmp_tickets-shaped** rows (`id`, `tenant_id`/`tenantId`, `status`, `stage`, `description`, `updated_at`, `console_json`/`consoleJson`).
- **Repository selector:** `getRequestRepository()` → `fixture` (proof / `NODE_ENV=test` / no `POSTGRES_URL`) or `cmp_tickets_read` (existing Prisma `cmpTicket` reads).
- Both paths use **`normalizeCmpTicketRow`** then Core/Tenant projectors. Missing/invalid tenant ID **fail-closed** (never becomes CorpFlowAI).
- DB path is **read-only** in this slice; review/expose mutations remain fixture-proof only.
- Optional `console_json.client_view.components[]` (JSON only — **no schema change**).
- Progress is **deterministic** from milestone weights (`not_started` … `live_verified`).

## Compatibility routes (not deleted)

| Path | Role |
| ---- | ---- |
| `/change` | Operational Change Console — remains; not expanded into `/app` shell |
| `/change-v2` | Experimental |

Safe navigation: Core Delivery/Operations → `/change`; Tenant placeholders may link to existing capabilities; `/change` may link back to `/app/core` or `/app/tenant` where appropriate.

## Explicit non-actions

- No schema/DB mutation, env/secrets, production deploy, merge, client sends
- `/change` not expanded into everything-dashboard
- No #721 Prospect Ops, no Lux product work

## Proof mode

`?proof=1` on `/app/core` or `/app/tenant` mints a **single-environment** proof actor (Preview / local only). Denied when `VERCEL_ENV=production`.

## Remaining limitations

- Fixture-backed repository for Preview/tests (same contracts as live `cmp_tickets`); live Prisma wiring can reuse `normalizeCmpTicketRow` without schema change
- `/change` remains the mature operational hub for many flows
- Preview URLs may be SSO-gated for the team
