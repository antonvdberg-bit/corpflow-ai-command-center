# CorpFlowAI 30-Day Commercial Launch Campaign — Dashboard

**Status:** DRAFT ONLY — NO IMPLEMENTATION AUTHORIZED · **Owner:** Anton  
**Workstream:** Stream E · **Branch:** `docs/corpflowai-launch-campaign`  
**Created:** 2026-07-14

---

## Campaign purpose

Launch a **30-day, manual, warm-network-first** commercial campaign for CorpFlowAI rapid-delivery sprints in Mauritius — driving qualified discovery submissions on `https://corpflowai.com` without mass outreach, automation, or scraping.

**Month-end revenue target (operator):** MUR 150,000–200,000 collected or contracted with deposit verified — per `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md`.

---

## Canonical sources (do not contradict)

| Source | Use |
| ------ | --- |
| `lib/public/rapid-delivery-offers.js` | Three MUR sprint offers, prices, outcomes |
| `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md` | Sales flow, deposit rules, ERPNext-first |
| `docs/revenue/CORPFLOWAI_GTM_SELLABLE_PATH.md` | Prospect → CF-… → desk → ERPNext path |
| `docs/revenue/CORPFLOWAI_PUBLIC_CTA_AND_INTAKE_MAP.md` | CTA destinations and intake persistence |
| `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` | Hook / Proof / Depth, CTA rules |
| `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` | No generic AI / chatbot positioning |

**USD 150 wedge:** `/lead-rescue` → `/admin/lead-rescue` — separate path; mention only when buyer fits the warm-network pilot profile. Primary campaign CTAs point to **MUR sprints** on `/offers/*`.

---

## Artifact index

| # | File | Purpose |
| - | ---- | ------- |
| 00 | [00-CAMPAIGN-DASHBOARD.md](./00-CAMPAIGN-DASHBOARD.md) | This dashboard |
| 01 | [01-AUDIENCE-AND-POSITIONING.md](./01-AUDIENCE-AND-POSITIONING.md) | Who we speak to and how we position |
| 02 | [02-OFFER-MESSAGE-MATRIX.md](./02-OFFER-MESSAGE-MATRIX.md) | Pain → offer → message mapping |
| 03 | [03-30-DAY-CONTENT-CALENDAR.md](./03-30-DAY-CONTENT-CALENDAR.md) | Day-by-day publish + outreach plan |
| 04 | [04-LINKEDIN-POSTS.md](./04-LINKEDIN-POSTS.md) | LinkedIn post drafts |
| 05 | [05-FACEBOOK-POSTS.md](./05-FACEBOOK-POSTS.md) | Facebook post drafts |
| 06 | [06-INSTAGRAM-POSTS.md](./06-INSTAGRAM-POSTS.md) | Instagram post drafts |
| 07 | [07-YOUTUBE-METADATA.md](./07-YOUTUBE-METADATA.md) | Video titles, descriptions, tags |
| 08 | [08-EMAIL-OUTREACH-DRAFTS.md](./08-EMAIL-OUTREACH-DRAFTS.md) | Warm email templates |
| 09 | [09-WHATSAPP-OUTREACH-DRAFTS.md](./09-WHATSAPP-OUTREACH-DRAFTS.md) | Warm WhatsApp templates |
| 10 | [10-REFERRAL-PARTNER-DRAFTS.md](./10-REFERRAL-PARTNER-DRAFTS.md) | Referral / introducer messages |
| 11 | [11-PROSPECT-RESEARCH-TEMPLATE.md](./11-PROSPECT-RESEARCH-TEMPLATE.md) | Pre-outreach research checklist |
| 12 | [12-MANUAL-OUTREACH-RUNBOOK.md](./12-MANUAL-OUTREACH-RUNBOOK.md) | Step-by-step operator runbook |
| 13 | [13-RESPONSE-AND-FOLLOW-UP-GUIDE.md](./13-RESPONSE-AND-FOLLOW-UP-GUIDE.md) | Replies, objections, follow-up |
| 14 | [14-LAUNCH-METRICS.md](./14-LAUNCH-METRICS.md) | Weekly manual metrics sheet |
| 15 | [15-ANTON-LAUNCH-APPROVAL.md](./15-ANTON-LAUNCH-APPROVAL.md) | Anton sign-off checklist |

