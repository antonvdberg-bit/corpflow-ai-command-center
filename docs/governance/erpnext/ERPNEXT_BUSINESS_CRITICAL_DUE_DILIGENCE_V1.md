# ERPNext business-critical due diligence — market, competitor, security and AI-operated-company fit

**Status:** Decision-ready evidence packet. **Research / documentation only.**  
**Date (UTC):** 2026-08-16  
**Source issue:** [#959](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/959) (parent [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953); strategy [#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954) / [#955](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/955) / [#960](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/960); deployment audit [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956))  
**Owner:** Anton (platform and trust decisions); Cursor Factory (this packet)  
**Cursor agent ID:** `bc-51c4be16-7b03-4d3f-b6e9-407707b7d74a`  
**Cursor run URL:** https://cursor.com/agents/bc-51c4be16-7b03-4d3f-b6e9-407707b7d74a  
**Anchor:** `<!-- ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1 -->`

<!-- ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1 -->

**Environment classification:** `local` (docs / governance only). This packet does **not** publish to a live host and does **not** change ERPNext, Neon, Vercel, or `corpflow-exec-01`.

**NO IMPLEMENTATION AUTHORIZED.** This document does **not** authorize purchase, vendor contact, migration, production accounting/tax/bank mutation, schema/custom DocTypes, env/secrets change, live send, paid-tool buy, public/client_production launch, or merge.

---

## 0. Executive verdict

**ERPNext BUSINESS-CRITICAL USE APPROVED WITH CONDITIONS**

This is a **platform-choice** verdict against CorpFlowAI Version 2, not a licence to treat the current site as an irreplaceable system of record.

| Question | Answer |
|----------|--------|
| Does ERPNext remain the right **product** for CorpFlowAI’s AI-operated, one-human, API-first model? | **Yes.** No comparator in this set is a better fit on the Version 2 weights. |
| May CorpFlowAI now trust ERPNext with **irreplaceable** financial / tax / client-contract records? | **Not yet.** [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956) still reports **ERPNext BUSINESS-CRITICAL BACKUP/DR/SECURITY: NOT PROVEN**. Product approval cannot override that. |
| Should CorpFlowAI switch to Odoo, Business Central, SAP Business One, or NetSuite? | **No.** Switching would raise cost, lock-in, or API-friction without closing the controls that actually block trust today. |
| Does this block the Prestige fast lane? | **No.** Prestige continues in parallel on the existing hosted-test foundation. This programme must not block that revenue deliverable. |

**How to read the verdict string:** `APPROVED WITH CONDITIONS` means **stay on ERPNext** and **close the named conditions before treating it as irreplaceable**. It is **not** `APPROVED` (unconditional). It is **not** `LIMITED` (use only for toys / consider leaving). It is **not** `REJECTED`.

The four allowed #959 strings, for the record:

- `ERPNext BUSINESS-CRITICAL USE APPROVED` — **not selected**
- `ERPNext BUSINESS-CRITICAL USE APPROVED WITH CONDITIONS` — **selected**
- `ERPNext BUSINESS-CRITICAL USE LIMITED` — **not selected**
- `ERPNext BUSINESS-CRITICAL USE REJECTED` — **not selected**

---

## 1. How evidence is marked

Every material claim is one of:

| Mark | Meaning |
|------|---------|
| **FACT** | Current official / primary source (vendor docs, GitHub advisory, Microsoft list price, Frappe support page). |
| **AGGREGATOR** | G2 / Capterra / industry-consultant pricing. Sentiment or negotiated-price only — not capability proof. |
| **CORP FLOW RECORD** | Already recorded in this repo (Version 2, #956 audit, #920 foundation). Not re-proven here. |
| **INFERENCE** | This packet’s judgement from the above. |

Do not promote an aggregator score or an inference into a FACT.

---

## 2. What this packet evaluates against

Canonical strategy: `docs/governance/erpnext/VISION_AND_INTENDED_USE.md` — **`APPROVED — VERSION 2`** (Anton, 2026-08-14 12:54 +04:00). **CORP FLOW RECORD.**

Version 2 already chose ERPNext as the intended financial/corporate authority *where standard ERPNext fit exists*, with reconcile-don’t-duplicate, zero default AI spend, Anton supplier and quotation gates, Draft → Review → Reject/Amend/Approve → Submit → Externally Share, accountant authority for CoA/tax/payroll/cutover, and a Prestige fast lane that must not be blocked.

#959’s job is the **independent product/market/security/AI-fit check** of that choice. It does **not** re-approve Version 2 and does **not** rewrite it.

Heavily weighted criteria (from #959 and Version 2 §17):

1. Accounting / financial integrity and auditability
2. API-first / machine-operated usability
3. Least-privilege integration identities and draft/submit control
4. Low operating cost for a one-human startup
5. CRM / Selling / Buying / Projects / Support without a second ledger
6. External accountant collaboration and monthly close
7. Bank / payment reconciliation
8. Security patch / support lifecycle
9. Backup / restore / DR operability
10. Start small, expand later, without heavy customization
11. Data / control portability and vendor lock-in
12. Professional client-facing documents

---

## 3. Weighted scorecard (this packet’s judgement)

Scores are **INFERENCE** on a 1–5 scale (5 = best fit for CorpFlowAI Version 2). They are not vendor ratings.

| # | Criterion | ERPNext | Odoo (hosted) | Dynamics 365 BC | SAP Business One | NetSuite |
|---|-----------|:-------:|:-------------:|:---------------:|:----------------:|:--------:|
| 1 | Accounting / auditability | 4 | 4 | 5 | 5 | 5 |
| 2 | API-first / machine-operated | 5 | 2 | 3 | 3 | 3 |
| 3 | Least-privilege + draft/submit | 4 | 3 | 5 | 4 | 4 |
| 4 | One-human TCO | 5 | 3 | 2 | 1 | 1 |
| 5 | CRM / Selling / Buying / Projects / Support in one system | 4 | 5 | 4 | 3 | 4 |
| 6 | External accountant collaboration | 4 | 4 | 5 | 4 | 4 |
| 7 | Bank / payment reconciliation | 4 | 4 | 5 | 4 | 5 |
| 8 | Patch / support lifecycle | 3 | 4 | 5 | 4 | 4 |
| 9 | Backup / restore / DR *as a product* | 4 | 4 | 5 | 4 | 5 |
| 10 | Start small, expand later | 5 | 4 | 3 | 2 | 2 |
| 11 | Portability / lock-in | 5 | 3 | 2 | 2 | 1 |
| 12 | Client-facing documents | 4 | 4 | 4 | 4 | 4 |
| | **Weighted towards Version 2** | **Best** | API paywall + per-user | Strong but expensive / Microsoft-bound | Partner-heavy, wrong scale | Cloud lock-in, no public list price |

**INFERENCE:** ERPNext wins because Version 2 is an **API-operated, low-headcount, start-small, portable** company — not a 20-seat Microsoft or Oracle shop. BC and NetSuite score higher on managed-vendor assurance and some accounting polish; they lose on cost, lock-in, and machine-operability for a factory that already speaks REST. Odoo is the closest product rival and loses on **hosted External API being Custom-plan-only**.

**CORP FLOW RECORD (criterion 9, our deployment):** product backup capability is not the same as CorpFlowAI having a proven restore. #956 remains **NOT PROVEN**. That is why the verdict is **WITH CONDITIONS**, not unconditional **APPROVED**.

---

## 4. Comparator set

### 4.1 ERPNext / Frappe (incumbent)

**FACT — product / licence / commercial model**

- Official pricing page: ERPNext is free and open-source; Frappe monetizes **hosting and enterprise support**, not feature paywalls. Self-host is listed as **AGPL-3.0**. “Do you have paid features hidden behind paywalls? **No.**” Source: [frappe.io/erpnext/pricing](https://frappe.io/erpnext/pricing) (retrieved 2026-08-16).
- Frappe Cloud is billed **by compute, not per user**. Published entry points: Sites **$5/mo onwards** (managed upgrades & backups); Servers **$20/mo onwards**; dedicated-class **$125/mo onwards**. Same page.
- Product Warranty (engineer bug-fix, not functional implementation) is a paid Cloud add-on class; Frappe’s SLA page states warranty SLA applies to Cloud plans **$50 and above**. Source: [frappe.io/support-sla](https://frappe.io/support-sla).

**FACT — support lifecycle**

- Official supported versions (retrieved 2026-08-16 from [frappe.io/support-versions](https://frappe.io/support-versions) and the [ERPNext Supported Versions wiki](https://github.com/frappe/erpnext/wiki/Supported-Versions), wiki edited 2026-01-19):
  - Version 14 — EOL **31 January 2026**
  - Version 15 — EOL **end of 2027 (planned)**
  - Version 16 — EOL **end of 2029 (planned)**
- Frappe forum confirmation that v14 reached EOL on 2026-01-31: [discuss.frappe.io/t/160084](https://discuss.frappe.io/t/reminder-erpnext-v14-has-reached-end-of-life/160084).

**FACT — API / identities**

- Frappe generates a REST API for every DocType (`/api/resource/…`, `/api/v2/document/…`). Token auth is logged against a chosen User; **roles are checked against that user**; official docs say you can **create a new user just for API calls**. Source: [Token Based Authentication](https://docs.frappe.io/framework/user/en/guides/integration/rest_api/token_based_authentication) (page updated 2026-02-17).
- Draft / submit / cancel are first-class document methods on the v2 API. Source: [REST API guide](https://docs.frappe.io/framework/user/en/guides/integration/rest_api).

**FACT — backup/restore as a product (Frappe Cloud)**

- Official Cloud docs: automated backups; **offsite** backups on **USD 25 and above** plans, uploaded to AWS S3; dashboard download of offsite backups; restore-from-files and restore-to-another-site exist. Sources: [docs.frappe.io/cloud/sites/backups](https://docs.frappe.io/cloud/sites/backups) (updated 2026-02-27); [docs.frappe.io/cloud/sites/migrate-an-existing-site](https://docs.frappe.io/cloud/sites/migrate-an-existing-site) (updated 2026-07-17); [frappe.io/cloud/backup](https://frappe.io/cloud/backup).
- Trial sites: official FAQ says Frappe does **not** keep backups of dropped trial sites. Source: [docs.frappe.io/cloud/faq/site](https://docs.frappe.io/cloud/faq/site).

**FACT — 2026 security advisories (primary GitHub Security Advisories)**

Patch discipline is mandatory. Selected 2026 ERPNext advisories (authenticated, no workaround, upgrade required):

| Advisory | Published | Severity | Patched |
|----------|-----------|----------|---------|
| [GHSA-qq49-v74j-hjh7](https://github.com/frappe/erpnext/security/advisories/GHSA-qq49-v74j-hjh7) SSTI / CVE-2026-72911 | 2026-08-08 | **9.9 Critical** | **15.118.0** / **16.29.0** |
| [GHSA-pxf3-4gvc-v45j](https://github.com/frappe/erpnext/security/advisories/GHSA-pxf3-4gvc-v45j) SSTI data disclosure / CVE-2026-55242 | 2026-07-04 | **8.8 High** | 15.111.0 / 16.22.0 |
| [GHSA-6fm9-g88m-hxr7](https://github.com/frappe/erpnext/security/advisories/GHSA-6fm9-g88m-hxr7) SQL injection / CVE-2026-44446 | 2026-04-30 | **8.8 High** | 15.104.3 / 16.14.0 |
| [GHSA-6ffr-92hr-3394](https://github.com/frappe/erpnext/security/advisories/GHSA-6ffr-92hr-3394) path traversal / CVE-2026-44440 | 2026-04-30 | **6.5 Medium** | 15.101.1 / 16.10.0 |

**CORP FLOW RECORD:** #956 (2026-08-14) recorded the commercial hosted site as **frappe 16.25.0 / erpnext 16.26.2**. That recorded line is **below 16.29.0**. This packet did **not** re-probe the live site. Treat current patch level as **REQUIRES VERIFICATION** (condition C5). Do not publish the vendor hostname.

**AGGREGATOR — market sentiment (not capability proof)**

- G2 ERPNext product page (IT locale snapshot 2026-08-16): **4.3 / 5 from 51 reviews**. Common praise: customization, open-source, cost. Common concern: setup complexity, update/customization stability. Source: [g2.com/it/products/erpnext/reviews](https://www.g2.com/it/products/erpnext/reviews). Some G2 compare pages show **4.2 / 5 from ~44–45** reviews — same product, different page vintage. Do not over-fit the decimal.
- Capterra listing cited by Capterra’s own 2026 open-source ERP article: **4.6 / 5 from 138 reviews**. Source: [capterra.com/resources/free-open-source-erp-software](https://www.capterra.com/resources/free-open-source-erp-software/). South Africa Capterra page earlier the same year showed **4.6 / 136**. Sentiment, not a control.

**CORP FLOW RECORD — already proven on our hosted test (not production accounting)**

- Integration user `integrations@corpflowai.com`, standard Customer / Quotation / Item / Project / Issue path, draft-only commercial documents, Prestige synthetic foundation READY (#880 / #882 / #920).
- Print Designer evaluated; production-grade client PDF still a later packet.
- Accountant still owns CoA / VAT / opening balances.

### 4.2 Odoo

**FACT**

- Official External API docs (Odoo 19.0, saas-19.3, and master, retrieved 2026-08-16): **“Access to data via the external API is only available on Custom Odoo pricing plans. Access to the external API is not available on One App Free or Standard plans.”** Sources: [odoo.com/documentation/19.0/developer/reference/external_api.html](https://www.odoo.com/documentation/19.0/developer/reference/external_api.html), [saas-19.3](https://www.odoo.com/documentation/saas-19.3/developer/reference/external_api.html), [master](https://www.odoo.com/documentation/master/developer/reference/external_api.html).
- Official pricing page: **External API** and **Odoo Studio** sit on the **Custom** plan, not Standard. “External API means you set up external software … that initiates calls to the Odoo API.” Calls **initiated from Odoo** (payment providers, bank sync) are **not** External API. Source: [odoo.com/pricing](https://www.odoo.com/pricing).

**INFERENCE:** For CorpFlowAI, hosted Odoo is the wrong API contract. Version 2 requires a factory that can create drafts, read masters, and stop before submit using a least-privilege identity. Paying up to Custom solely to unlock the inbound API, then paying per user, is a worse TCO and a worse control story than Frappe’s “every DocType is REST, roles follow the integration user.”

Odoo Community self-host would restore API access, but then CorpFlowAI would take on the same self-host burden #956 already refuses to grow on `corpflow-exec-01`. That is not a reason to migrate.

**AGGREGATOR:** Odoo has a much larger public review base than ERPNext (Capterra Odoo ~4.2 from 1,300+ reviews). Breadth of apps is a real market signal. It does not cancel the hosted-API restriction.

### 4.3 Microsoft Dynamics 365 Business Central

**FACT**

- Official US list price (retrieved 2026-08-16): **Essentials $80.00 user/month, paid yearly**; **Premium $110.00 user/month, paid yearly**. Sales Order Agent and Payables Agent **require Copilot Credits sold separately**. Source: [microsoft.com/en-us/dynamics-365/products/business-central/pricing](https://www.microsoft.com/en-us/dynamics-365/products/business-central/pricing).
- June 2026 Dynamics 365 Licensing Guide repeats **$80 / $110** and notes Copilot Credits separately. Source: [Dynamics-365-Licensing-Guide-June-2026](https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/bade/documents/products-and-services/en-us/bizapps/Dynamics-365-Licensing-Guide-June-2026-PUB-2.pdf).

**INFERENCE:** BC is the strongest “managed-vendor assurance + approval/audit” product in this set. It is the wrong **operating cost and lock-in** for a one-human Mauritius startup that already has a working Frappe REST integration. Agent/Copilot extras are additional spend and are not a substitute for CorpFlowAI’s own approval gates. Do not buy BC to solve a backup-proof problem that is cheaper to close on the current vendor site.

### 4.4 SAP Business One

**FACT**

- Official Service Layer is an OData REST API over the same business objects as the desktop client (validation is not bypassed). OData v4 (`/b1s/v2/`) is the current primary protocol; OData v3 is deprecated as of Feature Pack 2405. Sources: [Working with SAP Business One Service Layer](https://help.sap.com/doc/fc2f5477516c404c8bf9ad1315a17238/10.0/en-US/Working_with_SAP_Business_One_Service_Layer.pdf); [Service Layer API Reference](https://help.sap.com/doc/056f69366b5345a386bb8149f1700c19/10.0/en-US/Service%20Layer%20API%20Reference.html).

**INFERENCE:** The API exists and is mature. The **go-to-market** is partner-led, on-prem/HANA-or-SQL, and structurally heavier than CorpFlowAI’s current scale. This packet does **not** invent a SAP B1 list price. Even without a price, the implementation model (partner, desktop heritage, SQL/HANA estate) is the wrong shape for an AI-operated one-human company that must stay reversible and cheap.

### 4.5 Additional comparator — Oracle NetSuite

Included because it is the usual “just buy a serious cloud ERP” alternative. It adds decision value on **TCO and lock-in**. It is not a recommended move.

**FACT**

- Oracle does **not** publish an official public NetSuite list price. SuiteScript 2.1 has documented **API governance / usage-unit limits**. Source: [Oracle NetSuite Applications Suite — SuiteScript 2.1 API Governance](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157072844224.html).

**AGGREGATOR (not official list):** 2026 consultant write-ups commonly quote a **~$999/month** platform fee plus **~$129–$199 per full user / month**, plus modules, plus implementation. Sources: Broken Rubik NetSuite pricing guide (July 2026); Oracle Licensing Experts 2026 guide. Treat as **negotiated-range rumour**, not a quote.

**INFERENCE:** NetSuite would raise cost and lock-in by an order of magnitude and would not close #956. Reject as a switch.

---

## 5. Required research sections

### 5.1 Product maturity / release / support lifecycle

**FACT:** ERPNext has a published two-major-version support policy; v15 through end-2027 and v16 through end-2029 (planned). v14 is already EOL. CorpFlowAI’s commercial test is on the **v16** line (#956). The Hetzner sandbox remains a **v15** pin (`v15.109.1`) — a second major line that must not become a second ledger (#956 S2).

**INFERENCE:** Stay on **one** system of record: the vendor-hosted v16 site. Do not grow the loopback sandbox/production-shell as a commercial ledger. Plan upgrades inside v16; do not sit on an unpatched point release.

### 5.2 Market reputation / adoption signal

**AGGREGATOR:** ERPNext’s public review base is **small** (G2 ~50, Capterra ~140) versus Odoo / BC. Scores are mid-4s. Strengths: flexibility, cost, all-modules-included. Weaknesses: setup skill, partner quality, upgrade pain when heavily customized.

**INFERENCE:** Small review count is a **market-signal** weakness, not a reason to switch. CorpFlowAI already has working hosted-test evidence that standard DocTypes fit Phase 1. The mitigation is **standard ERPNext first** (Version 2), not a brand-name migration.

### 5.3 Open-source / commercial model

**FACT:** 100% open-source product; Frappe sells hosting/support; no feature paywall on the official pricing FAQ. Self-host remains available (AGPL-3.0 on the pricing page).

**INFERENCE:** This is the correct commercial model for CorpFlowAI: pay for **managed hosting and warranty**, keep the right to export and self-host if the vendor relationship fails. That portability is the main lock-in advantage over BC / NetSuite / hosted Odoo Custom.

### 5.4 Accounting / commercial depth

**FACT / CORP FLOW RECORD:** ERPNext Accounts is a full double-entry product (GL, Sales Invoice, Payment Entry, Journal Entry, Currency Exchange, bank reconciliation). CorpFlowAI has already exercised draft quotations, draft invoices, FX fail-closed behaviour, and sandbox reconciliation cycles. Statutory/tax/payroll/CoA policy remains the **external accountant’s** authority (Version 2). Phase D production-readiness still lists accountant CoA + VAT as hard blockers (`docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md`).

**INFERENCE:** Depth is sufficient for Phase 1 if we stay on **standard** DocTypes and do not invent accounting policy. BC/NetSuite may be “more enterprise,” but they do not remove the accountant gate.

### 5.5 CRM / projects / support / workflow fit

**CORP FLOW RECORD:** Standard Lead → Opportunity → Customer, Quotation, Project, Task, Issue, Timesheet are in use on hosted test (#920 READY). Version 2 still has open questions on whether ERPNext is the full project **operating** surface vs project **control**, and on Help Desk vs CorpFlow `/change` UX. Those stay open; do not silently close them.

**INFERENCE:** Fit is good enough to **reconcile into ERPNext** rather than build a second CRM/project/support ledger. Daily prospect pipeline may remain in CorpFlow `#701` until a later explicit handoff. That is consistent with Version 2, not a reason to pick Odoo.

### 5.6 API / webhook / integration model

**FACT:** Dedicated integration users, role-checked tokens, REST on every DocType, submit/cancel as methods.

**INFERENCE:** This is the strongest Version 2 fit in the comparator set. Official docs do not use the word “idempotent” on the token page; **INFERENCE** that CorpFlowAI must still design idempotency / external references itself (Version 2 open question #9). Do not assume the framework makes retries safe.

**FACT (Odoo contrast):** hosted External API is Custom-plan-only.

### 5.7 Approval / audit / versioning model

**CORP FLOW RECORD / FACT:** ERPNext `docstatus` (draft / submitted / cancelled) plus Workflow, Version, and Activity Log exist. CorpFlowAI’s intended outbound lifecycle is Draft → Review → Reject/Amend/Approve → Submit → Externally Share. The integration user must **not** be able to skip to Submit or Externally Share.

**INFERENCE:** Product support is adequate. The control is **role design + factory stop-before-submit**, not a new ERP. BC’s approval/audit story is more “enterprise packaged”; it is not worth $80+/user/month at this headcount.

### 5.8 Security advisory history and patch expectations

**FACT:** 2026 includes **critical and high** ERPNext advisories, including a 9.9 SSTI patched only in 15.118.0 / 16.29.0. No workaround; upgrade required.

**INFERENCE:** Open-source plus a public advisory feed is a **feature** if someone watches it, and a **liability** if nobody does. Condition C5 is non-negotiable. Vendor-hosted does **not** automatically mean patched; #956 could not read System Settings.

### 5.9 Backup / restore / DR model

**FACT (product):** Frappe Cloud documents daily backups, offsite S3 on $25+ plans, dashboard download, and restore-to-another-site.

**CORP FLOW RECORD (our deployment):** #956 B1 vendor backup **NOT PROVEN** to this identity; no recorded restore; RPO/RTO **UNKNOWN**. Product docs cannot substitute for Anton reading the actual Cloud dashboard (plan, offsite toggle, last backup, one disposable restore).

**INFERENCE:** Do **not** buy a second ERP to get backups. Prove the backups we are already paying a vendor for.

### 5.10 Hosting / self-hosting burden

**CORP FLOW RECORD:** Commercial work is already on **vendor-hosted** v16, not on `corpflow-exec-01`. The box holds sandbox v15 and a production-shell; those are different data. Version 2 and #956 both say do not grow a second ledger on the box.

**INFERENCE:** Keep commercial ERPNext **vendor-hosted**. Self-hosting would add the exact DR/patch burden we have not proven. Uptime Kuma remains the only authorized extra self-hosted tool carve-out; this packet does not widen that.

### 5.11 Upgrade / customization risk

**AGGREGATOR:** Reviewers repeatedly tie upgrade pain to **heavy customization**.

**INFERENCE / Version 2:** Standard ERPNext first. No custom DocTypes in this programme without a separate Anton approval. That is how CorpFlowAI avoids the failure mode that makes ERPNext look unstable in reviews.

### 5.12 Partner / support ecosystem

**FACT:** Frappe does **not** sell implementation itself; it points to a partner network. Product Warranty is Cloud-plan-gated and is bug-fix, not functional consulting. Source: pricing FAQ + SLA page.

**INFERENCE:** CorpFlowAI should **not** hire a partner to re-platform. Use Frappe Cloud warranty (if the current plan includes it — **REQUIRES VERIFICATION**) plus the external accountant for statutory questions. A partner engagement would be a **paid-tool / vendor** decision and is not authorized here.

### 5.13 Likely cost / TCO at CorpFlowAI scale

Assumptions: one operator, one integration user, one Company, Phase 1 modules only, vendor-hosted.

| Option | Licence / host (order of magnitude) | Evidence class |
|--------|-------------------------------------|----------------|
| ERPNext on Frappe Cloud | **$5–$50+/month** compute; $25+ for documented offsite backups; $50+ for warranty SLA class | **FACT** (published Cloud prices / SLA) |
| Odoo Online Standard | Per-user; **no** hosted External API | **FACT** (API docs + pricing page) |
| Odoo Custom | Per-user + Custom (API + Studio) | **FACT** that Custom is required for API; exact 2026 seat price not relied on here |
| Business Central Essentials | **$80/user/month** official US list, annual | **FACT** |
| SAP Business One | Partner quote; not estimated | No invented price |
| NetSuite | No official list; aggregator ~$999/mo + per-user | **AGGREGATOR** |

**INFERENCE:** At one human, ERPNext is cheaper by a large multiple and already paid. TCO risk is **Anton time + accountant time + patch/backup discipline**, not licence fees. That is acceptable under Version 2 (Anton time is a real cost; do not buy a heavier ERP to avoid operator work).

### 5.14 AI-operated-company fit

Version 2 needs: machine-operable drafts, least-privilege identity, stop-before-submit, evidence in GitHub, no autonomous spend, no autonomous supplier or quotation release.

| Need | ERPNext | Closest rival note |
|------|---------|--------------------|
| Draft then stop | Yes (`docstatus=0`, submit is a separate method) | BC/NetSuite also can; Odoo hosted API is gated |
| Least-privilege robot user | Yes (official “user just for API calls”) | All can; ERPNext is already wired |
| No feature-paywall on core financial DocTypes | Yes | Odoo Custom / BC Premium / NetSuite modules add cost |
| Factory can refuse send/payment | Process + roles; not a product gap | Same on all; do not buy a product to get a policy |
| Incapacity / key-person | Standard records + GitHub evidence | A Microsoft/Oracle estate is **worse** key-person risk at this headcount |

**INFERENCE:** ERPNext is the best **AI-operated** fit in this set **if and only if** the factory keeps the integration user below Submit/Share and Anton keeps the Version 2 gates. The product will not enforce “zero AI spend” by itself.

### 5.15 Key conditions that must be proven in **our** deployment

See §6. These are the difference between “right platform” and “trusted for irreplaceable records.”

---

## 6. Conditions (must close before irreplaceable trust)

Until **C1–C6** are proven, CorpFlowAI may continue **synthetic / hosted-test / Prestige-fast-lane draft** work. It must **not** treat ERPNext as the irreplaceable store for real money, tax filings, or client contracts.

| ID | Condition | Why | Already authorized? |
|----|-----------|-----|---------------------|
| **C1** | Vendor ERPNext **backup enabled + interval + retention + one restore into a disposable site** recorded (names only). | #956 B1 **NOT PROVEN**. Product docs say Cloud *can* do this; we have not read *our* dashboard or restored *our* site. | Anton dashboard inspect. Restore is a consequential action — exact restore packet later. |
| **C2** | Neon **PITR / retention** recorded in `POSTGRES_PROVIDER.md` (names, no connection strings). | App ledger is Neon. ERPNext cannot back up CorpFlowAI Postgres. #956 B8 **NOT PROVEN**. | Anton reads Neon console; docs PR after is ordinary. |
| **C3** | Monitor **#14** timer live (restic silence visible off-box). | #956 B9. Ops backup is not ERPNext, but it is part of the same “can we recover the company” question. | Existing L3 packet; Anton enables. |
| **C4** | `MASTER_ADMIN_KEY` **absent** from ordinary Cursor Cloud. | #956 S8 / #899 still **INCOMPLETE** as of 2026-08-14. Factory master in an ERP worker is a trust-boundary defect. | Already authorized by #899; UI delete of the **name**. |
| **C5** | Vendor ERPNext on a **supported patched** v16 (at least **16.29.0**, or the then-current patched 16.x) **or** a documented exception. Monthly check of [github.com/frappe/erpnext/security/advisories](https://github.com/frappe/erpnext/security/advisories). | 2026 critical/high advisories; recorded 16.26.2 may be behind 16.29.0. | Version read is ordinary. Upgrade is a vendor-dashboard / Cloud action — Anton. |
| **C6** | External accountant has approved **CoA / VAT / opening-balance / cutover** posture before the first **real** tax invoice. | Version 2 accountant authority. Phase D hard blocker unchanged. | Accountant + Anton. Not this packet. |
| **C7** | Integration identity stays **least-privilege**. Factory **must not** Submit or Externally Share. Draft → Anton approve → Submit remains the only outbound path. | Version 2 gates. Product will not enforce them alone. | Already standing doctrine. |
| **C8** | **No custom DocTypes / schema** without a separate Anton approval. Standard ERPNext first. | Reviewer upgrade-pain pattern; Version 2 minimum-viable-correctly-founded. | Standing. |
| **C9** | **One commercial SoR:** vendor-hosted v16. Do not grow sandbox/production-shell as a second ledger. CorpFlowAI execution stays outside and **reconciles**. | #956 S2; Version 2 reconcile-don’t-duplicate. | Standing. |
| **C10** | **Prestige fast lane is not blocked** by this programme. | Version 2 §16. | Standing. |

**C1–C4** are the same first four #956 P0s. #956 said #953 should only consider this verdict after those close. #959’s job is the **platform** decision **now**. The combined reading: **platform = ERPNext; irreplaceable trust = after C1–C6.**

---

## 7. What continues / what stops

**Continue (ordinary, already in flight):**

- Prestige proposal / quotation fast lane (#919 / #920) on hosted test; no send unless Anton separately approves that exact send.
- Standard-DocType foundation work, synthetic proofs, docs, PRs.
- Accountant conversation on CoA/VAT (human).

**Stop / do not start:**

- Treating ERPNext as irreplaceable until C1–C6.
- Migrating to Odoo / BC / SAP B1 / NetSuite.
- Buying a DR server or a second ERP “for safety.”
- Custom DocTypes, production accounting mutation, live send, env/secret changes, client_production.
- Growing self-hosted ERPNext on `corpflow-exec-01` as the commercial SoR.

---

## 8. Protected actions

**Protected actions encountered in this packet:** **NO** (research/docs only).

**Exact protected actions this verdict does *not* authorize** (still require exact later approval):

- client_production release / public launch
- env / secret value change
- production DB / schema / custom DocType
- payment
- live email / WhatsApp / SMS / external send
- vendor purchase or paid partner engagement
- live restore onto a non-disposable ERPNext site
- merge of this PR (Anton)

---

## 9. Sources (retrieved 2026-08-16 unless noted)

**Primary / official**

- [Frappe supported versions](https://frappe.io/support-versions)
- [ERPNext Supported Versions wiki](https://github.com/frappe/erpnext/wiki/Supported-Versions)
- [Frappe / ERPNext pricing](https://frappe.io/erpnext/pricing)
- [Frappe support SLA](https://frappe.io/support-sla)
- [Frappe Cloud site backups](https://docs.frappe.io/cloud/sites/backups)
- [Frappe Cloud restore & migrate](https://docs.frappe.io/cloud/sites/migrate-an-existing-site)
- [Frappe Cloud backup product page](https://frappe.io/cloud/backup)
- [Frappe token-based REST auth](https://docs.frappe.io/framework/user/en/guides/integration/rest_api/token_based_authentication)
- [Frappe REST API](https://docs.frappe.io/framework/user/en/guides/integration/rest_api)
- [GHSA-qq49-v74j-hjh7](https://github.com/frappe/erpnext/security/advisories/GHSA-qq49-v74j-hjh7) / CVE-2026-72911
- [GHSA-pxf3-4gvc-v45j](https://github.com/frappe/erpnext/security/advisories/GHSA-pxf3-4gvc-v45j)
- [GHSA-6fm9-g88m-hxr7](https://github.com/frappe/erpnext/security/advisories/GHSA-6fm9-g88m-hxr7)
- [GHSA-6ffr-92hr-3394](https://github.com/frappe/erpnext/security/advisories/GHSA-6ffr-92hr-3394)
- [Odoo 19 External API](https://www.odoo.com/documentation/19.0/developer/reference/external_api.html)
- [Odoo pricing](https://www.odoo.com/pricing)
- [Business Central official pricing](https://www.microsoft.com/en-us/dynamics-365/products/business-central/pricing)
- [Dynamics 365 Licensing Guide June 2026](https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/bade/documents/products-and-services/en-us/bizapps/Dynamics-365-Licensing-Guide-June-2026-PUB-2.pdf)
- [SAP Business One Service Layer](https://help.sap.com/doc/fc2f5477516c404c8bf9ad1315a17238/10.0/en-US/Working_with_SAP_Business_One_Service_Layer.pdf)
- [NetSuite SuiteScript 2.1 API governance](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157072844224.html)

**Aggregators (sentiment / unofficial price only)**

- [G2 ERPNext reviews](https://www.g2.com/it/products/erpnext/reviews) — 4.3/5 (51)
- [Capterra open-source ERP article](https://www.capterra.com/resources/free-open-source-erp-software/) — ERPNext 4.6/5 (138)
- Broken Rubik / Oracle Licensing Experts NetSuite 2026 price write-ups — **not** official list prices

**CorpFlowAI records**

- `docs/governance/erpnext/VISION_AND_INTENDED_USE.md` — APPROVED — VERSION 2
- `docs/operations/ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md` — backup/DR/security **NOT PROVEN**
- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` — first real tax invoice not yet
- `docs/erpnext/ERPNEXT_PRESTIGE_FOUNDATION_V1.md` — synthetic foundation READY

---

## 10. Explicit non-actions

This packet did **not**:

- contact a vendor or partner
- purchase anything
- change ERPNext data, roles, or versions
- change env, secrets, DNS, or schema
- send a message
- merge to `main`
- claim live production delivery
- re-probe the vendor hostname or print secrets

---

## 11. Next owner

| Next | Who | Why |
|------|-----|-----|
| Review and merge this docs PR | Anton | Ordinary merge gate |
| C1 vendor backup dashboard + disposable restore | Anton | Operator identity; restore is consequential |
| C2 Neon PITR names | Anton | Billing/console |
| C3 Monitor #14 | Anton | L3 |
| C4 delete `MASTER_ADMIN_KEY` name from ordinary Cloud | Anton | Already #899 |
| C5 confirm patched v16 | Anton (dashboard) or a later read-only probe packet | Version string only; no hostname in git |
| C6 accountant CoA/VAT | External accountant + Anton | Statutory |
| Platform switch | **none** | Not recommended |

Anton is **not** required to re-decide the platform. Anton **is** required for the exact control proofs above and for merge.
