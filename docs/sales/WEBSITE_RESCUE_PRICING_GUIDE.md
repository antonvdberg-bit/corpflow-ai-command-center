# Website Rescue — Pricing Guide (operator-side)

**Audience:** the operator quoting Website Rescue / Premium Landing Page Rescue.
**Status:** Operator-side reference for GitHub **#654**. Docs-only — no runtime, no env vars, no schema changes.
**Parent pack:** `docs/marketing/WEBSITE_RESCUE_PRODUCT_PACK_V1.md`
**Quote packet:** `docs/marketing/WEBSITE_RESCUE_QUOTE_READY_PACKET_V1.md`
**Anchor sentinel:** `<!-- WEBSITE_RESCUE_PRICING_GUIDE_V1 -->`

<!-- WEBSITE_RESCUE_PRICING_GUIDE_V1 -->

## What this doc is for

The **public** page (`/offers/premium-landing-page-rescue`) advertises **one floor price**: *from MUR 45,000* for **Premium Landing Page Rescue** (Website Rescue **T1**). That public-page rule follows `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` (single primary offer on the page; complexity after intent).

This guide tells the operator:

- How to quote T1 / T2 / T3 bands.
- What is included and excluded at each band.
- When to upsell brochure/rebuild vs keep T1.
- When to offer Lead Rescue as an add-on (separate workstream).
- How to handle price objections without inventing guarantees.

**Anton gate:** Final pricing approval is **W1**. Until confirmed, treat T2/T3 edges as recommendations.

---

## 1. Headline pricing

| Tier | Public name | Recommended fee (MUR) | Deposit | Balance |
|------|-------------|----------------------|---------|---------|
| **T1** | Premium Landing Page Rescue | **45,000** (public floor) | 22,500 (50%) | 22,500 before production |
| **T2** | Brochure Rescue (operator quote) | **55,000–75,000** | 50% | Before production |
| **T3** | Bounded Rebuild (operator quote) | **75,000–120,000** | 50% | Before production |
| Maintenance | Optional | Per maintenance template | Monthly after handover | — |
| Lead Rescue add-on | Separate SKU | Per Lead Rescue pricing guide | Separate | Separate |

**ERPNext (T1):** item `CF-RD-LANDING-RESCUE` @ MUR 45,000.

**Do not** put T2/T3 rupee figures on the public offer page until Anton **W6**.

---

## 2. Cost / margin assumptions (internal — not for buyers)

| Assumption | Guidance |
|------------|----------|
| Operator hours T1 | ~8–16 h including audit, build, two rounds, release |
| Operator hours T2 | ~16–28 h |
| Operator hours T3 | ~28–45 h including audit/IA |
| Preview hosting | Existing CorpFlowAI-managed surfaces — no new infra in quote |
| Stock / tools | Prefer client assets; royalty-free only; paid stock/plugins billed separately |
| Target contribution | Keep setup fee above internal hours × operator rate; do not discount below T1 floor without Anton |

These are planning assumptions for Anton’s W1 review — not published SLAs.

---

## 3. Revision limits

| Tier | Structured preview rounds included | Extra round |
|------|-------------------------------------|-------------|
| T1 | 2 | Quote MUR 3,000–5,000 or roll into change order |
| T2 | 2 | Same |
| T3 | 3 | Same |

A “round” = one consolidated written feedback batch from the named approver, not unlimited chat tweaks.

---

## 4. When to quote which tier

| Buyer signal | Quote |
|--------------|-------|
| “Fix my homepage / landing” | **T1** |
| “We need Home + Services + Contact” | **T2** |
| “The whole site is embarrassing / broken” | **T3** after URL audit |
| “Leads go nowhere after the form” | Website Rescue **plus** Lead Rescue add-on (separate quote) |
| “Full e-commerce / booking engine” | **Out of scope** — custom programme, not this product |

---

## 5. Add-ons

| Add-on | How to quote |
|--------|--------------|
| Extra brochure page beyond tier | MUR 8,000–12,000 per page (recommend after discovery) |
| Photography sourcing | Time-and-materials or fixed day rate — written |
| Domain / DNS cutover | Separate line; **Anton W3** before execution |
| Lead Rescue | Separate product pack — never bundle silently into Website Rescue fee |
| Maintenance | After handover using `docs/revenue/templates/maintenance-offer.md` |

---

## 6. Pilot / first-client structure

For first practical opportunities (including hotel-supplies–style enquiries):

- Prefer **T1** unless page count clearly requires T2.
- Use the **fictional demo** (`/demo/website-rescue`) — never paste private client details into the repo, PR, or public page.
- May offer one structured extra preview round as a pilot courtesy **only** if Anton agrees on that specific deal — do not advertise a standing discount.
- Keep deposit at 50%; do not start build on verbal promise alone.

---

## 7. Objection handling (no guarantees)

| Objection | Operator response |
|-----------|-------------------|
| “Will I rank #1 on Google?” | “We do not sell SEO rankings. We deliver a clearer, mobile-ready enquiry path. SEO can be a later conversation.” |
| “Can you guarantee more sales?” | “No. We improve credibility and enquiry capture; results still depend on your offer and follow-up.” |
| “I don’t know what I want the site to look like.” | “You won’t write a brief from scratch. We’ll show 2–3 guided options and a recommended path, then lock scope.” |
| “Can we skip the deposit?” | “No — deposit starts the build clock after manual bank verification.” |
| “Just rebuild everything.” | “If the whole site is weak we quote T3 after a short URL audit — still bounded pages, not an open-ended rebuild.” |
| “Also fix follow-up on WhatsApp.” | “That’s Lead Rescue — separate quote so scope and accountability stay clear.” |

---

## 8. Payment / deposit wording (reuse)

From revenue templates — keep consistent:

- Deposit: **50% MUR** via manual bank transfer (ERPNext invoice) before design/build.
- Balance: before production release.
- Work starts only after **manual verification of cleared bank funds**.
- No card checkout on the public offer page in this phase.

---

## 9. Remaining Anton approvals (pricing-related)

| ID | Decision |
|----|----------|
| W1 | Affirm T1 floor + T2/T3 bands |
| W4 | Any payment path beyond manual MUR deposit |
| W6 | Publishing T2/T3 prices on the public offer page |

See full W1–W6 list in the product pack §9.
