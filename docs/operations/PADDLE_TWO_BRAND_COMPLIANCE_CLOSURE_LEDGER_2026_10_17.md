# Paddle two-brand compliance closure ledger — 17 October 2026

**Purpose:** B2B websites and real order-to-ERPNext onboarding must be proven before live Paddle onboarding. This is evidence, not a compliance certificate.

## Already delivered — do not rebuild

- PR #1437: CorpFlowAI regional pricing and two-brand reviewer pages MERGED. Public pricing and review content retrieved, but interactive acceptance incomplete.

- PR #1465: product navigation improvements MERGED. Read-only browser reached Website Rescue with MUR 45,000; other products/markets need interaction tests.

- PR #1422: Business Admin Desk legal identity/contact code MERGED. Public-domain promotion and working brand mail routing NOT VERIFIED.

- PR #1450: ERPNext Sales Order and Invoice print-brand routing MERGED. Actual authenticated ERPNext Print Format read-back and PDF rendering remain distinct.

- PR #1403 and #1398: signed Paddle sandbox events and idempotency reported PASS. No inspected event handler integration to ERPNext order writes.

## Fresh actual public defects

1. P1 CorpFlowAI homepage at https://corpflowai.com/ contains retired MUR 85,000 Lead Rescue CTA despite new MUR 12,900 offer above. Remove obsolete claim, verify no unsupported scarcity.

2. P1 Business Admin Desk public homepage at https://businessadmindesk.co.za/ links to personal swart829@gmail.com and is conversation-first. The CEO requires B2B product catalogue, select package, structured company onboarding. Test host at https://cipc.corpflowai.com/ uses brand alias but routing is pending verification. Public host changes require approval.

3. P1 CorpFlowAI terms/refund pages describe bank acquiring, chargebacks and PDF invoice issued by CorpFlowAI for each successful payment. Before Paddle Merchant-of-Record activation, finance and legal must approve conditional buyer receipt/invoice and ERPNext accounting treatment; avoid duplicate demand.

4. P1 Business Admin Desk pricing is quote-only and unapproved. Internal CIPC bands are model assumptions, not legal sales prices. Avoid invented prices.

5. P1 Sandbox Paddle state.js stores events but does not create ERPNext Customer, Sales Order, Invoice or Payment Entry in inspected handler. Examine existing connector and avoid duplicate implementation.

## Test log

- Public content retrieved from CorpFlowAI home/pricing/reviewer/Lead Rescue/terms/refund; BAD public home/partners and test home/pricing. Content retrieval PASS, no form or payment submission.

- One read-only browser pricing navigation reached Website Rescue with MUR 45,000. Full product/market/device flow remains NOT TESTED.

- Follow-up interactive dual-host attempt timed out upstream. Do not mark page FAIL or PASS from this.

- Paddle Live remains 0 percent NOT STARTED per operator screenshot; no merchant submission, secrets, payment or ERP data mutation.

## Completion path

1. Verify deployed SHA and desktop/mobile journeys for product selection, all regions, pricing and CTA, without live sends.

2. Correct confirmed stale CorpFlowAI homepage text with existing website owner in a narrow PR, no duplicate claimed work.

3. Verify Business Admin Desk test-host catalogue and intake, brand email routing and real order/onboard record, no public release.

4. Reconcile Paddle merchant-of-record documents with ERPNext Sales Order, tax invoice/accounting and receipt. Legal/finance approval reserved.

5. Prove sandbox B2B transaction-to-ERPNext-company-order-and-onboarding once, including replay, failure, cancellation and partner scenarios.

6. Assemble truthful product-specific evidence, policies, company identity and provider eligibility questions; submit only after Anton approval.

## Deferred operator decisions

- Anton/Serah approve Business Admin Desk actual prices and service package boundaries.

- Anton/finance approves invoice/receipt/tax/recurring grace terms and provider-specific legal policies.

- Anton approves only exact merge, deploy, DNS/mail routing, provider submission and live-payment gates.

Current verdict: NOT YET SUBMISSION READY. Existing code is significantly complete but customer-facing and cross-system evidence incomplete. Context/Agent Learning not written.

## 17 October — direct laptop endpoint smoke checks

Executed from connected `2024-LTPAvdBerg` through Desktop Commander, using unauthenticated HTTPS GET, no secrets and no data writes:

| Endpoint | HTTP | What it proves |
| --- | --- | --- |
| `https://erp.corpflowai.com/api/method/ping` | 200 | ERPNext public API routing is reachable from operator laptop; **not authenticated access** |
| `https://erp.corpflowai.com/login` | 200 | Login UI route responds; **not logged-in session** |
| `https://cipc.corpflowai.com/pricing` | 200 | BAD review pricing route responds; **not live checkout** |
| `https://corpflowai.com/pricing` | 200 | CorpFlowAI price route responds; **not verified buyer-order journey** |

