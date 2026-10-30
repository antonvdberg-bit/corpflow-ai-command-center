## ADDED Requirements

### Requirement: Scoped invoice-to-batch proposal
The system SHALL calculate a complete synthetic allocation intent for each invoiced line using the existing canonical-policy allocator and verified supplied batch snapshots. It SHALL retain stable organization, invoice/version, line, item, batch and unit identity with exact quantities and expected snapshot evidence.

#### Scenario: Invoice quantity differs from the order
- **WHEN** an invented order requests 3 units and its explicit stock-effective invoice event contains 2 units
- **THEN** the planner proposes batch quantities totaling exactly 2 for that invoice line and does not allocate the unbilled unit.

#### Scenario: Split across eligible lots
- **WHEN** two eligible lots are required to fulfil an invoice line under the canonical expiry policy
- **THEN** the intent retains both batch identities and exact split quantities in the existing FEFO/FIFO order.

#### Scenario: Invalid identity or evidence
- **WHEN** organization, line identity, canonical policy, unit, opening/reservation evidence or snapshot provenance is missing or contradictory
- **THEN** the complete event is blocked with a bounded reason and no partial intents.

### Requirement: Complete planning before output
The system SHALL return proposed only when every invoice line is satisfiable against the supplied verified snapshot. It SHALL not mutate inputs or reserve/consume stock.

#### Scenario: Later line has a shortage
- **WHEN** the first line is satisfiable but a later line has insufficient eligible batch quantity
- **THEN** the complete event is blocked and no first-line allocation is returned as committed or ready to post.

#### Scenario: Draft invoice
- **WHEN** the explicit event represents a draft/unsent invoice
- **THEN** no allocation or reservation is proposed.

### Requirement: Receipt-backed duplicate handling
The system SHALL return no_op only for an identical event and payload with matching previously accepted allocation evidence. Reused identities with different payloads or ambiguous prior receipts SHALL block.

#### Scenario: Same event delivered twice
- **WHEN** an identical event and invoice version have a matching accepted receipt
- **THEN** the second delivery is no_op and creates no additional allocation.

#### Scenario: Conflicting event payload
- **WHEN** an event identity is reused with changed line quantities or a different invoice fingerprint
- **THEN** the result is blocked rather than allocating twice.

### Requirement: No inferred physical reversal
The system SHALL NOT automatically free batch quantities or increase stock from an invoice edit, void/cancel, credit note or return claim without separately verified physical-movement and disposition evidence.

#### Scenario: Credit note without stock-return evidence
- **WHEN** a credit note exists without verified physical return and disposition
- **THEN** no restock or allocation reversal is proposed.

#### Scenario: Revision after accepted allocation
- **WHEN** line quantities change after accepted allocation receipts exist
- **THEN** the planner blocks for reconciliation rather than silently replacing or reversing those allocations.

### Requirement: Synthetic and unconnected boundary
The system SHALL perform no API, credential, persistence, stock/accounting, scheduler or send action. Expected versions and fingerprints SHALL be preparation metadata, not a claim of atomic native commit.

#### Scenario: Repeated deterministic evaluation
- **WHEN** the same invented event, receipt set and verified snapshot are evaluated twice
- **THEN** outputs match and inputs and external state remain unchanged.

#### Scenario: Operational readiness requested
- **WHEN** only the synthetic intent tests pass
- **THEN** the delivery verdict still marks live mapping, native lifecycle, durable concurrency/recovery and operational enforcement unverified.
