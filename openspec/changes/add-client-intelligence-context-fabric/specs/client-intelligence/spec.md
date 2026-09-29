## ADDED Requirements
### Requirement: Durable internal client context
The system SHALL store internal client context separately from public tenant knowledge, with typed records, lifecycle state, confidence/verification, validity, sensitivity and provenance.

#### Scenario: OrixHealth corpus is re-seeded
- **WHEN** the OrixHealth seed mechanism runs
- **THEN** it creates or refreshes one `orixhealth` context space with facts, research, options, decisions, unknowns, stakeholders and commitments linked to source identities and extracted claims.

### Requirement: Factory-authenticated grounded retrieval
The system SHALL provide bounded retrieval and deterministic question answering for a context space, and SHALL reject unauthenticated access.

#### Scenario: Operator asks about banking
- **WHEN** an authenticated factory operator submits a banking question
- **THEN** the response contains only retrieved context records and identifies supporting provenance records.

#### Scenario: Unauthenticated request
- **WHEN** a request reaches the client-intelligence API without factory master authentication
- **THEN** the API returns 403 and does not query or expose context data.

### Requirement: Operator interrogation surface
The system SHALL provide an internal `/change/client-intelligence` route where an operator can select/search records, inspect current state and ask an ad-hoc grounded question.

#### Scenario: Call preparation
- **WHEN** the operator opens the route
- **THEN** OrixHealth is the default context and the page presents priorities, unknowns, decisions, records and source labels in a call-usable layout.
