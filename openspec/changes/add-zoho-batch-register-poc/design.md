## Context

This is an offline synthetic proof for a possible Zoho Books batch register.
It must be useful for review without claiming that Books provides the required
enforcement or locking behavior.

## Decisions

- Keep the core pure and dependency-free; `BatchLedger` is the only local
  mutable wrapper.
- Represent quantities internally as six-decimal scaled integers to avoid
  floating-point allocation drift.
- Require plans to carry expected versions and require idempotency keys for
  state-changing operations.
- Keep the browser demo static, with no network, storage, framework, or
  analytics.
- Adapt only the FEFO/split idea from the pinned MIT-licensed InvenTree source;
  do not vendor its implementation.
- Keep the Books-shaped adapter transport-injected and mapping-driven. It
  normalizes only the synthetic contract, replays immutable fetched records
  from an explicit verified opening baseline, and delegates final splitting to
  `core.mjs`.
- Keep item policy canonical and trusted at the ledger/adapter boundary:
  absent, blank, and unknown values normalize to `review`; no expiry date,
  item name, unit, or supplier infers exemption.
- Keep the daily review pure and explicit-date driven. It reports positive
  replayed lot balances only and has no scheduler, transport, persistence, or
  send side effect.

## Non-goals

This change does not add Zoho authentication, API calls, persistence, schema,
reservations outside memory, expiry alerts, or production stock enforcement.
The adapter does not prove live Zoho response fields, API readback, durable
concurrency/recovery, or enforcement across alternate write channels.

## Rollback

Remove the prototype directory, focused test, and this OpenSpec change. The
demo Reset action is only an in-memory presentation reset.
