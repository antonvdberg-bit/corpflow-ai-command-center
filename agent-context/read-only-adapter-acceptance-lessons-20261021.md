# Read-only adapter acceptance lessons — 21 October 2026

Status: evidence-backed technical observations for review. This document changes no operating doctrine, runtime, access, or approval policy.

## Evidence

Source issue #1486 and draft PR #1487, runtime commit `c91a41a5d254e68c0bda5fdf9016756964f31345`, final documentation head `1657e397f5505c0585ecb829acee84ba7a17e446`.
Controller acceptance: PR comments 6309950041 and 6310039059.
Verification: 49 focused project tests, 30 independent transport/error-boundary probes, and 34 independent actual-mapping probes passed. These counts describe the reviewed milestone; refresh the current head before reusing them.

## Reusable observations

| Failure or risk | Accepted verification pattern | Scope |
| --- | --- | --- |
| A callback closes over the imported fixture while a test mutates a supplied clone. Missing-evidence tests can falsely pass. | Bind every mapping callback to the actual supplied pages and evidence. Mutate that input through the complete preview path and assert rejection. | Tested generic read-only mapping example. |
| Mapping substitutes an evidence assertion for an unchecked native item lookup. | Require one scalar native identity, a unique canonical item match and exact evidence identity/unit agreement. | Synthetic native-shaped records; no live tenant binding certified. |
| A first-match policy lookup hides conflicting canonical entries. | Inspect all matching entries. Contradictions reject or explicitly block allocation. | Canonical policy mapping. |
| Catching a rejected promise without awaiting it can leave an unhandled rejection. | Await the mapper inside the bounded error boundary and assert zero unhandled events after an event-loop turn. | Async mapper regression. |
| Input cloning or output cloning can throw outside the intended error boundary. | Keep clone, await, validation and output clone inside one boundary; assert bounded errors without raw values or causes. | Transport/error redaction. |
| Missing evidence is silently defaulted to zero. | Require explicit opening, verification, date, sequence, reservations, identity and unit. Test missing and null individually; preserve legitimate explicit zero. | Generic evidence validation. |
| Green CI and named coverage categories conceal gaps in actual behavior. | Exercise the actual helper, transport and preview together, including later pages and conflicting evidence. Inspect unchanged inputs after success and failure. | Acceptance method. |
| A local atomic ledger or read-only preview is described as production stock control. | Keep local simulation, repository acceptance, authenticated integration, durable posting/concurrency and live UAT as separately evidenced milestones. | Delivery reporting. |

## Supersession and limits

Earlier failing mapping and async-boundary observations are resolved for the reviewed generic milestone only. They do not certify authenticated bindings, native transaction semantics, crash recovery, all-channel enforcement or live client acceptance. Existing doctrine and protected gates remain authoritative.

Dynamic experience and candidate learning records belong in the existing Postgres Context / Agent Learning fabric. A Git document or prepared JSON payload is not proof of a database write. Preserve source, scope, verification state, status and supersession; require returned record identifiers and retrieval evidence before claiming database persistence.
