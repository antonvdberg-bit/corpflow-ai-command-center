# Change: prepare deterministic expiry reminder plans

## Why
The accepted daily expiry review groups lots by age but cannot identify a single reminder cycle or suppress a previously confirmed warning. Anton explicitly requested completing the outstanding 90/60/30-day reminder workflow without client feedback on29October2026. This bounded implementation follows that approved preparation outcome; scheduling, recipients and live sends remain protected.

## What Changes
- Reuse buildExpiryReview; add a dependency-free deterministic reminder planner with independently supplied source evidence and complete supplied receipt history.
- Produce only proposed internal reminder intents, suppressed sent identities and bounded review/blocker codes.
- Define one stable identity per organization/item/batch/expiry-date/threshold/recipient-set. Catch up only the current age band; never replay three missed warnings at once.
- Test calendar boundaries, partial/invalid evidence, receipt contradictions and immutable repeated evaluations.

## Impact
New planner/tests plus existing README and these OpenSpec files on the existing batch PR1487. No allocator change, connection, data, API, persistence, scheduler, email/WhatsApp/SMS runtime or live activation. This is a reviewed controller preparation contract under Anton's approved outcome, not authorization to send.
