## 1. Current-truth and compatibility gate

- [ ] 1.1 Read-only inventory production/test Frappe + ERPNext versions, hosting topology, installed apps and install permissions
- [ ] 1.2 Verify current backup/restore evidence before any production app install is proposed
- [ ] 1.3 Inventory real commercial records across Growth*, Postgres leads, ERPNext Lead/Opportunity/Customer/Contact/Address/Quotation
- [ ] 1.4 Produce duplicate/conflict counts without exposing private contact data
- [ ] 1.5 Confirm stable Frappe CRM v1.x compatibility with the exact v16 estate

## 2. Non-production same-site proof

- [ ] 2.1 Prepare isolated clone/test site
- [ ] 2.2 Install stable Frappe CRM v1.x on the test site
- [ ] 2.3 Enable ERPNext integration with the test company
- [ ] 2.4 Prove CRM Lead → Deal history preservation
- [ ] 2.5 Prove Deal → ERPNext Customer + Contact/Address
- [ ] 2.6 Prove Deal → ERPNext Quotation
- [ ] 2.7 Prove ERPNext Item/Item Price → CRM Product/pricing behavior
- [ ] 2.8 Prove permissions, least-privilege API use and backup/restore
- [ ] 2.9 Return `FRAPPE_COMMERCIAL_ESTATE_SANDBOX_PASS` or one exact blocker

## 3. Minimum operating-model configuration

- [ ] 3.1 Map existing Growth/lead fields to standard CRM fields/tags/statuses/activities
- [ ] 3.2 Document only proven field gaps
- [ ] 3.3 Propose the smallest custom-field set if required; stop before applying schema changes
- [ ] 3.4 Define Lead/Deal stages, qualification gate, quote-readiness and won/lost rules
- [ ] 3.5 Keep all outbound email/WhatsApp/telephony automation disabled during migration testing

## 4. Migration dry run

- [ ] 4.1 Build deterministic read-only/dry-run mapping for the 20 selected Growth prospects
- [ ] 4.2 Classify active Postgres sales leads as CRM Lead / Deal / existing Customer path / skip
- [ ] 4.3 Reconcile active ERPNext Leads/Opportunities to proposed CRM Lead/Deal targets
- [ ] 4.4 Reconcile existing ERPNext Customers without creating duplicates
- [ ] 4.5 Emit CREATE / LINK / UPDATE / SKIP / CONFLICT plan per record
- [ ] 4.6 Verify no real data writes occurred

## 5. Controlled pilot

- [ ] 5.1 Select one active qualified pursuit, one warm pursuit, a small cold-prospect sample and one existing Customer
- [ ] 5.2 Obtain explicit approval for the real-data pilot writes
- [ ] 5.3 Execute pilot reconciliation
- [ ] 5.4 Verify activity/history, Lead→Deal, Customer linkage, pricing and Quotation handoff
- [ ] 5.5 Verify quote-readiness fails closed on incomplete commercial identity
- [ ] 5.6 Observe for duplicates/conflicts before broader cutover

## 6. Production cutover

- [ ] 6.1 Obtain explicit production app-install and data-migration approval
- [ ] 6.2 Install/enable the approved CRM version on production
- [ ] 6.3 Reconcile active selected prospects and pursuits
- [ ] 6.4 Switch all new pre-sales authorship to Frappe CRM
- [ ] 6.5 Keep Customer/pricing/quotation/transactions authoritative in ERPNext
- [ ] 6.6 Remove/disable duplicate CorpFlowAI commercial write paths only after proof
- [ ] 6.7 Update operator views to Frappe-backed read/execution paths or retire duplicates
- [ ] 6.8 Verify production data, APIs, backup/restore and user access

## 7. Decommission and doctrine

- [ ] 7.1 Supersede #701 Postgres-first CRM doctrine
- [ ] 7.2 Supersede/close duplicate #721 Prospect Operations slices
- [ ] 7.3 Supersede Postgres→ERPNext Lead/Opportunity bridge where native CRM integration owns the path
- [ ] 7.4 Update source-of-truth matrix, agent bootstrap and ERP strategy
- [ ] 7.5 Preserve required historical evidence; do not drop tables/data without a separate approved plan
- [ ] 7.6 Document the v16→v17 paired-app rehearsal path
