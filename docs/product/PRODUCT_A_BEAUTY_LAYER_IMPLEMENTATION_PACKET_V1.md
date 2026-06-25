# Product A — Human-First Beauty Layer implementation packet (v1)

**Status:** Implementation packet — **docs-only**. This document authorizes **no** runtime change by itself. The runtime restyle is a separate, gated PR (see § 15 *Delivery & gating*).
**Surface:** Product A / US Clinics — route `/product-a/us-clinics`, component `components/ProductAUsClinicLanding.js`.
**Standard being applied:** `docs/marketing/CORPFLOW_VISUAL_STANDARD_HUMAN_FIRST_BEAUTY_LAYER.md` (non-negotiable; Product A is the **first adopter** per its § 6.2).
**Owner:** Anton (gate) → Cursor (executes the gated runtime PR).

**Anchor sentinel:** `<!-- PRODUCT_A_BEAUTY_LAYER_V1 -->`

<!-- PRODUCT_A_BEAUTY_LAYER_V1 -->

**Companion / governing docs:**

- `docs/marketing/CORPFLOW_VISUAL_STANDARD_HUMAN_FIRST_BEAUTY_LAYER.md` — the standard (photo + 3D glass, layering, four-second test, accessibility/performance constraints).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — conversion/copy/CTA/claims rules win in any conflict with beauty.
- `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md` — every background photo is a governed asset.
- `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` — canonical palette (teal `#2dd4bf`, base `#06111f`, body `#eef6ff`).
- `docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` — § 6 (landing/intake), § 6.5 (visual standard adoption).
- `docs/product/PRODUCT_A_INTAKE_WEBHOOK.md` — the intake contract that this packet **must not touch**.
- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — §3.2/§3.3/§3.4 (a11y/perf/mobile) + §4.1 Visual-PARTIAL gate.
- `.cursor/rules/delivery-reality.mdc` — live-prod verification is mandatory before "done".

---

## 1. Objective

Move `/product-a/us-clinics` from **technically correct** to **visually compelling**: a beautiful, audience-appropriate photographic foundation with content on frosted "3D glass" panels, premium within four seconds — **without** weakening CTA clarity, readability, performance, or form completion, and **without** touching the intake API, event contract, or form fields.

This is a **presentation-layer** change only. The DOM that matters for conversion (the form, its field `name`s, required attributes, submit handler, success/error states, and the `/api/product-a/intake` POST) is preserved byte-for-byte in behaviour.

## 2. Hard constraints (non-negotiable — copy into the runtime PR description)

| Constraint | How this packet honours it |
|---|---|
| **Do not change the intake API.** | No edit to `lib/server/product-a-intake*.js`, `api/factory_router.js`, or the `POST /api/product-a/intake` call site. The `fetch` body and headers are untouched. |
| **Do not change the event contract.** | The intake/automation contract (`corpflow.product_a.intake.v1` / `intake.product_a.us_clinic.v1`) is untouched. The existing Plausible events `pa_intake_submit_attempt` / `pa_intake_submit_success` / `pa_intake_submit_error` keep identical names and fire points. New measurement points in § 13 are **additive** Plausible custom events only — they do not alter the intake/automation event contract. |
| **Do not change form field names or required-field behavior.** | `clinic_name`, `website`, `contact_name`, `email`, `phone`, `city_state`, `biggest_problem` keep identical `name`, `type`, `required`, and validation. The `EMPTY_FORM` shape and `updateField`/`submitAuditRequest` logic are unchanged. Only the *presentation wrapper* (glass panel) around the form changes. |
| **No CRM, GHL, SMS, auto-send email, or LLM lead enrichment.** | This is a CSS/markup-only restyle. No new outbound calls of any kind. |
| **Keep Product A commercial message conversion-focused.** | Copy is unchanged (or only tightened with explicit approval). H1, offer, no-guarantee line, CTA wording (`Request a Website & Lead Rescue Audit`) all preserved. |
| **Beauty must improve first impression without weakening CTA clarity.** | Primary CTA stays the single most prominent above-the-fold action; the CTA glass/action block (§ 7) keeps the teal `#2dd4bf` solid fill (not glassy/translucent) so it never loses contrast against the photo. |

