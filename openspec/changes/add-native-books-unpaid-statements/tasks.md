## 1. Preparation implementation

- [x] 1.1 Add the pure complete-history statement planner with strict date, balance,
  status, page, customer, currency, duplicate, truncation, and page-cap validation.
- [x] 1.2 Add a disabled Deluge preparation draft with bounded metadata only and a
  configurable named connection.
- [x] 1.3 Document official source references, installation steps, limitations, and
  separate native activation gates.
- [x] 1.4 Reconcile the native draft with the planner for the 90-day period, future-date
  exclusion, explicit currency scope, bounded range iteration, and fixed failure codes.

## 2. Verification

- [x] 2.1 Add meaningful synthetic tests for pagination, ordering, partial payment,
  exclusions, strict ISO/calendar-valid date boundaries, malformed evidence and
  collections, cardinality limits, empty-page guards, mismatch, duplication, and input
  immutability.
- [x] 2.2 Run focused Node tests, syntax checks, diff whitespace checks, and OpenSpec
  strict validation where the validator is available.
- [x] 2.3 Record that native Deluge compilation and live/read-only Books verification
  remain unperformed.
- [x] 2.4 Record the exact native verification gate: compile in the Books editor, then
  perform one scoped read-only test; source checks and Node tests are not native proof.
- [x] 2.5 Keep native collection type/cardinality and full-iteration error boundaries
  fail-closed; native compilation remains an explicit unresolved gate.
