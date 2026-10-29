# Native Zoho Books unpaid-statement preparation

Status: `PREPARATION ONLY — NO IMPLEMENTATION AUTHORIZED FOR LIVE SEND`

This packet contains a dependency-free offline planner and a disabled Deluge draft. It
does not install a Books function, read client data, create statements, send email, or
schedule anything. `prepare-customer-statement.ds` must remain disabled until every gate
below is separately reviewed.

## Verified design basis

Sources checked 2026-10-26 (accessed 2026-10-26):

- [Zoho Books invoices API](https://www.zoho.com/books/api/v3/invoices/) — invoice
  `customer_id`, `status`, `date`, `balance`; statuses include `sent`, `overdue`,
  `partially_paid`, `paid`, `void`, `draft`, and `viewed`.
- [Zoho Books pagination](https://www.zoho.com/books/api/v3/pagination/) — list responses
  use `page_context.page`, `per_page`, and `has_more_page`; `per_page` supports the
  documented 200-item bound.
- [Zoho Deluge invokeUrl](https://www.zoho.com/deluge/help/webhook/invokeurl-api-task.html)
  — GET requests can use a named `connection`; the draft uses the documented
  `connection : connection_name` form.
- [Zoho Books OAuth conversion](https://www.zoho.com/books/api/v3/convert-deluge-scripts/)
  — Books API calls use a named OAuth connection rather than embedded credentials.
- [Zoho Books custom functions API](https://www.zoho.com/books/api/v3/custom-functions/)
  — custom functions support Deluge, configured input arguments, and map return types.
- [Zoho Deluge for each](https://www.zoho.com/deluge/help/list-manipulations/for-each-element.html)
  — bounded iteration uses the explicit ten-item list `{1,2,3,4,5,6,7,8,9,10}`;
  it does not depend on a numeric-range loop or JavaScript-style `while`.
- [Zoho Deluge date functions](https://www.zoho.com/deluge/help/functions/date-time/add-day.html)
  — the organisation-local current date is captured once and shifted by 90 days.
- [public schedule-statements example](https://help.zoho.com/portal/en-gb/community/topic/function-4-schedule-customer-statements)
  — reference only; its page-1 approach is intentionally not copied.

Native compile and read-only execution have **not** been performed in this repository.
The draft is therefore a review artifact, not proven native-compatible or
live-delivery-ready. Because Deluge's documented `isText()`/`isNumber()` checks are not
strict JSON type predicates, the draft and pure fixture use the tested fixed-key
`Map.toString()` wrapper: lists require the exact list shape, while positive integer and
boolean attestations require their unquoted JSON tokens. This rejects maps,
JSON-looking strings, quoted numbers, decimals, booleans, nulls, and escaped-string
spoof attempts without returning supplied values. Collection cardinality is checked
before invoice iteration. The explicit list iteration, named connection, strict
`yyyy-MM-dd` date round-trip, custom-function inputs, and map return shape must still be
checked in the Books editor; source inspection and the pure fixture are not native
compilation or Books execution evidence. If Books rejects any syntax or supplied context
map, stop and record the fixed reason code plus exact editor error; do not substitute
another ERP or service.

## Planner contract

`prepareCustomerStatementPlan({ customerId, currencyCode, asOfDate, pages })` expects
synthetic, already-captured page responses. It validates every page and invoice, follows
the explicit `has_more_page` chain, reads at most 10 pages of 200, and fails closed on
missing context, API errors, truncation, duplicate IDs, customer/currency mismatch, or
malformed evidence. Eligible debt is `sent`, `overdue`, or `partially_paid` with a
positive `balance` and an invoice date on or before the explicit as-of date.

The period ends on the as-of date and starts on the earlier of the oldest eligible invoice
date or 90 days before that date. Currencies remain separate. Invoice balances are not
reduced by credits; credits and net account balance require native statement
reconciliation. A debt-free customer returns `no_statement`. Each captured invoice list
must contain no more than its attested `per_page` count and no more than 200 entries.
An empty first final page is valid; an empty continuing or later page is rejected.

## Manual controller procedure

1. Create a disabled Books custom function in the native `Customers` module with the
   observed parameters `customer`, `organization`, and `user`, return type `map`, and
   no schedule or send action. The draft uses only the Books-supplied
   `customer.currency_code`; if it is absent or blank, it returns the existing
   `missing_customer_currency_scope` blocker. The organisation base currency is never
   a fallback.
2. Paste `prepare-customer-statement.ds`; replace only
   `REPLACE_WITH_BOOKS_CONNECTION` with the reviewed named Books connection. Do not put
   credentials, customer IDs, organization IDs, names, addresses, invoice rows, or
   arbitrary error text in logs or function output.
3. Run `native-type-fixtures.ds` only in the public Deluge evaluator and retain its
   bounded result as synthetic fixture evidence. This validates wrapper primitives, not
   the complete Books function or input/connection contract.
4. Compile the disabled function natively in the Books editor. Confirm the explicit
   ten-item list iteration, fixed-wrapper type guards, collection cardinality guard,
   `invokeurl` named connection, strict `yyyy-MM-dd` date round-trip, `toDecimal`
   conversion, and custom-function input/`map` return contract. Then run
   one scoped read-only test against a synthetic/safe test customer and inspect only
   bounded preparation metadata.
5. Independently reconcile examples covering old debt on a later page, partial payment,
   paid/void/draft/future exclusions, no debt, credits, multiple currencies, and the
   10-page cap.
6. Before any future send work, verify recipients and cadence, define duplicate-send
   protection and an auditable statement identity, then obtain a separate reviewed
   activation decision. A later workflow may render/send only after those gates.

The current artifact has no send path, `sendmail`, POST, record update, schedule,
activation toggle, or customer mutation. It does not claim automatic statements were
delivered.
