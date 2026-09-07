# CorpFlowAI public CTA and intake map

**Status:** Operator verification register · **Updated:** 2026-08-24 (#710 named Website Rescue landing)
**Anchor:** `<!-- CORPFLOWAI_PUBLIC_CTA_INTAKE_MAP_V1 -->`

<!-- CORPFLOWAI_PUBLIC_CTA_INTAKE_MAP_V1 -->

Traces every primary public CTA on priority routes. Qualified market enquiries persist via `POST /api/tenant/intake` (`meta.product = corpflow-rapid-delivery`) into the existing `leads` table. Homepage service paths deep-link to `/contact?path={id}#discovery` (mapped to buyer-need). AI Lead Rescue CTAs deep-link to `/contact?offer=ai-lead-rescue#discovery` (locked product). Operator desk: `/admin/rapid-delivery` (+ cockpit link on `/change/revenue`). **No automated outreach** without separate Anton approval.

---

## Priority routes (P0 slice)

### `/` — homepage

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/` hero | Request a 15-minute Enquiry Recovery Diagnosis | `/enquiry-recovery#diagnosis` | form | `leads` | Reference on screen | Validation / tenant context | `/admin/rapid-delivery` | — | **Working** |
| `/` service path cards | Enquire about this path → | `/contact?path={id}#discovery` | form | `leads` | Reference on screen | Validation | `/admin/rapid-delivery` | — | **Working** |
| `/` offer cards (secondary) | View sprint → | `/offers/{slug}` or `/website-rescue` for Website Rescue | — | — | Offer page loads | — | — | — | **Working** |

### `/offers/*` — rapid delivery sprints

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/offers/{slug}` | Request discovery | `#discovery` form | `POST /api/tenant/intake` | `leads` (`corpflow-rapid-delivery`) | On-screen `CF-…` reference | Validation | `/admin/rapid-delivery` | `revenue_offer_cta_click` | **Working** |
| `/offers/{slug}` | Email fallback | `mailto:support@corpflowai.com` | mail client | Inbox only | Compose opens | No mail client | Manual | — | **Working** |

### `/contact`

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/contact` | Submit enquiry | `POST /api/tenant/intake` | form (`buyer_need` / `?path=` prefill / `?offer=` lock) | `leads` | On-screen reference | Validation | `/admin/rapid-delivery` | — | **Working** |
| `/contact` | Email fallback | `mailto:support@corpflowai.com` | mail client | Inbox only | Compose opens | — | Manual | — | **Working** |
| `/contact?offer=ai-lead-rescue#discovery` | Submit qualified enquiry (locked Lead Rescue) | `POST /api/tenant/intake` | DiscoveryIntakeForm `lockedOffer` | `leads` (`corpflow-rapid-delivery`, `offer_slug=ai-lead-rescue`) | On-screen reference | Validation | `/admin/rapid-delivery` | — | **Canonical Lead Rescue intake** |
| `/contact?offer=website-rescue#discovery` | Submit qualified enquiry (alias → Website Rescue SKU) | `POST /api/tenant/intake` | DiscoveryIntakeForm `lockedOffer` on `premium-landing-page-rescue` | `leads` (`corpflow-rapid-delivery`, `offer_slug=premium-landing-page-rescue`) | On-screen reference | Validation | `/admin/rapid-delivery` | — | **Alias accepted; canonical URL is `/contact?offer=premium-landing-page-rescue#discovery`** |

### `/website-rescue` (specialist — named Website Rescue landing)

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/website-rescue` | Request discovery | `#discovery` form | `POST /api/tenant/intake` | `leads` (`corpflow-rapid-delivery`, SKU `premium-landing-page-rescue`) | On-screen `CF-…` reference | Validation | `/admin/rapid-delivery` | `revenue_offer_cta_click` | **Named buyer path — same SKU as `/offers/premium-landing-page-rescue`** |
| `/website-rescue` | Open the Website Rescue demo | `/demo/website-rescue` | — | — | Fictional before/after | — | — | — | **Recording-ready proof** |

### `/lead-rescue` (specialist — USD wedge; CTA only)

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/lead-rescue` | Start my 48-hour setup | `/contact?offer=ai-lead-rescue#discovery` | canonical form | `leads` (`corpflow-rapid-delivery`) | On-screen reference | Validation | `/admin/rapid-delivery` | `lr_primary_cta_click` | **Canonical enquiry — no embedded form** |

---

## Forbidden public destinations (verified by test)

- No public page should link primary CTAs to `/change`.
- No public page should expose Core admin URLs.

---

## ERPNext-first operator path (manual)

```text
structured form (/contact or /offers/*)
→ CF- reference on screen
→ /admin/rapid-delivery (qualify + proposal summary)
→ discovery call + delivery proof (/offers/*, /standards)
→ quote email only after Anton approval
→ deposit → verify → deliver → ERPNext invoice
```

Authoritative records: **ERPNext**. CorpFlowAI holds public capture + operator desk (`/admin/rapid-delivery`, `/change/revenue`).
