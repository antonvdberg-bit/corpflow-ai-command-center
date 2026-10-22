## 1. Synthetic prototype

- [x] 1.1 Implement validated FEFO planning with fixed-precision quantities.
- [x] 1.2 Implement in-memory receipts, atomic commits, stale-plan checks,
  recursive idempotency, history, delta-based reversal, and complete allocation
  revalidation.
- [x] 1.3 Add the responsive static demonstration and local run instructions.
- [x] 1.4 Add focused synthetic tests for allocation, validation, replay,
  forged-plan atomicity, later-movement-preserving reversal, and concurrency
  simulation.
- [x] 1.5 Record InvenTree provenance and the complete MIT license.
- [x] 1.6 Add a generic, transport-injected, read-only synthetic Books-record
  adapter with pagination, mapping, baseline, replay, and blocker checks.
- [x] 1.7 Add synthetic fixture and adapter regression tests; document the
  unverified live integration and concurrency boundaries.
- [x] 1.8 Add canonical item policies, exempt receipt ordering, policy
  revalidation, and the pure deterministic expiry review report.
- [x] 1.9 Add acceptance coverage for policies, report boundaries, zero stock,
  quarantine, invalid dates, stale plans, and deterministic repeat.
- [x] 1.10 Add a transport-injected native Books page bridge, synthetic
  `items`/`module_records` pages, and direct page-to-preview integration
  coverage for provenance, pagination, mappings, and fail-closed envelopes.

## 2. Verification

- [x] 2.1 Run the focused Node test file.
- [ ] 2.2 Run strict OpenSpec validation (blocked: `openspec` CLI unavailable,
  `openspec: command not found`; no dependency install permitted).
- [x] 2.3 Run `git diff --check`.
- [ ] 2.4 Record that live Zoho field translation, UAT, concurrency, posting,
  scheduling, sends, and production stock control remain unverified.
- [x] 2.5 Record that native live binding, tenant mapping, opening/reservation
  proof, movement lookup encoding, and operational enforcement remain
  unverified.
- [x] 2.6 Add the disabled native identity readback diagnostic with explicit
  private-binding schema, bounded callback transport, redacted output, and
  end-to-end mock connector tests.
