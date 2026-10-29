# Design: supplied-evidence oldest-debt planner

## Calculation
For one explicit organization/customer and as-of date, validate all supplied pages before output. Qualifying invoices have stable unique IDs, the requested customer/organization, a supported issued unpaid status, a positive exact remaining balance, an invoice date on/before as-of and a real Gregorian due date. Earliest due date wins. The date is not the largest balance or invoice creation date.
Future due dates on already issued unpaid invoices remain valid debt dates; future-dated invoices are excluded. No qualifying invoice means clear only when the supplied complete source proves absence. Null is an explicit clear intent, never an implicit zero or missing-value substitution.

## Source contract
Require independently supplied snapshot identity/version/fingerprint/strict UTC observation time in both `source` and `expectedSource`, plus expected customer helper value and attested sequential complete invoice pages. Each page has exactly one nested `scope` and `source` contract; conflicting flat aliases are rejected. Set explicit page/record caps. Missing, duplicated, contradictory or truncated evidence blocks that customer, including clear. Validate customer/currency scope; never sum currencies. Invalid qualifying due date blocks, rather than silently selecting a later invoice. Paid/draft/void/cancelled invoices cannot keep a stale date. Unknown statuses block rather than proving absence; native sent/overdue statuses are supported unpaid statuses. Reject inconsistent status/balance evidence rather than guessing.

## Payments and credits
Use invoice remaining balances from the supplied authoritative snapshot, not original totals. Partial payment does not remove an invoice until its balance is zero. Allocated credit is reflected through remaining invoice balance. Unallocated customer credit does not automatically settle an invoice or erase its due date. This helper is a collection-order aid, not net debtor valuation or collection authorization.

## Output
Return proposed set/clear/unchanged with organization/customer ID, currency, as-of date, computed oldest date, expected prior helper value/version and source snapshot fingerprint/version/observation time. Unchanged produces no write intent. Do not emit unrelated customer fields or financial values. Process multiple customers independently, reject repeated scopes conservatively and report incomplete coverage explicitly; do not claim whole-report freshness after a partial run.
All inputs are invented fixtures. No transport, credentials, filesystem, timers, persistence or native mutation in the implementation.

## Later native integration, excluded here
Use a verified field-specific update route, re-read/revalidate expected helper and invoice snapshot before any write, handle intervening payment/invoice changes, and verify saved value. Record per-customer results and overall coverage/freshness. Evaluate a bounded native scheduled refresh first; invoice/payment/credit event triggers may improve freshness later. No schedule or frequency is represented as installed.
Never use whole-customer overwrite/import to update one helper. Native field mapping, null-clear behavior, permissions, connection, retry/recovery and freshness presentation require separate proof and approval.

## Routing
Controller authors and reviews this bounded proposal. After scope approval, Cursor may implement the pure planner/tests; existing Forge contracts do not authorise a new algorithm/integration. No competing active executor. No merge or live activation implied.

## Reuse and limitations
Reuse a verified complete-source field-intent pattern for other computed customer fields only where authorised. Source timestamps/fingerprints supplied by a fixture prove consistency, not live authenticity or transactional concurrency. This milestone cannot establish an automatically current live report.
