# Route Governance

This document defines canonical route ownership and production expectations without changing existing routing behavior.

## Canonical routes

- `/change` is the canonical operator UI route in production.
- `/change` is implemented by the Next.js page **`pages/change.js`** on all hosts (Core and tenant). No Vercel rewrite is required.
- `/change` remains temporarily operational and must **not** be expanded into the long-term Core/Tenant application shell (#773 / #778).

## Central app shell (Slice 1 + Slice 2 — Core / Tenant workspace)

- `/app` is the entry chooser; `/app/core` and `/app/tenant` are separately authenticated environments with production-shaped request adapters (`fixture` harness or read-only `cmp_tickets_read`). Product names: **Operating Workspace** (`/app/core`) and **Tenant Workspace** (`/app/tenant`). No shared ScopeSwitcher — Core session cannot enter Tenant and vice versa.
- `/app/prospects` is the first staff-only Prospect Operations route inside the Operating Workspace (#772). Tenant sessions receive 403. See `docs/architecture/OPERATING_TENANT_WORKSPACE_CONSOLIDATION_V1.md`.
- `/app/today` is the staff-only Today / My Work landing inside the Operating Workspace (#772). It reuses the shared prospect list and `#721` `matchesMyWorkTodayFilter`. Tenant sessions receive 403. Tenant **My Work** remains an in-shell placeholder.
- `/app/prospects/[id]` is the staff-only shared Prospect detail / action / history surface (#994 / #721 Slice 2). `GET`/`PATCH` `/api/app/prospect` is Core only. Tenant sessions receive 403. Product desks at `/admin/lead-rescue` and `/admin/rapid-delivery` remain until later slices.
- `/app/workbench` is the staff-only shared Prospect Workbench (#996). `GET /api/app/workbench` is Core only. Tenant sessions receive 403. The product-branded grid at `/admin/lead-rescue` remains a temporary desk.
- Slice 2 (#877): normal authenticated session path is the operator default (no `?proof=1` required). Proof remains Preview/local harness only.
- Core nav may link Delivery/Operations to `/change` (compatibility). Tenant nav may link existing enabled capabilities.
- `/change` and `/change-v2` remain compatibility / experimental routes — **not** deleted and **not** production-redirected yet.
- See `docs/architecture/SLICE1_CORE_TENANT_SHELL_V1.md`. Not a second deployment; same Next app + Postgres.

## Experimental routes

- `/change-v2` is experimental.
- Do not rely on `/change-v2` as the production control surface until explicitly promoted.

## Legacy/non-canonical files

- **`public/change.html`** is a legacy static variant of the Change Console. Prefer **`pages/change.js`** for routing and UX evolution so `/change` stays a single implementation.

## Tenant-local service routes

- `/concierge` is tenant-local when present.
- `/concierge` must be feature-gated per tenant service option before production use.

## Ownership model

- Core/provider ownership: canonical control-plane behavior and route governance.
- Tenant ownership: tenant-local service routes and tenant-specific experience.
- Public ownership: marketing/static public surfaces.
