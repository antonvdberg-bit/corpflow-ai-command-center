# OrixHealth — consolidated release, acceptance and operator handover packet

**Date:** 30 October 2026. **Owner:** CHAT/controller. **Status:** Prepared, not deployed or client-accepted.
**Scope:** Non-client-private, non-executable readiness material. Parent #1304. Verified GitHub heads below; authenticated tenant observations come from WORK issue receipts, **not** this document.

## 1. Release readiness — the five components

| Workstream / current head | Verified repository status | Tenant/operational gate | Next owner |
|---|---|---|---|
| MCB reconciliation #1539 `fd4c5658` (draft) | Focused 34/34, diff clean; native one-payment/one-invoice and one-payment/three-invoice cases source-traced without posting (#1538) | No trusted full banking API; non-post pilot, status/duplicate freshness and financial Match authority absent | WORK native acceptance; CHAT only evidenced code defects |
| Sales price proposal #1540 `d4a6ac7c` (draft) | 16/16, diff clean; integer cents, no-write, blocks policy/FX uncertainty | Destination, source provenance, EUR/MUR price-list visibility, tax/FX/rounding, eligibility and overrides unapproved | Business decision then WORK native readback; CHAT integration |
| Oldest debt #1533 `71d112c3` | 19/19, diff clean; offline planner | Invoice completeness, pagination, credit status and enforceable conditional update/clear verification absent | WORK source; CHAT contract |
| Statements #1522 `b59447e8` | 15/15, diff clean; offline disabled draft | Saved native function guard now **verified `disabled = true;`** via full-source before/staged/persisted equality (WORK #1522 receipt 6519269007); no function invocation or send. Runtime acceptance remains pending | WORK guard-only recovery, then CHAT acceptance |
| Batch allocation & expiry #1487 `5e708915` (draft) | Batch preview + expiry subset 27/27, diff clean after two EOF hygiene fixes | Verified batch opening quantities, units, reservations and movements absent; date-only rolling comparator bounds not proven | WORK source and native boundary; CHAT acceptance |

**Lifecycle:** code/test verified is not merged; merged is not deployed; deployed is not tenant accepted; tenant accepted is not client-trained. No merge, deployment, payment, invoice, stock change, schedule, notification, access change or client send approved by this packet. Technical test receipts: parent #1304 comment 6519227405. Current heads must be rechecked at release time.

## 2. Cross-component integration and non-duplication contract

1. **SoT separation:** Zoho Books/Inventory own invoices, payments, customer/item records and stock; bank entries are not themselves proof of an invoice payment. Repository planners generate advisory decisions only; never infer posting authority from a helper result.
2. **Bank `Paid` versus offline `open`:** #1539 normalized `ledger.status=open` is not the native status of the verified existing Customer Payment, which showed `Paid`. A mapping is BLOCKED until the source schema and route meaning are independently verified. No coercion to make tests pass.
3. **Aggregate payments:** one existing bank-side candidate can be a single recorded payment allocated across three fully paid invoices. Review the payment's native allocation table and all reciprocal invoice links first; do not create three new receipts or accept a second payment automatically.
4. **Customer/currency/price-list:** `cf_cost_exworks` is decimal but `cf_currrency` (native spelling) is optional free text, not a certified ISO currency; native customer currency may be MUR while the observed GC EUR sales list is not selectable in that customer's assignment dropdown. #1540 returns proposals, not sales-list updates or customer pricing coverage.
5. **Purchase sync independence:** historical `gc_exworks_price_sync` success pertains to a purchase-pricebook route, not approved sales-rate automation. The separate vendor/currency enrichment helper has a recurring GET failure; preserve working sync, do not assume its source fields are complete.
6. **Debt/statement dependency:** statement preparation must not silently consume a planner-derived oldest-debt value as if saved in native customer state. Source invoice/credit completeness and explicit readbacks precede any refresh; customer currency and statement-period policy are independent gates.
7. **Batch/expiry dependency:** an expiry date alone is not quantity available. Allocation requires attested opening balances, movements, reservations, units and canonical earliest expiry; warning windows are date-only until independently stock-qualified. No stock writes.
8. **Partial-order separation:** a sales order's total `Amount` is not the unbilled remainder. Existing pending list shows Confirmed/Partially Invoiced; available reporting columns do not prove a reliable line-level residual. Do not conflate with receivables/credits.
9. **Cross-stream risk:** no unverified shared background scheduler, duplicate financial/stock ledger, or second production database; operational actions should remain native-first.

## 3–4. MCB reconciliation operator procedure and no-post pilot

