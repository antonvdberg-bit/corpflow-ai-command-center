# CorpFlowAI Visual Standard — Human-First Beauty Layer

**Status:** Mandatory, non-negotiable. Canonical for the *visual presentation layer* of every CorpFlowAI public-facing surface.
**Effective:** 2026-06-25 (Anton directive).
**Owner:** Commercial / Brand / Product Delivery.
**Applies to:** Every CorpFlowAI public-facing website, landing page, product page, lead-magnet page, and marketing surface — apex `corpflowai.com` and its public sub-paths, lead-rescue surfaces, and Product A (US clinics) surfaces.
**Does not apply to:** Internal / operator surfaces (`/change`, `/admin`, `/master`, `/factory/*`, `/api/*`, login/auth). These remain governed by their own visual language (see `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` §2) and are out of scope by design. Tenant brands (Lux, Concierge, France) keep their own separate identities and are not flattened into this standard.

**Companion / governing docs (read together):**

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — the canonical brand/conversion doctrine. This standard **refines and supersedes** its § *Visual direction* and its § *AI Lead Rescue visual reference* "avoid stock photos / dashboard-first hero" guidance **for the public-marketing hero/presentation layer only** (see §7 below). It does **not** relax any conversion, copy, claims, CTA, single-offer, or above-the-line rule.
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` — § 6 *Aesthetic standard* (this doc is its visual-execution companion).
- `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md` — every photograph used as a background is a governed visual asset (licence, owner, alt text, lifecycle, no PII / no clinical details).
- `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` — canonical palette/typography tokens this standard layers on top of.
- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — the visual beauty layer is doctrine-binding within that scoring system (see §3.5 / §4.1 there).
- `docs/marketing/CORPFLOW_PROMPT_LIBRARY.md` — for any AI-generated photographic asset (provenance required).

---

## 1. Problem this standard fixes

The current CorpFlowAI site and Product A pages are technically accurate and useful, but **too machine-readable** and **not visually compelling enough for human buyers**. Analytics indicate visitors are not staying long enough. The first impression must become emotionally engaging, premium, and visually beautiful **before** the visitor reads the detail.

This standard does not replace effectiveness with decoration. It raises the floor: a public CorpFlowAI page must now be **both** conversion-disciplined **and** breathtakingly beautiful. A page that converts but looks machine-generated is no longer "done"; a page that is pretty but does not convert is also not "done."

## 2. The non-negotiable rule

> Every CorpFlowAI public-facing site, landing page, product page, and marketing surface must meet a minimum visual standard of **breathtakingly beautiful, human-first, premium, and visually engaging** — and must do so **within the first four seconds, before the visitor reads the copy.**

This standard **supersedes purely technical / minimal layouts for public-facing marketing pages.** A bare, dashboard-first, or generic-SaaS-gradient hero is no longer an acceptable first impression on a public marketing surface.

## 3. Required visual direction

### 3.1 Photographic foundation

1. Use an **absolutely beautiful, high-quality photographic background** as the visual foundation of the page.
2. The photograph must be **appropriate to the audience and the page content.**
   - **For medspas / aesthetic clinics (Product A):** refined clinic interiors, calm luxury treatment environments, premium skincare / aesthetic imagery, elegant human wellness / beauty context, or tasteful abstract luxury visuals.
   - **Avoid** generic SaaS gradients as the *primary* visual identity.
   - **Avoid** cold, empty, overly technical, or dashboard-first imagery as the *hero* impression.
3. Imagery must be real or convincingly premium — never the cheap, obviously-stock, handshake/headset cliché. AI-generated imagery is permitted only with full provenance per `CORPFLOW_ASSET_GOVERNANCE.md` and `CORPFLOW_PROMPT_LIBRARY.md`, and must not depict identifiable real people or fabricated clinical results.

### 3.2 "3D glass" content panels

Content must sit on semi-transparent **3D glass** panels:

- Matte glass / frosted-glass effect.
- Semi-transparent background.
- Rounded square / rectangular corners.
- Subtle depth, shadow, border, blur, and layering.
- Panels **may** vary by opacity, tint, thickness, and text colour **as long as accessibility remains strong** (see §5).

### 3.3 Layered composition

The page should feel layered, in this stack order:

1. Beautiful **photo base layer**.
2. Optional **dark/light atmospheric overlay (scrim)** for readability.
3. **Glass content cards** above the scrim.
4. **Clear CTA hierarchy** above the glass layer.

### 3.4 Four-second test

The design must be visually appealing within the **first four seconds**, before the visitor reads the copy. If a first-time visitor would not feel "this is premium and intentional" before reading a word, the hero fails.

### 3.5 Commercial purpose (not pretty for its own sake)

The standard is **not** "pretty for the sake of pretty." The goal is commercial effectiveness:

- Increase trust.
- Increase time on page.
- Increase form starts.
- Increase completed enquiries.
- Make CorpFlowAI feel premium, intentional, and high-value.

A beautiful page that lowers form starts has failed this standard, not passed it.

## 4. Reconciliation with the rest of the doctrine (binding)

This standard is **additive to** — never an override of — conversion, copy, claims, CTA, single-offer, payment-timing, and above-the-line rules. In any conflict:

- **Conversion clarity wins over beauty.** If a glass panel, overlay, or photograph reduces CTA clarity, form completion, or readability, the visual treatment is wrong and must change — not the conversion behaviour. (`BRAND_AND_CONVERSION_DOCTRINE.md` § *Definition of done*, § *CTA rules*; `00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` § 6.)
- **Copy, claims, and offer rules are untouched.** No new revenue guarantees, no exaggerated AI claims, single-offer rule intact, payment/routing still after intent.
- **Above-the-line positioning is untouched.** Beautiful imagery must not drift the page into "generic AI tool" framing.

The principle "effectiveness beats decoration" still holds. What changes: on a public marketing surface, **a non-beautiful first impression is now itself a defect**, because it measurably costs trust and time-on-page.

## 5. Accessibility & performance constraints (hard)

- **Text must remain readable on all backgrounds.** Glass panels and overlays exist to protect contrast, not just to look good.
- **Glass panels must pass basic contrast / readability checks** — WCAG AA on body text, links, and primary CTA against the *effective* (post-glass, post-scrim) background, measured against the worst-case region of the photo behind them.
- **Do not sacrifice form completion or CTA clarity for beauty.** The primary CTA must remain the most prominent actionable element above the fold.
- **Use optimized, responsive images** — appropriately sized per breakpoint, modern formats (e.g. AVIF/WebP with fallback), lazy-loaded below the fold, with an LCP-friendly hero. Do not regress Largest Contentful Paint or Cumulative Layout Shift (`CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` §3.3).
- **Avoid heavy animation** unless it improves the page without slowing it down. Backdrop blur is GPU-cost-aware: cap blur layers, provide a reduced-motion / reduced-transparency fallback, and respect `prefers-reduced-motion` and `prefers-reduced-transparency`.
- **Maintain mobile-first quality.** Glass + photo must look intentional and remain readable at 360 / 390 / 414px; no horizontal scroll; tap targets ≥ 44×44pt (`CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` §3.4).
- **Photograph governance.** Every background photo is a governed asset under `CORPFLOW_ASSET_GOVERNANCE.md`: stable id, licence + owner, meaningful `alt` (or `decorative: true`), lifecycle state, AI provenance when generated. **No PII, no identifiable patients, no real clinical/medical details, no fabricated before/after.**

## 6. Implementation guidance — the reusable "photo + glass" page system

Establish a **reusable CorpFlowAI "photo + glass" page system**, not one-off styling. Create reusable components/tokens for:

- **Full-page photographic background** — responsive `<picture>`/`next/image` hero-background primitive with art-directed sources per breakpoint and an LCP priority hint.
- **Overlay gradient / scrim** — a tunable atmospheric overlay (dark or light) sitting between photo and content, parameterised by direction, colour, and opacity.
- **Frosted glass panel** — the base matte-glass surface (`backdrop-filter: blur()`, semi-transparent fill, hairline border, soft shadow, rounded corners) with opacity/tint/thickness variants and a reduced-transparency fallback.
- **Glass card grid** — a responsive grid of glass panels for feature/proof blocks.
- **Hero glass block** — the headline + subhead + primary CTA composition that sits on glass above the photo.
- **CTA glass / action block** — a high-contrast action surface that keeps the primary CTA the most prominent element regardless of the photo behind it.

### 6.1 Token direction

Layer these on top of the canonical v1 tokens in `CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` (teal `#2dd4bf` accent, `#06111f` base, `#eef6ff` body text, etc.). Suggested new token roles (names indicative; finalise in the runtime packet):

