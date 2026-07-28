# Website Rescue — Product Pack v1 (sellable vertical slice)

**Status:** Consolidated product + commercial + delivery pack for GitHub **#654**. Docs/operator artefacts only — no production deploy, domain/DNS, DB/schema, secrets, payment/messaging runtime, or outreach.
**Workstream:** `website-rescue` (must **not** be combined with Lead Rescue **#653**).
**System boundary:** CorpFlowAI business system (not a client tenant).
**Environment:** preview / local docs; live offer surface reused for demonstration.
**Anchor sentinel:** `<!-- WEBSITE_RESCUE_PRODUCT_PACK_V1 -->`

<!-- WEBSITE_RESCUE_PRODUCT_PACK_V1 -->

**Source issue:** [#654](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/654)

## 0. What moved / blocked / next / owner / Anton?

| | |
|--|--|
| **What moved** | Productised “Website Rescue” around the existing **Premium Landing Page Rescue** public offer; tiers, delivery checklists, quotation pointers, pricing recommendation, demo evidence. |
| **What is blocked** | Final pricing approval; production/domain changes; live client builds. Issue comments from Cloud Agent blocked (`issues:read`). |
| **What is next** | Operator review; Anton pricing bands; optional follow-up PR for on-page “Website Rescue” alias copy if approved. |
| **Who owns it** | Cursor (this pack); ChatGPT/operator (review); Anton (pricing + protected gates). |
| **Anton required** | **Yes** for final pricing, production release of client sites, DNS/domain, payment. **Not** required to merge this docs pack. |

### Segregation note

Started **after** #653 Lead Rescue claim/PR opened. Separate branch and PR. No shared runtime file edits with #653. Lead Rescue may be offered as an **add-on** in quotation language only — implementation stays on the Lead Rescue workstream.

---

## 1. Product definition

| Field | Content |
|-------|---------|
| **Internal product name** | Website Rescue |
| **Public SKU (existing)** | **Premium Landing Page Rescue** (`/offers/premium-landing-page-rescue`) |
| **Why two names** | Buyers say “fix my website”; the public page already sells a bounded landing-page rescue. Operators use “Website Rescue” as the umbrella; the public title stays Premium Landing Page Rescue until Anton approves a rename. |
| **Target customer** | Small businesses whose site looks outdated, hides the offer, or fails mobile/enquiry capture — including novice buyers who cannot write a web brief (guided options required). |
| **Qualifying problems** | Weak credibility; no clear CTA; broken mobile layout; missing enquiry path; brochure site that does not convert. |
| **Promised outcome** | A credible, mobile-ready landing (or bounded brochure) surface with clear offer + enquiry capture on a managed delivery path — **without** a months-long custom platform programme. **No SEO/revenue/performance guarantees.** |
| **Included scope (standard)** | Audit of starting URL; recommended tier; Hook/Proof/Depth landing structure; single primary CTA; enquiry capture; preview for feedback; production release after written approval. |
| **Supported starting conditions** | Existing site upgrade (landing focus); one-page rescue; small brochure (1–3 pages) via warm add-on bounds; rebuild of a single landing — not full multi-app builds. |
| **Exclusions** | Custom platform / CMP factory work; complex e-commerce; SEO ranking guarantees; multi-brand design systems; unpaid open-ended revisions; Lead Rescue runtime (sold separately / add-on). |
| **Client responsibilities** | Provide business name, offer summary, target buyer; logo/colours/photos; named approver; domain/access when production release is approved; timely preview feedback. |
| **Standard delivery timeframe** | First visible preview **24–72 hours** after deposit + assets; production typically within **five business days** after written approval (existing offer copy). |
| **Implementation dependencies** | Rapid Delivery offer page; tenant/marketing preview surfaces; revenue templates; quality scoring for pre/post audit (operator-internal). |

---

## 2. Commercial packaging (recommendation → Anton)

| Tier | Starting condition | Recommended setup band (MUR) | Recurring (optional) |
|------|--------------------|------------------------------|----------------------|
| **T1 — Landing Rescue** | One primary landing / homepage rescue | **MUR 45,000** (matches live public offer) | Maintenance from existing maintenance template |
| **T2 — Brochure Rescue** | 1–3 page brochure + enquiry | **MUR 55,000–75,000** | Same |
| **T3 — Rebuild (bounded)** | Replace weak site with managed landing + thin brochure | **MUR 75,000–120,000** | Same |

| Item | Recommendation |
|------|----------------|
| **Public page price** | Keep **from MUR 45,000** on `/offers/premium-landing-page-rescue` until Anton changes it. |
| **Deposit** | 50% MUR manual bank transfer (ERPNext) before design/build; balance before production release (existing). |
| **Revision limits** | Two structured preview rounds in standard T1; extra rounds quoted. |
| **Add-ons** | Lead Rescue (USD 150 pilot or MUR sprint — **separate workstream**); extra pages; photography sourcing; domain cutover (Anton-gated). |
| **Pilot / first-client** | Carol hotel-supplies style opportunity may inform the demo narrative **without** private client data in repo. |
| **Cost/margin** | Operator design/build time + managed hosting surface; avoid custom-platform scope. |

**Pricing recommendation for Anton:** Affirm T1 public floor MUR 45,000; decide whether T2/T3 appear on-page or stay operator-quoted only.

---

## 3. Sellable surface

| Surface | URL | Role |
|---------|-----|------|
| Public offer | `https://corpflowai.com/offers/premium-landing-page-rescue` | Sellable page — Hook/Proof/Depth, discovery CTA |
| Offer registry | `lib/public/rapid-delivery-offers.js` | Price, deposit, outputs |
| Revenue templates | `docs/revenue/templates/` | Quote, deposit, onboarding, release approval |
| Website add-on bounds | `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_WEBSITE_ADDON.md` | When sold with Lead Rescue |

**CTA:** Discovery / enquiry intent (existing mailto / discovery path) — not payment-path language.

**FAQ discipline:** No unsupported SEO, revenue, or Core Web Vitals guarantees.

---

## 4. Demonstration path

Verified **2026-07-28**:

| Step | Evidence |
|------|----------|
| Offer page live | `GET https://corpflowai.com/offers/premium-landing-page-rescue` → **200** |
| Before/after narrative | Weak/outdated site → premium mobile landing with clear CTA (describe; do not invent metrics) |
| Enquiry | Discovery mailto / intake path on offer page |
| Optional Lead Rescue handoff | Quotation add-on only — runtime owned by #653 |

**Demo script:** Open offer page → show outcome + delivered outputs → explain 24–72h preview → deposit → preview feedback → written production approval → optional Lead Rescue add-on.

---

## 5. Delivery system

| Checklist | Source / content |
|-----------|------------------|
| Website audit | Quality dimensions from `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` (operator pre/post scores; not a buyer revenue claim) |
| Client content/assets | Logo, colours, photos, offer summary, proof points — `docs/revenue/templates/client-onboarding-document-checklist.md` |
| Domain/access | Collect only when production release approved; DNS changes = Anton gate |
| Design choices for novices | Present 2–3 guided options + recommended path; convert feedback to structured requirements (do not ask clients to write a brief from scratch) |
| Implementation | Landing structure, CTA, enquiry capture, preview URL |
| Review/revision | Preview feedback template + two rounds (T1) |
| Acceptance/handover | `production-release-approval.md` + balance payment |
| Maintenance boundary | Optional maintenance offer template; not included in T1 setup unless quoted |

---

## 6. Quotation content

| Element | Source |
|---------|--------|
| Quote email | `docs/revenue/templates/quote-email.md` |
| Deposit request | `docs/revenue/templates/deposit-request.md` |
| Tiered scope | T1/T2/T3 table above |
| Assumptions/exclusions | §1 of this pack |
| Revision allowance | Two preview rounds (T1) |
| Payment/deposit | 50% before build; balance before production |
| Project-start | Deposit cleared + assets received |

---

## 7. Remaining Anton approvals

| # | Approval | Unlocks |
|---|----------|---------|
| W1 | Confirm MUR 45k T1 floor + T2/T3 bands | Quoting |
| W2 | Public rename “Website Rescue” vs keep Premium Landing Page Rescue | Marketing copy |
| W3 | Domain/DNS / production release per client | Live client sites |
| W4 | Payment path changes beyond manual MUR deposit | Checkout |
| W5 | Outreach using this offer | Acquisition |

---

## 8. Quality gate

Hook/Proof/Depth via existing offer page + this pack as validation depth. Dual-asset: offer page → pack/templates.  
**Self-score:** 12/14 — docked for thin published before/after proof assets and pending issue-comment observability.

## 9. Explicit non-actions

- No Lead Rescue (#653) file changes  
- No Lux / CIPC / Living Word tenant coupling  
- No schema, env, secrets, deploy, DNS, messaging, payment runtime  
- No rebuild of the offer page in this PR
