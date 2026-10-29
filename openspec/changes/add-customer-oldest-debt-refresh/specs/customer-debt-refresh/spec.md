## ADDED Requirements

### Requirement: Earliest positive unpaid due date
The planner SHALL calculate the earliest valid due date among qualifying issued invoices with positive remaining balances in one explicit customer and organization scope.

#### Scenario: Partial payment preserves oldest invoice
- **WHEN** an older invoice retains a positive partial balance and a newer invoice is also unpaid
- **THEN** the older due date is selected.

#### Scenario: Oldest invoice is fully settled
- **WHEN** the oldest invoice has zero remaining balance
- **THEN** it is excluded and the next qualifying due date is selected.

#### Scenario: Unallocated credit
- **WHEN** the customer has unallocated credit but an invoice still has positive remaining balance
- **THEN** the planner does not infer settlement or erase its date.

#### Scenario: Date eligibility
- **WHEN** an issued unpaid invoice has a future due date but an invoice date on/before as-of
- **THEN** its due date remains eligible, while future-dated invoices are excluded.

### Requirement: Complete-source clearing
The planner SHALL propose clearing a helper only after complete validated scoped source evidence proves no qualifying invoices remain.

#### Scenario: All invoices settled
- **WHEN** every invoice in a complete source is settled or excluded
- **THEN** an existing helper date receives an explicit clear intent.

#### Scenario: Truncated or malformed source
- **WHEN** pages are missing, duplicated, capped, contradictory or malformed
- **THEN** the customer is blocked and no set or clear intent is returned.

#### Scenario: Invalid unpaid due date
- **WHEN** a qualifying positive-balance invoice lacks a valid due date
- **THEN** the customer is blocked rather than selecting a later date.

### Requirement: Field-only deterministic intent
The planner SHALL return only the scoped helper-field change with expected old value and source identity/version, or unchanged/blocked.

#### Scenario: Unchanged date
- **WHEN** the computed date equals the supplied current helper
- **THEN** no update intent is produced.

#### Scenario: Cross-customer evidence
- **WHEN** an invoice belongs to another customer or organization
- **THEN** the customer is blocked.

#### Scenario: Exact input immutability
- **WHEN** the same valid fixture is evaluated repeatedly
- **THEN** outputs match and inputs remain unchanged.

### Requirement: Preparation-only boundary
The planner SHALL contain no live API, persistence, schedule, customer write or notification path.

#### Scenario: Proposed refresh requested
- **WHEN** all synthetic checks pass
- **THEN** the verdict remains preparation-only with native mapping, concurrent change handling, null clearing and activation unverified.
