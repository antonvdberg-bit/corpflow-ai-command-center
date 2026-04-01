# Plan: Client config sync (superseded)

**Status:** Superseded. Client configuration lives under `tenants/<client_id>/config/` (filesystem) and durable factory state in **Postgres** via Prisma (`Tenant`, `AuthUser`, `CmpTicket`, etc.). The legacy external-table sync tool under `core/engine/src/tools/` has been removed.

**Current approach:** use `core/onboarding/onboard_client.setup_client` for local workspace skeletons and `POST /api/provision` for database tenants.
