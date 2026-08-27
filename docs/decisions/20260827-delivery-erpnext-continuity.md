# Delivery Workspace projects existing ERPNext Project/Issue references

**Date:** 2026-08-27
**Status:** accepted for #1170 current-main repair of #1156 (PR implementation; live corpflow_test after merge)
**Issue:** [#1170](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1170) (source [#1156](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1156); supersedes unmergeable PR #1158)

## Context

Operating Workspace Delivery (#1005 / PR #1142) listed Lead Rescue, Website Rescue, and Change work without the already-recorded ERPNext Project/Issue names from #1097 / #1144. Live Postgres was never written (`qualification_json.erpnext.delivery` remains an in-memory / fixture contract). Inventing a join from client name would create a second mapping. Copying task or Issue history into Postgres would create a second project/helpdesk.

PR #1158 proved the Delivery projection, then `main` advanced with Operating Workspace action overview (#1159 / PR #1161) and Commercial quotation-evidence (#1160 / PR #1162). This ADR is the current-main repair, not a redesign.

## Decision

- Reuse the existing `corpflow.delivery.erpnext.v1` contract: `cf1097-synthetic-delivery` → Project `PROJ-0001`, `cf1097-synthetic-support` → Issue `ISS-2026-00001`.
- Project those identifiers and a bounded safe status (live GET when available, otherwise recorded #1097 read-back on the proof harness) into `/app/delivery`.
- Land that proven capability on exact current `main`. Preserve later Operating overview and Commercial quotation-evidence work.
- Do not invent organisation-name joins. Do not copy Task/Issue history. Do not PATCH Postgres. Do not mutate ERPNext. Tenant Workspace stays fail-closed.

## Consequences

- Positive: an operator can see, from one Delivery item, the authoritative ERPNext Project/Issue without a second system.
- Negative / follow-ups: live leads still need a recorded pointer before they show as linked; writing that pointer to Postgres is a later packet.

## Links

- Canonical: `docs/erpnext/ERPNEXT_DELIVERY_WORKSPACE_CONTINUITY_V1.md`
- Foundations: `docs/erpnext/ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md`, `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`