Next acceptance: use existing least-privilege ERPNext integration worker to read back approved document metadata; render existing documents without posting financial entries. Browser login remains fallback. BAD customer charge currency is ZAR only. Current provider documentation does not establish Paddle direct MUR payout; verify payment/bank conversion route before making payout claims.


## 18 October — authenticated ERPNext proof and CEO approved BAD direct price baseline

**Supersedes the 17 October unauthenticated-only ERPNext limitation and the prior "BAD rates not approved" blanket statement.** On 17 October local Cursor's existing Playwright Chrome extension succeeded in authenticated ERPNext Desk read-only verification (GitHub #1390 comment 6233536329). After explicit CEO approval, local Cursor created, enabled and read back three existing ERPNext configuration records: `Business Admin Desk ZAR Sales Order` (Print Format), `Business Admin Desk ZAR Sales Invoice` (Print Format), and `ZAR Selling` (Price List); see #1432 comment 6233731427. Existing company default remains MUR, Mauritian legal seller unchanged. No client-ready ZAR print was achieved: there was no BAD Item, ZAR Item Price or ZAR transaction. Do not claim full document acceptance.

**CEO commercial decision 18 October** — recovered 8 October direct-SME schedule adopted, and Annual Return range resolved to **R99**, see #1432 comments 6245413750 and 6245440999. Customer-facing service fees, all **ZAR**, statutory/government fees excluded and separately disclosed:

| Direct BAD service item | Approved ZAR fee |
| --- | ---: |
| Simple existing-company entity onboarding | 199 |
| New standard-company registration plus onboarding, as one bundle | 299 |
| Annual Return — BO already current, clean case | 99 |
| Simple Beneficial Ownership filing | 249 |
| Ordinary director appointment or resignation | 199 |
| Registered address change | 69 |
| Share certificate from verified register | 99 |
| Name reservation | 99 |
| Financial year-end change | 199 |

Scope/condition: these are fees for ordinary cases only, not a government charge or promise of successful/expedited filings. No extra onboarding charge on top of the new-company combined bundle. Original standalone registration R129 is still only a *historical test candidate*, not an approved SKU. Partner PAYG 20–35% is a *tested pricing architecture*, NOT a universal or approved live partner price list. Monthly capacity/portfolio fees are negotiated, unpriced. Tax/VAT and Paddle processing FX settlement remain finance/provider gates. The 8 October Serah written response approved the measured pilot and approach while flagging final service-time/cost verification; do not misstate that as final independent cost validation. CEO's later exact rates are the current commercial price instruction.

**Immediate ERPNext execution gate:** local Cursor must be explicitly invoked; GitHub handoff does not summon an authenticated laptop agent. Search-before-create nine Item masters under `Business Admin Desk Services`, set only nine approved Item Prices in existing `ZAR Selling`, verify name/item group/price list/currency/amount via authenticated read-back and detect duplicate or inconsistent mapping. This instruction has explicit CEO authorisation in #1432 comment 6245440999, but **no local Cursor pickup or completed write/read-back is yet evidenced**. No customer/order/invoice/payment entry, public publishing, live Paddle onboarding, new secrets or bank mapping is authorised by this record. Subsequent acceptance: safe brand-ZAR Print Format rendering without posting production finance truth, and independently verify public website/policy/merchant-of-record terms and B2B onboarding integration.

**Source preservation:** canonical ERPNext Jinja templates still require export/versioned source. Latest observed source remains live ERPNext plus local evidence, not GitHub. Keep implementation and source recovery together; no claim of repo persistence until verified.


## 18 October — nine live BAD service Items and ZAR Item Prices read-back verified

Live authenticated local Cursor evidence: #1432 comment 6245591063. Search-before-create passed, and 9 Items / 9 Item Prices were added and read back in standard ERPNext; existing Item group leaf is `BAD Administration` under `Business Admin Desk Services`. Existing `ZAR Selling` price list used; company `CorpFlowAI LTD` remains Mauritius with MUR base. Prices: existing-entity onboarding 199, standard registration + onboarding 299, annual return BO current 99, simple BO 249, director appointment/resignation 199, address change 69, share certificate 99, name reservation 99, financial-year-end change 199, all ZAR service fees excluding statutory charges. Baseline counts Item 9->18, Item Price 7->16, ZAR Item Price 0->9; Sales Order 1, Sales Invoice 3, Payment Entry 0 and Customer 7 unchanged. No public pricing, partner price, payout or actual payment test performed.

**Precisely unresolved:** the non-transaction test sent an `Item` code to a `Sales Order` Print Format; it correctly failed closed but cannot validate an actual BAD ZAR Sales Order. Need appropriately typed safe draft/isolated synthetic Sales Order and Sales Invoice fixture/render. The attempted `Sales - CFAI` income account assignment failed link validation and was **not** persisted; determine existing valid income-account mapping and do not invent GL accounts. See controller reconciliation #1432 comment 6245600424. Merchant of Record invoice role, dual-currency financial reconciliation, ZAR customer charges and provider USD/MUR payout remain unverified. This is catalogue complete, **not** checkout or client-ready document acceptance.


