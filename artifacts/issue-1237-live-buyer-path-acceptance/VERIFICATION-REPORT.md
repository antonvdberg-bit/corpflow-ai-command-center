# #1237 live buyer-path acceptance — current main `eb31cfd3`

**Recorded:** 2026-08-28  
**Owner:** Cursor  
**Environment:** `corpflow_test` / public CorpFlowAI buyer routes  
**Operating model version:** `2026-08-13-v1`  
**Source issue:** #1237  
**Current-main SHA:** `eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751`  
**GitHub Production deployment:** `6133312089` (state `success`)  
**Live Next.js `buildId`:** `5dirmuFAOwaIhNNE4crwU`  
**Method:** GET + desktop/mobile walk. No form submit. No live POST.

## Verdict on published current-main

`NOT READY — Website Rescue buyer surfaces still show internal SKU titles instead of Website Rescue`

After this PR is merged and Production is serving it, re-check `/demo/website-rescue` and `/website-rescue` before flipping to `LAUNCH PRODUCT LIVE BUYER PATHS VERIFIED`.

## Live GET floor (2026-08-28)

| URL | HTTP | Buyer-visible product / lock |
|-----|------|------------------------------|
| `https://corpflowai.com/` | 200 | Nav **Lead Rescue** + **Website Rescue** |
| `https://corpflowai.com/lead-rescue` | 200 | H1 *Stop losing leads because follow-up is too slow.*; CTA **Start my 48-hour setup** → `/contact?offer=ai-lead-rescue#discovery` |
| `https://corpflowai.com/contact?offer=ai-lead-rescue#discovery` | 200 | Heading **Request AI Lead Rescue**; lock **You are requesting discovery for AI Lead Rescue** |
| `https://corpflowai.com/demo/website-rescue` | 200 `noindex` | Label Website Rescue; lock **You are requesting discovery for Website Rescue**; operator-close still **T1 Landing Rescue**; intro still **landing-rescue SKU** |
| `https://corpflowai.com/website-rescue` | 200 | Eyebrow **Website Rescue**; CTA **Request discovery**; lock **Website Rescue**; footer extra **Premium Landing Page Rescue** |
| `https://corpflowai.com/contact?offer=premium-landing-page-rescue#discovery` | 200 | Heading **Request Website Rescue**; lock **Website Rescue** |
| `https://corpflowai.com/offers/website-rescue` | 308 → `/website-rescue` 200 | Named-path redirect |

Query slug `offer=premium-landing-page-rescue` is the existing SKU lock and is allowed. Buyer-visible titles must say **Website Rescue**.

## Journey 1 — Lead Rescue (pass)

Desktop 1440 and mobile 390:

- Named product: **AI Lead Rescue**
- Five-second: problem (slow follow-up) / offer (USD 150 launch pilot, 48-hour setup) / action (**Start my 48-hour setup**)
- One primary CTA, repeated in nav/hero
- Destination form preserves **AI Lead Rescue**; no auto-send copy
- No **Premium Landing Page Rescue** / **T1** leakage
- No horizontal overflow observed

Screenshots: `lead-rescue-desktop-above-fold.webp`, `lead-rescue-mobile-above-fold.webp`, `lead-rescue-contact-desktop-lockline.webp`

## Journey 2 — Website Rescue demo (lock pass; SKU-title fail)

Desktop 1440 and mobile 390:

- Named product: **Website Rescue demonstration**
- Five-second: *From outdated brochure to a clear enquiry path* + **Open sellable offer page**
- Demo lock (the #1230 repair) is live: **You are requesting discovery for Website Rescue**
- Destination `/website-rescue` loads; discovery lock is **Website Rescue**
- No horizontal overflow observed
- **Blocker:** buyer-visible internal titles:
  1. `/demo/website-rescue` operator-close: **T1 Landing Rescue**
  2. `/demo/website-rescue` enquiry intro: **landing-rescue SKU**
  3. `/website-rescue` footer extra, hero alt, and meta/og description: **Premium Landing Page Rescue**

Screenshots: `website-rescue-demo-desktop-above-fold.webp`, `website-rescue-demo-desktop-enquiry-lock.webp`, `website-rescue-demo-mobile-above-fold.webp`, `website-rescue-demo-mobile-enquiry-lock.webp`, `SKU-LEAKAGE-T1-Landing-Rescue.webp`, `website-rescue-page-desktop-above-fold.webp`, `website-rescue-page-desktop-footer.webp`

## This PR (local fix only until merge)

One defect class: buyer-visible SKU/title leakage on Website Rescue surfaces.

- `components/WebsiteRescueDemo.js` — operator-close and enquiry intro now say **Website Rescue**
- `components/RapidDeliveryOfferPage.js` — footer extra, hero alt, mailto subject, and meta/og description use `buyerFacingName` (**Website Rescue**) when that landing is in use. Internal SKU slug unchanged.

No enquiry submit, pricing change, new product, env/secrets, schema, or send path.

## Delivery Reality Audit (this packet)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: GitHub 6133312089 (current-main, pre-fix)
- Commit deployed: eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751
- Live URLs tested: https://corpflowai.com/lead-rescue ; https://corpflowai.com/contact?offer=ai-lead-rescue#discovery ; https://corpflowai.com/demo/website-rescue ; https://corpflowai.com/website-rescue ; https://corpflowai.com/contact?offer=premium-landing-page-rescue#discovery
- Expected vs actual result: Lead Rescue usable. Website Rescue lock after #1230 is live. Buyer-visible SKU titles remain on the Website Rescue demo and destination footer.
- Client-facing flow usable: PARTIAL (Lead Rescue yes; Website Rescue enquiry lock yes; SKU-title leakage no)
- Final verdict: PARTIAL — NOT READY on live current-main until this repair is published and re-checked
```
