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
| **What moved** | Productised “Website Rescue” around **Premium Landing Page Rescue**; T1/T2/T3 tiers; quote-ready packet; pricing guide; delivery/onboarding checklists; public before/after + FAQ depth; fictional demo at `/demo/website-rescue`; operator-pack rail on `/admin/rapid-delivery` for landing-rescue leads. |
| **What is blocked** | Final pricing approval from Anton (W1); T2/T3 prices on public page (W6); production/domain (W3); outreach (W5); payment runtime beyond manual MUR deposit (W4). |
| **What is next** | Review/merge this runnable slice → Preview verify demo + offer page → Anton W1 for confident T2/T3 quoting. |
| **Who owns it** | Cursor (implementation PR); ChatGPT/operator (review); Anton (pricing + protected gates). |
| **Anton required** | **Yes** for W1–W6. **Not** required to merge the PR itself. |

### Companion artefacts (sellable slice)

| Artefact | Path |
|----------|------|
| Quote-ready packet | `docs/marketing/WEBSITE_RESCUE_QUOTE_READY_PACKET_V1.md` |
| Pricing guide | `docs/sales/WEBSITE_RESCUE_PRICING_GUIDE.md` |
| Delivery checklists | `docs/operations/WEBSITE_RESCUE_DELIVERY_CHECKLISTS_V1.md` |
| Demonstration path | `docs/marketing/WEBSITE_RESCUE_DEMONSTRATION_PATH_V1.md` |
| Named buyer landing | `/website-rescue` (SKU lock `premium-landing-page-rescue`) |
| Public offer | `/offers/premium-landing-page-rescue` |
| Public demo (noindex) | `/demo/website-rescue` |
| Video production packet (#700 / #1143) | `docs/marketing/WEBSITE_RESCUE_VIDEO_PRODUCTION_PACKET_V1.md` |

### Segregation note

Started **after** #653 Lead Rescue claim/PR opened. Separate branch and PR. No shared runtime file edits with #653. Lead Rescue may be offered as an **add-on** in quotation language only — implementation stays on the Lead Rescue workstream.

---

## 1. Public name decision (definitive for this pack)

| Layer | Name | Where it appears |
|-------|------|------------------|
| **Public SKU (buyer-facing)** | **Premium Landing Page Rescue** | `https://corpflowai.com/offers/premium-landing-page-rescue`, ERPNext item `CF-RD-LANDING-RESCUE`, revenue templates, discovery emails |
| **Internal / operator umbrella** | **Website Rescue** | CMP issue #654, this pack, operator control board, delivery checklists |
| **Short page label** | Landing page rescue | `rapid-delivery-offers.js` → `pageLabel` |

**Decision (pending only Anton W2 for a public rename):**

- **Keep “Premium Landing Page Rescue” as the public title and URL slug.** Buyers already land on a live, conversion-ready offer page; renaming would require coordinated changes to ERPNext items, templates, and marketing assets with no buyer benefit until a broader rebrand is approved.
- **Use “Website Rescue” internally** when operators discuss the workstream, tiers, delivery system, and quotations. In client-facing copy, lead with **Premium Landing Page Rescue** and describe T2/T3 as scoped extensions (“brochure rescue”, “bounded rebuild”) — not a separate public product name.
- **Do not** introduce a second public route (e.g. `/offers/website-rescue`) in this workstream without Anton W2 approval.

---

## 2. Product definition (umbrella)

| Field | Content |
|-------|---------|
| **Target customer** | Small businesses whose site looks outdated, hides the offer, or fails mobile/enquiry capture — including novice buyers who cannot write a web brief (guided options required). |
| **Qualifying problems** | Weak credibility; no clear CTA; broken mobile layout; missing enquiry path; brochure site that does not convert. |
| **Promised outcome** | A credible, mobile-ready landing (or bounded brochure) surface with clear offer + enquiry capture on a managed delivery path — **without** a months-long custom platform programme. **No SEO/revenue/performance guarantees.** |
| **Supported starting conditions** | Existing site upgrade (landing focus); one-page rescue; small brochure (1–3 pages); bounded rebuild of a weak site — not full multi-app or e-commerce builds. |
| **Implementation dependencies** | Rapid Delivery offer page; tenant/marketing preview surfaces; revenue templates; quality scoring for pre/post audit (operator-internal). |

---

## 3. Service tiers (three clearly differentiated)

Use this table to route discovery calls. **T1** is the public offer floor. **T2** and **T3** are operator-quoted extensions — not separate public pages today.

### Tier comparison

| | **T1 — Landing Rescue** | **T2 — Brochure Rescue** | **T3 — Bounded Rebuild** |
|--|-------------------------|--------------------------|--------------------------|
| **Best for** | One weak homepage or landing URL | 1–3 page brochure that under-sells the offer | Site so weak that landing-only rescue is insufficient |
| **Starting condition** | Single primary landing / homepage | Existing 1–3 pages OR landing + thin brochure | Replace weak multi-section site with managed landing + up to 3 brochure pages |
| **Recommended band (MUR)** | **45,000** (public floor) | **55,000–75,000** | **75,000–120,000** |
| **ERPNext item** | `CF-RD-LANDING-RESCUE` | Quote as extension of landing item + line note | Quote as extension + written scope appendix |
| **Preview window** | 24–72 h after deposit + assets | 3–5 business days after deposit + assets | 5–7 business days after deposit + assets + URL audit |
| **Production window** | Within 5 business days after written approval | Within 7 business days after written approval | Within 10 business days after written approval |
| **Structured preview rounds** | 2 included | 2 included | 3 included |
| **Pages in scope** | 1 landing | Up to 3 brochure pages + shared enquiry path | 1 hero landing + up to 3 supporting pages |
| **Enquiry capture** | Yes — one primary CTA path | Yes — unified across pages | Yes — unified across pages |

---

### T1 — Landing Rescue (public SKU)

**Deliverables**

1. Operator audit of the starting URL (quality dimensions from `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — internal scores only).
2. Premium landing structure with Hook / Proof / Depth and **one** primary buyer-action CTA.
3. Mobile-ready layout on CorpFlowAI-managed preview surfaces.
4. Enquiry capture wired to the agreed alert or intake path (email / form handoff — not a custom CRM build).
5. Preview URL for structured feedback before production release.
6. Production release on the client’s agreed hostname after written approval and balance payment.
7. Handover note: what was built, how to request changes, maintenance boundary.

**Exclusions**

- Additional pages beyond one landing.
- SEO ranking, traffic, or Core Web Vitals guarantees.
- Custom platform, CMP factory, or multi-tenant builds.
- Complex e-commerce, booking engines, or member portals.
- Unlimited revision rounds (two structured preview rounds included).
- Lead Rescue runtime (separate workstream — quotable as add-on only).
- Domain/DNS cutover unless separately quoted and Anton-gated.
- Stock photography licensing beyond client-supplied or royalty-free operator picks.

**Expected delivery windows**

| Milestone | Window |
|-----------|--------|
| Deposit + assets confirmed | Day 0 |
| First visible preview | **24–72 hours** |
| Client preview feedback | Client-owned; target 48 h per round |
| Production release | **≤ 5 business days** after written approval |
| Optional maintenance quote | After handover |

**Client inputs (required before build)**

| Input | Detail |
|-------|--------|
| Business name + primary contact | For quote and preview access |
| Offer summary + target buyer | Plain language — operator converts to structure |
| Logo + brand colours | Files or links |
| Approved photography or proof points | Or permission to use restrained stock |
| Named approver | Single decision-maker for preview and production |
| Starting URL | If upgrading an existing page |
| Enquiry destination | Email, form recipient, or agreed handoff |

**Acceptance criteria (all must pass)**

1. Preview loads on mobile and desktop without horizontal scroll or broken layout on agreed viewports.
2. Offer is understandable within ~5 seconds: headline states outcome; primary CTA describes buyer intent (not internal process).
3. Exactly **one** primary CTA above the fold; secondary links do not compete with conversion goal.
4. Enquiry path delivers a test submission to the agreed destination (operator verifies once).
5. Client provides **written production approval** (template: `docs/revenue/templates/production-release-approval.md`).
6. Balance invoice cleared before production release (manual bank verification).

---

### T2 — Brochure Rescue

**Deliverables**

Everything in **T1**, plus:

1. Up to **three** brochure pages (e.g. Home, Services, Contact/Enquiry) with consistent navigation and visual system.
2. Shared enquiry path across pages (one primary conversion goal).
3. Lightweight internal linking so buyers can reach depth without losing the CTA.
4. Per-page mobile checks on all in-scope URLs.

**Exclusions**

- More than three brochure pages (quote per extra page).
- Blog, news, or CMS with unlimited editor seats.
- Multi-language sites.
- All T1 exclusions (SEO guarantees, e-commerce, Lead Rescue runtime, etc.).

**Expected delivery windows**

| Milestone | Window |
|-----------|--------|
| First visible preview (core landing + nav shell) | **3–5 business days** |
| Full brochure preview | **≤ 7 business days** after assets |
| Production release | **≤ 7 business days** after written approval |

**Client inputs (additional to T1)**

| Input | Detail |
|-------|--------|
| Page list + priority | Which 1–3 pages matter most |
| Copy per page | Bullet notes acceptable — operator structures |
| Existing site map or menu | If migrating from current site |
| Legal/footer requirements | Company reg, privacy link if required |

**Acceptance criteria (T1 criteria plus)**

1. All in-scope pages share one visual system and one primary enquiry path.
2. Navigation does not trap users without a path back to the primary CTA.
3. Each page passes the same mobile layout check as T1.

---

### T3 — Bounded Rebuild

**Deliverables**

Everything in **T2**, plus:

1. Documented URL audit and recommended information architecture before build.
2. Replacement of the weak site with a **new managed landing + up to three supporting pages** (not a lift-and-shift of broken templates).
3. Redirect or cutover plan documented for agreed URLs (execution of DNS = Anton gate).
4. Three structured preview rounds included.
5. Post-release smoke check on production URLs (operator GET + enquiry test).

**Exclusions**

- Full digital transformation, custom apps, or ERP integrations.
- More than three supporting pages without change order.
- Guaranteed migration of legacy blog archives or hundreds of URLs.
- All T1/T2 exclusions.

**Expected delivery windows**

| Milestone | Window |
|-----------|--------|
| URL audit + IA recommendation | **≤ 3 business days** after deposit |
| First visible preview | **5–7 business days** after audit sign-off |
| Production release | **≤ 10 business days** after written approval |
| DNS cutover (if quoted) | Scheduled separately; Anton-gated |

**Client inputs (additional to T2)**

| Input | Detail |
|-------|--------|
| Full current site URL + admin access if needed | Read-only or export sufficient when possible |
| Must-keep URLs or brand assets | List any non-negotiables |
| Redirect requirements | Old URLs that must not 404 |
| Domain registrar access | Only when production cutover is in scope |

**Acceptance criteria (T2 criteria plus)**

1. Agreed legacy URLs either redirect or are documented as out of scope.
2. Production smoke check: **200** on primary landing and enquiry path on the live hostname.
3. Written cutover checklist completed when DNS is in scope.

---

## 4. Commercial packaging (recommendation → Anton)

| Item | Recommendation |
|------|----------------|
| **Public page price** | Keep **from MUR 45,000** on `/offers/premium-landing-page-rescue` (T1 floor). |
| **T2 band** | **MUR 55,000–75,000** — quote after page count and copy burden confirmed. |
| **T3 band** | **MUR 75,000–120,000** — quote after URL audit; upper bound for complex redirects only. |
| **Deposit** | 50% MUR manual bank transfer (ERPNext) before design/build; balance before production release. |
| **Revision limits** | T1/T2: two structured preview rounds; T3: three; extra rounds quoted. |
| **Add-ons** | Lead Rescue (separate workstream); extra pages; photography sourcing; domain cutover (Anton-gated). |
| **Recurring** | Optional maintenance from existing maintenance template — not included in setup unless quoted. |
| **Pilot / first-client** | Carol hotel-supplies style opportunity may inform demo narrative **without** private client data in repo. |

**Pricing recommendation for Anton:** Affirm **T1 public floor MUR 45,000**. Approve T2/T3 bands for operator quoting; keep T2/T3 off the public offer page until a deliberate packaging decision.

---

## 5. Quotation-ready wording

Copy into `docs/revenue/templates/quote-email.md` placeholders. Replace `{braces}`.

### T1 — Landing Rescue (default public quote)

**Subject:** Quote — Premium Landing Page Rescue · {business name}

**Scope**

> One primary landing page rescue: audit of {starting URL}, premium mobile-ready layout with Hook / Proof / Depth, single primary enquiry CTA, and preview on CorpFlowAI-managed surfaces before production release.

**Deliverables**

> - Operator audit of starting URL (internal quality scorecard)
> - One landing page with clear offer, proof, and buyer-action CTA
> - Mobile-ready preview link within 24–72 hours of deposit clearance and asset receipt
> - Enquiry capture to {enquiry destination}
> - Production release after your written approval and balance payment

**Price**

> - **Project fee:** MUR 45,000
> - **Deposit:** MUR 22,500 (50%) — due before design/build commences
> - **Balance:** MUR 22,500 — due before production release

**Timeline**

> - First preview: **24–72 hours** after deposit clearance and assets received
> - Production: within **five business days** of written approval
> - Two structured preview feedback rounds included

**Boundaries**

> - No guaranteed SEO rankings, traffic, lead volume, or revenue outcomes
> - One landing page only; additional pages require a written change order
> - Lead follow-up automation (Lead Rescue) is a separate engagement if needed
> - Work starts only after manual verification of cleared bank funds

**Offer reference:** https://corpflowai.com/offers/premium-landing-page-rescue

---

### T2 — Brochure Rescue (operator quote extension)

**Scope**

> Brochure rescue: up to **three** pages ({page list}) with shared navigation, one primary enquiry path, and consistent mobile-ready layout on managed preview surfaces.

**Price**

> - **Project fee:** MUR {55,000–75,000 — specify after discovery}
> - **Deposit:** 50% before design/build
> - **Balance:** before production release

**Timeline**

> - First preview: **3–5 business days** after deposit and assets
> - Full brochure preview: **≤ 7 business days**
> - Production: **≤ 7 business days** after written approval

---

### T3 — Bounded Rebuild (operator quote extension)

**Scope**

> Bounded rebuild: URL audit and IA recommendation, replacement landing plus up to three supporting pages, documented redirect/cutover plan for agreed URLs, three preview rounds, production smoke check.

**Price**

> - **Project fee:** MUR {75,000–120,000 — specify after audit}
> - **Deposit:** 50% before audit/build
> - **Balance:** before production release (DNS cutover scheduled separately if quoted)

**Timeline**

> - Audit + IA: **≤ 3 business days**
> - First preview: **5–7 business days** after audit sign-off
> - Production: **≤ 10 business days** after written approval

---

### Optional add-on line (quotation only — separate workstream)

> **Lead Rescue add-on (optional):** Connect enquiry capture to visible follow-up workflow — quoted separately per Lead Rescue product pack; not included in Website Rescue setup fee.

---

## 6. Sellable surface

| Surface | URL | Role |
|---------|-----|------|
| Public offer | `https://corpflowai.com/offers/premium-landing-page-rescue` | Sellable page — Hook/Proof/Depth, before/after, FAQ, discovery CTA (T1) |
| Public demo | `https://corpflowai.com/demo/website-rescue` | Fictional before/after + enquiry practice (noindex) |
| Offer registry | `lib/public/rapid-delivery-offers.js` | Price, deposit, outputs, `demoPath`, `beforeAfter` |
| Operator desk | `/admin/rapid-delivery` | Discovery pipeline + Website Rescue operator-pack links |
| Revenue templates | `docs/revenue/templates/` | Quote, deposit, onboarding, release approval |
| ERPNext item | `CF-RD-LANDING-RESCUE` | T1 quotation line |
| Demonstration record | `docs/marketing/WEBSITE_RESCUE_DEMONSTRATION_PATH_V1.md` | Live GET verification |

**CTA:** Discovery / enquiry intent (discovery form + mailto fallback) — not payment-path language.

**FAQ discipline:** No unsupported SEO, revenue, or Core Web Vitals guarantees.

---

## 7. Demonstration path

See **`docs/marketing/WEBSITE_RESCUE_DEMONSTRATION_PATH_V1.md`** for live GET evidence.

**Demo script (5 minutes)**

1. Open `https://corpflowai.com/offers/premium-landing-page-rescue` — show headline, before/after, from MUR 45,000.
2. Open `https://corpflowai.com/demo/website-rescue` — toggle before/after; show product strip + enquiry form.
3. Explain **Website Rescue** internal name vs **Premium Landing Page Rescue** public SKU (§1).
4. Walk tiers: T1 = public offer; T2/T3 = operator-quoted extensions (pricing guide).
5. Show discovery CTA → quote-ready packet §11 → 50% deposit → assets → 24–72 h preview.
6. Close with acceptance criteria: written production approval + balance before go-live.
7. Optional: mention Lead Rescue add-on without editing #653 files.

---

## 8. Delivery system

Canonical checklist pack: **`docs/operations/WEBSITE_RESCUE_DELIVERY_CHECKLISTS_V1.md`**.

| Checklist | Source / content |
|-----------|------------------|
| Website audit | Checklists §A + `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` |
| Client content/assets | Checklists §B + `docs/revenue/templates/client-onboarding-document-checklist.md` |
| Domain/access | Checklists §C; DNS = Anton W3 |
| Design choices for novices | Checklists §D — 2–3 guided options + recommended path |
| Implementation | Checklists §E |
| Review/revision | Checklists §F; rounds per tier (§3) |
| Acceptance / handover | Checklists §G–H + `production-release-approval.md` |

---

## 9. Remaining Anton approvals

| # | Approval | Unlocks |
|---|----------|---------|
| W1 | Confirm MUR 45k T1 floor + T2/T3 bands | Confident quoting |
| W2 | Public rename to “Website Rescue” (if ever) | New slug, ERPNext item, template sweep |
| W3 | Domain/DNS / production release per client | Live client sites |
| W4 | Payment path changes beyond manual MUR deposit | Checkout |
| W5 | Outreach using this offer | Acquisition |
| W6 | T2/T3 pricing on public offer page | Marketing packaging change |

---

## 10. Quality gate

Hook/Proof/Depth via existing offer page + this pack as validation depth. Dual-asset: offer page → pack/templates.

**Self-score:** 13/14 — docked only for thin published before/after proof assets on corpflowai.com (describe in sales calls; do not invent metrics).

## 11. Explicit non-actions

- No Lead Rescue (#653) product-file changes beyond a demo cross-link to `/lead-rescue`
- No Lux / CIPC / Living Word tenant coupling
- No schema, env, secrets, production deploy, DNS, messaging, payment runtime
- No public rename to “Website Rescue” without W2
- No T2/T3 prices on the public offer page without W6
- No private client data (including Carol opportunity details) in repo artefacts
