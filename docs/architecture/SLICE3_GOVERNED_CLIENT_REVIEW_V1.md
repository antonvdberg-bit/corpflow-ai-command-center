# Slice 3 — Governed client review (expose / comment / approve)

**Issue:** [#883](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/883)  
**Parent:** [#773](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/773)  
**Prerequisite:** [#877](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/877) / PR [#878](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/878)  
**Status:** Bounded Core expose + Tenant review on existing request contracts  
**Date:** 2026-08-11

## Outcome

Core can explicitly expose a request component for client review. Tenant can comment and approve / request changes **only** on exposed components. Internal components stay view-only. Core sees the resulting client decision evidence.

## Persistence path (no schema)

**Audit result:** review/expose state already lives on the AppRequest contract inside `console_json.client_view.components[]` (`exposed_for_client_review`, `reviews[]`, milestone / client-safe status). Change Console already uses `console_json.client_view.preview_review` for approve / request_changes.

| Path | Data source | Persistence |
| ---- | ----------- | ----------- |
| Proof / test / no `POSTGRES_URL` | `fixture` | In-memory fixture store (`fixture_store.console_json`) |
| Authenticated + Postgres | `cmp_tickets_read` | **Existing** `cmp_tickets.console_json` JSON column via Prisma update |

**No** new table, column, or migration. Writes are bounded to `consoleJson` (+ optional `description` mirror). Tenant-scoped updates load with `{ id, tenantId }` fail-closed.

Also synced on review (existing fields only):

- `client_view.preview_review` / `preview_reviews[]` — Change Console contract
- `client_view.workflow_state` — `in_review` | `client_approved` | `changes_requested`
- `client_view.client_safe_blocker` / `attention_required`

## Review states (mapped)

| `review_state` | Meaning |
| -------------- | ------- |
| `internal` | Not exposed — Tenant view-only |
| `review_ready` | Exposed, not yet in `client_review` milestone |
| `awaiting_client` | Exposed + `client_review` — waiting on Tenant |
| `approved` | Tenant approved |
| `changes_requested` | Tenant amend / reject |

## Auth / isolation (unchanged)

- Core-only: `POST /api/app/component-expose`
- Tenant-only: `POST /api/app/component-review`
- Server rejects review when `exposed_for_client_review !== true` (403)
- Cross-tenant get/update fail closed (404)
- Tenant projection omits GitHub / PR / commit / agent / internal-note fields

## Explicit non-actions

- No schema / migrations / env / secrets / deploy / merge / client sends
- No messaging/email notification, no advanced approval engine, no CRM rebuild

## Related

- Slice 2 workspace: `docs/architecture/SLICE2_AUTHENTICATED_LIVE_REQUEST_WORKSPACE_V1.md`
- Foundation: `docs/architecture/SLICE1_CORE_TENANT_SHELL_V1.md`
