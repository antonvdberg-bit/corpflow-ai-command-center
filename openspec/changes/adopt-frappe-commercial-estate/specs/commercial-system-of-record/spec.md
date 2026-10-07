## ADDED Requirements

### Requirement: Paired Frappe commercial estate
The CorpFlowAI commercial architecture SHALL use Frappe CRM and ERPNext as a paired Frappe commercial estate where the supported same-site integration is technically feasible.

#### Scenario: Pre-sales record
- **WHEN** a named party is selected for active CorpFlowAI prospecting or nurture
- **THEN** the durable pre-sales record SHALL be a Frappe CRM Lead rather than a new CorpFlowAI commercial-master record

#### Scenario: Qualified pursuit
- **WHEN** a Lead becomes a qualified sales pursuit
- **THEN** the pursuit SHALL be represented as a Frappe CRM Deal

### Requirement: ERPNext transactional authority
ERPNext SHALL remain authoritative for transactional and financial commercial records including Customer, product/pricing, Quotation, invoice/payment and project records where standard ERPNext capability fits.

#### Scenario: Quotation creation
- **WHEN** a Deal is ready for a formal quotation and commercial identity requirements are satisfied
- **THEN** the quotation SHALL be created/reconciled in ERPNext using ERPNext product/pricing authority

### Requirement: CorpFlowAI non-duplication boundary
CorpFlowAI SHALL NOT operate a competing durable CRM/commercial ledger after cutover.

#### Scenario: Research candidate
- **WHEN** a possible target has not yet been selected for active prospecting
- **THEN** CorpFlowAI MAY retain research/enrichment evidence without creating a commercial master

#### Scenario: Selected prospect
- **WHEN** the operator selects the target for active prospecting
- **THEN** CorpFlowAI SHALL create/reconcile the Frappe CRM Lead and SHALL NOT create a parallel authoritative GrowthCompany/Lead record for commercial ownership

### Requirement: Migration safety
The migration SHALL be staged, deduplicated, reversible before final cutover, and non-destructive until explicit decommission approval.

#### Scenario: Dry run
- **WHEN** existing CorpFlowAI/ERPNext records are classified for migration
- **THEN** the system SHALL return CREATE, LINK, UPDATE, SKIP or CONFLICT decisions without modifying real data

#### Scenario: Conflict
- **WHEN** duplicate or ambiguous identity evidence is found
- **THEN** migration SHALL stop that record for review rather than create a second commercial identity

### Requirement: Native integration first
The migration SHALL prove and prefer Frappe CRM's supported ERPNext integration before any custom CRM↔ERP bridge is designed.

#### Scenario: Same-site integration succeeds
- **WHEN** the supported same-site CRM/ERPNext integration passes Customer, Contact/Address, Quotation and product/pricing acceptance tests
- **THEN** CorpFlowAI SHALL use that path and retire overlapping custom pre-sales bridges after cutover

#### Scenario: Same-site integration is blocked
- **WHEN** the current hosting topology cannot support the same-site integration
- **THEN** implementation SHALL stop and return the exact blocker before any paid hosting change or custom bridge is approved

### Requirement: Supported-version progression
CorpFlowAI SHALL keep the commercial estate on a supported paired Frappe CRM/ERPNext version and SHALL rehearse major-version upgrades before production.

#### Scenario: Current v16 operation
- **WHEN** Frappe CRM stable v1.x is compatible with the existing ERPNext/Frappe v16 estate
- **THEN** the migration SHALL prove that pair without requiring an immediate v17 upgrade

#### Scenario: Future v17 migration
- **WHEN** the CRM v2.x + ERPNext/Frappe v17 pair is considered production-ready
- **THEN** CorpFlowAI SHALL rehearse the paired upgrade on a clone before production cutover