## 3. Architecture: a reusable system, not one-off styling

Per the standard's § 6, build the primitives **once** in a shared location, apply to Product A first, then reuse on the apex home and lead-rescue surfaces. Proposed file layout (new files; no existing file's behaviour changes except the Product A component's presentation):

```
lib/ui/glass.js                      # tokens + style factories (no JSX) — single source of truth
components/beauty/PhotoBackground.js # (1) full-page responsive photographic background
components/beauty/Scrim.js           # (2) atmospheric overlay for readability
components/beauty/GlassPanel.js      # (3) frosted glass panel/card primitive
components/beauty/GlassCardGrid.js   # (3b) responsive grid of glass panels
components/beauty/HeroGlassBlock.js  # (4) hero headline + subhead + CTA on glass
components/beauty/CtaGlassBlock.js   # (5) high-contrast action block
```

Rationale for the split: the repo styles components with inline style objects (no CSS framework, no CSS modules — see `components/ProductAUsClinicLanding.js` and the brand-identity proposal). `lib/ui/glass.js` keeps the *values* (tokens) in one place; the `components/beauty/*` primitives are thin, presentational, prop-driven wrappers that render those inline styles. This matches existing conventions and avoids introducing a new styling system.

### 3.1 Token direction (`lib/ui/glass.js`)

Layered on the canonical v1 palette. Final values are tuned against the chosen photo during the runtime PR (accessibility § 9 is the gate, not aesthetics):

```js
// lib/ui/glass.js  (proposed)
export const GLASS_TOKENS = {
  scrimDark: 'linear-gradient(180deg, rgba(4,11,20,0.30) 0%, rgba(4,11,20,0.62) 55%, rgba(4,11,20,0.86) 100%)',
  scrimLight: 'linear-gradient(180deg, rgba(248,250,252,0.10) 0%, rgba(248,250,252,0.55) 100%)',
  glassFill: 'rgba(8,18,32,0.55)',          // semi-transparent panel
  glassFillStrong: 'rgba(8,18,32,0.72)',    // for text-dense panels (form) — higher opacity = safer contrast
  glassBorder: 'rgba(255,255,255,0.14)',
  glassBlur: '16px',                        // capped; see perf § 10
  glassShadow: '0 24px 80px rgba(0,0,0,0.38)',
  glassRadius: 24,
  accent: '#2dd4bf',
  onAccent: '#031018',
  text: '#eef6ff',
  textMuted: '#c9d8e8',
};

// Panels accept variant overrides (opacity, tint, thickness, text color)
export function glassPanelStyle(opts = {}) {
  const t = GLASS_TOKENS;
  return {
    position: 'relative',
    border: `1px solid ${opts.border || t.glassBorder}`,
    borderRadius: opts.radius ?? t.glassRadius,
    background: opts.fill || t.glassFill,
    boxShadow: opts.shadow || t.glassShadow,
    backdropFilter: `blur(${opts.blur || t.glassBlur})`,
    WebkitBackdropFilter: `blur(${opts.blur || t.glassBlur})`,
    color: opts.color || t.text,
    padding: opts.padding ?? 22,
  };
}
```

> Variant freedom is intentional and bounded: per the standard § 3.2, panels **may** vary opacity, tint, thickness, and text colour — but only within combinations that still pass § 9 contrast. The **form panel uses `glassFillStrong`** (higher opacity) because it is text- and input-dense and must be the most readable surface on the page.

## 4. Primitive (1): reusable photo background

`components/beauty/PhotoBackground.js` — a fixed/absolute full-bleed responsive background using a native `<picture>` element (not `next/image`, to avoid adding `images` config to `next.config.mjs` and keep the change tightly scoped; `next/image` is a documented future option in § 10.3).

