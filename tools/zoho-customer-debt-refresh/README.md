# Synthetic customer oldest-debt refresh planner

`plan.cjs` is a dependency-free, CommonJS-only calculator for synthetic Zoho-like
invoice fixtures. It validates one explicit organization/customer/currency scope,
independently supplied expected snapshot evidence, and complete sequential invoice pages
before returning a field-only `set`, `clear`, `unchanged`, or `blocked` result.

The planner uses exact decimal strings for positive-balance checks and selects the
earliest due date from issued, unpaid, sent, overdue, partially-paid or other
documented unpaid invoices whose invoice date is not future relative to `asOf`.
Future due dates remain eligible. Partial payment and
allocated credit are represented by `remainingBalance`; unallocated credit is not
used to infer settlement.

`expectedSource` must independently repeat the source snapshot ID, version,
fingerprint and strict UTC observation timestamp. Every page must attest the same
nested `scope` and `source`; flat aliases, unknown statuses, malformed continuation,
truncation, duplicate scopes and incomplete pages block before any intent. Results
preserve currency, as-of date, fingerprint and observation time. `planMany()`
isolates customer failures and marks aggregate coverage incomplete when any customer
is blocked. The source fingerprint is fixture-consistency evidence, not proof of
live authenticity or concurrency.

This is preparation-only. It has no API client, credentials, filesystem access,
database, scheduler, timer, notification, customer update, persistence, or live
field binding. Native mapping, null-clearing behavior, concurrent-change handling,
refresh frequency, and activation remain separate gates.

Run:

```bash
node --test node-tests/zoho-customer-debt-refresh.test.mjs
node --check tools/zoho-customer-debt-refresh/plan.cjs
```
