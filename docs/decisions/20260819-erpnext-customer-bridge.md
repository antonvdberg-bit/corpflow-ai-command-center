# ERPNext WP1 Customer bridge is operator-invoked search-before-create

**Date:** 2026-08-19  
**Status:** accepted for synthetic/test ERPNext Customer writes (#1009)  
**Issue:** [#1009](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1009)

## Context

Merged [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918) / [PR #993](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/993) named **qualified Customer identity** as the first bridge (`leads.id` → Customer / Contact / Address) and forbade a second CRM, custom DocTypes, and automated sync in that matrix packet. #1009 is the bounded implementation of that first bridge, with a synthetic idempotency proof.

## Decision

- Implement one Customer bridge using the existing #880 mapper and standard Frappe REST.
- Search-before-create with a deterministic idempotency key `corpflow.customer_bridge.v1:lead=<leads.id>`.
- On match, update the allowed mapped fields. Do not create a second Customer.
- Record the ERPNext names on `qualification_json.erpnext` in the reference lead used by the event. Do **not** add schema and do **not** PATCH live Postgres in this packet.
- Synthetic ERPNext writes are allowed. Real Prestige Procurement Customer, send, payment, cron, and `client_production` are not.

## Consequences

- Positive: WP2–WP5 can copy this search-before-create / replay / pointer pattern without a large integration framework.
- Negative / follow-ups: a later operator step may persist the same pointer onto a real `leads.qualification_json` row. That is still not a schema change. It is a production Postgres write and needs its own authorization.

## Links

- Canonical: `docs/erpnext/ERPNEXT_CUSTOMER_BRIDGE_V1.md`
- Mapping: `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`
- Client Master: `docs/erpnext/ERPNEXT_CLIENT_MASTER_V1.md`