```jsx
// components/beauty/PhotoBackground.js  (proposed)
import React from 'react';

/**
 * Full-page photographic background. Renders the LCP hero image with
 * art-directed responsive sources. `priority` adds fetchpriority="high"
 * so the hero photo is the (fast) LCP element. Width/height reserve
 * space to keep CLS = 0.
 */
export default function PhotoBackground({ sources, fallbackSrc, alt = '', priority = false, children }) {
  return (
    <div style={{ position: 'relative', isolation: 'isolate' }}>
      <picture>
        {sources.map((s) => (
          <source key={s.srcSet} type={s.type} media={s.media} srcSet={s.srcSet} />
        ))}
        <img
          src={fallbackSrc}
          alt={alt}
          aria-hidden={alt === '' ? 'true' : undefined}
          decoding="async"
          {...(priority
            ? { loading: 'eager', fetchPriority: 'high' }
            : { loading: 'lazy' })}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center', zIndex: -2,
          }}
        />
      </picture>
      {children}
    </div>
  );
}
```

- `alt`: when the photo is purely atmospheric, pass `alt=""` (decorative) so screen readers skip it; the manifest sets `decorative: true` (§ 9). If the photo carries meaning, pass real alt text (no PII).
- The hero photo is the **LCP element**; a matching `<link rel="preload" as="image" imagesrcset=… imagesizes=…>` is added in the page `<Head>` (§ 10.1).

## 5. Primitive (2): scrim / overlay layer

`components/beauty/Scrim.js` — a tunable atmospheric overlay between photo and content. Its only job is **readability**, not decoration.

```jsx
// components/beauty/Scrim.js  (proposed)
import React from 'react';
import { GLASS_TOKENS } from '../../lib/ui/glass.js';

export default function Scrim({ tone = 'dark', style }) {
  const bg = tone === 'light' ? GLASS_TOKENS.scrimLight : GLASS_TOKENS.scrimDark;
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, zIndex: -1, background: bg, pointerEvents: 'none', ...style }}
    />
  );
}
```

The scrim opacity is the primary lever for passing contrast (§ 9): if AA fails over a bright region of the photo, **strengthen the scrim first**, before touching panel opacity or text colour.

## 6. Primitive (3): frosted glass panel / card + grid

`components/beauty/GlassPanel.js` and `components/beauty/GlassCardGrid.js`.

```jsx
// components/beauty/GlassPanel.js  (proposed)
import React from 'react';
import { glassPanelStyle } from '../../lib/ui/glass.js';

export default function GlassPanel({ variant, as: Tag = 'div', style, children, ...rest }) {
  return (
    <Tag style={{ ...glassPanelStyle(variant), ...style }} {...rest}>
      {children}
    </Tag>
  );
}
```

```jsx
// components/beauty/GlassCardGrid.js  (proposed)
import React from 'react';

export default function GlassCardGrid({ minColWidth = 260, gap = 18, children, style }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth}px, 1fr))`,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
```

The existing `styles.card` in `ProductAUsClinicLanding.js` (border + radius + translucent fill + `backdropFilter: blur(14px)`) is already 70% of the glass look; this primitive generalises it and adds the scrim-aware opacity variants.

## 7. Primitives (4) & (5): hero glass block + CTA/action glass block

```jsx
// components/beauty/HeroGlassBlock.js  (proposed)
import React from 'react';
import GlassPanel from './GlassPanel.js';

export default function HeroGlassBlock({ eyebrow, title, lead, actions, children }) {
  return (
    <GlassPanel variant={{ padding: 28 }} style={{ maxWidth: 760 }}>
      {eyebrow}
      {title}
      {lead}
      {actions}
      {children}
    </GlassPanel>
  );
}
```

```jsx
// components/beauty/CtaGlassBlock.js  (proposed)
import React from 'react';
import GlassPanel from './GlassPanel.js';
import { GLASS_TOKENS } from '../../lib/ui/glass.js';