| Role | Token (indicative) | Purpose |
|---|---|---|
| Scrim — dark | `--cf-scrim-dark` | Atmospheric overlay over bright/busy photos for readability |
| Scrim — light | `--cf-scrim-light` | Overlay for dark-text-on-light glass treatments |
| Glass fill | `--cf-glass-fill` | Semi-transparent panel background (e.g. `rgba(6,17,31,0.55)`) |
| Glass border | `--cf-glass-border` | Hairline edge (e.g. `rgba(255,255,255,0.14)`) |
| Glass blur | `--cf-glass-blur` | Backdrop blur radius (capped for performance) |
| Glass shadow | `--cf-glass-shadow` | Depth shadow for layering |
| Glass radius | `--cf-glass-radius` | Rounded corner radius for panels |

These are **doc-level direction**, not yet shipped tokens. Final names, values, and contrast-verified pairings are decided in the runtime packet (see §8). Accessibility (§5) is the gate, not aesthetics.

### 6.2 Build order

1. Build the reusable primitives once (background, scrim, glass panel, glass grid, hero block, CTA block).
2. **Apply first to Product A / US Clinics** (`components/ProductAUsClinicLanding.js`, route `/product-a/us-clinics`). See `docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` § 6.
3. **Then roll the same visual language** into the apex home, lead-rescue surfaces, and other CorpFlowAI public marketing surfaces — reusing the same components/tokens, not re-styling each page.

