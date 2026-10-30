# OrixHealth MCB native review acceptance — v1 (read only)

**Status:** Operator pilot procedure, **not** financial authorisation, live integration, or proof of completed reconciliation.
**Owner:** WORK for authenticated Zoho inspection and guided pilot; CHAT for technical acceptance.
**Lineage:** parent #1304; reconciliation issue #1538; draft review helper PR #1539.

## Scope and current evidence

Work verified one incoming MCB bank entry's Best Match identifies an **already recorded Customer Payment**. The payment was independently found through Sales > Payments Received; source date/reference/currency/amount/customer and Deposit To account agreed in the authenticated session. The existing payment showed Paid and no unused amount; its linked invoice was Paid with no balance, and invoice Payments Received pointed back to the same payment. This **one example** supports a candidate explanation; it does not establish a fully reconciled bank line or validity of other transactions. A separate no-write grouped-reference case was also verified: the native Best Match pointed to one pre-existing Customer Payment already allocated across **three** invoices, with sum of allocations agreeing with the aggregate payment and reciprocal payment links visible on each fully paid invoice. No Match or Categorize was executed in either case. See #1538 receipts 6512830787, 6513205484 and 6517856297.

## No-write operator inspection procedure

1. Open the existing MCB account's **Uncategorized** bank entries. Open one incoming entry by its description, not the checkbox. Note its matching state privately.
2. Read the **Best Matches** and **Possible Matches** panels. Do not assume that an alternative displayed in Possible Matches is recommended.
3. Classify the proposed route:
   - **Existing Customer Payment**: seek an already recorded payment and check its account, currency, amount, date/reference and customer identity. Follow **Payment for invoice**, check each linked invoice's outstanding balance, then follow reciprocal **Payments Received** links to ensure this is the same payment record. For grouped-reference receipts, inspect the existing aggregate payment's allocation table first and reconcile its displayed allocations to the total; do not manufacture separate invoice payments. If partial, ambiguous or missing links, mark **EVIDENCE_NEEDED**. Do not create another invoice payment.
   - **Invoice**: potentially creates/records a payment rather than merely links a previous payment. Treat as **REVIEW**, never imply equivalence to an existing-payment match.
   - **Transfer**, **Vendor Payment**, **Bill**, **Expense**, **Credit/Refund** or unclear type: apply the corresponding existing-record trail or mark **EVIDENCE_NEEDED**. Do not infer accounting treatment.
4. Immediately before any later approved financial action, re-check bank-entry matched/duplicate state and available residual against native source. If freshness or independent source evidence is unavailable, stop.
5. Close via **Cancel** for this pilot. Do not Select, Match, Categorize, import, edit, send or activate a rule.

## Per-case sanitized acceptance fields (record in approved private operating record, not public GitHub)

Use an anonymous case label and these non-sensitive classifications only:

| Field | Allowed value |
|---|---|
| Native candidate route | existing-payment / invoice-route / transfer / vendor-route / other |
| Independent source path found | yes / no / incomplete |
| Account-currency-amount-reference corroborated | yes / partial / no |
| Reciprocal payment-to-invoice relationship | yes / no / not-applicable |
| Residual or duplicate uncertainty | none-observed / unresolved |
| Operator decision | review-ready / evidence-needed / reject-candidate |
| Financial action performed | no (for this read-only pilot) |
| Time | manually measured, optional, no client-private amounts |

A positive review-ready status is **not** Match approval. Capture at least one **different** exception category before claiming broad pilot coverage. Do not include bank IDs, account identifiers, parties, amounts or customer references in repository comments.

## Software boundary

The helper in PR #1539 evaluates **synthetic/offline** candidate data. Its `source.attested` and `source.complete` fields are caller assertions, not independent OAuth/API attestation; it does not fetch Zoho Books. The helper currently expects its own normalized `ledger.status='open'` model, while Work observed a native Customer Payment in **Paid** state. **Do not map Paid to open or route real records to this helper without an explicitly verified adapter contract.** A schema mismatch is a release blocker, not permission to coerce status values.

No authorised general banking API execution surface was found (#1538 receipt 6512737383). Native-first manual review remains the deployable *procedure* pending an approved operational pilot; additional matching software is justified only by a reproduced native deficiency.

## Acceptance / release gates

- **Read-only pilot**: at least one safely traceable different exception category beyond the now-verified single-invoice and three-invoice aggregate-payment cases and a bounded representative sample with recorded source and decision completeness; no posting.
- **API integration**: approved authenticated GET-only surface, organisation/account/currency identity, complete paging, bank and ledger state interpretation, freshness and schema attestation. Do not add connections or expand scopes without approval.
- **Live financial reconciliation**: separate exact posting/matching approval, correct source balances, current duplicate check, Johan review and rollback/recovery plan.
- **Release**: PR tests and code review, Anton-approved merge/deployment, tenant validation and client acceptance. None is inferred from this document.

## Next ownership

WORK: inspect a different bank-side exception and privately trace the source read-only; report classification and concrete blockers in #1538.
CHAT: maintain PR #1539 integration contract and review software only for evidenced native gaps.
ANTON: approve only the eventual protected action presented with its exact scope.

**No client outreach or tenant change was performed in preparing this procedure.**
