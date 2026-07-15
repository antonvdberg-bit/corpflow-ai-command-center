## ADDED Requirements

### Requirement: Protected LuxeMaurice content-update route

The system SHALL provide `/client/luxe-maurice-ai/content` only within the authoritative LuxeMaurice tenant host and existing allowlisted editor session boundary.

#### Scenario: Anonymous user opens the route

- **WHEN** an unauthenticated user opens the content-update route on the LuxeMaurice host
- **THEN** the system redirects to the existing login flow with a path-only `next` target

#### Scenario: Wrong tenant or non-editor opens the route

- **WHEN** a session is not scoped to LuxeMaurice or is not an allowed editor session
- **THEN** the system fails closed without exposing content requests or cross-tenant data

### Requirement: Structured content-update request

The system SHALL let an authorised editor submit one of: property/listing update, image/photo update, document/PDF update, video/walkthrough link update, or text/page-copy update.

#### Scenario: Editor completes a request

- **WHEN** the editor supplies request type, property/reference, target page/section, asset link or file reference, visibility, instructions, and priority
- **THEN** the system validates bounded values and presents a clear submit action

#### Scenario: Editor submits unsupported values

- **WHEN** request type, visibility, priority, or required instructions are invalid
- **THEN** the system rejects the request with a client-safe error and creates no ticket

### Requirement: Existing tenant-scoped persistence

The system SHALL persist valid content-update requests through the existing CMP ticket path under tenant `luxe-maurice`, without a new database, table, schema, migration, or client-supplied tenant id.

#### Scenario: Valid request is submitted

- **WHEN** an authorised LuxeMaurice editor submits a valid request
- **THEN** the system creates a tenant-scoped CMP ticket visible in the existing `/change` operator queue

### Requirement: Client confirmation and publication boundary

The system SHALL display a `CONTENT-REQ-…` reference and explain that CorpFlowAI/operator review and explicit publication occur after submission.

#### Scenario: Request creation succeeds

- **WHEN** CMP persistence returns a ticket id
- **THEN** the page displays a stable client reference and states that CorpFlowAI will review, apply the approved update, and return a preview/live link for verification

#### Scenario: Client interprets submission status

- **WHEN** the success state is shown
- **THEN** it MUST NOT claim that content is already public, automatically published, emailed, or sent through WhatsApp/SMS

### Requirement: Safe asset-reference workflow

The first slice SHALL accept hosted video links and external asset/file references without claiming a new binary-upload or public-media capability.

#### Scenario: Video request

- **WHEN** Jan provides a YouTube, Vimeo, or other approved hosted link
- **THEN** the link and placement instructions are recorded for operator review

#### Scenario: File is delivered outside the page

- **WHEN** Jan references an image, PDF, or raw video delivered through an approved human channel
- **THEN** the request records the file reference and instructions without claiming the file was uploaded or published

### Requirement: Visible training evidence

The Jan PDF/HTML SHALL show the implemented route, form, confirmation, examples, review boundary, and verification checklist near the front.

#### Scenario: Package is rebuilt

- **WHEN** the training package generator runs after implementation
- **THEN** the PDF/HTML includes **How to add or update LuxeMaurice website content** and screenshots 09–11 using fictional data