## 7. Explicit supersession over prior visual guidance (public marketing surfaces only)

`BRAND_AND_CONVERSION_DOCTRINE.md` previously directed: "clean dark or deep-neutral bases … interface-like cards," and listed "avoid … random 3D shapes" and "avoid … stock photos." `00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` § 6 directed "screenshots, diagrams, or product visuals over generic stock imagery."

For the **public-marketing hero / presentation layer**, this standard supersedes that guidance as follows:

- A **beautiful, audience-appropriate photographic background is now required** as the hero foundation; a flat dark base or SaaS gradient alone is no longer sufficient as the first impression.
- The "avoid stock photos" rule is **narrowed** to its real intent: avoid *cheap, generic, cliché* stock (handshakes, headset call-centre, generic "AI" art). High-quality, premium, licensed or vetted photography that fits the audience is **encouraged**.
- "3D" now explicitly means the **frosted-glass panel system** of §3.2 — deliberate, layered depth — not "random 3D shapes."
- Interface-like cards, screenshots, diagrams, and product visuals remain valuable **as proof/depth content below the hero**; they are no longer the required hero impression.

Everything else in those documents (voice, copy rules, claims rules, CTA rules, conversion order, above-the-line, single-offer) is **unchanged**. This is a presentation-layer supersession, recorded here so doctrine and reality do not silently disagree.

## 8. Runtime is gated

This document is **docs-only doctrine**. It authorizes no runtime change by itself. Building the photo+glass primitives, adding background photos, and restyling Product A are **runtime work** that returns through the normal approve / PR gate with a Delivery Reality Audit and live production verification (`.cursor/rules/delivery-reality.mdc`). Sequencing: see §6.2.

## 9. Definition of done

A public CorpFlowAI page is **not done** unless it is **all** of:

- strategically clear,
- conversion-focused,
- fast,
- readable,
- mobile-ready,
- **and visually beautiful enough to hold a human visitor's attention immediately** (the four-second test, §3.4).

If any one of these is false, the page is **PARTIAL**, even when tests pass and the copy is correct. This standard supersedes purely technical / minimal layouts for public-facing marketing pages.

## 10. Reviewer checklist (visual beauty layer)

Before publishing a public marketing surface, confirm:

- Is there a beautiful, audience-appropriate photographic background as the hero foundation?
- Does the page pass the four-second "premium and intentional" test before any copy is read?
- Does content sit on frosted-glass panels with deliberate depth, shadow, border, blur, and rounded corners?
- Is there a layered composition (photo → scrim → glass cards → CTA hierarchy)?
- Does body text, link text, and the primary CTA pass WCAG AA against the *effective* background over the worst-case region of the photo?
- Is the primary CTA still the most prominent actionable element above the fold?
- Are images optimized and responsive, with no LCP/CLS regression?
- Does it respect `prefers-reduced-motion` / `prefers-reduced-transparency` and degrade gracefully?
- Is every background photo a governed asset (licence, owner, alt, lifecycle, no PII / clinical details)?
- Did the visual treatment **improve** (not reduce) form starts and CTA clarity?

## 11. Enforcement

This file is canonical for the visual presentation layer of public-facing CorpFlowAI marketing surfaces. If a branch, chat, task, design, or implementation conflicts with this standard, this standard wins for the presentation layer, unless a newer in-repo decision explicitly supersedes it. Conversion, copy, claims, CTA, single-offer, payment-timing, and above-the-line rules in `BRAND_AND_CONVERSION_DOCTRINE.md` always win in a conflict (§4).

Do not bury visual-standard changes only in chat. If this standard changes, update this file in the same change set and reference the decision in branch/PR notes. Cite this document in handoffs whenever work touches the visual design of public marketing pages.

## 12. Cross-references

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — brand/conversion doctrine (§ Visual direction superseded for the hero layer per §7 above).
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` — § 6 Aesthetic standard.
- `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md` — photographic asset governance (licence, alt, lifecycle, no PII).
- `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` — canonical palette/typography tokens.
- `docs/marketing/CORPFLOW_PROMPT_LIBRARY.md` — AI-generated image provenance.
- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — visual beauty layer is doctrine-binding (§3.5 / §4.1).
- `docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` — first surface to adopt the photo+glass system (§ 6).
- `docs/product/PRODUCT_A_BEAUTY_LAYER_IMPLEMENTATION_PACKET_V1.md` — the concrete first-adopter implementation packet (reusable primitives, a11y/perf, asset governance, Plausible before/after; docs-only, runtime gated).
- `.cursor/rules/brand-conversion-doctrine.mdc` — enforcement rule (lists this standard in the canonical set).
- `.cursor/rules/delivery-reality.mdc` — runtime adoption must be live-verified.

## 13. Document history

| Version | Date (UTC) | Change |
|---|---|---|
| v1 | 2026-06-25 | Initial standard — human-first "photo + glass" beauty layer declared non-negotiable for public marketing surfaces; presentation-layer supersession of prior minimal/dashboard-first hero guidance recorded; reusable component/token system specified; Product A US clinics named as first adopter. |
