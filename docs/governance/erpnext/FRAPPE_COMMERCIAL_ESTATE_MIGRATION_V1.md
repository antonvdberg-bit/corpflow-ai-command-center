# Frappe Commercial Estate Migration v1

**Status:** APPROVED MIGRATION PLAN — Anton approved PR #1414's migration plan on 2026-10-07. Phase 0 read-only current-truth work is authorized. Merge and protected runtime/data actions remain separately gated.  
**Target architecture:** Frappe CRM + ERPNext on the same Frappe site where technically supported.  
**Current estate:** ERPNext/Frappe v16; CorpFlowAI Postgres prospect/lead execution stores and operator surfaces remain live until cutover.  
**Related:** #1413, #1411, #1412, #918, #1018, #1009, #701, #721.

## 1. Executive decision

CorpFlowAI will not choose between ERPNext and Frappe CRM.

The target commercial architecture is:

- **Frappe CRM** = pre-sales operating system: Leads, Deals, organizations, contacts, activities, emails, calls, tasks, qualification, scoring, nurture/follow-up and sales pipeline.
- **ERPNext** = transactional/commercial ERP: Customer, transaction-facing Contact/Address, Items/Pricing, Quotations, Sales Orders where used, Invoices, Payments, Projects, Support, Suppliers and financial records.
- **CorpFlowAI** = research, enrichment, AI analysis, channel-specific execution, delivery automation and operator experience where justified. It MUST NOT remain a competing durable CRM/commercial ledger.

The preferred deployment is **same-site** Frappe CRM + ERPNext so native integration is used and both apps operate inside one Frappe site rather than introducing another standalone commercial database.

Do not invest further in the legacy ERPNext CRM workspace as the long-term user surface. Do not expand CorpFlowAI Growth/Prospect Operations as an independent CRM.

## 2. Permanent source-of-truth model

| Business object / activity | Authoritative home after cutover | Notes |
|---|---|---|
| Unselected market-research candidate | CorpFlowAI research staging | Ephemeral/research evidence only; not a commercial master |
| Selected operational prospect | Frappe CRM Lead | Create when CorpFlowAI deliberately decides to prospect/nurture a named party |
| Prospect organization/contact | Frappe CRM | Pre-sales relationship identity/activity |
| Emails/calls/tasks/notes/follow-up | Frappe CRM | Durable pre-sales interaction history |
| Qualification / score / temperature / nurture state | Frappe CRM | Standard fields/automation first; minimal custom fields only if evidence requires them |
| Qualified sales pursuit | Frappe CRM Deal | Deal is the active opportunity/pipeline record |
| Customer used for commercial transactions | ERPNext Customer | Created/reconciled from the Deal under the native integration |
| Transaction-facing Contact/Address | ERPNext | Carried/reconciled from CRM for quotations/orders/invoices |
| Products and pricing | ERPNext Item / Item Price | ERPNext remains pricing authority; CRM consumes synced products/prices |
| Formal quotation | ERPNext Quotation | Created from CRM Deal where supported; outbound release remains Anton-approved |
| Order / invoice / payment / accounting | ERPNext | Transactional/financial source of truth |
| Delivery project / support | ERPNext + CorpFlowAI execution evidence | ERPNext durable business record; CorpFlowAI may execute/visualize |
| Research provenance / AI enrichment | CorpFlowAI evidence linked to CRM | Do not create a second commercial master |

This is one **commercial estate**, not one application. On a same-site deployment the two Frappe apps share the same site/database while retaining their own standard DocTypes.

## 3. Migration principles

1. **No big-bang migration.** Preserve the working business while proving the paired stack.
2. **Standard capability first.** Configure Frappe CRM/ERPNext before creating custom fields, code or another bridge.
3. **Same-site native integration first.** Do not build a custom CRM↔ERP integration unless the supported same-site path demonstrably fails a required use case.
4. **No destructive cleanup before proof.** Existing ERPNext Lead/Opportunity and CorpFlowAI prospect records remain available during reconciliation; do not delete them during migration.
5. **Search-before-create / dedupe.** Every real-record migration must reconcile identities before creating records.
6. **No double entry after cutover.** A commercial fact is authored in its authoritative system; CorpFlowAI may cache/reference it but not become a second ledger.
7. **Protected actions remain protected.** Production app installation, data writes/migration, schema/custom-field mutation, email/WhatsApp activation, env/access/secrets, merge and deployment require their applicable approval.
8. **No paid hosting/tool change without approval.** Use the current self-hosted/open-source path where feasible.
9. **Version stability over novelty.** Remain on supported v16 while this architecture is proven. Do not upgrade to v17 merely to obtain the new CRM architecture.

## 4. Phase 0 — freeze duplication and establish current truth

**Objective:** stop making the migration harder.