/**
 * The CTA block is glass, but the primary button is a SOLID teal fill
 * (GLASS_TOKENS.accent) — never translucent — so it stays the most
 * prominent, highest-contrast action regardless of the photo behind it.
 */
export default function CtaGlassBlock({ children, style }) {
  return (
    <GlassPanel variant={{ fill: GLASS_TOKENS.glassFillStrong, padding: 24 }} style={style}>
      {children}
    </GlassPanel>
  );
}
```

**CTA clarity rule (binding):** the primary CTA keeps `background:#2dd4bf; color:#031018` (existing `styles.primary`). It is never given `backdrop-filter`, never translucent, and remains the single most prominent above-the-fold action. The secondary CTA stays visually subordinate (existing translucent `styles.secondary`).

## 8. How the Product A page is recomposed (presentation only)

Layering order on `/product-a/us-clinics`, matching the standard § 3.3:

1. `PhotoBackground` (audience-appropriate clinic/wellness photo) — base layer, LCP.
2. `Scrim tone="dark"` — readability overlay.
3. Content (`<main style={styles.shell}>` unchanged structurally) wrapped so it sits above the scrim:
   - Nav (unchanged content).
   - `HeroGlassBlock` wrapping the existing `<h1>`, lead `<p>`, and the existing CTA `<a>`s.
   - The existing "What you get" / "What the audit covers" cards become `GlassPanel`s (reuse current copy).
   - The intake `<section id="intake">` form is wrapped in a `CtaGlassBlock` / `GlassPanel` using `glassFillStrong`. **The `<form>`, all `<label>`/`<input>`/`<textarea>` `name`s, `required`, `type`, `onChange`, `onSubmit`, success/error blocks, and the `fetch('/api/product-a/intake', …)` call are copied unchanged.**
   - `PublicSiteFooter` unchanged.

The diff is a **wrapping/styling diff**: swap the `styles.page` flat gradient for `PhotoBackground` + `Scrim`, replace `styles.card` usages with `GlassPanel`, and keep every functional node identical. No props on the form elements change.

> **Explicitly unchanged:** `EMPTY_FORM`, `updateField`, `submitAuditRequest`, `trackEvent('pa_intake_submit_*')`, the POST body/headers, the success/error state machine, and all field validation.

## 9. (7) Accessibility — contrast & readability checks

Measured against the **effective** (post-photo + post-scrim + post-glass) background, over the **worst-case (brightest/busiest) region** of the chosen photo.

| Check | Target | How |
|---|---|---|
| Body text (`#eef6ff` on glass) | WCAG AA ≥ 4.5:1 | Contrast checker against the panel's effective background; strengthen scrim/`glassFill` if it fails. |
| Muted text (`#c9d8e8`) | AA ≥ 4.5:1 (it is body-size) | Same; bump to `#eef6ff` if marginal. |
| Eyebrow / labels (`#7dd3fc`) | AA ≥ 3:1 (large/uppercase) or 4.5:1 if < 18.66px | Verify at rendered size. |
| Primary CTA (`#031018` on `#2dd4bf`) | AA ≥ 4.5:1 | Already passes (solid fill, photo-independent). |
| Form inputs | Visible borders + placeholder ≥ 4.5:1 | Keep `glassFillStrong` behind the form. |
| Focus states | Visible focus ring on every input, link, button | Add a non-color-only focus outline (e.g. `2px solid #2dd4bf` + offset). |
| Heading order | One `<h1>`, no skipped levels | Unchanged from current page. |
| Landmarks | `<main>` present; nav/footer landmarks | Unchanged. |
| Reduced transparency / motion | Respect `prefers-reduced-transparency` and `prefers-reduced-motion` | Provide a solid-fill fallback (drop `backdrop-filter`, use opaque `#0a1429`) and disable any parallax/animation. |
| Photo alt | Decorative `alt=""` + `aria-hidden` OR meaningful alt | Per manifest `decorative` flag (§ 12). |

