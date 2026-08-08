# #699 production redeploy verification — 2026-08-09

## Purpose

Create a fresh merge-to-main deployment event for the already-merged Issue #699 market-ready state. CorpFlowAI intentionally skips branch previews; production deployments are triggered from `main` only.

## Scope

- No application logic change.
- No schema change.
- No environment or secret change.
- No payment, email, WhatsApp, SMS, or external outreach change.
- No second app or database.
- No preview deployment opt-in.

## Deployment behavior

Repository Vercel policy intentionally skips non-production branch previews and always allows Production / `main` builds. This PR is therefore expected to remain preview-skipped. After Anton approves and merges this PR to `main`, Vercel should create a new production deployment containing the full current `main` state, including the merged #699 implementation and follow-up path-prefill work.

## Required post-merge verification

1. Record the new production deployment ID/URL and deployed commit SHA.
2. Verify `https://corpflowai.com/` serves the current market-ready gateway.
3. Verify `/contact?path=website-digital#discovery` and the other service-path deep links resolve to the correct buyer-need prefill.
4. Verify Lead Rescue and Website Rescue entry paths remain intact.
5. Run one privacy-safe synthetic qualified enquiry in the approved test context and verify operator handoff.
6. Record evidence on Issue #699 before closure.

## Completion gate

Issue #699 remains NOT COMPLETE until the new `main` production deployment and live verification evidence are recorded.
