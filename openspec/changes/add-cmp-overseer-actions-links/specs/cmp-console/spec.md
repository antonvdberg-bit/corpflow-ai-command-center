## ADDED Requirements

### Requirement: GitHub Actions run link after sandbox dispatch
The system SHALL provide operators with a GitHub Actions run link (or a deterministic fallback link to the Actions page) after a CMP sandbox dispatch is accepted.

#### Scenario: Dispatch accepted and run link is available
- **WHEN** `approve-build` triggers a sandbox dispatch successfully
- **THEN** the API response includes a `sandbox_branch.run_url` (GitHub HTML URL) when resolvable

#### Scenario: Dispatch accepted but run link cannot be resolved
- **WHEN** `approve-build` triggers a sandbox dispatch successfully
- **AND** the workflow run cannot be resolved immediately
- **THEN** the API response includes a fallback `sandbox_branch.actions_url`

### Requirement: Overseer view for automation outputs
The system SHALL provide an Overseer view that lists commits and changed files for the sandbox branch associated with a CMP ticket.

#### Scenario: Admin views overseer data
- **WHEN** an admin session requests overseer data for a `ticket_id`
- **THEN** the API returns a list of commits and changed files (best-effort)

#### Scenario: Non-admin is denied overseer access
- **WHEN** a non-admin session requests overseer data
- **THEN** the request is denied with 403

