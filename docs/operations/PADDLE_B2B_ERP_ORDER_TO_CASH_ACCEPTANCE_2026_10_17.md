# B2B order-to-cash and rapid onboarding acceptance contract — 17 October 2026

**CEO decision:** On either brand, a paid business order must create a traceable authoritative ERPNext commercial record and rapidly initiate company onboarding. Website selection and payment are only the entry point, not operational completion. CEO expects a business sales order, an invoice and a payment receipt attributed to that business, with high automation precision.

**Governing existing sources:** ERPNext-first #918 and #1054; CorpFlowAI/BAD Paddle #1432; #1398 verified sandbox payment flow. **No new billing database/application.** ERPNext owns Customer, Contact, Address, Item, Sales Order, Sales Invoice and Payment Entry where applicable. CorpFlowAI owns workflow execution and references ERPNext IDs.

## Business journey (required outcome, not implementation claim)
1. Buyer chooses an accurately described **B2B** offer and approved rate or an explicitly scoped quotation; no unapproved BAD numeric pricing, no unauthorised Paddle offer.
2. Confirm purchasing legal business name, country, billing currency, authorised business contact and minimum billing requirements securely. Do not publicly request secrets, IDs or unneeded private documentation.
3. Generate an immutable order intent and correlation/reference key, with the business, brand, SKU, quoted terms, currency and expected one-time/recurring schedule.
4. Create or safely match **one** company Customer/Contact/Address in ERPNext; prevent duplicates using authoritative identifiers and reviewed matching, never just similar names.
5. Create the linked ERPNext business **Sales Order** or approved commercial equivalent after confirming the external purchase terms; preserve product and brand provenance.
6. For a Paddle-eligible SKU only after approved activation: obtain server-verified transaction/payment status via Paddle's signed webhook and authoritative provider API; browser 'success' never confirms payment. If a direct invoiced sale instead, use the approved ERPNext collection path.
7. Maintain a legally accurate ERPNext **Sales Invoice/payment accounting representation** and customer-facing documentation. **Critical MoR check:** Paddle is Merchant of Record on Paddle transactions, and may issue the buyer's tax invoice/receipt. Do **not** send an additional CorpFlowAI/BAD payment demand or second seller tax invoice for that same purchase. Finance must decide the correct ERPNext document/accounting and payout mapping before activation. Customer must still receive the applicable authoritative invoice and receipt, and our ERP must retain reconciliation evidence.
8. Link payment confirmation to the company, Sales Order, invoice/accounting references, provider transaction IDs, payout/reconciliation IDs where available; issue customer receipt/confirmation only from the legally correct source. Deduplicate delayed/replayed webhook events.
9. Automatically activate a **company-specific onboarding case/workflow** as soon as eligible authorised payment is genuinely confirmed, or at the separately approved commercial milestone for invoiced clients. Provision only the purchased package; do not imply instant fulfilment for human/statutory steps.
10. Send an appropriate onboarding link/next step only via an approved message channel once live messaging is authorised. Track incomplete company details without blocking already accepted payment evidence.
11. For monthly billing, maintain a single source of truth: native Paddle subscription events for Paddle transactions, ERPNext financial/commercial mirror, CorpFlowAI service entitlement/workflow state. Overdue, refund, cancellation and disputed charges must reconcile without double billing or unapproved grace assumptions.
12. Exceptions/alerts go to human review with case identifiers and minimal information; do not silently drop payment and do not grant service from frontend UI alone.

## Deterministic acceptance test cases
| ID | Scenario | PASS criterion |
|---|---|---|
| E01 | New company places eligible order | Exactly one ERPNext Customer and linked Contact/Address, documented source order key |
| E02 | Existing company repeat order | Reuse correct ERPNext Customer; no duplicate company |
| E03 | Successfully paid Paddle purchase | Paddle signature/API evidence matched to order; correct sale/payment accounting and customer receipt source; onboarding initiated exactly once |
| E04 | Browser reports success without signed payment | No fulfilment/entitlement or paid accounting mutation |
| E05 | Duplicate or out-of-order webhook | Exactly-once effect; event ledger and reconciliation preserved |
| E06 | Unpaid/manual invoice | Order and company recorded, unpaid state visible; no false receipt or unauthorised provisioning |
| E07 | Multi-brand same company | Shared legal Customer where applicable; brand/product provenance and correctly isolated execution |
| E08 | Monthly renewal and past-due | Renewal maps to right business and schedule; failed charge not posted as received |
| E09 | Refund/credit/cancellation | Correct provider and ERP reversal/adjustment evidence, no duplicate merchant invoice |
| E10 | Customer detail validation fails | Exception queue; traceable payment/order preserved and no orphan customer records |
| E11 | Partner/portfolio company orders BAD | Explicit purchaser, beneficiary businesses, authority and package scope; correct account/customer relationships |
| E12 | End-to-end time to onboarding | Timestamped order -> verified payment -> ERP records -> onboarding start; SLO to be agreed from realistic existing runtime measurement, not invented |

## Owner and routing
- Controller: reconcile existing #918/#1054 ERPNext and #1398 Paddle APIs, prove whether any bridge already exists; define exact missing API/data contract and test packet. No speculative new stack.
- Cursor **only for confirmed integration gaps** in existing ERPNext/Paddle runtime, with bounded file list, tests, single existing executor and no data/schema changes by default.
- Finance/accounting owner + Anton: **one material decision** before Paddle activation: exact Merchant-of-Record invoice, tax, receipt, payout and ERPNext accounting mapping. Prepare evidence for their review; do not invent tax treatment.
- Anton: approve public/live checkout, production deploy, any protected ERP data writes and outbound customer messages at the exact gate.

**Security:** no production data writes, env/secrets/access changes, actual payment, email dispatch or public release in this documentation packet.

**Verification status:** Contract documented, actual customer E2E NOT VERIFIED. No browser, ERPNext customer creation or Paddle payment performed.
