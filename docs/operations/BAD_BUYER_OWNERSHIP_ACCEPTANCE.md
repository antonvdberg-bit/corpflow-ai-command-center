# BAD buyer ownership — acceptance evidence (#1504 / #1509)

**Date:** 27 October 2026  
**Code under test:** authenticated checkout + durable ownership contract on branch `cursor/bad-buyer-ownership-delivery-1509`  
**Live operations:** none. No Paddle charge, no ERPNext financial posting, no env change, no customer message.

## What was already complete

- Synthetic ownership contract (PR #1508)
- Durable schema/adapter, fail-closed flag (PR #1510)
- Disposable Postgres concurrency lock fix (PR #1513)
- Core Neon tables applied and Prisma history registered (#1517 closed)

## What this packet proves locally

`npm test`: **3403 + 20 pass, 0 fail**.

Focused command:

```bash
node --test \
  node-tests/paddle-bad-buyer-ownership.test.mjs \
  node-tests/paddle-bad-buyer-ownership-durable.test.mjs \
  node-tests/paddle-bad-buyer-purchase-journey.test.mjs \
  node-tests/paddle-bad-zar-bridge.test.mjs \
  node-tests/paddle-bad-webhook-recovery.test.mjs
```

| ID | Scenario | Result | Evidence |
|---|---|---|---|
| T04 | BAD ZAR completed checkout → one internal order, no buyer invoice/Payment Entry | **PASS (synthetic)** | `paddle-bad-buyer-purchase-journey.test.mjs` authenticated bind → server Paddle id → verified completed event → one adapter order, zero invoices/payments, owner retrieve |
| T06 | Owner retrieve; anonymous / other buyer / wrong tenant denied | **PASS (synthetic)** | same file; also existing memory/durable suites |
| T07 | Duplicate / out-of-order webhook; customData cannot bind ownership | **PASS (synthetic)** | duplicate event replays one order; forged `checkout_intent_id` / email does not attach an unbound transaction |
| T08 | Failed or abandoned payment | **PASS (synthetic)** | `payment_failed` → `abandoned`; draft checkout not retrievable |
| T09 | Refund before bind and after issuance | **PASS (synthetic)** | unbound refund tombstones later bind; post-issue refund cannot return to paid/issued |
| T01–T03, T05, T10–T14 | Prospect conversion, native PDF, accounting credit notes, supplier, reporting | **NOT IN THIS PACKET** | unchanged; live ERPNext still protected |

Disposable two-connection Postgres proof from #1512 remains valid for T06/T07/T09 concurrency. It was not re-run here (no disposable loopback database in this session).

## Protected live tests still required

These cannot pass from CI or a Preview URL alone:

1. Anton sets `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE=1` on one named runtime (see `BAD_BUYER_OWNERSHIP_ACTIVATION.md`). Preview may share production Neon.
2. Signed-in BAD customer creates a **sandbox** Paddle transaction through `POST /api/paddle/bad/checkout` (no live card if a sandbox method exists; still a real sandbox API call).
3. Verified Paddle webhook reaches production/preview and the same ownership row moves to paid/issued.
4. Owner retrieves confirmation; a second existing user is denied.
5. ERPNext write mode stays `disabled` unless a later accountant-approved isolated write is authorised. Current adapter production writes remain forbidden.

## Operational completion

**PARTIAL.** Synthetic authenticated purchase-to-confirmation, access control, idempotency, and refunds are demonstrated in code. The customer-facing journey is **not** operational until the flag is enabled on a deployed runtime and the live sandbox checks above succeed.