**Case admission (read-only):** In authenticated native MCB Uncategorized, open an entry detail (not checkbox); inspect Best/Possible Matches and classify: (A) existing customer payment, (B) invoice-route, (C) vendor/bill/transfer/expense/refund, (D) uncertain. For A, independently locate the exact recorded payment, compare bank account/currency/amount/date/reference/party and no unused residual, then inspect its allocated invoices and reciprocal payment links. For grouped A, verify sum of invoice allocations equals original payment and do not create additional payments. For B, note that invoice-route may create a payment and is **not** equivalent to A. For C/D, require route-specific source evidence; do not guess. Cancel without Select, Match, Categorize or edits.

**Pilot matrix (non-posting):**

| Case | Minimum evidence | Decision |
|---|---|---|
| Existing payment — one invoice | Reciprocal link, fully paid invoice, correct bank/account and payment identity | REVIEW_READY only if all consistent |
| Aggregate existing payment — multiple invoices | One source payment, complete invoice links, sum=payment, no residual | REVIEW_READY only if all consistent |
| Same amount/reference duplicate | Fresh unmatched/matched state and independent transaction identity | EVIDENCE_NEEDED until duplicate excluded |
| Partial/overpayment/short payment | Available residual, linked balances and treatment policy | EVIDENCE_NEEDED; never invent allocation |
| Withdrawal, supplier bill, transfer or refund | Correct native source route, source bank/account and obligation | Route-specific review only |
| Missing reference, conflicting currency, incomplete pagination | Missing/conflicting source documented | BLOCKED_SOURCE; stop |

**Pilot evidence (private operator record):** anonymous case label; route; evidence completeness yes/partial/no; original payment vs new-payment route; duplicate/residual uncertainty; review-ready/evidence-needed/reject; no action performed; time if measured. Do not include identities, balances, account numbers or transaction amounts in public GitHub. Snapshot freshness must be re-established immediately before any separately authorised Match. Operator performs no financial mutation through this packet.

**Acceptance:** known single- and three-invoice examples are verified in #1538; a further different exception category and bounded sample are still needed for broad acceptance. No claim of bank reconciliation completion.

## 5. Sales-pricing integration acceptance

**Proposal inputs:** independently verified current `cf_cost_exworks` with positive two-decimal money; verified ISO currency semantics independent of free-text `cf_currrency`; eligible carried item; explicit no-override evidence; approved target **sales** list identity, customer assignment/distribution, tax basis, rounding, currency policy and exchange-rate source/date where FX is required. Policy must not be inferred from UI labels or historical purchase sync.

**Calculation:** approved same-currency 100% markup = cost × 2, exact cents. #1540 fails closed on absent business approval, destination, nonpositive/ambiguous cost, item exclusions, override uncertainty, mismatched or unapproved currency; it refuses cross-currency conversion. Verify source→proposal and native target-list→transaction rate separately. No automatic updates to existing purchase list or dealer/customer exceptions. If pilot customer MUR cannot select candidate EUR list, BLOCKED_DISTRIBUTION rather than claiming live activation.

**Readback gate:** read effective price on representative item/customer/transaction; compare exact effective currency and tax/rounding, check one carried and one excluded item, preserve override; mutation and rollback require explicit scope approval.

## 6. Oldest-debt controlled deployment/rollback contract

**Preconditions:** tenant-specific read-only source with complete invoice pagination, clear open/paid/void/credit/overpayment semantics, customer scope/currency, source as-of time and valid due dates. Unknown status, missing page or inconsistent credit => no candidate update. Do not fill missing source with zero or stale stored values.

**Proposal:** choose earliest due date among independently verified outstanding positive balances; if none, propose an explicit clear only when completeness of the full customer invoice universe is proven. No unconditional clear and no write-on-read.

**Protected write gate:** independently verify target custom field and permissions; enforce a conditional/compare-and-set style safeguard or equivalent acceptable freshness recheck, audit previous value, update only exact authorized scope, re-read persisted value and verify. On conflict or unexpected result STOP; restore only through separately approved, source-verified rollback, never blind overwrite. PR passing 19 tests is not an installed workflow.

## 7. Customer statement acceptance and send prevention

**Safety gate verified:** WORK applied Anton's exact approved native guard-only correction, with full-text pre-save and reopened persisted equality checks, and confirmed a single `disabled=true` guard, no remaining `disabled=false` and no invocation (#1522 comment 6519269007). This proves saved guard parity only, **not** functional execution safety or tenant acceptance. Never Execute merely to retest the guard.

**Independent acceptance after guard:** source scope/customer selection, date start/end inclusivity, native statement currency and multi-currency separation, CC recipient permissions/consent, preview artifact, invoice/credit/receipt completeness, privacy and destination checked. A controlled no-send invocation requires separate authorisation and verified function-source parity; externally sending statements requires distinct approval and human validation. No emails scheduled by this document.

## 8. Batch allocation and reservation acceptance

