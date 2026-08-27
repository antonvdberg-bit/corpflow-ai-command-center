# CorpFlowAI ↔ ERPNext bridge contract v1

**Status:** Mapping-only. **No automated sync. No Postgres migration. No live client data copy.**  
**Issue:** [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920) Phase 6  
**Environment:** `corpflow_test`  
**Machine rows:** `config/erpnext-prestige-foundation.v1.json` → `bridge.rows`  
**Helpers:** `lib/erpnext/prestige-foundation.js`

**Anchor:** `<!-- ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1 -->`

<!-- ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1 -->

ERPNext is the commercial system of record. CorpFlowAI Postgres is the intake, CMP execution, and operator-pipeline store. Pointers may be stored later; this issue does **not** write them. WP1 Customer bridge implementation: [`ERPNEXT_CUSTOMER_BRIDGE_V1.md`](./ERPNEXT_CUSTOMER_BRIDGE_V1.md) (#1009) — synthetic/operator-invoked; still no live Postgres PATCH. WP2 sales lifecycle: [`ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md`](./ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md) (#1018) — synthetic Lead → Opportunity → reused Customer; still no live Postgres PATCH.

Full #918 domain matrix (supersedes this file as the complete classification, not as a rewrite of these rows): [`docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`](../governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md). This contract remains the #920 mapping slice.

Conflict authority: **ERPNext** for Customer / Quotation / Invoice / payment reference / Project / durable Issue. **CorpFlowAI** for `/change` execution evidence, Technical Lead audits, and fulfilment flags.

Retry rule for every row: **search-before-create**. Never invent a second Customer, Lead, or Issue for the same source key.

| Source | ERPNext | Direction | Source key | ERPNext key | Idempotency | Audit |
| ------ | ------- | --------- | ---------- | ----------- | ----------- | ----- |
| Postgres `Lead` | Lead then Opportunity | CorpFlowAI → ERPNext | `leads.id` | `Lead.name` / `Opportunity.name` | Search email then company name | Pointer later; not migrated here |
| `GrowthCompany` / `GrowthContact` | Lead (pre-sale) or Customer + Contact | CorpFlowAI → ERPNext | `growth_companies.id` | `Customer.name` / `Contact.name` | Client Master duplicate rules (#880) | No second billing identity |
| Company Master | Company identity / Letter Head; Customer pointer for clients | read / pointer | approved assets | `Company.name` / `Customer.name` | Do not create a Customer named CorpFlowAI LTD | tax_id + Company No already live |
| `CmpTicket` | Issue | execution → durable ticket | `cmp_tickets.id` | `Issue.name` | Search subject containing ticket id | `/change` keeps execution fields |
| `PaymentRecord` | Sales Invoice / Payment Entry **references only** | blocked until financial-rail approval | `record_reference` | SI / PE name | Do not create SI/PE in #920 | No payment mutation |
| Delivery / project state | Project + Task from 12-phase template | after accepted quotation | operator notes / ticket | `Project.name` / `Task.name` | One Project per accepted Customer engagement | Standard Task subjects only |

`/change` remains the client-facing execution surface. ERPNext Issue is now writable (`ISS-2026-00001` synthetic proof) and is the durable support/business ticket — not a replacement for factory evidence. #1097 proved close/reopen and an internal description trail on that same Issue. #1202 GET-only acceptance confirmed the same Issue remains operationally usable without a second write.

PaymentRecord must **not** be treated as GL truth. ERPNext Payment Entry after bank clearance remains the clearance gate.