## 18 October — Paddle published payout mechanics verified; final provider/account fit still gated

Paddle official Help Center confirms: (1) ZAR customer payments need not equal the merchant balance currency; accepted customer funds are converted into configured balance currency at purchase, and supported balance currencies include USD; (2) supported payout currencies include USD and ZAR, but **not MUR**; (3) wire payments are typically **monthly**, subject to configured payout minimum (at least USD 100 equivalent), with payout initiated in the monthly cycle; (4) payout currency different from balance currency may incur an FX conversion margin up to 1.5%, international wire routes may have a 15-unit SWIFT charge plus bank/intermediary fees. Official references: https://www.paddle.com/help/start/set-up-paddle/how-do-i-change-my-default-%28balance%29-currency ; https://www.paddle.com/help/manage/get-paid/can-i-be-paid-in-my-local-currency ; https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid ; https://www.paddle.com/help/manage/get-paid/is-there-a-fee-taken-for-payouts . These are provider policy statements, **not verification of merchant-specific USD payout eligibility or bank receipt**.

CEO approved route: BAD website/checkout/customer amount **ZAR**; configure **USD balance and USD payout** as the sensible candidate into existing Mauritius USD bank account if Paddle confirms eligibility. This is preferable to avoid an unnecessary additional balance-to-payout conversion; validate charges, any other fees, monthly settlement, cash-flow consequence, merchant legal identity, bank SWIFT reception, and final MUR functional-currency books. Do not alter payment/bank settings or start a live transaction without specific approval. MUR bank-credit preference remains aspirational subject to verification; neither preference supplies evidence of live routing. Reconciliation must cover customer ZAR charge, USD Paddle balance, Paddle fees, USD payout and bank credit, plus ERPNext base-MUR conversion using actual rate/date. Legal/finance review must reconcile Paddle MoR buyer invoice vs seller ERPNext order/receivable before launching.

**Document acceptance correction:** Existing Jinja Print Format's nontransaction `Item`-as-`Sales Order` probe is a type mismatch, not proof of template defect. Inspect exact currently valid ERPNext sales income account and inherited/default mappings in read-only mode. Do not select `Sales - CFAI` again without verifying the exact linked Account ID and company. A safe typed Sales Order/Sales Invoice rendering can be prepared from memory/fixture only if ERPNext renderer supports this without persisting production commercial documents; otherwise flag exact protected draft creation gate for Anton. No need to alter existing fail-closed safety for the invalid Item probe.


## 18 October — typed BAD ZAR commercial document render PASS; income leaf traced

Verified local authenticated ERPNext read-only evidence #1432 comment 6245658557 (2026-10-18T04:27:30Z). Nine approved BAD Items and ZAR Selling Item Prices are unchanged; Item=18, Item Price=16, SO=1, SI=3, Payment Entry=0, Customer=7. `CorpFlowAI LTD` remains Mauritius/base MUR. Native ERPNext `frappe.www.printview.get_html_and_style` rendered **non-persisted, correctly typed ZAR Sales Order and Sales Invoice JSON fixtures**: BAD branding, Mauritian legal seller and amount ZAR 199 passed; draft invoice accurately reads Pro-forma. Mixed-item-group, non-ZAR and wrong-company negative tests failed closed; existing MUR/USD saved documents fail closed. This is real Jinja/native print-engine **template acceptance**, NOT proof that a saved numbered client document exists; no production draft/order/invoice or payment was created.

**Accounting investigation:** `Sales - CFAI` does not exist in the ERPNext CoA (legacy stale Item Defaults may still contain that string). `CorpFlowAI LTD.default_income_account` is empty; BAD Item Groups have no inherited defaults. Valid existing MUR, non-group income leaves: `4101010 - Professional Fees - CFAI`, `4101020 - Development  Fees - CFAI`, `4101030 - Project Management Fees - CFAI`, `4101040 - Product Sales - Code - CFAI`. Existing draft Sales Invoice already used `4101010`. **Controller recommendation for finance review:** classify standard BAD company-secretarial service revenue under existing `4101010 - Professional Fees - CFAI`, *if* finance confirms appropriate. This is only a suggested accounting mapping; no account assignment, default update, ledger posting or Item modification is authorised by this document. An approved income account must be present on any submitted invoice lines; it need not be copied into all Item Defaults if safely supplied by existing invoicing logic. Do not duplicate Paddle MoR customer invoices; establish seller/bookkeeping document role before posting.

**Status:** BAD product/price catalogue PASS, BAD ZAR typed Print Format PASS, income-account diagnosis PASS. Income classification approval, actual merchant MoR invoice/ERPNext receivable design, saved-document acceptance and sandbox B2B payment-to-ERP linkage remain OPEN. No premature live Paddle onboarding.
