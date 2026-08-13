# CorpFlowAI public market route register

**Status:** Operator inventory · **Updated:** 2026-08-13 (#822)
**Anchor:** `<!-- CORPFLOWAI_PUBLIC_MARKET_ROUTE_REGISTER_V1 -->`

<!-- CORPFLOWAI_PUBLIC_MARKET_ROUTE_REGISTER_V1 -->

Physical register of routes an unauthenticated prospect could reach on **`corpflowai.com`** / apex marketing hosts. Lux (`lux.corpflowai.com`), Core (`core.corpflowai.com`), and tenant client apps are out of scope for this alignment pass.

---

## Priority aligned in PR (P0 slice)

| Route | Purpose | Target buyer | Status | Visual family | Primary CTA | CTA destination | Mobile | Trust | Analytics | Launch decision | Required action |
| ----- | ------- | ------------ | ------ | ------------- | ----------- | --------------- | ------ | ----- | --------- | --------------- | --------------- |
| `/` | Market entrance — managed workflow proposition + three service paths + proof/trust + optional sprints | Owner/management-led SMB | **Aligned (#699)** | CorpFlow public photo shell | Request a qualified conversation | `/contact#discovery` | Header menu + responsive grid | Trust/safety section + footer privacy/terms | Plausible when configured | **KEEP_AND_ALIGN** | Live verify after merge |
| `/offers/ai-lead-rescue` | Lead rescue sprint offer | Multi-channel enquiry pain | **Aligned** | Photo + glass + shared header | Request Discovery Call | `mailto:support@corpflowai.com` | Glass stack + shared nav | FAQ + not-included + footer | Event `revenue_offer_cta_click` | **KEEP_AND_ALIGN** | Live verify |
| `/offers/premium-landing-page-rescue` | Landing page rescue | Weak conversion page | **Aligned** | Photo + glass + shared header | Request Discovery Call | mailto | Same | Same | Same | **KEEP_AND_ALIGN** | Live verify |
| `/offers/customer-reputation-recovery` | Recovery sprint | Reviews/complaints spike | **Aligned** | Photo + glass + shared header | Request Discovery Call | mailto | Same | Same | Same | **KEEP_AND_ALIGN** | Live verify |
| `/contact` | Qualified enquiry intake — **single public form** | Pre-sale enquiries | **Aligned (#699 / #822)** | Photo shell + discovery form | Submit enquiry | `POST /api/tenant/intake` | Menu + form | Consent + no auto-send copy | — | **KEEP_AND_ALIGN** | Live verify |
| `/contact?offer=ai-lead-rescue#discovery` | Canonical Lead Rescue enquiry (locked product) | Warm-network / Lead Rescue CTAs | **Aligned (#822)** | Same form, locked offer | Submit qualified enquiry | `POST /api/tenant/intake` with `offer_slug=ai-lead-rescue` | Same | Same | — | **KEEP_AND_ALIGN** | Surviving Lead Rescue CTA URL |
| `/privacy` | Privacy policy | All visitors | Existing | PublicPolicyLayout + shared header | — | — | Menu | Linked from footer | — | **KEEP_AND_ALIGN** | Periodic legal review |
| `/terms` | Terms | All visitors | Existing | PublicPolicyLayout + shared header | — | — | Menu | Linked from footer | — | **KEEP_AND_ALIGN** | Periodic legal review |

---

## Secondary public routes (recorded — next PR or nav-only)

| Route | Purpose | Target buyer | Status | Visual family | Primary CTA | CTA destination | Mobile | Trust | Analytics | Launch decision | Required action |
| ----- | ------- | ------------ | ------ | ------------- | ----------- | --------------- | ------ | ----- | --------- | --------------- | --------------- |
| `/lead-rescue` | USD 150 launch pilot (legacy wedge) | Warm-network pilot buyers | Specialist | Photo + glass (AiLeadRescueLanding) | Start my 48-hour setup | `/contact?offer=ai-lead-rescue#discovery` | CTA only — no embedded form | Strong trust copy | CTA click events | **KEEP_AS_SPECIALIST_LANDING** | Canonical enquiry is `/contact?offer=ai-lead-rescue#discovery` |
| `/lead-rescue/property-mauritius` | Property vertical pilot | Mauritius property operators | Specialist | Photo + glass | Intake | `POST /api/tenant/intake` | Same family | Same | Same | **KEEP_AS_SPECIALIST_LANDING** | Connect nav/footer to public family |
| `/about` | Company trust architecture | Evaluating buyers | Editorial | PublicPolicyLayout | Process link | `/process` | Menu | Standards cross-links | — | **KEEP_AND_ALIGN** | Shared header applied |
| `/process` | Engagement process | Evaluating buyers | Editorial | PublicPolicyLayout | Lead rescue | `/lead-rescue` | Menu | — | — | **KEEP_AND_ALIGN** | — |
| `/standards` | Operational standards | Evaluating buyers | Editorial | PublicPolicyLayout | Start intake | `/lead-rescue` | Menu | Delivery reality language | — | **KEEP_AND_ALIGN** | — |
| `/onboarding` | Onboarding journey | Signed clients | Editorial | PublicPolicyLayout | Contact | `/contact` | Menu | — | — | **KEEP_AND_ALIGN** | — |
| `/services` | Service catalogue | General | Editorial | PublicPolicyLayout | Contact | `/contact` | Menu | — | — | **REMOVE_FROM_NAVIGATION** | Consider redirect to `/`#offers |
| `/product-a/us-clinics` | Product A vertical experiment | US clinics | Specialist glass | ProductA landing | Intake | `POST /api/product-a/intake` | — | — | — | **REQUIRES_ANTON_DECISION** | Keep or NOINDEX |
| `/product-a/mauritius` | Product A Mauritius property | Property ops | Specialist glass | ProductA landing | Intake | `POST /api/product-a/intake` | — | — | — | **REQUIRES_ANTON_DECISION** | Keep or NOINDEX |
| `/france` | Legacy campaign | France prospects | Legacy inline | Form | Submit | `POST /api/tenant/leads` | Unknown | Weak | — | **NOINDEX** | Redirect or archive |
| `/concierge` | Lux concierge (wrong host on apex) | Lux buyers | Lux tenant | Lux brand | — | — | — | — | — | **NOINDEX** on apex | Host routing only on lux.corpflowai.com |
| `/demo/website-rescue` | Fictional Website Rescue before/after demo (#654) | Sales walkthrough / discovery prospects | Demo | Specialist glass + demo ribbon | Request discovery | `#demo-enquiry` → offer intake | Toggle + form | noindex banner | — | **NOINDEX** | Keep out of main nav; link from offer page only |
| `/change/revenue` | Operator revenue cockpit | Anton/operators | Operator | Standalone dark UI | — | — | — | noindex | — | **NOINDEX** | Never in public nav |
| `/change`, `/change/*` | Change console | Operators/clients | Private | CMP console | — | — | — | — | — | **NOINDEX** | Must not link from public pages |

---

## Sitemap

`/offers/*` added to `APEX_PATHS` in `pages/sitemap.xml.js` as part of this slice.
