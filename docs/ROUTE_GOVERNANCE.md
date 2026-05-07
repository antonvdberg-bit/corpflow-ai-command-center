# Route Governance

This document defines canonical route ownership and production expectations without changing existing routing behavior.

## Canonical routes

- `/change` is the canonical operator UI route in production.
- On **Core** hostnames (`core.corpflowai.com`, `www.core.corpflowai.com`), `/change` is served by a **Vercel rewrite** to `public/change.html` (CMP Change Console).

## Experimental routes

- `/change-v2` is experimental.
- Do not rely on `/change-v2` as the production control surface until explicitly promoted.

## Legacy/non-canonical files

- `pages/change.js` implements `/change` for hosts **without** the Core rewrite (for example tenant hostnames that rely on the Next.js route). Core ops must open **`/change` on the Core hostname** for the canonical static console.

## Tenant-local service routes

- `/concierge` is tenant-local when present.
- `/concierge` must be feature-gated per tenant service option before production use.

## Ownership model

- Core/provider ownership: canonical control-plane behavior and route governance.
- Tenant ownership: tenant-local service routes and tenant-specific experience.
- Public ownership: marketing/static public surfaces.
