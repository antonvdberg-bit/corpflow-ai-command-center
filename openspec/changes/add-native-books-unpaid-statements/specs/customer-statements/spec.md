## ADDED Requirements

### Requirement: Complete-history unpaid statement preparation

The preparation tooling MUST read an explicit, bounded pagination chain for one customer,
validate page context and invoice ownership, select positive remaining balances from
sent, overdue, and partially-paid invoices, and calculate a statement period ending at
the caller's valid as-of date. It MUST keep currencies separate using customer context or
an explicit currency input, preserve native invoice balances, return bounded period and
currency metadata, and return `no_statement` when no eligible debt exists.

#### Scenario: Oldest debt is on a later unordered page
- **WHEN** page one contains newer debt and a later page contains an older unpaid invoice
- **THEN** the plan uses the later invoice as the earliest eligible date and covers at least
  90 days through the explicit as-of date

#### Scenario: Partially paid debt is selected
- **WHEN** an invoice has status `partially_paid` and a positive native balance
- **THEN** the plan includes the remaining balance without subtracting credits

#### Scenario: No eligible debt
- **WHEN** all invoices are paid, void, draft, future-dated, unsupported, or non-positive
- **THEN** the plan returns `no_statement` and exposes no send action

### Requirement: Fail-closed evidence validation

The preparation tooling MUST fail closed for malformed dates or balances, contradictory
invoice evidence, wrong customer or currency, duplicate invoice IDs, nonzero/transport
errors, missing or inconsistent page context, empty continuing pages, and history that
reaches the 10-page cap with more pages remaining. It MUST not mutate caller inputs.

#### Scenario: Pagination is incomplete
- **WHEN** a page is missing, has an error, has invalid page context, or says more pages
  remain after the cap
- **THEN** the plan returns a typed validation failure rather than a partial statement

#### Scenario: Invoice ownership is inconsistent
- **WHEN** an invoice ID repeats or its customer/currency differs from the request
- **THEN** the plan returns a typed mismatch failure and no statement period

### Requirement: Disabled native preparation draft

The native draft MUST use only Books-supplied customer and organization context plus a
configurable named connection. It MUST use a bounded supported Deluge iteration form,
exclude valid future-dated invoices, and fail closed when customer currency scope is
missing or mixed. It MUST remain disabled and preparation-only: no statement or email
POST, sendmail, update, schedule, activation toggle, live invocation, sensitive logging,
or executable send path is permitted.

#### Scenario: Controller reviews the native draft
- **WHEN** the controller installs the draft for review
- **THEN** it is compiled and tested read-only while disabled, with separate gates for
  recipients, cadence, duplicate protection, reconciliation, and reviewed send activation

#### Scenario: Draft has no debt
- **WHEN** a read-only preparation run finds no eligible balance
- **THEN** it returns bounded `no_statement` metadata and does not send or update anything
