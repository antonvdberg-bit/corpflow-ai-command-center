# C05 — Offer Cards Template Spec

**Asset ID:** C05 · **Platform:** Social feed, stories, site embeds  
**Dimensions:** 1080 × 1080 px (1:1) — one card per offer

---

## Purpose

Three standalone offer cards aligned to `lib/public/rapid-delivery-offers.js`.

---

## Card structure (repeat per offer)

| Zone | Content |
|------|---------|
| Top badge | Sprint name (canonical title from offers.js) |
| Headline | Offer `headline` field (max 3 lines) |
| Outcome | One-line `outcome` trim (≤ 120 chars) |
| Price row | "From MUR X" + "50% deposit" badge |
| Footer CTA | "Request discovery" + path slug |

---

## Offer variants

### C05a — AI Lead Rescue Sprint

| Field | Value |
|-------|-------|
| Title | AI Lead Rescue Sprint |
| Headline | Stop losing enquiries because follow-up is slow, scattered, or invisible. |
| Price | From MUR 35,000 |
| URL | `/offers/ai-lead-rescue` |

### C05b — Premium Landing Page Rescue

| Field | Value |
|-------|-------|
| Title | Premium Landing Page Rescue |
| Headline | Turn a weak landing page into a credible enquiry path — fast. |
| Price | From MUR 45,000 |
| URL | `/offers/premium-landing-page-rescue` |

### C05c — Customer Recovery & Reputation Management Sprint

| Field | Value |
|-------|-------|
| Title | Customer Recovery & Reputation Management Sprint |
| Headline | Respond to complaints and review damage with a visible recovery plan — not panic posts. |
| Price | From MUR 45,000 |
| URL | `/offers/customer-reputation-recovery` |

---

## Visual spec

| Element | Value |
|---------|-------|
| Background | `#06111f` + optional `heroBase` photography at 20% opacity |
| Glass panel | Centre 85% width · `rgba(6, 17, 31, 0.72)` blur |
| Title badge | `#2dd4bf` text on dark pill |
| Headline | Inter Bold 40px `#eef6ff` |
| Price | Inter Bold 32px `#2dd4bf` |
| Deposit note | Inter Regular 18px `#7dd3fc` |

---

## Export

PNG · 1080×1080 · also export 1080×1920 story crop per offer

---

## Forbidden

"Automation Starter" or any offer not in `RAPID_DELIVERY_OFFER_SLUGS`
