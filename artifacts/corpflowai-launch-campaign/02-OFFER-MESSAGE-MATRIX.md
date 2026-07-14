# Offer Message Matrix

**Status:** DRAFT ONLY · **Source of truth:** `lib/public/rapid-delivery-offers.js` + `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md`

---

## Three MUR sprints (primary campaign offers)

| Offer | Slug | Starting price | Deposit (50%) | Primary CTA URL |
| ----- | ---- | -------------- | ------------- | --------------- |
| AI Lead Rescue Sprint | `ai-lead-rescue` | MUR 35,000 | MUR 17,500 | https://corpflowai.com/offers/ai-lead-rescue |
| Premium Landing Page Rescue | `premium-landing-page-rescue` | MUR 45,000 | MUR 22,500 | https://corpflowai.com/offers/premium-landing-page-rescue |
| Customer Recovery & Reputation Sprint | `customer-reputation-recovery` | MUR 45,000 | MUR 22,500 | https://corpflowai.com/offers/customer-reputation-recovery |

**Universal terms:**

- 50% deposit in MUR via manual bank transfer (ERPNext invoice) before work starts
- First visible output within 24–72 hours after deposit clearance + access/assets
- Full sprint handover typically within five business days
- Mauritius sprint clients pay in MUR — USD banking for this path is not yet available
- No revenue guarantees

**Fallback CTA:** https://corpflowai.com/contact#discovery (general discovery)

---

## USD 150 wedge (secondary — use carefully)

| Offer | URL | When to mention |
| ----- | --- | --------------- |
| AI Lead Rescue launch pilot | https://corpflowai.com/lead-rescue | Warm-network buyer who fits first-paid-pilot profile (USD 150, 48h setup, 7-day monitoring) — per `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` |

**Campaign default:** Lead with **MUR sprints**. Mention USD wedge only when:

- Buyer explicitly wants lowest entry point
- Warm referral from network already familiar with Lead Rescue pilot
- Buyer is property/real-estate operator in pre-proof window

**Do not** mix MUR sprint pricing and USD pilot pricing in the same message without clarifying they are separate paths.

---

## Pain → offer mapping

| Buyer pain (their words) | Best offer | Headline to use |
| ------------------------ | ---------- | --------------- |
| "Messages get buried in WhatsApp / we reply too late" | AI Lead Rescue | Stop losing enquiries because follow-up is slow, scattered, or invisible |
| "Leads come from Facebook, email, and the site — nothing connects" | AI Lead Rescue | Every enquiry captured, alerted, and tracked in one workflow |
| "Our website looks outdated / people don't understand what we do" | Premium Landing Page Rescue | Turn a weak landing page into a credible enquiry path — fast |
| "We're losing jobs because the site has no clear next step" | Premium Landing Page Rescue | A polished, mobile-ready page that routes buyer intent into a working enquiry path |
| "Bad Google reviews / complaints stacking up" | Customer Recovery Sprint | Respond to complaints and review damage with a visible recovery plan |
| "Customer issues live in DMs and nobody owns responses" | Customer Recovery Sprint | Structured recovery responses, escalation paths, and monitoring |

---

## Sector → offer mapping

| Sector | Lead offer | Secondary offer |
| ------ | ---------- | --------------- |
| Property / hospitality | AI Lead Rescue | Landing Page Rescue |
| Professional services | AI Lead Rescue | Landing Page Rescue |
| Trades / home services | AI Lead Rescue | — |
| Clinics / wellness | AI Lead Rescue | — |
| F&B / retail (enquiry-heavy) | AI Lead Rescue | Customer Recovery (if review pain) |
| Any (reputation crisis) | Customer Recovery Sprint | — |
| Any (site is the bottleneck) | Landing Page Rescue | AI Lead Rescue |

---

## Message matrix by funnel stage

### Awareness (social posts, top-of-funnel)

| Element | Content |
| ------- | ------- |
| Hook | One Mauritius-relatable pain moment ("Monday morning: 14 WhatsApp enquiries, 3 replied") |
| Proof | Structural — 24–72h visible output, MUR pricing, bounded scope |
| Depth | Link to specific offer page |
| CTA | "See how the sprint works" → `/offers/{slug}` |

### Consideration (email, WhatsApp, referral intro)

| Element | Content |
| ------- | ------- |
| Hook | Reference their stated pain or your shared connection |
| Proof | Offer page + `/standards` + `/process` links |
| Depth | One delivered output bullet from offer definition |
| CTA | "Request discovery on the offer page" or `/contact#discovery` |

### Decision (post-discovery, quote stage)

| Element | Content |
| ------- | ------- |
| Hook | Restate their "success in 72 hours" language from call |
| Proof | Written quote tied to sprint deliverables |
| Depth | Deposit amount, bank instructions, timeline |
| CTA | Reply to approve quote + deposit |

---

## CTA copy library (buyer-action oriented)

Use these on campaign content — not internal process language.

| Context | Approved primary CTA |
| ------- | -------------------- |
| Lead loss pain | Request a discovery call about Lead Rescue → `/offers/ai-lead-rescue#discovery` |
| Website pain | See the Landing Page Rescue sprint → `/offers/premium-landing-page-rescue` |
| Reputation pain | View the Recovery sprint → `/offers/customer-reputation-recovery` |
| General / unsure | Book a discovery conversation → `/contact#discovery` |
| Homepage | View delivery sprints → `https://corpflowai.com/#offers` |

**Forbidden CTAs:** "Choose payment path", "Submit for AI analysis", "Get your free chatbot", "Transform your business with AI".

---

## Objection → message response (short)

| Objection | Response frame |
| --------- | -------------- |
| "Too expensive" | Compare to cost of one lost job / one bad review week; deposit is 50%; bounded scope |
| "We already have a CRM" | Sprint connects one source + visible follow-up — not replacing your CRM |
| "Can you guarantee more leads?" | No revenue guarantees; we guarantee visible workflow output in 72h |
| "We need the full website rebuilt" | Landing Page Rescue is one credible enquiry path this week — not a 6-month project |
| "What about ongoing support?" | Optional maintenance quoted separately after handover |

Full scripts: `13-RESPONSE-AND-FOLLOW-UP-GUIDE.md` and `docs/revenue/templates/`.
