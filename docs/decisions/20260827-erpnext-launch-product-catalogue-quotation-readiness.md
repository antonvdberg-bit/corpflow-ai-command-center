# ERPNext launch-product catalogue is quotation-ready from standard Item / Price List / Item Price

**Date:** 2026-08-27
**Status:** accepted for GET/read-only acceptance (#1207)
**Issue:** [#1207](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1207)
**Parents:** [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881), [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882), [#1166](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1166)

## Context

CorpFlowAI needs to quote the two launch products (Lead Rescue and Website Rescue) from the standard ERPNext catalogue already live from #881/#882, without a second product master or fabricated prices. This is production-acceptance evidence for an incremental Temporal pilot lane. The three ordinary production lanes stay reserved. Protected writes stay forbidden.

## Decision

- Reuse existing hosted ERPNext Item, Price List, and Item Price records. GET/read-only.
- Treat `config/erpnext-product-catalogue.v1.json` as the only CorpFlowAI projection of those identifiers.
- Quotation builders send ERPNext `item_code` (and qty/uom). Item Price on the document Price List is the rate source.
- Record exact identifiers and current-main SHA `be671871f2bc2b5c7545d5379ff2be2caf2284d5`. Closed PR #1224 is stale and is not resumed.
- Do not invent missing USD prices or exchange rates. The existing Anton Currency Exchange USD→MUR 47.15 remains authoritative.
- Include `customer_notes` on Quotation search so idempotency read-back stays duplicate-safe.

## Consequences

- Positive: operators can raise Lead Rescue and Website Rescue draft quotations from one catalogue.
- Follow-ups: do not submit or send synthetic drafts. Sales Invoice posting still waits on #1055. T2/T3 and Website Rescue maintenance list prices remain unapproved.

## Links

- Canonical: `docs/erpnext/ERPNEXT_LAUNCH_PRODUCT_CATALOGUE_QUOTATION_READINESS_V1.md`
- Probe: `scripts/erpnext/probe-launch-product-catalogue.mjs`
- Catalogue: `docs/erpnext/ERPNEXT_PRODUCT_CATALOGUE_V1.md`
