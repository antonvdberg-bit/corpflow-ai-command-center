# Design: expiry reminder preparation

## Input and evidence
Pure Node ES module. Inputs: explicit organizationId, asOfDate, recipientSetId (opaque, no address), canonical items and batches consumed by buildExpiryReview, sourceEvidence and independently supplied expectedSourceEvidence. Require matching snapshotId/version/fingerprint/observedAt and complete=true; strict UTC real Gregorian instant. A caller-supplied fingerprint is a consistency attestation, never authenticity/concurrency proof. Require receiptHistory.complete=true and scoped prior receipts. Hard caps on all arrays and scalar lengths. Never infer an opening, available quantity or receipt coverage from absence.

## Age bands and exclusions
Use buildExpiryReview without changing it. Only complete validated reports with no classification/expiry exceptions may yield reminders. Positive physical quantities in days61to90 propose90, days31to60 propose60, days1to30 propose30. At first observation onday20, propose30 only, not90+60. Boundary90/60/30 belongs to that threshold;91 excluded. Today/expired yield review items only; zero stock and explicitly non-expiring items yield no warning. Quarantined lots remain visible as physical-stock warnings with their original status; this grants no allocation/disposal authority.

## Identity and receipts
Stable canonical encoding of organizationId,itemId,batchId,expiryDate,thresholdDays,recipientSetId; avoid delimiter collisions, for example JSON array encoding plus SHA256 from node:crypto. Return deterministic warningId with these fields. Prior receipts require same org/recipient set, complete stable identity, confirmed status=sent, receiptId and valid sentAt. Validate all receipts before any candidates. Duplicate/contradictory receipt identities, uncertain/pending/failed outcomes or malformed history block the whole plan, never silently retry. A matching confirmed sent identity suppresses that warning. Changed expiry creates a new cycle; prior dated receipts stay historical. Different recipient-set identity represents a different approved routing configuration, not inferred consent.

## Output
proposed/no_op/blocked; synthetic=true,readOnly=true,operational=false,sendPath=false. Return scope/source evidence, deterministically ordered intents/suppressed identities, review codes and explicit coverage. No send function, credentials, filesystem, timers, persistence, native write or mutable registry. Inputs remain unchanged; results cannot claim scheduled/delivered. No arbitrary supplied error values in blockers.

## Later activation
A real sender must verify allowed recipients, native data provenance, complete stock coverage, durable send receipts and uncertain-delivery recovery before a separately approved schedule or send. The existing pure expiry report is not an operational reminder service. Keep this implementation unconnected.
