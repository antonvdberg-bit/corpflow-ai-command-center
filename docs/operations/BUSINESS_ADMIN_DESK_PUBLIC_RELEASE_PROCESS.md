# Business Admin Desk — Public Website Release Process

Status: Mandatory release process
Owner: CorpFlowAI / Anton van den Berg
Applies to: Business Admin Desk website changes

## Two fixed surfaces

- **Internal staging / review:** https://cipc.corpflowai.com/
- **Public production:** https://businessadmindesk.co.za/

The internal site is where proposed Business Admin Desk website changes are reviewed. The public domain keeps the last approved version until Anton explicitly approves publication.

## Required flow

1. **Build**
   - Make the proposed website change on a bounded branch / PR.
   - Keep the public production presentation unchanged.

2. **Internal staging**
   - Merge only the staging-safe implementation needed to show the candidate version at:
     `https://cipc.corpflowai.com/`
   - The internal site must remain `noindex,nofollow`.
   - It may display an internal-review indicator.
   - The public domain must continue showing the currently approved version.

3. **Verify internally**
   - Review the actual internal URL.
   - Confirm video, copy, CTA, logo, links and mobile behavior.
   - Confirm Marketing Value 1: no third-party regulator brand in public marketing.
   - Confirm both customer paths are clear:
     - individual businesses;
     - white-label / fractional support for companies and service providers.
   - Confirm no operator-only or test content would leak into the future public release.

4. **Owner approval**
   - Anton explicitly approves the staged version for publication.
   - Record the approval durably in the PR or governing issue.

5. **Publish**
   - Make the bounded publication change that promotes the already-reviewed candidate presentation to:
     `https://businessadmindesk.co.za/`
   - Merge only after owner approval.

6. **Live validation**
   - Verify the public domain and `www`.
   - Verify metadata, robots, canonical, video, logo, CTAs and partner route.
   - Verify no third-party regulator-brand leakage.
   - Confirm the internal staging site remains separate.

7. **Evidence and close**
   - Record PR, merge SHA, deployment ID, staging evidence, production URL and live verification result.
   - Only then call the release complete.

## Guardrails

- No direct edits to the public website.
- No public publication before internal review and explicit owner approval.
- No DB/schema/env/secrets/payment/messaging-runtime changes unless separately approved.
- Existing internal tenant ID and production data model remain unchanged unless separately approved.
- The internal CorpFlowAI host is a review surface only; the `.co.za` domain is the customer-facing production surface.
