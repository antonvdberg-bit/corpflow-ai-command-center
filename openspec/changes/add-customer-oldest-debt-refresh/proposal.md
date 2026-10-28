# Change: Prepare customer oldest-debt refresh

## Status
PROPOSED. Documentation only; no runtime implementation, native installation or customer update is authorised by this proposal.

## Why
An oldest-debt report depends on a customer helper date. Manual population becomes stale after invoices, payments or credit allocations change. A deterministic complete-source calculation can prepare only the required helper-field changes.

## What Changes
- Add a pure synthetic planner returning set, clear, unchanged or blocked for each customer.
- Use earliest due date among current positive unpaid invoice balances, preserving partial payments.
- Require complete scoped pagination, valid identities/dates and current balance evidence before setting or clearing.
- Produce field-only update intents with expected old value and source evidence, never a whole-customer import.
- Describe later native refresh, race/recovery and activation gates without implementing a writer or scheduler.

## Impact
Proposed implementation: tools/zoho-customer-debt-refresh/plan.cjs, node-tests/zoho-customer-debt-refresh.test.mjs and README, alongside this specification. No dependency, schema, workflow, connection, environment or live data change.
Existing statement preparation supplies adjacent bounded-pagination patterns; inspect reuse without coupling or changing its accepted semantics.

## Acceptance boundary
Only deterministic calculation and field-only synthetic intents. No native field binding, API transport, write, schedule or notification. Native install/write/activation needs exact later approval.
