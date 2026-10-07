# CorpFlowAI + Business Admin Desk — commercial readiness v1

Status: audit and approved identity architecture; website/email implementation pending.
Observed: 7 October 2026. Repo baseline: `6e023d20` (main).
Owner: controller for audit; Cursor for bounded website implementation; Anton for commercial facts and protected release/configuration approval.

## Authority and scope

Anton approved the wording **Business Admin Desk is a service brand operated by CorpFlowAI Ltd.** and instructed “let's get this done ASAP”. This authorizes ordinary preparation/implementation through the existing delivery route. It does not approve merge, DNS/mail/access changes, live sends, new legal promises, prices, public publication or Paddle submission.

Use one legal entity, two distinct marketing brands and product sets. Follow [the existing release process](BUSINESS_ADMIN_DESK_PUBLIC_RELEASE_PROCESS.md). Broad paused CIPC development (#640) remains paused; this bounded commercial-readiness correction is revenue enablement, not a restart of that estate.

## Canonical reference package

| Field | Agreed wording / evidence state |
| --- | --- |
| Legal supplier/operator | CorpFlowAI Ltd |
| Business Admin Desk relationship | Business Admin Desk is a service brand operated by CorpFlowAI Ltd. |
| CorpFlowAI description | CorpFlowAI provides business software and AI-assisted workflow automation, with implementation and configuration services. Current public offers remain Lead Rescue and bounded website work; planned software subscriptions must not be represented as already available. |
| Business Admin Desk description | Business Admin Desk provides company-administration support for businesses and white-label or fractional administration capacity for professional-service firms and internal teams. |
| What customers buy | Agreed software access/automation and associated implementation under CorpFlowAI; agreed administration packages, setup, add-ons and bespoke work under Business Admin Desk. Each offer must state scope, price, currency, frequency and exclusions. |
| Shared corporate facts | Repo merchant identity and candidate footer show BRN C25228280, Mauritius registration and +230 5901 4284. These are website/repo observations, not independent registry verification. |
| Address | Canonical merchant module uses Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius. Candidate adds Pamplemousses District, 22301. Reconcile with registration evidence before attestation; do not invent or silently normalize an unverified legal address. |
| Footer | Business Admin Desk is a service brand operated by CorpFlowAI Ltd. Follow with the verified registered details and working brand contact channels. Label Business Admin Desk as “Service brand”, not a registered trading name. |
| Independence | Independent company-administration support. Not a government or regulatory service. |
| Paddle description draft | CorpFlowAI Ltd provides business software subscriptions and associated software implementation/configuration services under CorpFlowAI. It also operates Business Admin Desk, a distinct company-administration service brand. Only eligible, accurately described offers approved for Paddle would be sold through Paddle. |

Do not claim formal trading-name registration, tax status, regulator affiliation, live subscriptions or Paddle approval without evidence.

## Email identity contract

Google Workspace is the approved corporate mail platform. Prefer existing mailboxes plus explicit brand aliases/routing, without purchasing seats. A Workspace domain alias alone normally mirrors existing usernames; the four requested addresses need deliberate user-alias/routing assignments, especially the ERPNext-only support path.

| Public identity | Destination / acceptance |
| --- | --- |
| info@businessadmindesk.co.za | Existing CorpFlowAI general-enquiry mailbox; exact mailbox not yet verified |
| support@businessadmindesk.co.za | ERPNext support/Issue workflow only; no parallel human-inbox processing; existing connector and supported outbound path must be inspected |
| accounts@businessadmindesk.co.za | Existing corporate billing/accounts mailbox; exact mailbox not yet verified |
| Serah.Fourie@businessadmindesk.co.za | Serah's existing Workspace account; exact account not yet verified |

Replies must use the exact addressed Business Admin Desk identity in From and Reply-To. Verify permitted send-as identities separately from inbound aliases; forwarding does not establish outbound authentication. Verify SPF/DKIM/DMARC alignment, routing-loop prevention, recipient preservation, support ticket creation, reply threading and absence of duplicate tickets. For automated replies, approval remains governed by existing live-messaging policy.

Preparation sequence: inspect existing domain/MX/Workspace setup and ERPNext email configuration; return a redacted exact mapping; request approval only for the concrete domain/alias/DNS/ERPNext configuration and controlled test sends; apply through authorized administration capability; verify all four identities before publishing them as working contacts. Do not delete old aliases or messages. No secrets in evidence. Admin-write capability is not exposed in this controller session; do not invent completed registration.

## Current-state evidence and page corrections

Fresh anonymous HTTPS GETs succeeded for the candidate pages below; `/pricing` returned 404. Public apex returned 200, public www redirected to apex, and CorpFlowAI www redirected to apex. These checks establish reachability, not a complete link/security/layout audit or deployed-SHA correlation.

| URL / surface | Current problem | Exact proposed correction | Type / priority |
| --- | --- | --- | --- |
| https://cipc.corpflowai.com/ | Review candidate; Gmail CTA; “trading name” footer | Approved service-brand sentence; general enquiry identity; retain review/noindex state | Content/contact MUST FIX |
| https://cipc.corpflowai.com/partners | Same identity/contact defect | Same sentence; info enquiries; retain partner positioning and review isolation | Content/contact MUST FIX |
| /annual-returns, /director-changes, /beneficial-ownership on candidate | Shared footer/contact component applies; routes previously staged under #1333, not freshly checked in this audit | Apply shared identity correction and verify each route; preserve specialist workflows | Content/contact MUST FIX |
| https://cipc.corpflowai.com/services | Renders CorpFlowAI shell and Lead Rescue | Brand-specific company-administration catalogue using actual existing service scope; no invented packages/prices | Content/routing MUST FIX |
| https://cipc.corpflowai.com/contact | CorpFlowAI diagnosis/contact experience | BAD info/support/accounts/Serah paths; support routes to ERPNext; do not promise unavailable mail | Content/routing MUST FIX |
| https://cipc.corpflowai.com/pricing | 404; no approved BAD public amount found | Prepare offer table for monthly, setup, add-ons and bespoke work; populate only approved currency, amounts, tax/fee treatment, scope and frequency | Pricing MUST FIX; business decision pending |
| https://cipc.corpflowai.com/terms | Inherited CorpFlowAI terms and engagement model | Shared legal core, brand-appropriate service schedule and links; draft changes for review before publication | Legal MUST FIX |
| https://cipc.corpflowai.com/privacy | CorpFlowAI workflow/intake policy and contacts | Shared operator/controller identity; accurate BAD information collection, processing and recipient details; no invented retention/transfer promises | Legal MUST FIX |
| https://cipc.corpflowai.com/refund-policy | Sprint/legacy-pilot language and irrelevant contact routes | Distinguish subscriptions, setup and performed administration; obtain approved cancellation/refund decisions and preserve applicable mandatory rights | Legal/pricing MUST FIX |
| /delivery-policy, /payment-security on candidate | Referenced by inherited policy pages; not newly audited | Inspect and replace brand mismatches; resolve every policy reference | Content/navigation MUST FIX |
| https://businessadmindesk.co.za/ and www | Reachable older approved surface; candidate not promoted | Keep existing public presentation until reviewed candidate and mail proof are approved for release | Release/routing MUST FIX |
| https://corpflowai.com/ and commercial/policy pages | Existing service-led proposition does not establish an available subscription catalogue | Preserve current offers; reconcile planned software sales and policy scope with #1398 before claiming checkout readiness | Commercial MUST FIX before Paddle |
| ERPNext client documents (#1406/#1402) | Existing templates use “trading identity” wording | Reconcile the service-brand disclosure through owning document workstream; no duplicate Print Format changes or live mutation here | Consistency SHOULD FIX |
| Footer navigation and dates | Brand-appropriate legal links and revision dates need complete check | Check header/footer, policy cross-references, mailto and canonical links across both brand hosts | Navigation SHOULD FIX; broken required links MUST FIX |
| Visual redesign/extra brand assets | Not required for verification | Defer; reuse current approved mark, layout and video | OPTIONAL |

## Paddle eligibility and legal relationship

Official sources checked 7 October 2026:
- [Acceptable use explanation](https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle): human services unrelated to software are prohibited; a human-service primary offering is not a good fit.
- [Domain review](https://www.paddle.com/help/start/account-verification/what-is-domain-verification): submit relevant checkout domains; only one approved domain is needed to advance; unrelated products can create buyer confusion.
- [Supplier terms](https://www.paddle.com/legal/terms) and [buyer terms](https://www.paddle.com/legal/buyer-terms): distinguish supplier from Paddle as merchant of record/reseller on Paddle transactions.

Inference: BAD administration cannot be assumed Paddle-eligible just because delivered digitally. Do not relabel administration or statutory-fee pass-through as SaaS. Maintain ERPNext/direct-invoice handling for those offers unless a supported eligible model is verified and approved. No new payment provider purchase/implementation in this packet. Both sites can be commercially coherent without both launching Paddle checkout.

CorpFlowAI Ltd is the legal operator/supplier and proposed Paddle account business. Paddle would be merchant of record for approved Paddle transactions; avoid describing CorpFlowAI as the card merchant for those same transactions. ERPNext must not issue a duplicate customer demand for a Paddle transaction. #1398 remains the sole sandbox integration workstream; this package does not activate payment runtime.

## Outstanding commercial decisions

No approved BAD price list was found: `docs/operations/CIPC_PRICING_MODEL_V1.md` explicitly marks its test bands as not public pricing and not Serah-approved. Needed: package names and actual deliverables; currency and amounts; monthly/setup/add-on/quoted basis; statutory-fee separation; tax treatment where applicable; cancellation notice/effective date; setup/work-performed refunds; response/service commitments. Draft structures can proceed; publication of unknown commercial terms cannot.

Legal company details must be matched to actual registration evidence for the final verification pack. Keep proofs private; record only public approved facts. Do not infer ownership from a footer's director list.

## Verification pack and release gates

Final pack must provide verified legal details, accurate brand descriptions, domains, approved offer/price URLs, Terms, Privacy, Refund/Cancellation, Contact/support URLs, working emails, item/category eligibility and price catalogue reconciliation. Policy and pricing destinations above are targets, not verified final BAD pages.

Required proof: complete internal link crawl; no inherited CorpFlowAI sprint/price/support material on BAD pages; no personal Gmail; correct host isolation; noindex on review surface; desktop/mobile captures; four email identities with authentication and support-ticket round trip; final apex/www HTTPS and intended redirects; deployed commit/deployment ID after authorized release. No Paddle submission in this work.

| Delivery state | Current verdict |
| --- | --- |
| Audit/reference package | Prepared; current source and HTTP evidence recorded |
| Website content updated locally | Not implemented by controller; runtime edits route to Cursor under AGENTS.md |
| Merged to main | No |
| Deployed | No new deployment |
| Live URL verified | Existing reachability only; corrected release not verified |
| Email identities operational | Not verified |
| Ready for Paddle verification | No; policy/pricing/eligibility/email and corrected-release proof pending |

## Closeout and learning

Corrected failure: previous web-tool inability to retrieve BAD was not proof of domain failure. Direct HTTPS GET shows apex/www work. Supersedes that discovery-only assumption.
Reusable learning: validate new issue bodies with validateCurrentCursorExecutionPacket before applying the ready label; CODEX_PACKET_V1 alone is not the Handoff marker. Payment-provider eligibility is product-specific, not brand- or digital-delivery-specific; distinguish legal supplier from merchant of record. Proposed learning is source-grounded, not a fabricated Context promotion.
Routing: controller owns evidence/canonical package; multi-page host-aware UI and integration require Cursor; Forge's approved contracts do not cover this. Existing release and print-format workstreams retain ownership.
Persistence: Anton explicitly approved disclosure to the public repository and queueing on 7 October 2026, superseding the earlier automatic-review disclosure block. Implementation source is [#1416](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1416), labelled dispatch:cursor-ready. This proves queued status only, not execution. Handoff run 37564566667 rejected the first issue body before starting an agent because it lacked the CURRENT CURSOR PACKET heading. The controller corrected it, verified the current-main packet validator (PASS, 7875 characters), and posted one CURSOR REQUEUE at issuecomment-6029990885. Retry handoff 37564682846 passed packet validation and started Cursor agent bc-965d1bb0-341c-42e4-8c39-6ec4184ac439, run run-13aaede7-dcc7-4066-80b8-16ee5a9e308f at 2026-10-07T03:00:45.195Z. Source comment reports IN_PROGRESS with no blocker. This supersedes the initial dispatch-format failure; no implementation PR/branch or completed-runtime evidence exists yet. Git CLI push lacked authentication; publication uses the authorized GitHub connector. Context/Agent Learning service is not exposed here, so no transactional promotion receipt is claimed.
Next: bounded website identity/contact correction, read-only mail mapping, then exact commercial decisions and protected configuration/release approval. No laptop app needs to stay open for ordinary cloud execution. Workspace administration requires authorized admin access at its later gate.

Reviewable implementation packet: [identity correction](BUSINESS_ADMIN_DESK_IDENTITY_IMPLEMENTATION_PACKET_V1.md). GitHub disclosure and queueing are approved; merge, DNS/mail configuration and public release still require their exact approvals.
