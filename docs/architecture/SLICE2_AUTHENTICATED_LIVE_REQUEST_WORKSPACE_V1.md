# Slice 2 — Authenticated live request workspace

**Issue:** [#877](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/877)  
**Parent:** [#773](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/773)  
**Prerequisite:** [#778](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/778) / PR [#875](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/875)  
**Status:** Authenticated operator path for Core / Tenant workspaces  
**Date:** 2026-08-10

## Outcome

Turn the Slice 1 proof into the first **normally usable** Core/Tenant application workspace:

- `/app/core` and `/app/tenant` work through the **existing authenticated session** path (no `?proof=1` required).
- Requests & Progress read through the established repository contract (`fixture` harness or `cmp_tickets_read`).
- Core shows authorised request/work-package records with internal evidence references.
- Tenant shows only the client-safe projection of the same request identities.
- Proof mode remains a **deterministic test harness**, not the default operator experience.

## Auth boundaries (unchanged)

| Rule | Enforcement |
| ---- | ----------- |
| Core session never enters Tenant | `assertEnvironmentAccess` + separate entry paths |
| Tenant session never enters Core | same |
| CorpFlowAI uses normal tenant auth | `typ=tenant` only; no admin bypass |
| Membership / tenant binding | `getEffectiveMemberships` + `resolveAuthorisedTenantId` |
| Cross-tenant fail-closed | Tenant list/detail constrain by authorised `tenant_id` |

## Data path

```text
session (or proof harness)
  → /api/app/shell|requests|request
  → getRequestRepository({ proofMode })
       proof / test / no POSTGRES_URL → fixture
       authenticated + POSTGRES_URL   → cmp_tickets_read (Prisma read-only)
  → normalizeCmpTicketRow
  → projectCoreRequest* | projectTenantRequest*
```

Slice 2 shipped the DB path as **read-only** for list/detail.  
**Slice 3 (#883)** enables bounded review/expose writes into the existing `cmp_tickets.console_json` column (no schema). See `SLICE3_GOVERNED_CLIENT_REVIEW_V1.md`.

## Operator UX

- Clear **loading**, **empty**, and **error** states on Core and Tenant.
- Auth-required screens prioritise normal login; proof links are muted harness hints.
- Workspace meta shows `data_source` (`fixture` vs `cmp_tickets_read`) for operator diagnosis.

## Explicit non-actions

- No schema / migrations / env / secrets / deploy / merge / client sends
- No persistence broadening — if writes become necessary, propose a separate packet

## Related

- Foundation: `docs/architecture/SLICE1_CORE_TENANT_SHELL_V1.md`
