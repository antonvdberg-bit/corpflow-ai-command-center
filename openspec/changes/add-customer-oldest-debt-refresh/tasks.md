## 1. Proposal
- [x] 1.1 Check for existing oldest-debt implementation and define a separate pure planner scope.
- [x] 1.2 Define complete-source set/clear/unchanged/blocked semantics and native boundaries.
- [x] 1.3 Proposal approval is recorded by the linked routing issue #1537 and its bounded implementation packet; this packet does not claim publication or executor start.
- [ ] 1.4 Run strict OpenSpec validation when CLI available; current environment has no openspec executable.

## 2. Implementation
- [x] 2.1 Implement pure scoped calculation with exact balance/date validation and bounded complete pagination.
- [x] 2.2 Produce field-only intents with expected old value and snapshot identity/version.
- [x] 2.3 Keep writer/transport/scheduler absent and document native gates.

## 3. Verification
- [x] 3.1 Test partial/full payment, allocated/unallocated credit, changed due date and terminal-status cases.
- [x] 3.2 Test future invoice vs future due date, invalid dates and exact positive balances.
- [x] 3.3 Test all-settled/empty complete source clearing and no clear on incomplete source.
- [x] 3.4 Test cross-scope, duplicate IDs, malformed/reordered pages and caps.
- [x] 3.5 Test unchanged result, immutable deterministic inputs and independent per-customer failure reporting.
- [ ] 3.6 Verify no transport/write/send/schedule and run affected CI once.
- [x] 3.7 Keep native field mapping, actual refresh frequency, concurrent change/recovery and activation unverified.
