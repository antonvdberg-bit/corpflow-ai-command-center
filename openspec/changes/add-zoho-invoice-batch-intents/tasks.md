## 1. Proposal
- [x] 1.1 Review current batch proof and explicitly separate its accepted scope from the proposed invoice-link milestone.
- [x] 1.2 Define deterministic intent, duplicate-event and lifecycle failure boundaries without adding live behavior.
- [ ] 1.3 Review and approve this proposal before runtime implementation.
- [ ] 1.4 Validate with OpenSpec CLI when available; otherwise report its absence and perform structural checks without claiming CLI validation.

## 2. Implementation — not started
- [ ] 2.1 Reuse the current allocator through a pure invoice-intent adapter.
- [ ] 2.2 Validate scoped identities, stable line IDs, quantities, policy and snapshot evidence.
- [ ] 2.3 Return complete proposed splits, receipt-backed no_op or bounded blocked result.
- [ ] 2.4 Block revisions, voids, credits and returns requiring unverified physical-movement assumptions.
- [ ] 2.5 Preserve disabled/unconnected posture and document remaining operational gates.

## 3. Verification — not started
- [ ] 3.1 Add behavioral cases for per-line splits and ordered versus invoiced quantity.
- [ ] 3.2 Add duplicate-event/conflicting-payload and multi-line all-or-none planning cases.
- [ ] 3.3 Add cross-organization, missing policy/evidence, units, fractional quantities and stale snapshot cases.
- [ ] 3.4 Assert inputs remain immutable and no network/write/send path exists.
- [ ] 3.5 Run existing batch suite and applicable CI; report exact commit and limits.
- [ ] 3.6 Keep live binding, durable posting/concurrency/recovery and client UAT explicitly unverified.
