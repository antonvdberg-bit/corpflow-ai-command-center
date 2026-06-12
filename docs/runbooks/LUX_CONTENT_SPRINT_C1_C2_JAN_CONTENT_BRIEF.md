# LuxeMaurice Content Sprint — C1 + C2 content brief for Jan

**Sprint workstreams:**

- **C1** — Homepage property imagery package (ticket `cmqa57uyt0000xf803uav5x8x`).
- **C2** — First real private opportunity (ticket `cmqa57ve00001xf80tpgmjeiz`).

**Sprint parent:** `cmqa2y2ga0000l704glnfro1f`.
**Strategy doc:** `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` § 3 C1 + § 3 C2.
**Audience:** **Jan (LuxeMaurice principal)** — this brief tells you exactly what to send Anton so the platform can go from brand-ready to commercially usable.
**Status:** **awaiting Jan content** (platform pipeline is fully ready; verified live 2026-06-12 — see § 1).
**Production host:** `https://lux.corpflowai.com/`.

---

## 1. What's already true (before you send anything)

You can trust that the platform is ready to receive your content. The 2026-06-12 verification confirmed:

- `https://lux.corpflowai.com/` renders the approved Strategic Vision design (charcoal / ivory / gold / stone palette, Cormorant Garamond + Inter typography, "Private. Curated. Considered.", "This is not a property website.", "Invited. Not advertised.", "Confidence at distance.").
- `https://lux.corpflowai.com/properties` correctly shows the **premium empty state** "Private opportunities are being prepared" until you supply real content. No demo or placeholder listing is being presented as real inventory.
- `https://lux.corpflowai.com/concierge` reads as **Private Advisory** with "Request a private consultation" CTAs.
- `/change` (the operator desk you'll use to upload imagery and create your first opportunity) is now readable in plain English: "Replace media safely", "Archive or restore this attachment", "Filter this ticket's attachments…", and engineering / phase labels have been removed from the operator UI (PR #347 → #352).
- The attachment upload → review → link → publish pipeline is verified end-to-end (PR #348 → #351). You can upload an image, mark it reviewed, link it to a property, and publish on an allowed slot (hero / gallery / card) without the agent or operator having to touch any code.

What is **not** yet true and waiting on you:

- No real client-approved homepage imagery has been uploaded yet (C1 blocker).
- No real LuxeMaurice opportunity exists in the published catalogue yet (C2 blocker).
- 8 placeholder property URLs from earlier staging work are still indexed in the public sitemap with empty pages — Anton will clear them via `docs/runbooks/LUX_CONTENT_SPRINT_C3_PLACEHOLDER_CLEANUP.md` (C3 placeholder cleanup, separate runbook); ideally cleared before your first real opportunity goes live so it lands into a clean public state.

---

## 2. C1 — Homepage property imagery package

### What we need from you

A package of high-resolution, **client-approved** images that match the Strategic Vision deck's visual language. Send them by upload to the C1 sprint ticket `cmqa57uyt0000xf803uav5x8x` (operator co-pilot can assist) or email them to Anton if upload is inconvenient.

### Image categories (4 required minimum, more welcome)

| # | Category | What it should show | Where it lives on the site |
|---|---|---|---|
| 1 | **Hero treatment** | Mauritius coastline / luxury villa exterior / dusk lighting — single iconic frame that anchors the homepage | Hero block at top of `/` |
| 2 | **Strategic Mauritius lifestyle** | Lifestyle / security / connectivity context — wide landscape or aerial, no people-identifying detail | Mauritius Strategic Base section |
| 3 | **Private aviation or arrival** | Private jet on tarmac at SSR, marina arrival, or chauffeured arrival sequence | Two Client Journeys section |
| 4 | **Marina / business lifestyle / luxury living** | Caudan / Le Caudan Waterfront-style imagery; high-end residential interior | Two Client Journeys section |
| 5 | **Owner experience — architect interaction** | Architect or designer with client over plans (no faces if confidentiality matters) | Owner Experience section |
| 6 | **Owner experience — interior design review** | Material samples, fabric swatches, design boards | Owner Experience section |
| 7 | **Owner experience — finish selection / procurement** | Finishes (stone, wood, brass), on-site decisions, or remote video review | Owner Experience section |

### Image specifications

| Property | Required | Notes |
|---|---|---|
| Format | JPEG (`.jpg`) or PNG (`.png`); WebP also accepted | Server allowlist: `image/*` per `lib/server/change-attachments.js` |
| Resolution (hero) | **≥ 2400 × 1600 px** (recommended 3200 × 2133 px) | Hero is full-width on desktop; under-resolution shows obvious quality loss |
| Resolution (lifestyle / section) | **≥ 1920 × 1280 px** | Anything smaller will look soft on retina displays |
| Aspect ratio | Hero: 3:2 or 16:9 wide landscape. Sections: 3:2 or 4:3. Portrait only when subject demands it. | We can crop, but providing pre-cropped saves a round-trip |
| Colour profile | sRGB | AdobeRGB / ProPhoto will shift colour in browsers |
| File size | Up to ~5 MB per file | Server payload limit `CORPFLOW_CHANGE_UPLOAD_MAX_BYTES` (current default 12 MB); larger files won't upload |
| Watermarks | **None** on hero / homepage usage; small discreet ones on illustrative material only with prior approval | Stock watermarks ("Shutterstock preview" overlays etc.) are a hard reject |
| People | Avoid identifiable faces unless person has signed a release | Anton can help draft a release if needed |
| Source / rights | Client-owned, commissioned, or licensed for commercial use on `https://lux.corpflowai.com/` | We will reject AI-generated stock unless explicitly flagged as such (per `lib/visualAssets/schema.js` AI-disclosure rule) |

### For each image, send Anton

```
File name: <something-descriptive.jpg>   (no spaces; lowercase; hyphens not underscores)
Category: 1-7 from the table above
Suggested alt text: short sentence describing what the image shows for screen readers
                    (≤ 180 chars; will appear on the public page as the image's alt attribute)
Suggested caption (optional): one-line caption shown beneath the image on the public page
                              (≤ 180 chars)
Source / rights: client-owned / commissioned by us / licensed via <stock source>
Notes (optional): anything you want Anton to know (e.g. "use this only on dark backgrounds")
```

A small example:

```
File name: lux-grand-baie-dusk-hero.jpg
Category: 1 (Hero treatment)
Suggested alt text: Luxury villa overlooking Grand Baie at dusk, infinity pool reflecting the sky
Suggested caption: Grand Baie - sunset from a private residence
Source / rights: commissioned 2025, client-owned, full commercial rights
Notes: please use as the hero image throughout June / July; we will refresh quarterly
```

### What happens after you send them

1. Anton uploads each image to the C1 sprint ticket via `/change` → ATTACHMENTS → Upload content (the readable panel from PR #352).
2. Anton marks each one **reviewed** in `/change` once you've signed off the visual.
3. Anton **publishes** each one on the matching homepage slot. Publish is a deliberate operator action; nothing goes live automatically.
4. You walk through `https://lux.corpflowai.com/` (C4 validation) and confirm each slot looks right.
5. PRs are not required for content publishing — it goes through the governed CMP pipeline, not code.

---

## 3. C2 — First real private opportunity

### What we need from you

One real, **client-approved** private opportunity to launch as the first entry on `/properties`. After this one ships, future opportunities follow the same template.

### Opportunity content template — fill this out and send to Anton

```
TITLE                : <e.g. "Private contemporary villa overlooking Grand Baie">
SLUG (URL fragment)  : <e.g. "lm-grand-baie-private-villa-2026"; lowercase, hyphens only,
                       prefixed "lm-" by convention; must be unique across Lux>
REGION               : <e.g. "Grand Baie, Northern Coast">
PROPERTY TYPE        : <Completed residence / Development opportunity / Off-market mandate /
                       Confidential access>
STATUS               : <Available / Under offer / Reserved / Sold / Confidential>
PRICE GUIDANCE       : <one of:
                        - exact figure in USD or MUR
                        - banded ("USD 4.5M-6.0M")
                        - "On application" if not approved for public display>
SHORT TEASER (max 180 chars) :
   <One line that makes a HNW client want to read more. Edited; not generic.>

OVERVIEW (4-8 sentences) :
   <Architectural style, footprint, key features, who it suits. Editorial tone,
    not feature-card. Read the homepage copy for voice reference.>

LIFESTYLE CONTEXT (3-5 sentences) :
   <What the location offers - beach access, schools, marinas, aviation, security,
    healthcare, neighbouring residents (without naming). Anchors why a HNW client
    would move to this part of Mauritius.>

ADVISORY NOTES (3-5 sentences) :
   <What LuxeMaurice would advise the buyer to consider - structuring, residency
    pathway interaction, build phasing if relevant, refurbishment notes. This is
    what differentiates a Private Wealth & Lifestyle Platform from a portal.>

AT A GLANCE (key:value pairs, 4-8 lines) :
   - Bedrooms: <n>
   - Bathrooms: <n>
   - Internal area: <sqm>
   - Plot area: <sqm>
   - Year completed / target completion: <YYYY>
   - Tenure: <freehold / leasehold / smart-city / PDS / RES / IRS / R+2>
   - Residency eligibility: <if applicable - e.g. "qualifies for PRP under PDS">
   - <add any other line that matters for this specific opportunity>

CONSULTATION CTA :
   <Default: "Request a private consultation" -> /concierge?intent=property&property=<slug>.
    Override only if there is a specific reason - e.g. "Request the private offering
    memorandum">

IMAGES (minimum 5, recommend 6-10) :
   For each image:
     - File name (lowercase, hyphens, descriptive)
     - Suggested alt text (≤ 180 chars)
     - Suggested public caption (≤ 180 chars, optional)
     - Suggested slot: hero | card | gallery
     - Gallery order (if gallery): 0-9999 (lower = earlier in the grid)
     - Gallery cover (if gallery): yes / no (one and only one image should be cover)
     - Source / rights: as in C1 § 2
```

### What "approved" means for C2

We don't publish anything you haven't said yes to in writing (email / message). When you send Anton the content above, please include the line **"Approved for public publication on lux.corpflowai.com"** so there's an unambiguous record.

### What Anton does after receiving the content

1. Logs into `/properties/admin` on `https://lux.corpflowai.com/` and creates the `lux_listings` row with the exact fields you sent.
2. Uploads the images to the C2 sprint ticket via `/change` → ATTACHMENTS → Upload content.
3. Marks each image reviewed; links each to the new `lux_listings` slug; assigns hero / card / gallery slot per your instruction; sets caption / alt text per your instruction; publishes each image.
4. Confirms `/properties` shows the new opportunity card; `/property/<slug>` renders the full Private Opportunity Memorandum with Overview / Lifestyle / Advisory / At a glance and gallery; `/concierge?intent=property&property=<slug>` preserves context through to the lead form.
5. Sends you the live URL plus a screenshot package for sign-off (C4).

### Out of scope for C2

- Video on the public surface (separate workstream, not blocking C2).
- IDX / MLS / feed-shaped data (explicitly retired per Strategic Vision repositioning).
- Pricing claims not approved by you.
- Any image not on your approved list above.

---

## 4. What this brief does NOT change

To be explicit about what stays exactly as it is:

- No code change. No schema change. No new migration. No workflow change. No secret change. No env-var change.
- No production data write executed by the agent — all uploads, links, and publishes are operator actions through `/change`.
- No master programme ticket `cmo8mjijk0000jl04l1jz0v6d` touched.
- No tenant boundary / auth / session / media-governance change.
- No public-media-rules or publication-governance change.

---

## 5. C4 validation — what Jan does after C1 + C2 land

The final reality gate is your walk-through. Once Anton confirms C1 + C2 are live, you:

1. Open `https://lux.corpflowai.com/` and confirm the homepage shows your approved imagery in each slot (hero, lifestyle, owner experience). If a slot looks wrong, message Anton and he can swap (replace media safely; the readable attachment panel walks the operator through it without any guesswork).
2. Open `https://lux.corpflowai.com/properties` and confirm your first real opportunity is the card you sent (correct image, correct teaser, correct title).
3. Open `https://lux.corpflowai.com/property/<your-slug>` and confirm the Private Opportunity Memorandum reads exactly as you wrote it (Overview, Lifestyle, Advisory, At a glance, gallery in the order you specified).
4. Click "Request a private consultation" and confirm the `/concierge` form pre-fills the property context (URL should contain `?intent=property&property=<your-slug>`).
5. Post on the sprint parent ticket `cmqa2y2ga0000l704glnfro1f` a one-line confirmation: **"Platform is commercially usable for LuxeMaurice — Jan, <date>"**. That's the C4 reality gate.

After your line lands on the ticket, Anton flips the C4 sprint child to `Closed` and the Content Population Sprint is COMPLETE per `.cursor/rules/delivery-reality.mdc`.

---

## 6. Related

- `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` — full sprint strategy + child ticket map.
- `docs/runbooks/LUX_CONTENT_SPRINT_C3_PLACEHOLDER_CLEANUP.md` — Anton's separate runbook for clearing the 8 placeholder slugs before C2 launches.
- `docs/runbooks/LUX_CHANGE_USABILITY_FIXES_2026_06_12.md` — PR #347 → #352 chain that landed the readable `/change` operator desk feeding C1 + C2.
- `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_2030.md` and `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_PRESENTATION_OUTLINE.md` — voice / visual reference for both C1 imagery and C2 copy.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — single-offer rule, route-after-intent, conversion CTAs.
