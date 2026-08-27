# Route Governance

This document defines canonical route ownership and production expectations without changing existing routing behavior.

## Canonical routes

- `/change` is the canonical operator UI route in production.
- `/change` is implemented by the Next.js page **`pages/change.js`** on all hosts (Core and tenant). No Vercel rewrite is required.
- `/change` remains temporarily operational and must **not** be expanded into the long-term Core/Tenant application shell (#773 / #778).

## Central app shell (Slice 1 + Slice 2 — Core / Tenant workspace)

- `/app` is the staff entry chooser; `/app/core` and `/app/tenant` are separately authenticated environments with production-shaped request adapters (`fixture` harness or read-only `cmp_tickets_read`). Product names: **Operating Workspace** (`/app/core`) and **Tenant Workspace** (`/app/tenant`). No shared ScopeSwitcher — Core session cannot enter Tenant and vice versa. A live Tenant session on `/app` redirects to `/app/tenant` (#1006).
- `/app/prospects` is the first staff-only Prospect Operations route inside the Operating Workspace (#772). Tenant sessions receive 403. See `docs/architecture/OPERATING_TENANT_WORKSPACE_CONSOLIDATION_V1.md`.
- `/app/today` is the staff-only Today / My Work landing inside the Operating Workspace (#772). It reuses the shared prospect list and `#721` `matchesMyWorkTodayFilter`. Tenant sessions receive 403. Tenant **My Work** is retired from Tenant nav (#1073); tenant work is Requests & Progress.
- `/app/prospects/[id]` is the staff-only shared Prospect detail / action / history surface (#994 / #721 Slice 2). `GET`/`PATCH` `/api/app/prospect` is Core only. Tenant sessions receive 403. Product desks at `/admin/lead-rescue` and `/admin/rapid-delivery` remain until later slices.
- `/app/workbench` is the staff-only shared Prospect Workbench (#996). `GET /api/app/workbench` is Core only. Tenant sessions receive 403. The product-branded grid at `/admin/lead-rescue` remains a temporary desk.
- `/app/pipeline` is the staff-only Postgres-backed Prospect Pipeline (#997). `GET /api/app/pipeline` is Core only. Tenant sessions receive 403. `/change/revenue` remains an optional personal checklist only.
- `/app/queue` is the staff-only canonical Prospect Action Queue (#995). `GET /api/app/queue` is Core only. Tenant sessions receive 403. Rows open `#994` `/app/prospects/[id]`. `/admin/rapid-delivery` remains a temporary desk.
- `/app/clients` is the staff-only Clients summary (#999). `GET /api/app/clients` is Core only. Tenant sessions receive 403. Company Master remains the evidence/asset editor. Client detail hops into Prospect / Commercial / Delivery keep `proof=1` on `/app/*` routes and use recorded prospect ids (#1212).
- `/app/commercial` is the staff-only Commercial summary (#1004). `GET /api/app/commercial` is Core only. Tenant sessions receive 403. Company Master remains the identity/evidence hub. No payment execution.
- `/app/commercial/[id]` is the staff-only Commercial → ERPNext quotation evidence drilldown (#1160). `GET /api/app/commercial-quotation` and `GET /api/app/commercial-quotation-pdf` are Core only. Tenant sessions receive 403. Reads the already-recorded Quotation id only. No ERPNext write and no copy into Postgres.
- `/app/delivery` is the staff-only Delivery summary (#1005 / #1119). `GET /api/app/delivery` is Core only. Tenant sessions receive 403. It projects existing Lead Rescue, Website Rescue, and Change/request records. `/change` remains the tenant service/change surface.
- Tenant Workspace (#1073 / #1006 / #1120 / #1151 / #1155 / #1165): nav is **Requests & Progress** plus **Service & change** (`/change?from=tenant-workspace`). Website Rescue and Lead Rescue delivery/onboarding progress for an authorised tenant are tenant-safe rows inside Requests & Progress (`docs/architecture/WEBSITE_RESCUE_TENANT_DELIVERY_PROGRESS_V1.md`, `docs/architecture/LEAD_RESCUE_TENANT_DELIVERY_PROGRESS_V1.md`) — not a second dashboard. Tenant chrome does not show **Choose workspace**, a staff chooser, a proof-harness hint, or an internal data-source label. `/change` remains the canonical tenant service/change surface. Placeholder Home / My Work / Documents / Reports / Support nav is retired. Navigation does not create a ticket. `/app/commercial` and `/app/delivery` are staff-only (not tenant routes).
- Slice 2 (#877): normal authenticated session path is the operator default (no `?proof=1` required). Proof remains Preview/local harness only.
- Core nav **Delivery** links to `/app/delivery`. Core nav **Operations** remains a compatibility link to `/change`. Tenant nav links Service & change to `/change`.
- `/change` remains the canonical tenant service/change route — **not** deleted and **not** replaced by a second request model.
- `/change-v2` remains experimental — **not** production-redirected.
- See `docs/architecture/SLICE1_CORE_TENANT_SHELL_V1.md`, `docs/architecture/TENANT_REQUEST_REVIEW_CHANGE_CONTINUITY_V1.md`, and `docs/architecture/TENANT_WORKSPACE_SIMPLIFICATION_V1.md`. Not a second deployment; same Next app + Postgres.

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
