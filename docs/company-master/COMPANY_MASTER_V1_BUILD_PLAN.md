# CorpFlowAI Company Master v1 — Build Plan

**Status:** Active foundation plan  
**Controller:** GitHub issue #765  
**Scope:** Company Master environment only  
**Business goal:** One authoritative company identity, fact, asset and document-reference hub used by CorpFlowAI processes and downstream outputs.  
**Authority:** Repository design and synthetic proof are authorised. Production database, storage permissions, ERPNext configuration, real company data, restricted documents, deployment and external communication remain separately gated.

## 1. Objective

Build one reusable Company Master environment that governs authoritative company facts, brand assets, company-document references, evidence, verification, approval, publication and downstream mappings for CorpFlowAI and client companies.

A Company Master record is the logical container for one company. It must provide one controlled reference point for:

- legal and trading identity;
- approved contact and address information;
- registration, tax, banking and compliance evidence references;
- logos, brand marks, signatures, letterheads and approved image assets;
- publication and usage status;
- effective versions and historical versions;
- downstream consumers such as websites, proposals, quotations, invoices, onboarding and delivery workflows.

The business outcome is update-once, consume-everywhere. For example, when an approved logo version changes in Company Master, future downstream renders must resolve the new approved version rather than retain independent copies or hard-coded paths.

The Company Master is not a second CRM, tenant registry, ERP, production application or production database. It is a governed domain within the existing CorpFlowAI platform.

## 2. Core architecture

### Stable identities

- `company_id` is the immutable Company Master identity.
- `tenant_id` remains the operational tenant identity where a company has a CorpFlowAI tenant.
- A company may exist before a tenant is provisioned.
- A tenant references an approved Company Master record when company identity is required.
- Every governed asset and document reference belongs to one `company_id`.

### Logical container versus physical storage

The Company Master is the authoritative logical container, but not every binary file belongs in Postgres.

- Postgres stores structured facts, asset/document metadata, version records, approval state, hashes, canonical references and downstream aliases.
- Approved document/object storage stores binary files such as PDFs, PNGs, SVGs, JPGs and office documents.
- Restricted evidence contents never enter GitHub.
- GitHub stores schemas, controlled vocabularies, mappings, synthetic fixtures, tests and runbooks only.

This preserves one source of truth without forcing large or sensitive binary files into database rows or repository history.

### System ownership

