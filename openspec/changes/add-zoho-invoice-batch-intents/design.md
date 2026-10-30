## Context
The existing pure BatchLedger and planAllocation already cover fixed-precision FEFO, policy-aware FIFO, reservations, stale plans and atomicity simulation. Reuse those contracts; do not implement a second allocator or claim that in-memory behavior supplies Zoho transaction guarantees.

## Proposed contract
planInvoiceBatchIntent receives explicit organization identity, event identity, invoice identity/version, stable line IDs, canonical item/unit/expiry policy, an explicit as-of date, verified batch snapshots, and previously accepted allocation receipts.
The future trusted binding must establish native event semantics. A browser claim or unverified status string is not proof that an invoice became stock-effective.

The result is one of:
- proposed: complete per-line batch splits and expected source versions/fingerprints;
- no_op: an identical event/payload already has a matching accepted receipt;
- blocked: bounded reason codes with no partial intents.

All examples and fixtures are invented. No live transport, credentials, environment access, timers or mutation are part of this module.

## Identity and quantities
Each intent retains organization, invoice, invoice version, stable line, item, batch and unit identity, exact six-decimal quantity, and input snapshot fingerprint. Names never substitute for IDs. Reject cross-organization evidence, duplicate line/batch identities, missing/unknown canonical expiry policy, unit conversions, ambiguous prior receipts or inconsistent snapshots.
Use the existing quantity implementation; do not introduce floating-point accumulation.

## Lifecycle boundaries
- A draft/unsent event proposes no allocation and makes no reservation.
- Only the explicit synthetic stock-effective invoice event may propose a first allocation.
- Plan the invoiced quantity, not the original sales-order request or remaining backorder.
- Receipt-backed identical event delivery is no_op; a reused idempotency identity with a different payload is blocked.
- A changed invoice that already has accepted allocations is blocked for reconciliation; do not guess a delta or reverse shipped goods.
- Void/cancel, credit note and return events never automatically increase stock or free batch quantities. Require separately verified physical-return and disposition evidence in a later reviewed capability.
- Product-level stock remains Books-owned. The proposed custom batch linkage must never make a second item-level stock posting.

## Atomicity and stale evidence
Plan every line before returning proposed. A shortage or invalid line blocks the complete event, not only that line. Preserve expected versions and fingerprints for a future commit boundary. This stage does not re-read or commit, does not obtain a lock and does not claim concurrent safety.
A future writer must revalidate and durably commit or reconcile the complete intent exactly once. That writer and crash recovery are outside this proposal.

## Verification
Behavioral examples must distinguish 3 units ordered from 2 units invoiced: propose only 2. Cover split across two eligible lots, FEFO/FIFO policy, shortage on a later line without partial output, duplicate/reused event identities, stale or missing snapshot evidence, fractional quantities, and forbidden automatic restock on void/credit.
Run existing batch tests unchanged to detect regressions.

## Routing and release
Controller owns this documentation proposal and review. Cursor owns runtime implementation after proposal approval. Implementation should extend the existing batch branch/PR rather than rebuild its accepted proof. Do not dispatch a competing client executor while another has an active claim.
No live installation, stock/accounting write, merge or deployment is authorised here.

## Known persistence gap
This intent planner cannot close operational stock control by itself. Live mapping/provenance, stock baseline approval, persisted movement lookup evidence, durable concurrency/recovery and native lifecycle enforcement still require separate proof.
