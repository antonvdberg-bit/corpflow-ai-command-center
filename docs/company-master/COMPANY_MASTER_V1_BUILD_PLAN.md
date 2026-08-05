# CorpFlowAI Company Master v1 — Build Plan

**Status:** Active foundation plan  
**Controller:** GitHub issue #765  
**Scope:** Company Master environment only  
**Authority:** Repository design and synthetic proof are authorised. Production database, ERPNext, Drive permissions, restricted documents, real company data, deployment and external communication remain separately gated.

## 1. Objective

Build one reusable Company Master environment that governs authoritative company facts, evidence references, verification, approval, publication and downstream mappings for CorpFlowAI and client companies.

The Company Master is not a CRM, tenant registry, document store, ERP replacement or second production application.

## 2. Core architecture

### Stable identities

- `company_id` is the immutable Company Master identity.
- `tenant_id` remains the operational tenant identity where a company has a CorpFlowAI tenant.
- A company may exist before a tenant is provisioned.
- A tenant references an approved Company Master record when company identity is required.

### System ownership

| Information class | Authoritative location |
|---|---|
| Governed structured company facts | Postgres Company Master model after schema approval |
| Tenant routing and runtime identity | Existing `tenants` / `tenant_hostnames` structures |
| Restricted evidence contents | Approved restricted Google Drive location |
| Evidence references, status and metadata | Company Master |
| Quotations, invoices and commercial records | ERPNext where approved |
| Schemas, controlled vocabularies, synthetic fixtures, tests, mappings and runbooks | GitHub |
| Operator task/approval projection | `/change`, referencing Company Master records |

## 3. v1 capabilities

1. Stable company identity.
2. Governed fields with source, sensitivity, verification and approval metadata.
3. Evidence checklist and evidence lifecycle.
4. Conflict handling without silent overwrite.
5. Public/internal/restricted publication control.
6. Review and expiry dates.
7. Mapping contracts for tenant, website and ERPNext uses.
8. Synthetic CorpFlowAI and client-onboarding proofs.
9. Manual operator workflow and approval gates.

## 4. v1 data contract

### Company record

- `company_id`
- `company_type`
- `jurisdiction`
- `lifecycle_status`
- `tenant_id` (nullable link)
- `record_owner`
- `created_at`
- `updated_at`
- `next_review_date`

### Governed field

- `company_id`
- `field_key`
- `field_value`
- `information_domain`
- `canonical_source`
- `source_document_reference`
- `source_system`
- `sensitivity_classification`
- `publication_status`
- `verification_status`
- `verified_by`
- `verified_at`
- `approval_status`
- `approved_by`
- `approved_at`
- `change_reason`
- `previous_value_reference`

### Evidence requirement

- `company_id`
- `requirement_key`
- `requirement_reason`
- `conditional_rule`
- `evidence_status`
- `document_reference`
- `received_at`
- `verified_at`
- `verified_by`
- `expiry_date`
- `waiver_reason`
- `waiver_approved_by`

## 5. Controlled vocabularies

### Sensitivity

- `PUBLIC`
- `INTERNAL`
- `CONFIDENTIAL`
- `HIGHLY_RESTRICTED`

### Evidence lifecycle

- `NOT_REQUIRED`
- `REQUESTED`
- `AWAITING_CLIENT`
- `RECEIVED`
- `UNDER_REVIEW`
- `VERIFIED`
- `REJECTED`
- `EXPIRED`
- `SUPERSEDED`
- `WAIVED_WITH_APPROVAL`

### Company lifecycle

- `DRAFT`
- `ONBOARDING`
- `EVIDENCE_INCOMPLETE`
- `UNDER_VERIFICATION`
- `READY_FOR_APPROVAL`
- `ACTIVE`
- `REVIEW_REQUIRED`
- `SUSPENDED`
- `OFFBOARDED`
- `ARCHIVED`

### Publication status

- `NOT_ASSESSED`
- `INTERNAL_ONLY`
- `APPROVED_PUBLIC`
- `RESTRICTED`
- `WITHDRAWN`

### Verification status

- `UNVERIFIED`
- `RECEIVED_NOT_VERIFIED`
- `VERIFIED`
- `CONFLICTING`
- `EXPIRED`
- `REJECTED`

## 6. Delivery phases

### Phase 0 — repository and system audit

Inspect tenant/client/company identifiers, onboarding structures, Postgres migrations and JSON fields, `/change` approval patterns, ERPNext integration docs, Drive/folder manifests, public company facts, and duplicate work.

Output: reuse map, duplicate map, target paths and exact blockers.

### Phase 1 — repository foundation

Create:

```text
company-master/
├── README.md
├── architecture/
├── schemas/
├── config/
├── mappings/
├── templates/
├── examples/
├── operations/
└── tests/
```

No production schema or runtime changes.

### Phase 2 — synthetic proofs

- Proof A: synthetic CorpFlowAI company record.
- Proof B: synthetic client onboarding with missing evidence and conflicting company name.

### Phase 3 — manual operating workflow

Define provisional creation, evidence request, receipt without verification, verification/rejection/expiry, conflict resolution, publication approval, activation/review/suspension/archive, and `/change` projection.

### Phase 4 — production decision packet

Return exact proposals for Postgres schema, ERPNext mappings, restricted Drive structure, `/change` projection, migration/rollback, retention/access policy, and first real company onboarding.

No Phase 4 execution without Anton approval.

## 7. Test requirements

- schema validation for both synthetic examples;
- stable `company_id` and nullable `tenant_id` relationship;
- company isolation;
- receipt is not verification;
- missing sensitivity/publication metadata fails closed;
- conflicts preserve history and block activation where material;
- expired evidence triggers review;
- conditional requirements vary by jurisdiction/company type/service;
- restricted evidence contents are absent from GitHub fixtures;
- downstream mapping uses only approved values;
- `git diff --check` clean.

## 8. Acceptance boundary

Company Master v1 foundation is ready when architecture and ownership are explicit, schemas and vocabularies exist, both synthetic proofs pass, the manual workflow is documented, mappings are defined, security checks pass, and one production decision packet exists.

## 9. Explicit non-goals

- no custom document storage;
- no OCR/document-extraction platform;
- no automated registry lookup;
- no broad CRM rebuild;
- no ERPNext replacement;
- no second app/database;
- no production schema/data change;
- no real company migration;
- no external document request or message;
- no production deployment.

## 10. Immediate execution order

1. Complete repository/current-system audit.
2. Confirm stable identity and source-of-truth contract.
3. Create schemas and vocabularies.
4. Create synthetic CorpFlowAI and client fixtures.
5. Add validation/security tests.
6. Document manual operating workflow.
7. Define mappings.
8. Produce protected production decision packet.
