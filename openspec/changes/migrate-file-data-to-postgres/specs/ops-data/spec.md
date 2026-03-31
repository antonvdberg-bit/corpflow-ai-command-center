## ADDED Requirements

### Requirement: Operational state stored in Postgres
The system SHALL store operational runtime state in Postgres rather than writing to local filesystems in production/serverless environments.

#### Scenario: Token credit balance stored in Postgres
- **WHEN** token credit balance is queried or debited for a tenant
- **THEN** the balance is read/written in Postgres
- **AND** filesystem writes to `tenants/<tenantId>/persona.json` are not required

#### Scenario: Telemetry stored in Postgres
- **WHEN** a telemetry event is emitted
- **THEN** it is stored in Postgres with tenant_id, event_type, occurred_at, and payload

#### Scenario: Recovery vault stored in Postgres
- **WHEN** the system journals a fallback record (e.g., DB outage recovery)
- **THEN** the journal is stored in Postgres rather than `recovery_vault.json`

### Requirement: Production does not depend on local files
The system SHALL function in serverless deployments without requiring writable local disk for operational state.

#### Scenario: CMP approve-build on serverless
- **WHEN** a CMP ticket is approved and automation is dispatched
- **THEN** required operational state (token debits, telemetry, overseer reports) is stored in Postgres
- **AND** missing local filesystem state does not block the request

