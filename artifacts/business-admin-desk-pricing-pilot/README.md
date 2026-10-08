# Business Admin Desk measured pricing pilot

This directory records only sanitized evidence for the private-input pilot. It
must not contain fees, hourly rates, client data, screenshots with identities,
tokens, or authenticated URLs.

## Current evidence

- Deterministic pilot fixtures: `node-tests/cipc-pricing-pilot.test.mjs`
- Browser preview evidence: not captured in this local run; authenticated access
  and a Ready preview URL must be supplied by the operator without sharing
  credentials.
- Mode boundary: current measured pilot is session-only; historical examples
  remain explicitly dated and unapproved.

## Unknowns and evidence still required

- Completed routine cases and onboarding measurements
- Review, submission, confirmation, and follow-up measurements
- Permitted filing channel plus authority/mandate and confirmation
- Tax treatment
- Available specialist hours and queue capacity
- Process-pilot approval separately from final commercial approval

No synthetic completion, filing, approval, quote, send, payment, or CIPC
submission evidence is recorded here. Actual case and financial records belong
in the existing ERPNext workflow; this calculator creates none.

## Delivery verdict

**PARTIAL** until the authenticated test route is verified against the deployed
commit. This packet does not authorize deployment, merge, public pricing, or
client workflow changes.
