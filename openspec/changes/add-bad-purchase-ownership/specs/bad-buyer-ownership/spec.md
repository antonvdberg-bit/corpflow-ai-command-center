## ADDED Requirements

### Requirement: Authenticated buyer ownership is durable and session-bound
The system SHALL persist Business Admin Desk purchase ownership in the existing
Core Postgres database with an immutable authenticated `AuthUser` id, tenant,
brand, unique checkout intent, unique order confirmation reference, and unique
nullable Paddle transaction reference.

#### Scenario: Session bind succeeds
- **WHEN** a verified tenant `corpflow_session` with `user_id` and `tenant_id` binds a checkout intent while the durable flag is enabled and the tables exist
- **THEN** the system stores that owner and returns server-created intent and confirmation references

#### Scenario: Unauthenticated bind fails
- **WHEN** bind is attempted without a verified tenant session user
- **THEN** the system refuses and stores no ownership row

### Requirement: Payment webhooks cannot create or replace ownership
A verified Paddle webhook SHALL update payment or reversal state only for an
already-bound provider transaction reference. It MUST NOT create an owner from
email, custom metadata, correlation id, or an unbound transaction.

#### Scenario: Unbound completion is ignored
- **WHEN** a `transaction.completed` webhook arrives for a Paddle id with no bound checkout intent
- **THEN** the event is accepted and ignored and no ownership row is created

#### Scenario: Refund before bind remains terminal
- **WHEN** a refund webhook arrives before bind and the same Paddle id is later bound and completed
- **THEN** the ownership row is a refunded or revoked tombstone and confirmation cannot be issued or retrieved

### Requirement: Feature remains inert until separately authorised
The durable ownership feature MUST stay non-operational until the prepared
migration is applied under a separate approval and
`CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE` is explicitly enabled.

#### Scenario: Flag off
- **WHEN** the durable flag is unset or `0`
- **THEN** bind and retrieve routes return a disabled error and webhooks do not write ownership rows
