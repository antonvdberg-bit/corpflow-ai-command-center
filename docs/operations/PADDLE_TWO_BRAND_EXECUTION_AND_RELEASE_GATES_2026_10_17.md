# Paddle two-brand readiness — executable release gates
Date: 2026-10-17
Owner: CorpFlowAI COO controller
Status: PREPARATION ONLY. No Paddle acceptance, submission or production payment activation is represented by this document.
Source issue: #1432. Related: #1398, #1403, #1416, #1417, #1437, #1465.

## Executive acceptance condition
There are **two independent product-category decisions**, for CorpFlowAI software offers and Business Admin Desk integrated digital administration packages. No software checkout is activated for an offer until its actual sale model, product, legal basis, brand/domain and Paddle acceptance are supported by evidence. No disposable compliance-only site: where user-facing functionality is developed it must complete a genuine customer task.

## Evidence ledger, required action and acceptance test

| ID | Brand | Requirement / release gate | Status as of 17 Oct | Evidence | Owner / next executable action | Acceptance proof |
|---|---|---|---|---|---|---|
| C01 | CorpFlowAI | Functional recurring software deliverable, licence/access scope and entitlement | PARTIAL | #1398 sandbox transaction-to-entitlement evidence reported; not real customer licence proof | Controller: inventory actual software product and delivery/hosting/handover; existing app tester: functional browser demo | Named app route, permitted customer journey, deployed commit, outcome |
| C02 | CorpFlowAI | Product category suitability: platform, automation, AI Lead Rescue, Website Rescue | BLOCKED ON PROVIDER CLASSIFICATION for ambiguous packages | Paddle AUP; #1432 commercial definition | Controller: per-package functionality table; draft eligibility query below; Anton gates send | Paddle written product-specific response; category recorded per SKU |
| C03 | CorpFlowAI | Pricing, legal policy and public domain | PREPARED; historical route verified | PR #1437 merged; #1432 comment records READY deployment dpl_HEBX5SaJtKgBSKZ2YiJXVGtsNguC and HTTP 200 on pricing, onboarding-review, refund-policy | Browser verifier: recheck production commit and mobile/desktop links, actual policies and approved regional matrix | Timestamped browser evidence; no broken primary action; correct amount/frequency |
| C04 | CorpFlowAI | Merchant identity, live domain approval, payout/legal account facts | UNKNOWN | No authenticated Paddle dashboard decision evidence in #1432 | Account operator: read-only Paddle dashboard status/export **without secrets/PII** | Reviewer status, approved domains, legal-entity status and outstanding items |
| C05 | CorpFlowAI | Live checkout, verified webhooks, customer receipt/cancellation/recovery | NOT ACTIVATED | #1398 sandbox final PASS comment; production variables Preview-scoped; no proof of live checkout | Reuse merged #1403; construct bounded test script/preview acceptance; request exact protected authorisation only for live env, deploy and payments | End-to-end Paddle live transaction and cancellation evidence with private data redacted after approval |
| B01 | Business Admin Desk | Real integrated digital workflows / software functions / human-review boundaries | PARTIAL DESCRIPTION; RUNTIME UNKNOWN | CEO clarification 17 Oct in #1432: no standalone manual-only events; #1417 brand model | Controller: for EACH sellable package identify working forms, automation, document processing, verification, deliverable and human-step; do not invent automation | User-test video/screenshots and package evidence, with exact application routes |
| B02 | Business Admin Desk | Paddle acceptable-use and government-service classification | BLOCKED ON PROVIDER CLASSIFICATION | Official Paddle AUP; integrated tech package does not itself prove category suitability | Controller drafts evidence-based submission below; Anton approves external message | Paddle written acceptance or exclusion of specifically described SKU(s) |
| B03 | Business Admin Desk | Commercial quote transparency / ZAR prices | PARTIAL; NUMERICAL RATES NOT APPROVED | #1432 / checklist: review quote-only, numbers pending | Controller validates quote-only flow with distinct statutory fee/tax; Anton approves numeric prices if fixed checkout needed | Approved pricing representation and buyer cost disclosed pre-purchase |
| B04 | Business Admin Desk | Test host/public host/branding/contact/legal policies | PARTIAL | #1416/#1417; review only cipc.corpflowai.com / cipc-desk.corpflowai.com, no public businessadmindesk.co.za promotion | Browser verify site, functioning contact method, brand/operator footer, policy separation, noindex review | Host-specific screenshots, tested links and contact receipt, approved release boundary |
| B05 | Business Admin Desk | Production billing checkout / fulfilment | NOT AUTHORISED | No approved Business Admin Desk merchant SKU or live collection proof | Hold checkout; reuse existing payment rail only if Paddle approves exact package and Anton approves release | Separate SKU acceptance, approved legal/price/domain, full functional E2E checkout |

Statuses have different evidence dimensions: **merged** is not **deployed**, deployed HTTP is not **user journey verified**, sandbox PASS is not **provider acceptance or production payment readiness**. If live testing unavailable mark UNKNOWN rather than PASS or FAIL.

