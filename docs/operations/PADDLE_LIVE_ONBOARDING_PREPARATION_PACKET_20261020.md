# Paddle Live — bounded release-preparation packet (20 October 2026)

Status: **documentation-only preparation; not implemented, not approved for Live payments or provider submission**.
Authority: CEO approved preparation of website corrections and fail-closed Live code. Merge, production deploy, credential/environment mutations, Paddle account writes and public checkout remain protected gates.
Tracking: #1432; payment runtime #1398; website readiness #1416/#1417; current unmerged integration PR #1488. Do not duplicate an active executor claim.

## Non-negotiable product model
CorpFlowAI Ltd runs two brands. **Business Admin Desk sells integrated software-managed end-to-end business-process packages.** Automation and controlled human execution are workflow stages in a single managed offering, not unrelated standalone human services. Describe current implemented functionality honestly; do not portray planned automated onboarding as operational.

Proposed Paddle product summary for operator review:
> CorpFlowAI Ltd develops and operates software-managed business process packages. Under CorpFlowAI, it configures and operates software workflows for enquiry handling and bounded automation. Under Business Admin Desk, customers purchase integrated company-administration process packages, combining software workflow management and controlled human execution in one end-to-end process. Government and statutory charges, when applicable, are separate.

This is **candidate commercial wording**, not a legal attestation or a claim of completed automation. Legal entity spelling, sales tax, compliance, registered address and product representation must be checked against authoritative records before submission.

## Live migration truth (read-only Cursor Desktop Playwright, 20 October)
- Sandbox BAD catalog: nine approved active ZAR **one-time** quantity-one packages; no discounts. The two older USD CorpFlowAI Platform ($100 monthly) and Implementation/Configuration ($500 one-time) items are test records **excluded** from Live.
- Live Paddle: 0 products, 0 prices, 0 discounts, 0 client tokens/API keys, 0 notification destinations; Live default payment link blank; approved checkout domains none; business setup draft saved but incomplete. Notification list contradiction was resolved by the authenticated UI audit as empty.
- Sandbox test payment and signed webhook validated; #1488 remains open and unmerged.
- CorpFlowAI /terms /privacy /refund-policy and /pricing are publicly reachable, but live offerings and pricing alignment are not yet demonstrated.
- BAD /pricing returns 404; BAD /terms /privacy /refund-policy serve inherited CorpFlowAI policy pages; public BAD home currently describes standalone human support, inconsistent with integrated packages.

## Approved candidate Live BAD catalog
Maintain exact item code, approved ZAR amounts and statutory-fee exclusion. Capture new Live pro_/pri_ IDs separately; NEVER reuse Sandbox IDs for Live.

| Item code | ZAR one-time |
|---|---:|
| BAD-ONBOARD-EXISTING | 199 |
| BAD-REG-ONBOARD-BUNDLE | 299 |
| BAD-ANNUAL-RETURN-BO-CURRENT | 99 |
| BAD-BO-SIMPLE | 249 |
| BAD-DIRECTOR-APPT-RESIGN | 199 |
| BAD-ADDRESS-CHANGE | 69 |
| BAD-SHARE-CERT-VERIFIED | 99 |
| BAD-NAME-RESERVATION | 99 |
| BAD-FYE-CHANGE | 199 |

## Cursor code task A — customer-facing website corrections
Executor: **Cursor Cloud/Web only after verifying branch/worktree and absence of an existing active owner; use existing code PR/workstream rather than duplicating**. Changing runtime pages, conditional host behavior and tests exceeds controller documentation-only changes.

Required:
1. Update public Business Admin Desk positioning to accurately present one software-managed, mixed execution business process, with details supported by actual current implemented functionality. Do not claim fully automated onboarding, payment or delivery already live.
2. Prepare correctly host-scoped BAD /pricing showing the nine approved ZAR one-time packages, item codes, scope/exclusions and government/statutory fees separately. Keep checkout disabled; no pay/checkout CTA.
3. Prepare BAD /terms /privacy /refund-policy with shared legal entity but relevant brand/service-specific content and appropriate policy review. Do not invent legal commitments, refunds or tax treatment; mark items requiring legal/commercial approval. Prevent inherited CorpFlowAI-only page misrepresentation.
4. Preserve CORPFLOWAI home/offers and CIPC review/noindex isolation. Validate both host contexts with tests, snapshots, route status and no unintended price leakage.
5. No public production deployment or merge without explicit approval.

## Cursor code task B — separate fail-closed Live configuration
Executor: Cursor Cloud/Web with proven repository access, preferably extending #1488 only after confirming its owner/claims; otherwise separate scoped PR, no conflicting changes.

Required:
1. Preserve existing tested Sandbox configuration. Live activation only through **explicit non-public mode** with correct Live client token prefix, separately provisioned Live API key, nine separately mapped Live price IDs, signature-verifying Live notification secret and approved checkout domain. Never log secret values.
2. Fail closed if any Live prerequisite is missing; no fallback from Live to Sandbox IDs, credentials or endpoints. Never expose staging checkout as public.
3. Retain: add `pwCustomer` only if Retain is actually used and an authenticated Paddle customer ID is available. Do not substitute internal IDs or email.
4. Preserve and independently validate raw-body signature, idempotency, refund/failure protections, and no production ERPNext writes. Create no new database or billing application.
5. Verify targeted tests/build and reviewable preview evidence. No merge, deployment, environment mutation or live payment.

## Cursor Desktop role, separate from Cloud
Desktop has authenticated Playwright access to Paddle dashboards. After protected account-write approval, Desktop can ADD ONLY missing approved Live products/prices, create token/API key via Paddle secure UI, and create notification destination **only after confirming none exists**. Never delete/archive/recreate Live entities or rotate existing secrets. Credentials belong directly in approved secret management; no chat, screenshots or repository content. Configure default checkout only on an approved real domain when authorised. Website approval, verification, payouts, bank/ID entry are separate protected actions.

## Exact release gates / evidence
- **Prepared**: draft website/code PR(s), checks/screenshots, accurate policy/pricing candidate, Live code fails closed, mapping plan.
- **Live catalog created**: provider read-back of each approved item with new Live ID mapping and zero duplicates (after authorization).
- **Verification submitted**: user/authorised operator submits accurate complete business/site information and identity securely; record non-sensitive result.
- **Approved**: Paddle business/domain/product approval proven.
- **Live enabled**: explicit Anton merge + production + checkout activation authorisations, successful monitored payment and reconciliation. Never conflate gates.

Next owners: Controller to review PR/evidence and coordinate; Cursor Cloud for justified code; Cursor Desktop for protected account operations only when authorized; Anton for legal/commercial facts and exact release gates. NO_MATERIAL_LEARNING beyond the prior product-positioning correction and need for separate Desktop vs Cloud access.
