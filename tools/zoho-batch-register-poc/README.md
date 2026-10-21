# Synthetic Zoho Books batch-register proof

Offline demonstration only. This folder contains a dependency-free, in-memory
ledger for one product with multiple lots. It is not stock control, does not
connect to Zoho, and does not prove native Books batch support or concurrency
locks.

## Run

From the repository root:

```bash
python3 -m http.server 4173 --directory tools/zoho-batch-register-poc
```

Open `http://localhost:4173/demo.html`. The demo has synthetic Lot A (6 units),
Lot B (10 units with 2 reserved), quarantined stock, an expired lot, an
undated lot, and another product. Expired, quarantined, reserved, and
wrong-product quantities are intentionally excluded from the as-of available
total and planner. Explicit `required` policy uses FEFO; `not_applicable` uses
receipt order and permits undated lots; missing, blank, or unknown policy is
`review` and blocks allocation. It demonstrates physical versus available quantity, FEFO
allocation, receipts, shortages, retained history, reversal, and reset.

The planner is also directly usable:

```js
import { BatchLedger, planAllocation } from './core.mjs';
```

## Synthetic Books-record adapter

`previewBooksRecords({ transport, orgId, asOfDate, itemId, unit, quantity, map })`
is a read-only adapter around `core.mjs`. The native page bridge is created as
`createNativeBooksPageTransport({ readPage, sources, orgId })` and exposes only
`fetchPage({ source, module, orgId, page, cursor })`. `sources` explicitly maps
`item`, `register`, and `movement` to `{ module, recordsKey, mapRecord }`;
`items` is used for items and `module_records` for the fictional
`cm_demo_lots`/`cm_demo_moves` custom modules. `readPage` is the only injected
I/O and returns `{ orgId, module, page, body }`, where the body must have
numeric `code: 0`, the configured collection, and matching `page_context`.
Pages and cursors are ordered and fail closed. Mapping receives a structured
clone and only `{ source, orgId, module, page }`, never raw headers,
authentication, or response metadata.

The organization claim in a caller-supplied request or receipt is not proof
that a native API response came from that organization. A future live binding
must provide verifiable request/response provenance; this synthetic bridge does
not manufacture it from body content. It performs no HTTP, OAuth, filesystem,
environment, credentials, timers, retries, POST, PUT, commit, receipt, or
reversal writes.

The explicit mapping must name fictional item, register, and movement module
fields for IDs, organization, item, lot, unit, status, expiry, received date,
item expiry policy, movement key/type/quantity/date/sequence, and optional
reversal reference. Verified opening and reservation evidence is deliberately
separate under `evidenceByBatchId`; it is joined by the register's scalar native
batch ID and only accepted when its canonical item and unit match a unique
canonical item lookup from the supplied item pages. Every required evidence
field is explicit; zero opening quantity, sequence, or reservation is valid.
The mapper examines all matching policy fields, so conflicting values reject
instead of silently selecting the first. A movement must be strictly after its
lot's verified opening boundary by date and sequence; missing or contradictory
boundary evidence fails closed. Lookup normalization is deliberately narrow:
the native fixture uses flat `cf_demo_*` fields and canonical policy in
`custom_fields[{api_name,value}]`. Missing, ambiguous, or unresolved lookups,
missing units or baselines, and unknown movement encodings are rejected; no
names, default conversion, fabricated dates/sequences, aggregate stock, or
absent-reservation zero is guessed. See
`fixtures/native-books-pages.synthetic.json`. A fixture does not establish how
a live tenant encodes movement lookups.

Every requested lot needs an explicit verified opening baseline and boundary. A
verified zero is valid; absent or unverified baseline blocks the preview. The
adapter parses quantities directly into six-place `BigInt` units and keeps
baseline, reservations, movements, reversals, intermediate balances, and
aggregates exact until the final displayed totals are converted once. The pure
replay is `opening + receipts - allocations + full reversal of the original
allocation delta`; reversal preserves later receipts. Blank status is excluded
as quarantine, while absent expiry is excluded without being date-parsed for
required items. Exempt items use receipt order without requiring expiry. The
result is marked `synthetic`,
`connected: false`, and `readOnly: true`, and includes physical/available
quantities, exclusions, proposed split, shortage, and blockers.

The native transport is pure and injected: it performs no HTTP, fetch, file,
environment, credential, network, or live-data access. A transport instance
is single-use per source; page state is intentionally not reset or reused
after completion. Input cloning, mapper execution, result validation, and
output cloning are one bounded failure boundary. Errors expose only a stable
`native <source> mapping failed` message and never raw native values or causes.

Native bridge acceptance matrix (verified by the focused suite):

