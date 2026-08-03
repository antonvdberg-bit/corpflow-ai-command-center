## Context

Issue #721 requires one Prospect Operations package with three complementary views. Existing surfaces:

- `/admin/rapid-delivery` — Rapid Delivery discovery desk (Action Queue closest)
- `/admin/lead-rescue` — Lead Rescue grid + detail (Workbench closest)
- `/change/revenue` — localStorage Kanban cockpit (not Postgres-backed)

Parent doctrine #720 names an Operating Workspace shell that does not yet exist in code. Revenue programme #711 has fixed Mauritius test dates; this package must not derail those gates with non-blocking polish.

## Goals / Non-Goals

- Goals:
  - One shared view model over existing `leads` + `qualificationJson`
  - Manual intervention from every view
  - Shared detail/action + exception vocabulary
  - Kanban and queues on the same records
- Non-Goals:
  - New CRM / tables / Prisma migration (unless Anton later approves)
  - External send, payment automation, deploy automation
  - Advanced forecasting, custom dashboard designer, bulk communications
  - Full visual unification ahead of function

## Decisions

- **Decision:** Keep product-native statuses authoritative for persistence; map to `canonical_stage` for shared UI/Kanban.
  - Alternatives: force one status enum onto `Lead.status` for all products → requires migration + breaks Lead Rescue forward-status UI and Rapid Delivery JSON status → rejected for P0.
- **Decision:** Store missing Rapid Delivery ops fields (`owner`, `next_action`, `next_action_due`, …) inside existing `rapid_delivery_operator` JSON.
  - Alternatives: new columns → Anton schema gate; separate table → second CRM → rejected.
- **Decision:** My Work / Today is a filter over Action Queue, not a fourth application.
- **Decision:** `/change/revenue` localStorage becomes optional personal checklist only after Kanban reads Postgres.
- **Decision:** AI may recommend/summarise/draft for review only; `assertSafeProspectIntervention` blocks protected actions in the shared layer.

## Risks / Trade-offs

- Dual status vocabularies remain → mitigated by explicit mapping tests and dual display (native label + canonical stage).
- Touching `admin-lead-rescue-api.js` is high-risk (cold-start history) → prefer adapters and shared UI extraction; keep API changes minimal and test-pinned.
- Kanban stage count (11 sell/deliver lanes) ≠ canonical commercial stages → map delivery playbook lanes onto canonical stages; keep template references as lane metadata, not a second status system.

## Migration Plan

1. Ship view-model + docs (Slice 1) with no UI behaviour change.
2. Adopt JSON fields + shared detail (Slice 2) behind existing routes.
3. Re-point workbench/queue/kanban progressively (Slice 3).
4. Add signal UI + cross-view tests (Slice 4).
5. Rollback = revert PR; no schema rollback needed.

## Open Questions

- None blocking Slice 1.
- Later: whether client-admin roles (not only factory admin) may see a subset of pipelines — deferred; current desks are factory-admin gated.
