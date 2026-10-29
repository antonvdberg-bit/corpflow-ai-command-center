# Synthetic customer oldest-debt refresh planner

`plan.cjs` is a dependency-free, CommonJS-only calculator for synthetic Zoho-like
invoice fixtures. It validates one explicit organization/customer/currency scope,
independently supplied snapshot evidence, and complete sequential invoice pages
before returning a field-only `set`, `clear`, `unchanged`, or `blocked` result.

The planner uses exact decimal strings for positive-balance checks and selects the
earliest due date from issued unpaid invoices whose invoice date is not future
relative to `asOf`. Future due dates remain eligible. Partial payment and
allocated credit are represented by `remainingBalance`; unallocated credit is not
used to infer settlement.

`planMany()` isolates customer failures and marks aggregate coverage incomplete when
any customer is blocked. The source fingerprint is fixture-consistency evidence,
not proof of live authenticity or concurrency.

This is preparation-only. It has no API client, credentials, filesystem access,
database, scheduler, timer, notification, customer update, persistence, or live
field binding. Native mapping, null-clearing behavior, concurrent-change handling,
refresh frequency, and activation remain separate gates.

Run:

```bash
node --test node-tests/zoho-customer-debt-refresh.test.mjs
node --check tools/zoho-customer-debt-refresh/plan.cjs
```
