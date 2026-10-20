# Change: Adopt Frappe CRM + ERPNext as the CorpFlowAI commercial estate

## Why

CorpFlowAI currently duplicates CRM/prospect functions across Postgres Growth models, Postgres lead/operator surfaces, and ERPNext Lead/Opportunity records. Frappe CRM is the forward CRM application in the Frappe ecosystem and integrates natively with ERPNext, including Customer/Quotation handoff and ERPNext product/pricing authority. Continuing to expand CorpFlowAI as a CRM or the legacy ERPNext CRM workspace creates avoidable duplication and migration debt.

## What Changes

- Establish Frappe CRM as the authoritative pre-sales application for selected prospects, Leads, Deals and pre-sales activities.
- Retain ERPNext as the authoritative transactional/commercial ERP for Customer, pricing, quotation, order/invoice/payment, project/support and finance.
- Treat same-site Frappe CRM + ERPNext as one commercial estate where technically supported.
- Stop expanding the legacy ERPNext CRM workspace and CorpFlowAI's Growth/Prospect Operations as competing durable CRM systems.
- Migrate current active prospecting/sales data through a staged, deduplicated, reversible process.
- Preserve CorpFlowAI research/enrichment/AI/channel-execution capabilities only where they add value around the Frappe commercial estate.
- Supersede the previously proposed meaningful-engagement admission boundary and replace it with: research candidates may remain outside CRM; once a named party is selected for active prospecting/nurture it belongs in Frappe CRM as a Lead.

## Impact

- Affected specs: new capability `commercial-system-of-record`.
- Affected workstreams/contracts: #701, #721, #918, #1009, #1018, #1411, #1412, current Growth prospect import/pipeline and quotation readiness.
- Likely affected runtime code/config after proposal approval:
  - `config/crm-operating-baseline.v1.json`
  - `config/erpnext-source-of-truth-matrix.v1.json`
  - `config/erpnext-sales-lifecycle-bridge.v1.json`
  - `lib/server/growth-pipeline.js`
  - `lib/erpnext/*` bridge/readiness helpers
  - prospect import/reconciliation scripts
  - duplicated Prospect Operations UI/write paths
- External dependency: Frappe CRM stable v1.x compatible with Frappe/ERPNext v16.
- No production install, data migration, custom field/schema mutation, external messaging, paid hosting change, merge or deploy is authorized by this proposal.
