# ERPNext Prestige operating foundation uses standard CRM/project/support objects

**Date:** 2026-08-14  
**Status:** accepted for synthetic/test configuration on hosted ERPNext (#920)  
**Issue:** [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920)

## Context

Prestige Procurement delivery (#919) needs a working ERPNext operating environment before the real client record exists: CRM, MUR quotation, reusable project/task structure, support Issue, and a first CorpFlowAI bridge map. Custom DocTypes were not authorized.

## Decision

Use **standard ERPNext** objects only:

- Lead → Opportunity → Customer + Contact + Address
- Item `CF-WS-CUSTOM-PROJECT` (no list price; quotation-time rate)
- Draft MUR Quotation on Standard Selling
- Project Template + Task + Project + Timesheet + Issue when Role Permissions allow
- Mapping-only bridge; no Postgres migration

The real Prestige Procurement customer is **not** created here. MUR 285,000 is **not** stored as an Item Price.

Live proof on 2026-08-14 as `integrations@corpflowai.com` completed the CRM + quotation path. Project / Task / Issue remain HTTP 403 until a UI Role Permissions Manager grant on role **Sales Manager**.

## Consequences

- Positive: Prestige can reuse one synthetic flow; sprint SKUs stay distinct; `/change` stays the execution surface.
- Negative / follow-ups: Anton must grant Project/Task/Issue on Sales Manager, then re-run `scripts/erpnext/apply-prestige-foundation.sh`. Payment Terms remain 403 (schedule lives in quotation terms text).

## Links

- Canonical: `docs/erpnext/ERPNEXT_PRESTIGE_FOUNDATION_V1.md`
- Bridge: `docs/erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md`
- Machine contract: `config/erpnext-prestige-foundation.v1.json`