Actions:
- freeze new feature expansion of the legacy ERPNext CRM workspace;
- freeze new CorpFlowAI CRM/prospect-ledger features unless needed to keep current revenue work operational;
- leave current systems functioning;
- inventory the actual Frappe/ERPNext v16 topology, provider/install permissions, backup/restore evidence, apps, customizations, roles and API integration;
- inventory current real CRM/prospect data in:
  - CorpFlowAI `GrowthCompany` / `GrowthContact` / `GrowthTouchpoint`;
  - Postgres `leads` / qualification JSON;
  - ERPNext Lead / Opportunity / Customer / Contact / Address / Quotation;
- identify active relationships, duplicates and historical-only records.

**Exit evidence:** read-only inventory + verified backup/restore readiness + install feasibility verdict.

No production mutation in Phase 0.

## 5. Phase 1 — prove Frappe CRM v1 with ERPNext v16 in non-production

**Objective:** prove the exact target before touching business records.

Preferred proof:
1. clone/use a non-production v16 site;
2. install the stable Frappe CRM v1.x application compatible with Frappe/ERPNext v16;
3. enable its ERPNext integration;
4. verify:
   - CRM Lead creation and activity history;
   - Lead → Deal conversion with history preserved;
   - Deal contacts and organization;
   - ERPNext Customer creation from Deal;
   - Contact/Address carryover;
   - ERPNext Quotation creation from Deal;
   - CRM Product ↔ ERPNext Item sync;
   - ERPNext Item Price/customer price list remains pricing authority;
   - replay/idempotency/duplicate behavior;
   - permissions and least-privilege API access;
   - backup/restore after app installation.

**Exit criterion:** `FRAPPE_COMMERCIAL_ESTATE_SANDBOX_PASS`.

If same-site integration is not supportable on the current hosting topology, stop and return the exact blocker before designing a custom bridge or buying capacity.

## 6. Phase 2 — configure the minimum CRM operating model

Use standard Frappe CRM capability before customization.

Required business stages:
- Research Candidate — outside CRM until selected;
- Selected Prospect — CRM Lead;
- Qualified — Lead status / convert-to-Deal gate;
- Deal stages: qualification/discovery, proposal/quotation, negotiation, ready-to-close, won/lost as appropriate;
- nurture/follow-up via CRM tasks/automations;
- Customer/Quotation handoff to ERPNext.

Evaluate current CorpFlowAI-only fields:
- fit hypothesis;
- qualification score;
- source/provenance URL;
- decision-maker-confirmed;
- preferred contact route;
- route failure;
- consent/marketing permission.

For each field choose, in order:
1. existing standard CRM field;
2. tag/status/note/standard activity;
3. minimal custom field;
4. CorpFlowAI linked evidence only if it is research/execution metadata rather than a commercial master field.

No custom field is created merely because the current Postgres model has one.

## 7. Phase 3 — deterministic migration mapping and dry run

Build one reconciliation mapping before real writes.

### 7.1 CorpFlowAI Growth estate

Current Growth records:
- `GrowthSegment`
- `GrowthCompany`
- `GrowthContact`
- `GrowthTouchpoint`

Target:
- selected/active prospect → Frappe CRM Lead;
- organization/person identity → CRM organization/contact as supported by the Lead/Deal model;
- fit hypothesis / provenance / score / route state → mapped standard/minimal custom fields or linked notes;
- touchpoint history → only commercially material interactions; do not manufacture email/call events that did not occur.

The current 20 Mauritius prospects are **selected operational prospects**, not merely an unfiltered research universe. After dedupe/readiness checks they are migration candidates to Frappe CRM Leads.

### 7.2 CorpFlowAI Postgres `leads`

Classify each active sales row:
- pre-qualified → CRM Lead;
- qualified/proposal/negotiation → CRM Deal;
- won/existing customer → ERPNext Customer is authoritative; create/link a CRM organization/deal only when it represents an active sales relationship.

Do not migrate client-tenant operational workflows that are not CorpFlowAI's own sales CRM.

### 7.3 Existing ERPNext Lead / Opportunity

Existing ERPNext Lead/Opportunity records are not deleted.

For active relationships:
- reconcile them into Frappe CRM Lead/Deal;
- preserve ERPNext identifiers/history references;
- establish the new forward rule: new pre-sales records originate in Frappe CRM after cutover.

Historical/synthetic ERPNext Leads/Opportunities may remain read-only evidence unless a business reason exists to reproduce them in CRM.

### 7.4 Existing Customers

ERPNext Customer remains authoritative.

For an active existing customer:
- do not create another Customer;
- reconcile CRM organization/contact/deal to the existing ERPNext commercial identity;
- prove how the native same-site integration handles existing-customer linkage before production migration.

**Dry-run output:** per-record action = CREATE / LINK / UPDATE / SKIP / CONFLICT, with no secrets/private contact data in logs.

## 8. Phase 4 — controlled pilot

Do not migrate the entire estate first.

Pilot set:
- one active qualified pursuit (OrixHealth-type path);
- one warm/deferred pursuit (Prestige-type path);
- a small sample of selected cold prospects from the 20-prospect set;
- one existing Customer path.

