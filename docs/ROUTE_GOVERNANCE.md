# Route Governance

This document defines canonical route ownership and production expectations without changing existing routing behavior.

**Long-term product direction (#773):** a centralized CorpFlowAI application with explicit **Core** and **Tenant** scopes will become the primary navigation model. Until that shell ships and redirects are approved, the production ownership rules below remain in force. Durable audit: **`docs/architecture/CORPFLOW_CENTRAL_APP_ROUTE_CAPABILITY_MATRIX_V1.md`**.

## Canonical routes

- `/change` is the canonical operator UI route in production **today** (temporary compatibility hub under #773 — not the long-term everything-dashboard).
- `/change` is implemented by the Next.js page **`pages/change.js`** on all hosts (Core and tenant). No Vercel rewrite is required.

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