Maps to `CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` §3.2. The page must not regress below its current accessibility posture.

## 10. (8) Performance — optimized imagery, LCP/CLS

| Lever | Requirement |
|---|---|
| **Hero image format** | Ship AVIF + WebP with a JPEG fallback via `<picture>`; pick the smallest that holds quality. |
| **Responsive sources** | Art-directed/sized variants per breakpoint (e.g. 768w / 1280w / 1920w / 2560w). Do not ship a 4K hero to a 390px phone. |
| **LCP** | Hero photo is the LCP element: `fetchpriority="high"`, `loading="eager"`, plus `<link rel="preload" as="image" imagesrcset imagesizes>` in `<Head>`. Target LCP ≤ 2.5s mobile (`CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` §3.3). |
| **CLS** | Reserve hero dimensions (fixed background container height / aspect ratio) so the photo never reflows content. Target CLS ≤ 0.1. |
| **Below-fold imagery** | `loading="lazy"` for any non-hero photo. |
| **Backdrop-blur cost** | Cap blur radius (`16px`) and the **number of simultaneously blurred layers** (large blurred areas are GPU-expensive on low-end mobile). If profiling shows jank, reduce blurred surface area before increasing radius. |
| **No heavy animation** | No autoplay video, no parallax-by-default. Any micro-animation must be gated behind `prefers-reduced-motion: no-preference` and must not delay LCP. |
| **Byte budget** | Hero image served to mobile should be well under a few hundred KB after compression; record the actual transferred size in the PR. |

### 10.1 `<Head>` preload (added to the page, not the API)

```jsx
<link
  rel="preload"
  as="image"
  href="/assets/product-a/hero-clinic-1280.avif"
  imageSrcSet="/assets/product-a/hero-clinic-768.avif 768w, /assets/product-a/hero-clinic-1280.avif 1280w, /assets/product-a/hero-clinic-1920.avif 1920w"
  imageSizes="100vw"
  type="image/avif"
/>
```

### 10.2 Measurement
Run Lighthouse mobile **before** (current page) and **after** (beauty layer) on the production hostname; record LCP/CLS/TBT/Performance deltas in the runtime PR's Delivery Reality Audit. A perf regression below the §3.3 thresholds blocks the PR.

### 10.3 `next/image` (future option, out of scope here)
`next/image` would automate responsive/format optimization but requires an `images` block in `next.config.mjs` (currently intentionally minimal — Prisma plugin only). Out of scope for v1 to keep the change tight; revisit as a separate packet if static `<picture>` proves hard to maintain.

## 11. (6) Responsive / mobile-first behaviour

- Mobile-first: design and verify at 360 / 390 / 414px first, then scale up. No horizontal scroll at any of these widths.
- Hero glass block: full-width with comfortable padding on mobile; `max-width` constrained on desktop (existing 1120px shell preserved).
- Glass card grid: `repeat(auto-fit, minmax(260px, 1fr))` collapses to a single column on phones (already the pattern in the current hero grid).
- Tap targets ≥ 44×44pt for both CTAs and nav (current CTA padding already meets this; verify after restyle).
- Primary CTA fully visible **above the mobile fold** on a 667pt-tall device.
- Background `object-fit: cover` + sensible `object-position` so the focal point of the clinic photo stays visible in portrait.
- Reduced-transparency / reduced-motion fallbacks apply on mobile too.

Maps to `CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` §3.4.

## 12. (9) Asset governance — licence, alt, PII, lifecycle

Every background photo is a governed asset per `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md`.

