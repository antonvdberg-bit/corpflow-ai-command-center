## CURRENT CURSOR PACKET — Business Admin Desk identity/contact correction

CODEX_PACKET_V1

Purpose:
Prepare the first safe Business Admin Desk commercial identity/contact correction on a reviewable branch. Anton approved “Business Admin Desk is a service brand operated by CorpFlowAI Ltd” and “let's get this done ASAP” on 7 October 2026.

Business outcome:
A corrected review candidate with the exact service-brand disclosure and all four planned Google Workspace identities, with public-release isolation proved. This is revenue/payment-verification enablement, not a resumption of the paused broad CIPC estate #640.

value_class: revenue_enablement
expected_outcome: Reviewable implementation PR with host-isolation and identity/contact verification.
output_type: runtime
surface: Business Admin Desk internal review candidate
tier: low
context_budget: M
execution_budget: one run; one bounded correction maximum; existing approved capacity only
consequential_gate: none
stop_condition: PR + focused checks + non-production preview proof, or one exact blocker
stale_threshold: five-minute acknowledgement per existing Handoff; no repeated activation

Linked issue or ticket:
This issue; broader source #640; existing Paddle sandbox #1398; print-format branding #1406/#1402.
Read controller branch docs/bad-commercial-readiness-20261007, docs/operations/BUSINESS_ADMIN_DESK_COMMERCIAL_READINESS_V1.md. Do not merge that branch to consume the packet.

Current evidence:
Main baseline 6e023d20. Anonymous HTTPS GET on 7 October: cipc homepage/partners are BAD with old Gmail and “trading name”; services/contact/terms/privacy/refund-policy serve inherited CorpFlowAI content; /pricing is 404. Public .co.za and www are reachable; www redirects to apex. Prior retrieval failure was not domain failure.
GitHub open PR search found no overlapping commercial-readiness implementation. #640 latest record pauses broad development; do not remove its pause. Inspect verified current executor claims before taking a slot, WIP=1. Do not duplicate an active owner.

Why Cursor:
Host-aware multi-component UI implementation and behavioral isolation tests are outside controller's AGENTS.md runtime permission and existing Forge contracts. Controller already completed audit and canonical decisions directly; this is not a documentation-only dispatch.

Target branch suggestion:
fix/bad-review-commercial-identity-20261007

Target files:
- components/BusinessAdminDeskLegalFooter.js
- components/BusinessAdminDeskContactActions.js
- components/BusinessAdminDeskPublicLanding.js
- components/BusinessAdminDeskPartnerLanding.js
- components/BusinessAdminDeskServiceLanding.js
- node-tests/business-admin-desk-commercial-identity.test.mjs (new focused behavioral proof)
- docs/operations/BUSINESS_ADMIN_DESK_COMMERCIAL_READINESS_V1.md (copy controller reference then add evidence; do not invent approval)
No other files without returning an exact scope blocker.

Patch or full file contents:
Apply these exact bounded transformations after confirming current main:
1. BusinessAdminDeskLegalFooter: internalReview defaults false. For internalReview=true, render the exact sentence “Business Admin Desk is a service brand operated by CorpFlowAI Ltd.” separately from registered details. Details label “Service brand:” replaces “Trading name:” only on review rendering. Existing public rendering must remain unchanged until approved publication; preserve legal facts as they exist and flag unverified registry facts in evidence, not public copy.
2. Internal footer replaces old Gmail with planned info@businessadmindesk.co.za. Display the four approved planned identities in an internal-review-only contact block, clearly marked “Email routing pending verification”:
   info@businessadmindesk.co.za — general enquiries
   support@businessadmindesk.co.za — ERPNext support/ticketing only
   accounts@businessadmindesk.co.za — billing/account administration
   Serah.Fourie@businessadmindesk.co.za — named contact
   Do not claim registered/operational mail or expose corporate destination accounts.
3. BusinessAdminDeskContactActions: add explicit internalReview=false prop. Select info@businessadmindesk.co.za only when internalReview=true, retaining the current public contact address as approved release baseline. Ensure both mailto and clipboard use the same selected address. Preserve existing exported CONTACT_EMAIL/buildMailto compatibility, subject/body encoding and copied-state behavior. Do not replace a shared global constant in a way that changes public behavior.
4. Pass internalReview explicitly through every BusinessAdminDeskContactActions invocation in all three allowed landing components, including multiline and spread-prop calls.
5. Retain existing brand, videos, layout, customer/partner positioning, existing service scope, public canonical handling and noindex review state. No redesign.
6. Keep review email links visibly pending verification; public .co.za behavior must remain unchanged. Do not submit forms/send mail during preview proof.

Definition of done:
- Exact sentence renders on review homepage, partner and service candidates.
- No old Gmail in the updated review contact/footer output.
- Four approved identities shown as planned/unverified.
- Actual mailto and clipboard point to info on review; public legacy behavior preserved.
- Meaningful rendered/behavioral tests prove internalReview=true vs false, all callers, pending-state notice, encoding, robots/canonical preservation. Do not settle for only source-string assertions.
- Focused checks and safe build; preview screenshot desktop/mobile from an existing nonproduction capability where available; no public release.
- PR, exact head SHA, check results and source-issue callback; never call implementation complete without branch/PR evidence.

Verification commands:
node --test node-tests/business-admin-desk-commercial-identity.test.mjs node-tests/cipc-desk-partner-funnel.test.mjs node-tests/cipc-desk-ui-refresh.test.mjs
npm run build
git diff --check
Use npm run build only; never vercel-build/schema hook. Follow required CI once after checks. If dependencies/test tools missing on actual host, return exact blocker without installing paid tools or widening access.

Expected PR title:
Prepare Business Admin Desk service-brand identity and branded review contacts

Explicit non-actions:
No merge/deploy/publication, DNS/MX/Google Workspace/ERPNext changes, send-as changes, live messages/test sends, secrets/access/data/schema, payment runtime/catalogue, Paddle submission, pricing/legal promises, new paid tools/capacity, third-party regulator marketing. Do not remove #640 pause or steal #1398/#1402 ownership.

Warnings / assumptions:
Email configuration is not operationally proved. BAD prices remain unknown; internal #989 test bands are not public approved prices. Terms/refunds must be reviewed and service-specific; do not blindly copy Lead Rescue. Paddle prohibits human services unrelated to software; do not claim BAD administration eligible. This first slice is not full commercial readiness.
Following slices: host-aware Services/Contact/policy/pricing corrections, read-only exact mail mapping and commercial approvals. Prepare them with controller; do not silently expand this run.

Stop condition:
Return PR URL/head SHA/branch, tests, preview evidence or exact unavailable-preview blocker, host-isolation proof, changes/corrections, learning or NO_MATERIAL_LEARNING, next owner/gate to this issue through existing callback. A ready label is not a run. No Anton prompt/evidence courier.

Risks:
Shared components could accidentally change already-approved public pages; internalReview behavioral proof is mandatory. Planned mail addresses could look operational; pending notice and no public release are mandatory. Do not resolve unknown pricing/legal facts by guessing.
