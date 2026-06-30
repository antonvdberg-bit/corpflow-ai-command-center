# Product A — Mauritius property offer (v1)

**Status:** Commercial / doctrine reconciliation packet — **docs only**. Reconciles Mauritius Product A as the **premium tier** above the AI Lead Rescue USD 150 wedge for the **property / real-estate** vertical. **No runtime, no deploy, no API route, no env, no automated outreach.**

**Owner:** Anton (operator) — offer framing, pricing after intake, outreach routing.

**Decision:** Anton (2026-06-30) — new Mauritius variant page alongside the US page (`/product-a/mauritius` planned); US `/product-a/us-clinics` untouched; Product A positioned as premium tier above the Lead Rescue pilot for property buyers who need website + enquiry operations, not follow-up alone.

**Anchor sentinel:** `<!-- PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1 -->`

<!-- PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1 -->

**Runtime gate:** A separate implementation PR may ship `/product-a/mauritius` **only after** this packet and the doctrine / launch-pack updates in the same docs PR are merged. This doc does **not** authorize n8n changes, ERPNext schema changes, or payment integration.

---

## 1. Purpose

Define how **Product A** exists in Mauritius **without** breaking the First-Paid-Pilots single-offer discipline on Lead Rescue surfaces.

CorpFlowAI sells two **separate** buyer journeys in Mauritius property — each page obeys **single-offer on its own URL**:

| Tier | Surface | Buyer problem | Public offer |
| ---- | ------- | ------------- | ------------ |
| **Wedge** | `/lead-rescue`, `/lead-rescue/property-mauritius` | Enquiries slip across WhatsApp, Facebook, listings, email — site exists but follow-up is memory-based | **AI Lead Rescue Setup — USD 150 launch pilot** (48-hour setup, 7-day monitoring, invoiced after intake review) |
| **Premium** | `/product-a/mauritius` *(planned)* | Website is weak or fragmented **and** multi-channel property enquiries need a managed operating workflow | **Request a Website & Lead Rescue Audit** — Mauritius property edition (scope + quote after intake review; no card on page) |

The wedge proves delivery and trust. Product A is the **graduation path** for agencies that need website rebuild/migration plus enquiry capture hardening — not a second menu on the pilot page.

---

## 2. Who (Mauritius property)

Adapted from Product A US positioning (`docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` § 2) for Mauritius property:

- Rental and sales agencies, independent agents, and small property operators (1–20 staff).
- Enquiries arrive via **Property24, Facebook, WhatsApp, website forms, email, walk-ins** — at least two channels in active use.
- Owner or operations lead can approve scope after an audit intake (no enterprise procurement cycle).
- **Website pain is real** — outdated site, no clear enquiry path, or listings traffic does not convert to logged follow-up.

**Route to the wedge instead** when the buyer already has an acceptable website and only needs follow-up visibility (see § 6).

---

## 3. What (buyer-facing)

| Element | Mauritius property definition |
| ------- | ------------------------------ |
| **What** | AI-ready website rebuild or migration + enquiry capture hardening + Lead Rescue operating workflow (human operator, not a chatbot pitch). |
| **Primary CTA** | **Request a Website & Lead Rescue Audit** |
| **Outcome promise (allowed)** | Property enquiries become visible, captured, and followed up — with a site that supports the workflow. |
| **Outcome promise (forbidden)** | Guaranteed sales, guaranteed lead volume, “never miss a viewing again” (unqualified), fully automated sales machine. See `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`. |

Product A remains **above-the-line**: managed workflow + website delivery for a vertical, not a generic AI wrapper (`docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`).

---

## 4. Single-offer rule (this page only)

On `/product-a/mauritius`, the public page advertises **one** offer: the **Website & Lead Rescue Audit** intake path for Mauritius property.

- **No** USD 150 pilot price as the primary hero offer on this page.
- **No** monthly monitoring figure on the public page.
- **No** buyer-selected payment route, region, or currency menu.
- Scope, timeline, and invoice amount are **operator decisions** communicated after intake review — same posture as US Product A (`/product-a/us-clinics`).

The page **may** include one short “lighter entry path” line pointing qualified buyers who only need follow-up to `/lead-rescue/property-mauritius`. That line must **not** compete with the primary CTA (audit request).

---

## 5. Pricing and payment posture

| Topic | Rule |
| ----- | ---- |
| **Public page** | No fixed project price, no MUR/USD figure in the hero. Audit request only. |
| **After intake** | Operator reviews scope; quote and manual pro-forma follow `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` and ERPNext/finance canon when applicable. |
| **Payment** | Manual proof-of-payment (POP) verification before work starts — no card collection on the page; no implied online checkout. |
| **Pilot wedge** | USD 150 Lead Rescue pricing is **unchanged** and lives only on Lead Rescue surfaces (`docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`). |

Operator sets premium-tier project pricing case by case after audit. Document the agreed figure on the invoice and in ERPNext — not on the marketing page.

---

## 6. Routing — wedge vs premium (operator)

Use this in discovery and warm outreach **before** sending a link:

| Signal | Send |
| ------ | ---- |
| “We have a website; enquiries just get lost in WhatsApp / Facebook” | `/lead-rescue/property-mauritius` (USD 150 wedge) |
| “Our website doesn’t represent us / no clear enquiry path / we’re on listings only” | `/product-a/mauritius` (premium audit) |
| “We need a chatbot / AI agent / guaranteed more leads” | Decline — not the offer (`docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 9) |
| Unsure | Start with wedge conversation; upgrade to Product A only if website scope is clearly required |

**Warm-network default during the first 1–4 paid pilots:** Lead Rescue wedge unless the buyer **explicitly** needs website rebuild scope. Product A is not a substitute pilot price — it is a separate engagement.

---

## 7. Planned runtime shape (implementation PR — not this doc)

When authorized in a follow-up PR:

| Piece | Planned behaviour |
| ----- | ----------------- |
| **Route** | `pages/product-a/mauritius.js` → Mauritius property landing component |
| **Visual** | Human-First Beauty Layer (`PublicMarketingPhotoGlassShell`); US page untouched |
| **Intake** | `POST /api/product-a/intake` extended or sibling handler with `intake.product_a.mauritius.v1`, Mauritius location field (not US `city_state`), `page: /product-a/mauritius` |
| **US page** | `/product-a/us-clinics` and `intake.product_a.us_clinic.v1` unchanged |

Security-sensitive intake changes require `docs/operations/SECURITY_REVIEW_CHECKLIST.md` on the implementation PR.

---

## 8. What NOT to do yet

Until the first Lead Rescue property pilots are running cleanly (see `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 1):

- Do **not** lead warm outreach with Product A when the wedge would fit.
- Do **not** run paid ads to Product A Mauritius.
- Do **not** publish a fixed public price on the premium page.
- Do **not** merge the two funnels into one page or one intake form.

---

## 9. Cross-references

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — § *Mauritius property commercial tier ladder*
- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — § *Mauritius tier ladder*
- `docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` — US Product A canon (offer shape)
- `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` — manual POP + ERPNext sequencing
- `components/AiLeadRescuePropertyMauritiusLanding.js` — wedge page (property Lead Rescue)
- `components/ProductAUsClinicLanding.js` — US premium reference implementation (beauty layer)