- **Location:** binary under `public/assets/product-a/` (repo-hosted, small) **or** CorpFlowAI CDN if large; manifest at `data/visual-assets/product-a-hero-clinic.manifest.json`.
- **Licence:** must be one of `stock_licensed` (with proof of licence + owner), `ai_generated` (full prompt provenance per `CORPFLOW_PROMPT_LIBRARY.md`), or `client_owned`. No un-licensed scraped imagery.
- **Alt text:** meaningful, no PII; or `decorative: true` with `alt=""` when purely atmospheric.
- **No sensitive PII / no clinical content:** no identifiable patients, no faces tied to a named person, no real before/after, no medical/clinical detail, no client-private photos.
- **Lifecycle / replacement:** `lifecycle.state` flows `draft → vetted → published`; a replacement bumps the `id` (or appends a content hash) — never overwrite a published path (CDN cache is immutable). Retirement sets `retired_at` and the manifest is kept for audit.

Example manifest (illustrative):

```json
{
  "schema_version": 1,
  "id": "product-a-hero-clinic",
  "surface": "product-a-us-clinics",
  "kind": "image",
  "title": "Calm premium medspa treatment room",
  "source": { "type": "ai_generated", "path": "/public/assets/product-a/hero-clinic-1920.avif", "width": 1920, "height": 1280 },
  "licence": { "tier": "ai_generated", "owner": "CorpFlowAI", "terms": "Generated for CorpFlowAI Product A; no third-party rights." },
  "accessibility": { "decorative": true, "alt": "" },
  "usage": { "allowed_surfaces": ["product-a-us-clinics"], "primary_cta": "Request a Website & Lead Rescue Audit" },
  "lifecycle": { "state": "draft", "created_at": "2026-06-25" },
  "prompt_provenance": { "prompt_id": "<library-entry>", "model": "<model>", "model_version": "<version>", "reviewed_by": "Anton" }
}
```

> The manifest directory is currently scaffolding (`CORPFLOW_ASSET_GOVERNANCE.md` status note). If the runtime loader is not yet wired, the manifest still ships as the governance record and the component references the static path directly. The CI schema test (`node-tests/visual-assets-schema.test.mjs`) must pass for any manifest added.

## 13. (10) Plausible before/after measurement points

**Goal:** prove the beauty layer increases trust / time-on-page / form starts / completed enquiries (standard § 3.5) — or roll back if it does not.

**Contract safety:** these are **additive Plausible custom events** for marketing measurement. They do **not** change the intake/automation event contract (`corpflow.product_a.intake.v1`), and the existing `pa_intake_submit_*` events keep identical names and fire points.

### 13.1 Baseline (capture BEFORE the restyle ships)
From Plausible for `/product-a/us-clinics` (apex only; analytics is apex-gated per `lib/analytics`):

| Metric | Source |
|---|---|
| Pageviews / unique visitors | Plausible pageview (automatic) |
| Bounce rate | Plausible (automatic) |
| Average time on page | Plausible (automatic) |
| Form starts | `pa_intake_start` (new — see § 13.2) — **or**, if baseline must use existing data, `pa_intake_submit_attempt` as a proxy |
| Submit attempts / successes / errors | existing `pa_intake_submit_attempt` / `_success` / `_error` |

Record the baseline window (e.g. trailing 14–28 days) in the runtime PR before merge.

### 13.2 New additive measurement events (optional, recommended)

| Event | Fires when | Props (no PII) |
|---|---|---|
| `pa_cta_click` | A primary/secondary CTA `<a>`/button is clicked | `{ location: 'hero' \| 'nav' \| 'intake_section' }` |
| `pa_intake_start` | First focus/change on any intake field (once per page view) | `{}` |

Implementation note: these use the existing `trackEvent(name, { props })` helper (`lib/analytics/index.js`) which is call-and-forget and no-ops off-apex. They must **not** capture field values — `location`/categorical labels only. Wiring `pa_intake_start` must not alter `updateField` behaviour beyond a guarded one-time `trackEvent` call.