| Information class | Authoritative location |
|---|---|
| Governed structured company facts | **Split (#880):** billing legal/trading name, contact and address are authoritative in **ERPNext Customer / Contact / Address**. Company Master keeps verification/approval metadata and pointers, not a second commercial customer. |
| Asset/document catalogue, metadata, versions and canonical pointers | Postgres Company Master model |
| Public and internal binary assets | Approved managed storage location, referenced by Company Master |
| Restricted evidence contents | Approved restricted storage location with least-privilege access |
| Tenant routing and runtime identity | Existing `tenants` / `tenant_hostnames` structures |
| Evidence status, verification and expiry | Company Master |
| Quotations, invoices and commercial records | **ERPNext** (authoritative commercial identity per #880). Company Master may supply approved **assets** (logo, letterhead) and a pointer to the ERPNext Customer name — it does not replace Customer/Contact/Address. |
| Schemas, vocabularies, synthetic fixtures, tests, mappings and runbooks | GitHub |
| Operator task/approval projection | `/change`, referencing Company Master records |

### Storage decision principle

Start with existing approved storage capabilities rather than building a custom file platform.

Initial target:

- use Google Drive or the currently approved managed document store for binary storage;
- use stable storage object/file identifiers rather than user-facing URLs as canonical references;
- store access classification and expected location in Company Master;
- keep storage-provider details behind an adapter/mapping so a future move does not change downstream company identity.

A custom object-storage service, OCR platform or document-management application is out of scope unless existing tools prove insufficient.

## 3. v1 capabilities

1. Stable company identity.
2. Governed fields with source, sensitivity, verification and approval metadata.
3. Company-scoped asset and document catalogue.
4. Versioned logos, images, letterheads, signatures and document references.
5. Evidence checklist and evidence lifecycle.
6. Conflict handling without silent overwrite.
7. Public/internal/restricted publication and usage control.
8. Review, effective and expiry dates.
9. Canonical aliases for downstream consumers.
10. Mapping contracts for tenant, website, document-generation and ERPNext uses.
11. Synthetic CorpFlowAI and client-onboarding proofs.
12. Manual operator workflow and approval gates.
13. Change-propagation contract for future processes.

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
- `effective_from`
- `effective_to`
- `change_reason`
- `previous_value_reference`

### Asset/document record

- `asset_id`
- `company_id`
- `asset_type`
- `logical_alias`
- `title`
- `description`
- `storage_provider`
- `storage_object_id`
- `storage_location_reference`
- `mime_type`
- `file_extension`
- `byte_size`
- `content_hash`
- `sensitivity_classification`
- `publication_status`
- `verification_status`
- `approval_status`
- `version_number`
- `supersedes_asset_id`
- `effective_from`
- `effective_to`
- `expiry_date`
- `uploaded_by`
- `uploaded_at`
- `verified_by`
- `verified_at`
- `approved_by`
- `approved_at`
- `retention_class`
- `record_owner`

### Canonical alias examples

- `brand.logo.primary`
- `brand.logo.monochrome`
- `brand.logo.square`
- `brand.letterhead.current`
- `brand.signature.authorised`
- `legal.registration_certificate.current`
- `legal.tax_certificate.current`
- `finance.bank_confirmation.current`

Downstream systems resolve the alias to the current approved effective asset. They must not hard-code provider URLs or duplicate unmanaged binary files.

### Evidence requirement

- `company_id`
- `requirement_key`
- `requirement_reason`
- `conditional_rule`
- `evidence_status`
- `asset_id` or `document_reference`
- `received_at`
- `verified_at`
- `verified_by`
- `expiry_date`
- `waiver_reason`
- `waiver_approved_by`

### Downstream consumption record

- `company_id`
- `consumer_system`
- `consumer_purpose`
- `field_key` or `logical_alias`
- `required_approval_state`
- `last_resolved_version`
- `last_resolved_at`
- `refresh_strategy`
- `fallback_policy`

## 5. Controlled vocabularies

### Sensitivity

- `PUBLIC`
- `INTERNAL`
- `CONFIDENTIAL`
- `HIGHLY_RESTRICTED`

### Asset types

- `LOGO`
- `BRAND_IMAGE`
- `LETTERHEAD`
- `SIGNATURE`
- `REGISTRATION_CERTIFICATE`
- `TAX_CERTIFICATE`
- `BANK_CONFIRMATION`
- `COMPLIANCE_DOCUMENT`
- `ADDRESS_EVIDENCE`
- `IDENTITY_EVIDENCE`
- `CONTRACT_TEMPLATE`
- `OTHER_COMPANY_DOCUMENT`

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

### Asset lifecycle

- `DRAFT`
- `UPLOADED`
- `UNDER_REVIEW`
- `APPROVED`
- `ACTIVE`
- `SUPERSEDED`
- `EXPIRED`
- `WITHDRAWN`
- `ARCHIVED`

## 6. Delivery phases

### Phase 0 — repository and system audit

Inspect tenant/client/company identifiers, onboarding structures, Postgres migrations and JSON fields, `/change` approval patterns, ERPNext integration docs, Drive/folder manifests, current brand/image/document storage patterns, public company facts, hard-coded asset paths and duplicate work.

Output: reuse map, duplicate map, storage inventory, target paths and exact blockers.

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

### Phase 2 — synthetic identity and evidence proofs

- Proof A: synthetic CorpFlowAI company record.
- Proof B: synthetic client onboarding with missing evidence and conflicting company name.

### Phase 3 — asset and document hub proof

Demonstrate with synthetic references only:

- primary logo and replacement logo versions;
- canonical alias resolution to the current approved logo;
- an approved public brand image;
- a restricted registration-certificate reference;
- a received-but-unverified document;
- a superseded document version;
- expiry/review behaviour;
- company isolation;
- no binary or restricted contents in GitHub.

### Phase 4 — downstream consumption and propagation contract

Define how websites, proposals, quotations, invoices, onboarding packs and workflows resolve Company Master data.

Rules:

- consumers request a governed field or logical asset alias;
- only approved and effective values may be returned;
- restricted values require an authorised consumer and purpose;
- future generated documents resolve current approved values at render time;
- cached or generated artefacts record the Company Master version used;
- a Company Master update affects future renders automatically;
- already issued legal/commercial documents remain immutable and retain their resolved snapshot;
- optional refresh/rebuild jobs may update non-legal derived surfaces after approval;
- failed resolution must fail closed or use an explicitly approved fallback.

### Phase 5 — manual operating workflow

Define provisional creation, field entry, asset upload/reference registration, evidence request, receipt without verification, verification/rejection/expiry, conflict resolution, publication approval, alias activation, version supersession, activation/review/suspension/archive, and `/change` projection.

### Phase 6 — production decision packet

Return exact proposals for:

- Postgres schema and migration;
- storage provider/folder or object-key model;
- permissions and restricted-access groups;
- upload and download controls;
- malware/content-type validation;
- ERPNext mappings;
- `/change` Company Master interface;
- downstream resolver/API contract;
- cache invalidation or refresh strategy;
- migration/rollback;
- retention/access policy;
- backup and restore;
- first real company onboarding.

No Phase 6 execution without Anton approval.

## 7. Test requirements

- schema validation for synthetic examples;
- stable `company_id` and nullable `tenant_id` relationship;
- company and asset isolation;
- receipt is not verification;
- missing sensitivity/publication metadata fails closed;
- conflicts preserve history and block activation where material;
- expired evidence triggers review;
- conditional requirements vary by jurisdiction/company type/service;
- restricted evidence contents are absent from GitHub fixtures;
- only approved effective values and assets resolve downstream;
- canonical alias changes from logo v1 to logo v2 after approval;
- logo v1 remains historically addressable but is no longer current;
- unapproved logo v3 never reaches a consumer;
- issued-document snapshot remains unchanged after a Company Master update;
- future document render uses the newly approved value/asset;
- missing asset produces a controlled error or approved fallback;
- storage provider URL changes do not alter the logical alias contract;
- content hashes and versions are preserved;
- `git diff --check` clean.

## 8. Acceptance boundary

Company Master v1 foundation is ready when:

- architecture and ownership are explicit;
- schemas and vocabularies exist;
- identity, evidence and asset/document synthetic proofs pass;
- the manual workflow is documented;
- storage and downstream mappings are defined;
- change-propagation rules are proven;
- security checks pass;
- one production decision packet exists;
- no real restricted data, credentials or production mutation occurred.

## 9. Explicit non-goals

- no custom binary-storage engine;
- no generic document-management product;
- no OCR/document-extraction platform in v1;
- no automated registry lookup;
- no broad CRM rebuild;
- no ERPNext replacement;
- no second app/database;
- no production schema/data change;
- no real company migration;
- no external document request or message;
- no production deployment.

## 10. Immediate execution order

1. Complete repository/current-system and storage audit. **Done in-repo:** `company-master/operations/REPOSITORY_STORAGE_REUSE_AUDIT.md`
2. Confirm stable identity, asset alias and source-of-truth contracts. **Done** in schema + resolver (`brand.logo.primary`, `company_id` / nullable `tenant_id`).
3. Create company, governed-field, asset/document and evidence schemas. **Done**
4. Create controlled vocabularies. **Done**
5. Create synthetic CorpFlowAI and client fixtures. **Done** (`corpflowai.synthetic.json`, `client-onboarding.synthetic.json`)
6. Add logo replacement and restricted-document synthetic proof. **Done** (v1 SUPERSEDED, v2 ACTIVE, v3 UPLOADED; restricted registration reference)
7. Add validation, security and propagation tests. **Done** (`company-master/lib/*`, `node-tests/company-master.test.mjs`)
8. Document manual operating workflow.
9. Define storage, website, document-generation, ERPNext and `/change` mappings.
10. Produce protected production decision packet.
