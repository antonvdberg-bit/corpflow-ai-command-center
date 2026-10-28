## 1. Proposal
- [x] 1.1 Check for existing oldest-debt implementation and define a separate pure planner scope.
- [x] 1.2 Define complete-source set/clear/unchanged/blocked semantics and native boundaries.
- [ ] 1.3 Obtain proposal approval before runtime implementation.
- [ ] 1.4 Run strict OpenSpec validation when CLI available; current environment has no openspec executable.

## 2. Implementation — not started
- [ ] 2.1 Implement pure scoped calculation with exact balance/date validation and bounded complete pagination.
- [ ] 2.2 Produce field-only intents with expected old value and snapshot identity/version.
- [ ] 2.3 Keep writer/transport/scheduler absent and document native gates.

## 3. Verification — not started
- [ ] 3.1 Test partial/full payment, allocated/unallocated credit, changed due date and void/cancel/draft cases.
- [ ] 3.2 Test future invoice vs future due date, invalid/missing dates and exact positive balances.
- [ ] 3.3 Test all-settled/empty complete source clearing and no clear on incomplete source.
- [ ] 3.4 Test cross-tenant/customer, duplicate IDs, malformed/reordered/missing pages and caps.
- [ ] 3.5 Test unchanged result, immutable deterministic inputs and independent per-customer failure reporting.
- [ ] 3.6 Verify no transport/write/send/schedule and run affected CI once.
- [ ] 3.7 Keep native field mapping, actual refresh frequency, concurrent change/recovery and activation unverified.