### 13.3 Success criteria (after ≥ 2–4 weeks live)
The beauty layer is a **win** (keep) if, versus baseline, it shows a non-trivial improvement in **at least** time-on-page **and** (form starts or completed submits), with **no** regression in completed submits and **no** Lighthouse perf regression below §3.3 thresholds. If completed submits drop, the layer has failed the standard (beauty must not weaken conversion) → tune or roll back.

## 14. Step-by-step build order (for the gated runtime PR)

1. Add `lib/ui/glass.js` + `components/beauty/*` primitives (no page references yet) — pure additive.
2. Source + license the hero photo; add binary under `public/assets/product-a/` (responsive AVIF/WebP/JPEG) + manifest under `data/visual-assets/`; CI schema test green.
3. Recompose `components/ProductAUsClinicLanding.js` presentation only (PhotoBackground + Scrim + GlassPanels), preserving every functional node (§ 8). Add `<Head>` preload (§ 10.1).
4. Add additive Plausible events `pa_cta_click` / `pa_intake_start` (§ 13.2).
5. Local checks: `npm test`, `npm run build`, axe/Lighthouse on the dev render; verify form still POSTs (note `vercel dev` caveat for the API rewrite from `PRODUCT_A_INTAKE_WEBHOOK.md`).
6. Open PR with the § 2 hard-constraints table in the description + before Lighthouse numbers + baseline Plausible window.

## 15. Delivery & gating

**Runtime build status (2026-06-25):** the gated runtime PR has been implemented in-branch — `lib/ui/glass.js`, `components/beauty/{PhotoBackground,Scrim,GlassPanel,GlassCardGrid,HeroGlassBlock,CtaGlassBlock}.js`, governed placeholder `public/assets/product-a/hero-clinic-placeholder.svg` + manifest `data/visual-assets/product-a-hero-clinic.manifest.json` (`product-a` surface added to the schema enum + content model), `components/ProductAUsClinicLanding.js` recomposed (intake contract byte-for-byte unchanged), and drift-guard `node-tests/product-a-beauty-layer.test.mjs`. `npm test` (1174 pass / 0 fail), `npm run build`, and `npm run check:marketing-quality-gate` are green. **State per `delivery-reality.mdc`: Local — not yet Merged/Deployed/Live-verified.** Live production verification on `https://corpflowai.com/product-a/us-clinics` remains the final gate (operator merge + deploy).

Per `.cursor/rules/delivery-reality.mdc` and the standard § 8, the standard itself is **docs-only**; the runtime restyle ships as its own gated PR and is not "done" until **live verified** on `https://corpflowai.com/product-a/us-clinics`:

```text
Delivery Reality Audit (to be completed on the runtime PR):
- Local fix exists: YES/NO
- Merged to main: YES/NO
- Production deployment ID:
- Commit deployed:
- Live URLs tested: https://corpflowai.com/product-a/us-clinics
- Expected vs actual: photo+glass renders; AA contrast holds; LCP ≤ 2.5s / CLS ≤ 0.1; form submits 200; success state shows
- Client-facing flow usable (submit an audit request): YES/NO
- Final verdict: COMPLETE / PARTIAL / FAILED
```

A `Visual-PARTIAL` (standard not met) or any broken submit flow blocks `COMPLETE` (`CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` §4.1).

## 16. Definition of done (this surface)

`/product-a/us-clinics` is done when it is **all** of: strategically clear, conversion-focused, fast, readable, mobile-ready, **and** visually beautiful within four seconds — with the intake API, event contract, and form fields unchanged, no perf regression, AA contrast holding, and the live submit flow verified.

## 17. Document history

| Version | Date (UTC) | Change |
|---|---|---|
| v1 | 2026-06-25 | Initial packet — photo + frosted-glass system for Product A US clinics; reusable `lib/ui/glass.js` + `components/beauty/*` primitives; a11y/perf/asset-governance/Plausible measurement plan; hard constraints (no intake API / event contract / form-field changes; no CRM/GHL/SMS/auto-send/LLM). Docs-only; runtime restyle gated. |
