# OrixHealth delivery mobilisation packet v1

**Status:** Ready for controller/client response; implementation has not started  
**Source issue:** [#1421](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1421)  
**Parent workstream:** [#1304](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1304)  
**Commercial position:** OrixHealth accepted the MUR 25,000 starter proposal on 2026-10-07. Acceptance is not payment, access, or implementation-start evidence.

## 1. Response position

CorpFlowAI can commit to mobilising the accepted starter scope in a controlled sequence:

- batch / expiry control;
- the local MCB-to-Zoho banking conversion workflow;
- bank-rule and reconciliation optimisation;
- the first customer-intelligence / reorder capability;
- testing, handover and operating guidance.

The default is to configure and reuse the existing Zoho environment. No additional paid licence, custom integration, payment action, or outbound campaign is included or assumed at commencement.

The multi-currency purchase-price request is **technically credible, but not yet commitment-ready for the current organisation**:

- **Zoho Books current setup — NATIVE transaction currency, CONFIGURE:** official Books guidance supports foreign-currency vendor transactions when the relevant plan supports vendor currencies and multi-currency transactions. A Purchase Order can be created in the vendor’s currency and use an exchange rate.
- **Zoho Books item master — NATIVE single purchase rate only:** official Books item guidance describes one item purchase rate reflected on purchase transactions. The current evidence does not support claiming that one Books item can hold three independently selected Ex-Works purchase rates in MUR, EUR and USD.
- **Zoho Inventory purchase-price lists — NATIVE capability, CONFIGURE if entitled:** official Inventory guidance supports purchase price lists with their own currency and application to a vendor, purchase transaction or item. This is the most direct native route for currency-specific supplier rates, but OrixHealth’s existing Zoho Inventory entitlement/integration is not verified.
- **Current OrixHealth outcome — UNKNOWN/BLOCKED pending live entitlement test:** Books Premium is the identified current plan, Inventory is not integrated, and the required price-list behaviour must be tested in the client organisation before it is promised. If unavailable in the current entitlement, it becomes an explicit extension/paid-licence or bounded custom decision, not an assumed deliverable.

This means the client-facing answer should be: **“We can verify and configure the native route first; we will confirm whether the existing plan supports the three-currency per-item workflow before committing to it as part of delivery.”**

## 2. Proposed staged sequence

The stages are deliberately sequential where one stage supplies evidence to the next. The indicative effort bands are planning inputs, not a fixed promise; access delays, data quality and entitlement findings can change them.

| Stage | Indicative effort | Sequence and dependency | Client input | Acceptance evidence |
|---|---:|---|---|---|
| 0. Mobilisation and evidence | 1–2 working days after start conditions | Confirm scope, owners, access method, current Zoho plan/modules, safe sample data and decision log. Must precede configuration. | Valérie admin/configuration walkthrough; Johan banking/import walkthrough; one representative item/vendor/PO; current MCB CSV sample with sensitive values redacted where practical. | Signed/current gap matrix; access and responsibility checklist; no secrets stored in the pack; open unknowns named. |
| 1. Batch and expiry control | 3–5 working days after Stage 0 evidence | Configure the already live-verified Books Custom Module “Batch Register”, item lookup, fields, views, exception handling and operating procedure. Revisit Zoho Inventory only if the live entitlement test makes it the better native path. | Confirm required batch, expiry, quantity, receipt, depletion, quarantine and alert fields; provide a safe sample import. | A sample item is linked to batch records; create/read/update/review path works; expiry and exception view is usable; stock/accounting source-of-truth boundary is documented; UAT sign-off. |
| 2. Banking and reconciliation | 2–4 working days after a usable MCB sample | Review CSV shape, import steps, categorisation, transaction rules, matching and exception ownership. Keep this separate from payment execution. | Johan’s representative MCB CSV, current reconciliation procedure, examples of recurring descriptions and approved exception outcomes. | Rehearsed import on a safe copy/test context; before/after rule map; matched and unmatched examples; reconciliation close checklist; no bank mutation or payment initiated. |
| 3. Customer intelligence and reorder | 3–5 working days after customer/item data is confirmed | Use existing Books/Analytics data first to define repeat, dormant and reorder signals; produce the first operator-facing list or report. CRM/marketing expansion is out of starter scope unless separately approved. | Agree reorder window, dormant definition, priority products/customers, consent/approval owner and preferred weekly report. | Reproducible report/list from agreed source data; at least three synthetic or approved sample signals; each signal has an owner and next action; no message sent. |
| 4. UAT, handover and controlled release | 2–3 working days after stages 1–3 | Run end-to-end acceptance, document operating ownership, record known limitations and prepare the handover. Any production configuration remains separately approved. | Named UAT users; acceptance feedback; final owner for batch, bank exceptions and customer follow-up. | Completed acceptance matrix; screenshots or safe evidence; runbook; rollback/retention notes; handover sign-off; explicit list of anything deferred. |

**Expected sequencing:** Stage 0 → Stage 1 and Stage 2 can overlap only after mobilisation evidence is complete; Stage 3 depends on trustworthy item/customer data; Stage 4 follows all included acceptance checks. The multi-currency feasibility test should occur in Stage 0 and be resolved before the relevant PO workflow is committed.

## 3. Multi-currency verification procedure

No live configuration change is authorised by this packet. During a client-approved read-only/configuration review, verify:

1. Exact Zoho product and edition: Books Premium, Inventory status, organisation base currency, and whether Inventory is available without a new purchase.
2. Whether Settings exposes vendor currency and “Multi-currency Transactions for Each Contact” in the current Books entitlement.
3. Whether MUR, EUR and USD are enabled and whether exchange rates can be entered/controlled in the organisation.
4. In a safe test context, whether one vendor can be assigned a foreign currency and a Purchase Order can be created in that currency.
5. Whether the current Books item has only one purchase rate, and whether changing it would affect existing PO/Bill behaviour.
6. If Inventory is available, whether Purchase Price Lists can be enabled, created separately for MUR/EUR/USD, assigned to a vendor/transaction/item, and selected correctly on a Purchase Order.
7. Whether the price list chosen on the PO is preserved through conversion to Bill/receipt and does not silently replace the accounting exchange-rate treatment.
8. Whether Ex-Works price, freight/duty/landed cost and final accounting cost remain distinguishable. Do not represent an Ex-Works price as landed cost.
9. Whether the resulting PO and reports show the source currency, rate, converted base amount and vendor/item relationship clearly enough for operator and accountant review.

**Decision rule:**

- If steps 1–7 pass in the existing entitlement, classify the request **NATIVE / CONFIGURE** and include only the tested configuration and procedure.
- If multi-currency transactions pass but three currency-specific item prices do not, classify it **NATIVE / CONFIGURE for currency POs; UNKNOWN for per-item price lists** and do not promise the latter.
- If Inventory purchase price lists pass only after an already-owned module is enabled, classify it **NATIVE / CONFIGURE**.
- If a Marketplace extension is required, classify it **EXTENSION** and obtain separate client approval for compatibility, cost, data access and support.
- If no native/configuration/extension route is acceptable, classify it **CUSTOM** only after a written scope, reconciliation design and commercial approval.
- If entitlement or behaviour cannot be tested safely, classify it **UNKNOWN/BLOCKED**, not “supported”.

## 4. Client-input and access checklist

Request only the following, through the agreed secure channel; never place credentials, MFA codes, bank account numbers or private exports in GitHub or this document:

- confirmation of the commercial start/payment condition;
- Valérie’s availability for an administrator screen-share or supervised configuration session;
- Johan’s availability for one MCB CSV/reconciliation walkthrough;
- Zoho organisation, plan and enabled-product read-back;
- one representative supplier, item and recent/import PO example;
- safe sample data or redacted exports for the batch, PO, customer and banking workflows;
- required fields and operating rules for batch, expiry, quantity, receipt, depletion, reorder and exceptions;
- definitions for repeat, dormant and reorder signals;
- named approvers for configuration, UAT and handover;
- accountant review requirement for foreign-currency/landed-cost presentation;
- Nova’s role and any configuration/support history that should be retained or avoided.

## 5. Scope and protected actions

Included preparation does not authorise:

- live OrixHealth/Zoho mutation or production cutover;
- new paid Zoho licence, Marketplace extension or other software purchase;
- env, secret, access or schema changes;
- bank connection, payment, invoice or accounting submission;
- client email, WhatsApp, campaign or other external send;
- ERPNext backup/restore work;
- Rare & Exclusive / Jan work;
- a custom replacement ERP, bank API, CRM, or second authoritative stock database.

Anton remains the approval owner for external wording/send, payment or deposit confirmation, any additional paid licence/extension, production configuration/cutover, and any scope or pricing change.

## 6. Controller/client response input

Suggested concise response:

> Thank you for confirming acceptance. We propose to start with a short mobilisation and verification stage, then work through batch/expiry control, MCB reconciliation improvement, customer/reorder visibility, and final testing and handover. We will first verify the current Zoho plan and configuration, including whether your existing setup can use separate MUR, EUR and USD purchase-price lists for the same items. Zoho supports foreign-currency purchase transactions, but the exact per-item price-list capability depends on the products and plan enabled in your organisation, so we will confirm this before promising it. We will use the existing Zoho environment first and will not add paid software or custom development unless a verified gap requires a separate decision. To begin, we need the agreed start/payment condition, a supervised administrator review with Valérie, an MCB CSV/reconciliation walkthrough with Johan, and representative item/vendor/PO data. We will then return a confirmed implementation sequence, acceptance checklist and any explicitly optional items.

## 7. Evidence and verification record

Authoritative capability references consulted:

- [Zoho Books — Customer/Vendor Preferences](https://www.zoho.com/books/help/contacts/contact-preferences.html): vendor currencies, multi-currency transactions and exchange-rate handling.
- [Zoho Books — Items](https://www.zoho.com/books/help/items/): item purchase rate reflected on purchase transactions.
- [Zoho Books — Customers & Vendors](https://www.zoho.com/books/help/contacts/): vendor currency availability depends on plan.
- [Zoho Inventory — Price List](https://www.zoho.com/inventory/help/items/price-list.html): purchase price lists, currency, and application to vendors, transactions or items.
- [Zoho Inventory — Currencies](https://www.zoho.com/inventory/help/settings/currencies.html): vendor currency applied to foreign-currency purchase orders and exchange-rate handling.
- [Zoho Inventory — Preferences](https://www.zoho.com/inventory/help/settings/preferences.html): multi-currency transactions and plan-dependent feature availability.

Repository evidence:

- Parent issue #1304 records the accepted starter scope, current Books Premium / no Inventory integration, the live-verified Books Custom Module batch-register path, and the no-extra-paid-software-at-commencement boundary.
- `docs/execution/CLIENT_DELIVERY_OPERATING_KIT_V1.md` supplies the reusable discover → verify → classify → scope → acceptance → handover method.
- `pages/demo/orixhealth.js` is synthetic demonstration material only; it is not live client evidence and is not changed by this packet.

**Verification performed for this packet:** repository inspection, current GitHub issue/parent refresh, official Zoho documentation review, scope-boundary review. No live OrixHealth or Zoho mutation occurred.

**Final verdict:** `ORIXHEALTH DELIVERY MOBILISATION READY FOR CONTROLLER/CLIENT RESPONSE`
