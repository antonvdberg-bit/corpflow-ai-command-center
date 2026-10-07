# Business Admin Desk commercial readiness v1

Status: bounded internal review candidate; not a public-release approval.

## Scope

This document records the first bounded identity/contact correction for the Business
Admin Desk review surface. It does not authorize publication, DNS or mail changes,
Google Workspace configuration, pricing, legal promises, payment setup, or external
communication.

The service-brand disclosure for this review candidate is:

> Business Admin Desk is a service brand operated by CorpFlowAI Ltd.

Planned review identities are shown as pending verification only:

- `info@businessadmindesk.co.za` — general enquiries
- `support@businessadmindesk.co.za` — ERPNext support/ticketing only
- `accounts@businessadmindesk.co.za` — billing/account administration
- `Serah.Fourie@businessadmindesk.co.za` — named contact

No claim is made here that these mailboxes are registered, operational, or configured.

## Implementation evidence

Issue #1416 requested a review-only correction while preserving the existing public
contact baseline and public canonical/robots behavior. The implementation:

- keeps the legacy public contact address unchanged;
- selects `info@businessadmindesk.co.za` only for `internalReview`;
- uses the same selected address for `mailto` and clipboard actions;
- renders the service-brand sentence, planned identities, and pending-verification
  notice only in review footer output;
- passes review mode explicitly through the homepage, partner, and service landing
  contact actions.

The current-main baseline was `87c9d352` when this evidence was prepared. This
candidate remains subject to review, CI, and the existing merge/public-release gates.

## Non-goals and open gates

Email routing, Google Workspace, legal facts, service-specific terms/refunds,
pricing, Paddle eligibility, and public publication remain unverified and out of
scope. The paused broad CIPC estate work is not resumed by this candidate.
