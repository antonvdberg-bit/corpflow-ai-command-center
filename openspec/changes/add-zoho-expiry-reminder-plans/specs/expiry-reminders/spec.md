## ADDED Requirements

### Requirement: Bounded threshold selection
The planner SHALL reuse the canonical expiry review to select only the current90/60/30-day age band from complete valid supplied stock evidence.

#### Scenario: Boundary and catch-up
- **WHEN** positive-stock required-expiry lots are90,60,30,20 and91days from expiry
- **THEN** propose thresholds90,60,30,30 and none respectively, never older missed thresholds.

#### Scenario: Exclusions and review
- **WHEN** stock is zero or explicitly non-expiring
- **THEN** no warning is proposed; today/expired lots produce review only and unknown/malformed policy/expiry blocks complete planning.

### Requirement: Receipt-backed suppression
The planner SHALL derive stable scoped warning identities and suppress only exactly matching confirmed sent receipts from complete valid history.

#### Scenario: Repeated evaluation
- **WHEN** a candidate identity has an exactly matching confirmed sent receipt
- **THEN** no repeated intent is produced and input data stays unchanged.

#### Scenario: Changed expiry
- **WHEN** the same lot receives a different validated expiry date
- **THEN** it has a distinct reminder-cycle identity while the earlier receipt remains historical.

#### Scenario: Ambiguous receipt
- **WHEN** history is incomplete, duplicated, conflicting, cross-scope, malformed or uncertain
- **THEN** block before returning any reminder intents.

### Requirement: Complete scoped evidence
The planner SHALL require explicit organization/as-of/recipient-set scope, matching independently supplied source attestations, strict Gregorian timestamps and bounded arrays.

#### Scenario: Missing or contradictory evidence
- **WHEN** a source field, complete flag or expected snapshot differs or is absent
- **THEN** return a bounded blocked result with no partial warning plan.

### Requirement: Unconnected preparation
The planner SHALL contain no send, scheduler, API, credential, persistence or native-write path.

#### Scenario: Passing synthetic verification
- **WHEN** all fixture checks pass
- **THEN** outputs still declare read-only, synthetic, non-operational and sendPath=false.
