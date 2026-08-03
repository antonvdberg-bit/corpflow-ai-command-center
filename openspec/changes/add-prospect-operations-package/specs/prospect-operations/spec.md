## ADDED Requirements

### Requirement: Canonical prospect view model over existing leads
The system SHALL project Lead Rescue and Rapid Delivery prospect records from the existing `leads` table and `qualificationJson` product namespaces into one shared prospect view model without requiring a Prisma schema migration.

#### Scenario: Lead Rescue row projects consistently
- **WHEN** a `leads` row has `qualificationJson.intake_meta.product = ai-lead-rescue`
- **THEN** the shared view model exposes id, tenant boundary, person/organisation, native status, canonical stage, owner, next action, next-action due (including activity fallback), and exception signals

#### Scenario: Rapid Delivery / Website Rescue path row projects consistently
- **WHEN** a `leads` row has `qualificationJson.intake_meta.product = corpflow-rapid-delivery`
- **THEN** the shared view model exposes the same identity fields and maps operator status into a canonical stage

#### Scenario: No second CRM store
- **WHEN** Prospect Operations views load or mutate prospects
- **THEN** they use the existing `leads` record (and product JSON) and MUST NOT introduce a separate prospect database or table

### Requirement: Shared exception and Action Queue ordering
The system SHALL compute a shared exception vocabulary and default-order Action Queue work by overdue, due today, then no next action.

#### Scenario: Overdue takes priority
- **WHEN** multiple prospects are queued and one has an overdue next-action due date
- **THEN** that prospect sorts ahead of due-today and no-next-action prospects

#### Scenario: My Work / Today filter
- **WHEN** an operator applies the My Work / Today filter
- **THEN** the queue includes overdue, due today, no next action, and awaiting-operator items without requiring a separate application

### Requirement: Safe manual intervention boundary
The system SHALL allow authorised safe interventions (stage/owner/next action/notes/activity/closure/prepare draft) and MUST block protected actions such as external send from the shared Prospect Operations intervention helper.

#### Scenario: Prepare draft is allowed
- **WHEN** an authorised operator requests `prepare_draft`
- **THEN** the shared intervention helper accepts the action

#### Scenario: External send is blocked
- **WHEN** any caller requests `external_send` through the shared intervention helper
- **THEN** the helper rejects the action with `PROTECTED_ACTION_BLOCKED`

### Requirement: Canonical stage transition guards
The system SHALL expose canonical stage transition checks for shared Kanban/queue moves while persisting product-native statuses through existing product adapters.

#### Scenario: Forward commercial move allowed
- **WHEN** a prospect is in canonical stage `proposal_sent` and an operator moves it to `won`
- **THEN** the canonical transition check allows the move

#### Scenario: Invalid reverse from won blocked at canonical layer
- **WHEN** a prospect is in canonical stage `won` and an operator attempts to move it to `new`
- **THEN** the canonical transition check rejects the move

### Requirement: Three complementary views over one workflow
The system SHALL provide Action Queue, Prospect Workbench, and Pipeline Kanban views that operate on the same underlying prospect records and shared detail/action layer.

#### Scenario: Cross-view identity
- **WHEN** the same lead is projected for queue, workbench, and kanban consumers
- **THEN** id and canonical stage match across projections

#### Scenario: Workbench is not Lead Rescue-owned
- **WHEN** the reusable workbench component is extracted
- **THEN** it MUST NOT remain structurally branded or exclusively owned by AI Lead Rescue
