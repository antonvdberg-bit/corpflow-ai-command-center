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
Lot B (10 units with 2 reserved), quarantined stock, another product, and
undated stock. It demonstrates physical versus available quantity, FEFO
allocation, receipts, shortages, retained history, reversal, and reset.

The planner is also directly usable:

```js
import { BatchLedger, planAllocation } from './core.mjs';
```

## Contract and safety limits

`planAllocation({ itemId, quantity, unit, asOfDate, batches })` validates real
Gregorian dates, positive quantities, supported units/statuses, unique batch
IDs and product/lot identity, nonnegative six-decimal quantities, reservations
within balance, finite values, and safe scaled-integer bounds. It excludes
other products, quarantined, expired, undated, and `expiryDate <= asOfDate`
stock. It sorts FEFO, then received date, then batch ID. Shortages do not
mutate state.

`BatchLedger` adds same-lot receipts without changing identity or expiry,
revalidates versions and every split before an atomic commit, rejects stale
plans, detects idempotency payload conflicts, and reverses each allocation
once while retaining depleted/history records. This is a local atomicity
simulation, not a claim about Books locking or recovery semantics.

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
