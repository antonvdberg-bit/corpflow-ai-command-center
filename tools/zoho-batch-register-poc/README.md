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
undated lot, and another product. Expired, undated, quarantined, reserved, and
wrong-product quantities are intentionally excluded from the as-of available
total and planner. Explicit `required` policy uses FEFO; `not_applicable` uses
receipt order; missing, blank, or unknown policy is `review` and blocks
allocation. It demonstrates physical versus available quantity, FEFO
allocation, receipts, shortages, retained history, reversal, and reset.

The planner is also directly usable:

```js
import { BatchLedger, planAllocation } from './core.mjs';
```

## Synthetic Books-record adapter

`previewBooksRecords({ transport, orgId, asOfDate, itemId, unit, quantity, map })`
is a read-only adapter around `core.mjs`. The caller injects a transport with
only `fetchPage({ source, module, orgId, page, cursor })`, returning
`{ records, hasMore, nextCursor }`. The explicit mapping includes a canonical
item source as well as register and movement sources. The adapter fetches every
page, rejects loops, duplicate IDs, malformed envelopes,
organization/item/unit mismatches, missing or conflicting canonical item
records, future dates, and ambiguous movement sequences. Policy is normalized
only from the canonical item record; caller policy context is ignored and
cannot turn review-required stock into an exemption. It never performs HTTP,
OAuth, POST, PUT, commit, receipt, or reversal writes.

The explicit mapping must name fictional item, register, and movement modules
fields for IDs, organization, item, lot, unit, status, expiry, received date,
verified opening quantity, verified `baselineDate` and nonnegative
`baselineSequence` watermark, item expiry policy, movement key/type/quantity/date/sequence, and
optional reversal reference. A movement must be strictly after its lot's
verified opening boundary by date and sequence; missing or contradictory
boundary evidence fails closed. Lookup normalization is deliberately narrow:
only the documented synthetic fields and units (`each`, `kg`, `g`, `l`, `ml`,
`box`) are accepted; no Zoho response shape or conversion is guessed. See
`fixtures/books-records.synthetic.json` for a fully fictional example.

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

`buildExpiryReview({ items, batches, asOfDate })` is also synthetic and
read-only. It treats `items` as the canonical item source, validates nonblank
batch/item/lot identities and finite nonnegative decimal quantities (maximum
six places and safe scaled bounds) before zero-stock filtering, and rejects
duplicate batch or item/lot identities. Missing canonical item identities and
required missing/invalid expiry dates make the report `complete: false`; an
explicit numeric or decimal-string zero remains a valid non-alert row. The
report does not aggregate quantities or perform floating-point repairs.

Status: configured synthetic mapping and mock-verified adapter only; live API
readback, durable concurrency/recovery, and all-channel enforcement remain
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
other products, quarantined, expired, undated, and `expiryDate <= asOfDate`
stock. It sorts FEFO, then received date, then batch ID. Shortages do not
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
- authentication, tenancy, audit retention, and expiry-alert ownership.

The relevant Zoho references are the widget `on_pre_save` documentation and
Books custom modules API. Expiry alerts are not activated. No deployment,
OAuth, live write, real record export, or client data is included.