**Source admission:** one actual item and two compatible existing batches are known in private delivery issue #3, but the opening quantity, base/pack unit, expiry, cutoff, stock movements and reservations are **not** independently verified. Until then return `BLOCKED_SOURCE`, never a source-dependent allocation preview.

**When source evidence arrives:** attest item/batch identity, opening balances and as-of boundary, all receipts/issues/reversals, in-flight commitments, reservations, units/conversions, expiry and lot status. Replay movement sequence in authoritative order; reject duplicated/dangling/future or out-of-boundary movements; calculate available = verifiable physical remaining − independent reservations, never negative. Sort eligible lots by earliest valid expiry, use older-expiring stock first irrespective of receipt date, allocate no more than source available, preserve total requested, and quarantine expired/missing-date and incompatible lots. Output advisory split only; invoice/batch stock mutation requires separately approved native pilot, fresh readback and rollback. Focused 27/27 alone does not confer live data authenticity.

## 9. Expiry review windows and notifications

Let D = today in the **Zoho organisation's Indian/Mauritius calendar**, E = populated expiry date.

| Review status | Mathematical date-only predicate |
|---|---|
| Expired | E < D |
| Today–30 | D <= E < D+31 |
| 31–60 | D+31 <= E < D+61 |
| 61–90 | D+61 <= E < D+91 |
| Missing expiry | E absent; separate quarantine |

Native unsaved range 30 Oct 2026–28 Jan 2027 rendered correctly but returned zero records. Official inspected Zoho Books view docs did **not** prove strict vs inclusive before/after or relative Today rollover semantics. Thus rolling-view native boundary acceptance is OPEN; do not save using inferred offsets, create live test batches, or activate reminders. Use vendor-confirmed exact semantics or approved non-production boundary fixtures. When enabled by separate approval, verify each 30/31/60/61/90/91-day boundary, missing-date route, date rollover, ownership/sharing, deduped notifications and no catch-up flood. Expiry-date view is **not** an available-stock alert.

## 10. Client operating handover package — prepared structure

**Johan — banking:** open native MCB, compare candidates to actual existing payment/bill/transfer, verify reciprocal invoice links, stop on ambiguity, escalate with private case evidence; never auto-create a second payment. Existing reconciliation pilot guide/tracker was previously sent; this packet does not resend.

**Valerie — stock/pricing:** confirm canonical cost/price list, item carry policy and any negotiated overrides; maintain independently reconciled batches with quantities, units, movements and expiry; review quarantined/near-expiry items; do not process unverified allocation advice. Client instruction material stays provisional until real workflow is installed.

**Both — statements/debt/orders:** review authoritative source and periods before statement preview; never send via test function. For partial orders compare per-line ordered vs invoiced and pending quantities; do not use order total as remaining value. Escalation categories: SOURCE_MISSING, CURRENCY_OR_PRICE_LIST, DUPLICATE_OR_RESIDUAL, BATCH_STOCK_UNVERIFIED, NATIVE_VIEW_BOUNDARY, SAFE_WRITE_BLOCKED.

**Handover sign-off (future, not achieved):** approved native configuration and access; evidence from representative transactions/items; reconciliation exceptions reviewed; batch quantities attested; debtor field change reversible; statement preview accurate with no unintended sends; price effective on actual transaction; Johan/Valerie demonstrate steps and accept exceptions route. Record source, approver, date and outcome in appropriate private client record; only sanitized milestone in GitHub.

## Open gates, work routing and reusable learning

- **CHAT:** own this release/readiness packet; maintain code PR lineage and correct only demonstrated defects; record review decisions. No justified Cursor dispatch for documentation alone.
- **WORK:** statement read-only source parity assessment (guard correction now verified; no execute), further distinct banking exception review, source-backed currency/pricing destination interpretation, verified expiry comparator boundaries, and safe order reporting under existing read-only scope. Do not duplicate code implementation.
- **Client:** later attest opening stock and approve pricing/operational pilot decisions; no immediate outreach from this packet.
- **Anton:** PR merges, production deployment, live stock/invoice/payment mutations, env/access/scheduler changes, messages, paid capacity and public launch remain protected individually.

**Learning:** native existing aggregate payments can represent several invoices; attempting one payment per invoice risks duplicate accounting. Description text is not executable guard state. Exact native editor staged/persisted full-source comparison prevented unintended edits and later verified the approved guard-only correction. Date-only views cannot establish stock availability. **Superseded:** 'grouped payment unverified' is superseded by source-bounded three-invoice case; 'statements function disabled' is superseded by verified saved `disabled=false`; all broader claims remain unproven.

**Completion classification:** all ten packet topics drafted, with current source-bounded acceptance rules; actual client operation remains gated. No production changes, client sends, PR merges or automated background work occurred in preparing this packet.