---

## Revenue programme flow (conceptual)

Campaign content always routes to the **public sellable path** documented in `docs/revenue/CORPFLOWAI_GTM_SELLABLE_PATH.md`:

```text
Social / email / WhatsApp / referral intro (manual, Anton-approved)
  → https://corpflowai.com/ or /offers/{slug} or /contact#discovery
  → Prospect submits DiscoveryIntakeForm
  → On-screen CF-… reference
  → Row in leads (product = corpflow-rapid-delivery)
  → Operator desk: /admin/rapid-delivery (+ /change/revenue checklist)
  → 15-min discovery call → written quote (Anton-approved send)
  → 50% MUR deposit → manual POP + bank verification
  → ERPNext invoice / project record (authoritative commercial state)
  → Approval to proceed → 24–72h visible delivery → preview → production release
```

The **revenue programme path** on `/change/revenue` is the operator cockpit link — not a public CTA. Prospects never receive `/change` URLs.

---

## Campaign rules (non-negotiable)

| Rule | Detail |
| ---- | ------ |
| No mass outreach | One-to-one warm contacts only |
| No auto send | Anton sends every external message |
| No scraping | No cold lists, no false personalisation |
| No publish without approval | All drafts in this pack require Anton sign-off in `15-ANTON-LAUNCH-APPROVAL.md` |
| No revenue guarantees | Structural proof only (24–72h visible output, 50% deposit, bounded scope) |
| No generic AI framing | Outcomes and accountable workflows — not "AI transformation" |

---

## Week-at-a-glance

| Week | Theme | Primary actions |
| ---- | ----- | --------------- |
| 1 (Days 1–7) | **Credibility + problem awareness** | Profile completion, 3 social posts, 5 warm outreach drafts sent (approved), offer page traffic |
| 2 (Days 8–14) | **Offer clarity + proof depth** | Lead Rescue focus, 1 short video metadata live, 5 more warm touches, first discovery calls |
| 3 (Days 15–21) | **Landing + recovery angles** | Rotate offers by niche, referral partner intro, follow-up pass on Week 1–2 |
| 4 (Days 22–30) | **Close + learn** | Quote/deposit push on warm leads, metrics review, case for Month 2 |

Track detail in [03-30-DAY-CONTENT-CALENDAR.md](./03-30-DAY-CONTENT-CALENDAR.md) and [14-LAUNCH-METRICS.md](./14-LAUNCH-METRICS.md).

---

## Quick links (production)

| Surface | URL |
| ------- | --- |
| Homepage | https://corpflowai.com/ |
| AI Lead Rescue Sprint | https://corpflowai.com/offers/ai-lead-rescue |
| Premium Landing Page Rescue | https://corpflowai.com/offers/premium-landing-page-rescue |
| Customer Recovery Sprint | https://corpflowai.com/offers/customer-reputation-recovery |
| Discovery contact | https://corpflowai.com/contact#discovery |
| USD wedge (secondary) | https://corpflowai.com/lead-rescue |
| Operator desk | `/admin/rapid-delivery` (not public) |

---

## Current status (operator fills in)

| Item | Status | Date |
| ---- | ------ | ---- |
| Campaign pack reviewed | ☐ Pending | |
| Anton approval (`15-ANTON-LAUNCH-APPROVAL.md`) | ☐ Pending | |
| LinkedIn profile updated | ☐ Pending | |
| Facebook page ready | ☐ Pending | |
| Instagram profile ready | ☐ Pending | |
| YouTube channel / first video | ☐ Pending | |
| Day 1 content published | ☐ Pending | |
| First warm outreach sent | ☐ Pending | |