| Case | Expected | Actual |
| --- | --- | --- |
| Native item identity changed or missing | Reject mapping | Rejects with stable native mapping error |
| Supplied opening evidence field removed | Reject mapping | Rejects; no fixture fallback |
| Conflicting canonical policy entries | Block allocation | Rejects mapping |
| Rejected async mapper | One bounded rejection, no unhandled event | Passes with zero unhandled events |
| Approved zero opening/receipt boundary | Preserve valid zero values | Generic adapter accepts valid zero opening |
| Exempt FIFO | Earlier received lot first, including undated/legacy-past expiry | Covered by native integration tests |
| Reservation or quarantine | Reduce availability or exclude lot | Covered by native integration tests |
| Later-page read/envelope/mapping failure | Reject whole preview | Existing fail-closed boundary coverage |

`buildExpiryReview({ items, batches, asOfDate })` is also synthetic and
read-only. It treats `items` as the canonical item source, validates nonblank
batch/item/lot identities and finite nonnegative decimal quantities (maximum
six places and safe scaled bounds) before zero-stock filtering, and rejects
duplicate batch or item/lot identities. Missing canonical item identities and
required missing/invalid expiry dates make the report `complete: false`; an
explicit numeric or decimal-string zero remains a valid non-alert row. The
report does not aggregate quantities or perform floating-point repairs.

Status: configured synthetic mapping and mock-verified adapter only. The
focused suite contains 46 tests, with native page integration and redaction coverage
in `node-tests/zoho-batch-register-native-pages.test.mjs`. Live tenant field
mapping, opening/reservation proof, movement lookup encoding, authenticated
binding, durable concurrency/recovery, and all-channel enforcement remain
unverified. This adapter is not operational stock control and has no posting
authority. Do not describe native record locking, uniqueness, or a re-read
before write as an atomic multi-lot allocation guarantee.

## Contract and safety limits

The adapter requires an explicit verified opening baseline and reservation quantity,
replays dated movements in order, and rejects ambiguous or negative intermediate
balances before calling the core. `planAllocation({ itemId, quantity, unit, asOfDate, batches, itemPolicyContext })` validates real
Gregorian dates, positive quantities, supported units/statuses, unique batch
IDs and product/lot identity, nonnegative six-decimal quantities, reservations
within balance, finite values, and safe scaled-integer bounds. It excludes
other products, quarantined, expired, and `expiryDate <= asOfDate` stock.
Required-policy items need a valid future expiry; canonical exempt-policy items
may use receipt-order FIFO for undated or legacy-past-expiry stock. It sorts
FEFO, then received date, then batch ID. Shortages do not
mutate state.

`BatchLedger` holds canonical item policy, rechecks it during commit, and adds same-lot receipts without changing identity or expiry,
revalidates the complete request, source fingerprint, lot identity, eligibility,
versions, and every split before an atomic commit, rejects stale or forged
plans, detects recursive idempotency payload conflicts, and reverses each
allocation once by applying quantity deltas to current lots while retaining
later movements and history. This is a local atomicity simulation, not a claim
about Books locking or recovery semantics. `buildExpiryReview` is a pure,
deterministic, read-only report for an explicit Gregorian `asOfDate`; it does
not schedule, send, persist, or call a transport.

## Provenance and rollback

The allocation ordering concept is adapted from InvenTree's MIT-licensed
`SalesOrder.auto_allocate_stock` at commit
`8d496ae3890cc7bad07028950c98220d038ee395`; see
`THIRD_PARTY_NOTICES.txt` and `vendor/inventree/LICENSE`. No InvenTree source
is vendored. Rollback for this prototype is deleting the folder/PR; the demo's
Reset button only resets in-memory browser state.

## Future Books integration checklist (UNPROVEN)

Before any live integration, separately prove and approve:

- Books item/accounting authority, no double-posting, and entitlement;
- custom-module/register mapping and the native batches field;
- creation sidebar and pre-save hook behavior;
- mandatory loading, edit, copy, recurring, conversion, mobile, import, and
  API-bypass paths;
- durable reservations, server-side atomicity, safe concurrency, and
  partial-save recovery;
- authentication, tenancy, audit retention, expiry-alert ownership, and
  verifiable request/response provenance for every native page;
- tenant mapping and UAT evidence for real opening, reservation, and movement
  encodings.

The relevant Zoho references are the widget `on_pre_save` documentation and
Books custom modules API. OpenSpec CLI validation is not claimed for this
synthetic bridge. Expiry alerts are not activated. No
deployment, OAuth, live write, real record export, authenticated integration,
deployed report, operational enforcement, or client data is included.
