# Change: Add shared Prospect Operations package (queue + workbench + Kanban)

## Why

CorpFlowAI already has three prospect/revenue operator surfaces, but they are product-split and do not share one record/workflow model. Operators need complementary Action Queue, Prospect Workbench, and Pipeline Kanban views over the same `leads` rows without building a second CRM (#721; doctrine #720; revenue programme #710–#716).

## What Changes

- Define a **canonical prospect view model** over existing `leads` + `qualificationJson` (no Prisma schema change).
- Add a **shared detail/action layer** (owner, stage/status, next action/due, notes, activity, closure) usable from every view.
- Connect **Action Queue**, **Prospect Workbench** (extracted from Lead Rescue branding), and **Kanban Revenue Cockpit** to the same data/actions.
- Add shared **exception signals** (overdue, due today, no next action, stale, etc.) and cross-view consistency tests.
- Keep AI bounded to summarise/recommend/draft-for-review only — no external send or protected commercial actions.

## Impact

- Affected specs: new capability `prospect-operations`
- Affected code (phased):
  - `lib/cmp/_lib/prospect-operations-view-model.js` (Slice 1)
  - `lib/cmp/_lib/ai-lead-rescue-operator.js`, `lib/cmp/_lib/rapid-delivery-operator.js` (JSON field adoption only)
  - `lib/server/admin-lead-rescue-api.js`, `lib/server/admin-rapid-delivery-api.js`
  - `components/RapidDeliveryRevenueDesk.js`, `components/AiLeadRescueAdminList.js`, `components/AiLeadRescueAdminDetail.js`
  - `pages/change/revenue.js`
  - new `components/prospect-ops/*`
- Docs: `docs/operations/PROSPECT_OPERATIONS_V1.md`
- Non-goals: new CRM/DB, schema without Anton, messaging automation, forecasting polish, deploy/payment automation

## Approval / Anton

- Slice 1 (audit + view-model contract): **no Anton action**
- Later slices: stop only if a Prisma migration or protected external action is proven necessary
