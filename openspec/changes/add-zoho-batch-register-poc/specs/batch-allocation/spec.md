## ADDED Requirements

### Requirement: Synthetic batch allocation

The prototype SHALL plan positive item quantities against validated synthetic
batches using available balance (`balanceQuantity - reservedQuantity`), FEFO
ordering, and deterministic received-date and batch-ID tie breakers.

#### Scenario: FEFO split

- **WHEN** an item requests eight units and the earliest lot has six available
- **THEN** the plan allocates six from the earliest lot and two from the next
  eligible lot

#### Scenario: Shortage

- **WHEN** eligible stock is less than the request
- **THEN** the plan reports the unallocated quantity and does not mutate state

### Requirement: Safe local ledger mutation

The prototype SHALL validate dates, units, quantities, identities, versions,
and complete allocation splits before atomically committing a receipt or
allocation. State-changing requests SHALL support idempotent replay and reject
conflicting payloads.

#### Scenario: Stale plan

- **WHEN** a second plan uses a batch version changed by a prior commit
- **THEN** the second commit is rejected without partially applying its split

#### Scenario: Reversal

- **WHEN** a committed allocation is reversed for the first time
- **THEN** the allocation quantities are returned to the current lot balances,
  later receipts and sales are preserved, and a second reversal is rejected

### Requirement: Honest offline demonstration

The prototype SHALL provide a responsive static demonstration labelled as
synthetic and disconnected from Zoho, and SHALL document unproven Books
integration paths and local-only rollback.

#### Scenario: Review flow

- **WHEN** an operator opens the local demo
- **THEN** they can receive stock, review and confirm a suggested split, see
  history, undo the last allocation, and reset the in-memory state

### Requirement: Synthetic read-only register adapter

The prototype SHALL adapt fully synthetic paginated register and movement
records through an injected read-only transport and explicit field map. It
MUST require verified opening baselines, preserve core quantity precision,
replay receipts, allocations and supported allocation reversals
deterministically, and return synthetic physical/available quantities,
exclusions, proposed splits, shortages, and blockers. It MUST reject
malformed pagination, duplicate/conflicting identities or keys, invalid
dates/sequences, incompatible units, dangling or unsupported reversals, and
negative balances without mutating fetched records.

#### Scenario: Paginated synthetic preview

- **WHEN** a mapped synthetic register has two lots with six and ten units
  and the request is eight units
- **THEN** all pages are read and the result proposes six from the earliest
  expiry and two from the next lot without any write operation

#### Scenario: Missing baseline

- **WHEN** a requested lot has no explicitly verified opening baseline
- **THEN** the adapter blocks the preview rather than resetting or guessing
  the opening quantity

#### Scenario: Reversal replay

- **WHEN** an allocation of two follows an opening ten and later receipt of
  five, then its valid full reversal is read
- **THEN** the derived balance is fifteen and the later receipt remains
  represented