## First executable inspection (no protected action)
1. Read exact current PR / issues and check current deployment SHA and environment status, preserving #1403, #1437, #1465.
2. CorpFlowAI: on desktop and 390px viewport open `https://corpflowai.com/pricing`; select all three offer cards; change each offered market/currency; verify price/interval, selected detail focus, primary CTA, offer routes and policy links. Inspect `/onboarding-review`, `/terms`, `/privacy`, `/refund-policy`, `/delivery-policy`, `/payment-security` and contact. Record timestamps, expected/actual, screenshot path, deployed SHA. **No simulated payment on production**.
3. Business Admin Desk: inspect only approved test hosts `https://cipc.corpflowai.com` and `https://cipc-desk.corpflowai.com`; check quote-only distinct view, legal-operator statement, truthful contact channels, policy routes, noindex review and no cross-brand price leaks. Read-only inspect public `https://businessadmindesk.co.za` without promotion.
4. Read Paddle account approval and domain status if an authenticated read-only access path exists; otherwise flag **HUMAN ACCOUNT INSPECTION** (no credentials requested).
5. Verify sandbox #1398 evidence includes checkout-originated event and Paddle notification, subscription lifecycle, idempotency and signature failure checks. Do not redo successful provider transactions unless an explicit coverage gap demands it.
6. Deliver a precise test log: date, route, exact commit/deployment, device, action, expected, actual, evidence location and PASS/FAIL/BLOCKED. No no-op browser screenshots accepted as proof of interactive behavior.
7. Controller issues a narrow Cursor correction packet only for demonstrated functional defects not already actively claimed; existing automation/Forge first if sufficient. Include files, tests, stop condition, no merge/deploy.

## Product classification truth checklist (fill separately for EACH proposed Paddle SKU)
- Buyer and use-case; exact price/interval and quote versus upfront checkout.
- Customer actually receives: working software, access/licence or installed configuration, data/document files, automation, controls and operational acceptance.
- Execution evidence: live route or running component, demonstrable input->automation->verified output, persistence and customer ownership/handover.
- Human tasks and their necessity; which government submission, if any, by whom; third-party statutory fees billed separately.
- Fulfilment/acceptance criteria, support/cancellation/refund policy, customer responsibility, recurring access terms.
- Restricted-category review under Paddle AUP: unrelated human services, marketing or mass messaging, government services and regulated professional advice.
- Outcome: eligible **only with Paddle confirmation**, excluded, or decision pending; attach source and decision date.

## Ready-to-review external product suitability clarification — DRAFT, NOT SENT
### CorpFlowAI
Subject: Product eligibility review — subscription software with implementation workflows

CorpFlowAI Ltd is a software and digital workflow automation business. We would like product-specific eligibility guidance before activating payments. Our intended products include recurring software access and one-time configuration/implementation, with testing and limited human verification associated with the software deliverable. Additional offers may involve inbound enquiry management, business workflow automation and website implementation; we understand that marketing services and primarily human-delivered services may fall outside your Acceptable Use Policy.

We will supply a separate product sheet for each actual SKU explaining exactly what software the customer receives or controls, whether access is recurring, what the automation does, what people do, and whether any outreach or mass messaging is included. Could you advise which types are eligible and what product evidence Paddle requires? We will not assume that a bundled service is approved solely because software is included.

### Business Admin Desk
Subject: Product eligibility review — integrated digital company administration packages

Business Admin Desk is a service brand operated by CorpFlowAI Ltd. Its packages combine software-enabled intake, structured information capture, workflow automation, document preparation and validation, coordination and human review or submission actions when needed. The customer purchases the defined end-to-end digital workflow and its deliverables, not separate hourly administration or consulting. Some packages relate to company registration records, annual returns, beneficial-ownership records and associated statutory processes; any government or statutory fee is distinctly identified.

We recognise Paddle has a separate government-services prohibition and ask for a specific eligibility ruling before offering these packages through Paddle. Can Paddle process charges for any of these technology-supported packages, and if so which software deliverables and excluded statutory or third-party activities must be kept outside the Paddle checkout? We can provide package-by-package demonstrations and exact fulfilment descriptions without claiming unimplemented functionality.

**External-send gate:** Anton approval required for any submission, onboarding material, live outreach or account mutation. Do not send these drafts automatically.

## Billing decision
Use native Paddle recurring subscription billing and recovery where supported; CorpFlowAI synchronises webhooks and customer fulfilment rather than building a second card charge engine. No self-declared grace-period length or direct card data storage. If manual billing is necessary, use an approved Paddle-supported invoicing path and a separately approved entitlement policy.

## Human intervention gates
1. Authenticated read-only Paddle dashboard: supply **statuses only** (merchant verification, brands/domains, product reviews, needed evidence). No secrets or personal identification in chat/GitHub.
2. Approve only the exact external product-classification query after product sheets are truthful and complete.
3. Resolve Business Admin Desk final prices if fixed numeric checkout is necessary (do not invent them).
4. Explicit release/payment approval after live QA and Paddle written acceptances; no implicit authorisation from this plan.

## Sources, durable learning and supersession
- https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle (official AUP).
- https://www.paddle.com/help/start/account-verification/what-is-domain-verification (review).
- https://developer.paddle.com/build/go-live-checklist/ (production checklist).
- Existing implementation and approval evidence: #1398, #1432, #1416, #1417, PR #1403, #1437, #1465.
- Supersedes any earlier claim #1437 or #1465 still unmerged; correct merged dates are preserved in issue #1432.
- Learning: a bundled technical and human outcome should be described truthfully, but cannot be treated as provider-approved without a package-specific suitability decision.
- Shared Postgres Context / Agent Learning not updated by this documentation branch; record persistence gap rather than claim promotion.

This document is a preparation/testing contract; it changes no client-facing code, payment configuration, database, policies or public site.