Prove:
- no duplicate identities;
- Lead/Deal activity works;
- communication/task history is usable;
- conversion to ERPNext Customer works;
- quotation creation uses ERPNext pricing and customer data;
- quote-readiness rules still fail closed when required identity is incomplete;
- no data is written back into CorpFlowAI as a competing master.

No live marketing sequence or external outreach is enabled merely by the pilot.

## 9. Phase 5 — production cutover

After explicit production-data/install approval and successful pilot:

1. install/enable the approved Frappe CRM version on the production Frappe/ERPNext v16 site;
2. configure roles, email integration and automation only within separately approved communication/access gates;
3. reconcile active selected prospects and sales pursuits into CRM;
4. set Frappe CRM as the **only new pre-sales commercial record path**;
5. set ERPNext as the **only transactional commercial path**;
6. stop creating new CorpFlowAI Growth/Lead records as commercial masters;
7. retire/supersede the CorpFlowAI → ERPNext Lead/Opportunity promotion bridge where native CRM→ERPNext integration now owns the path;
8. change CorpFlowAI operator views to either:
   - read from the Frappe commercial estate; or
   - retire them if Frappe CRM already provides the required operator experience.

Cutover must not require an operator to update both systems manually.

## 10. Phase 6 — decommission duplicate CRM behavior

Only after a stable observation period and reconciliation proof:

- mark `GrowthCompany`, `GrowthContact`, `GrowthTouchpoint` commercial-master use as deprecated;
- keep only clearly justified research/enrichment staging capability;
- disable or remove commercial writes from Prospect Operations;
- archive/supersede `add-prospect-operations-package` slices that duplicate Frappe CRM;
- retire obsolete CRM baseline/source-of-truth mappings and the Postgres→ERPNext pre-sales bridge;
- retain required historical evidence per retention policy;
- do not drop production tables/data without a separate approved deletion/migration plan.

## 11. Phase 7 — v17 progression

There is no immediate v17 migration requirement.

Current path:
- run ERPNext v16 + stable Frappe CRM v1.x;
- keep customisation shallow and business-state/API centric;
- monitor Frappe CRM v2.x + ERPNext/Frappe v17 maturity;
- before v16 support ends, clone the production site and rehearse the supported v16 → v17 pair upgrade;
- upgrade CRM and ERPNext as a tested pair, not independently;
- retain the same source-of-truth split unless Frappe's supported model changes materially.

ERPNext v16 is currently planned to remain supported through end-2029, providing a deliberate migration window.

## 12. Rollback strategy

Until final cutover:
- existing CorpFlowAI and ERPNext records are preserved;
- Frappe CRM pilot records are additive/reconcilable;
- no destructive table drops or historical deletions occur.

If Phase 1–4 fails:
- disable/remove the pilot CRM app only in the non-production environment as appropriate;
- keep ERPNext v16 production untouched;
- continue current commercial operations while the exact blocker is resolved.

After production cutover:
- rollback requires the tested site backup/restore procedure plus a forward reconciliation of any transactions created after the restore point. Therefore production cutover requires verified backup/restore evidence first.

## 13. Workflow and repository impact

Expected supersession/rework:
- #701 CRM baseline;
- #721 / OpenSpec `add-prospect-operations-package`;
- #918 source-of-truth matrix;
- #1009 Customer bridge;
- #1018 sales lifecycle bridge;
- #1411 old prospect→ERPNext admission implementation;
- #1412 conformance audit interpretation;
- Growth importer/pipeline;
- prospect reporting;
- quotation readiness path;
- agent/bootstrap instructions describing the commercial system of record.

Do not modify all of these in one uncontrolled implementation. Sequence changes behind the verified migration phases.

## 14. Protected gates

The migration definition itself does not authorize:
- production Frappe CRM installation;
- production app/package changes;
- backup/restore operations that alter state;
- schema/custom-field creation;
- real Lead/Deal/Customer migration;
- email account activation;
- WhatsApp/telephony integration;
- external outreach/nurture sends;
- secrets/access changes;
- merge or production deployment;
- paid hosting/provider changes;
- destructive removal of CorpFlowAI data.

Each remains gated at the exact consequential step.

## 15. Definition of migration complete

Migration is complete only when:

- Frappe CRM + ERPNext operate successfully on the approved production Frappe site;
- every active CorpFlowAI prospect/client relationship has one reconciled commercial identity;
- selected prospects and pre-sales interactions are authored in Frappe CRM;
- Customer/quotation/transaction truth is authored in ERPNext;
- ERPNext pricing is consumed by CRM where applicable;
- CorpFlowAI no longer owns a competing durable CRM/prospect ledger;
- old bridges/operator surfaces are retired or read-only where duplicated;
- backup/restore, permissions, API access and operational runbooks are verified;
- the v17 progression path is documented;
- no material commercial history has been lost.
