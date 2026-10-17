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
