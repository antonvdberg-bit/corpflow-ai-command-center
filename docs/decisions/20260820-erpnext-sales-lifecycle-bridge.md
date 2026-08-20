# ERPNext WP2 sales lifecycle bridge is operator-invoked search-before-create

**Date:** 2026-08-20  
**Status:** accepted for synthetic/test ERPNext Lead / Opportunity / Customer writes (#1018)  
**Issue:** [#1018](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1018)

## Context

Merged [#1009](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1009) / [PR #1012](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1012) proved the WP1 Customer bridge. #1018 is the next bounded bridge: one synthetic CorpFlowAI prospect into standard ERPNext `Lead` → `Opportunity` → existing/reused `Customer`, with search-before-create and replay idempotency.

## Decision

- Reuse the WP1 Frappe REST client and Customer bridge. Do not build a second integration framework.
- Search-before-create Lead by idempotency key, email, then company name. Opportunity by notes/title containing `leads.id`.
- Create Opportunity only at `qualified` / `proposal_ready` / `won`. Create/reuse Customer only at WP1 stages `proposal_ready` / `won`.
- On identity conflict (same email/company, different CorpFlowAI reference), stop. Do not steal a pre-existing ERPNext Lead.
- Record names on `qualification_json.erpnext` in the reference lead. Do **not** add schema and do **not** PATCH live Postgres in this packet.
- Synthetic ERPNext writes are allowed. Real client migration, quotation, send, payment, cron, and `client_production` are not.

## Consequences

- Positive: WP3 quotation can start from a proven Lead/Opportunity/Customer triple.
- Negative / follow-ups: a later operator step may persist the same pointer onto a real `leads.qualification_json` row. That is still not a schema change. It is a production Postgres write and needs its own authorization.

## Links

- Canonical: `docs/erpnext/ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md`
- WP1: `docs/erpnext/ERPNEXT_CUSTOMER_BRIDGE_V1.md`
- Mapping: `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`
