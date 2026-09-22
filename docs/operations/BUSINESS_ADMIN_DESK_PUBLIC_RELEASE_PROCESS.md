# Business Admin Desk — Public Website Release Process

Status: Mandatory release process
Owner: CorpFlowAI / Anton van den Berg
Applies to: businessadmindesk.co.za public marketing surfaces

## Purpose

Business Admin Desk public website changes must be prepared, reviewed and verified internally before they are published to the client-production domain.

## Required flow

1. **Branch / draft PR**
   - All public-site changes are made on a bounded branch.
   - A draft PR is opened against `main`.
   - No client-production publication occurs at this stage.

2. **Internal preview**
   - Vercel creates a Preview deployment from the branch.
   - Business Admin Desk public changes are reviewed on the preview-only route:
     `/business-admin-desk-preview`.
   - That route must not be available in the production environment.

3. **Internal verification**
   - CI/build/tests pass.
   - Marketing Value 1 is checked: no third-party regulator brand in public marketing.
   - Direct-business and partner/white-label positioning is verified.
   - CTA, video, logo, metadata, mobile layout and links are checked.
   - No internal review/operator content is exposed.

4. **Owner approval**
   - Anton explicitly approves the reviewed version for publication.
   - Approval is recorded durably in the PR or governing issue.

5. **Merge and production deployment**
   - Only after approval, merge to `main`.
   - Vercel production deployment is correlated to the merge commit.

6. **Live validation**
   - Verify `https://businessadmindesk.co.za/`.
   - Verify `www` redirects/resolves correctly.
   - Verify public metadata/robots/canonical.
   - Verify CTA, video, logo and partner route.
   - Verify no public regulator-brand leakage.
   - Verify internal/test surfaces remain isolated.

7. **Evidence and close**
   - Record PR, merge SHA, deployment ID, live URL and verification result.
   - Only then call the change complete.

## Guardrails

- No direct production edits.
- No merge-before-preview.
- No production deploy without explicit owner approval.
- No DB/schema/env/secrets/payment/messaging-runtime changes unless separately approved.
- Existing internal tenant ID and production data model remain unchanged unless separately approved.
- `businessadmindesk.co.za` is the public client-production brand surface; CorpFlowAI-hosted review surfaces remain internal/test.
