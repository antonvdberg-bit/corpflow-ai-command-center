# `public/assets/fonts/` — self-hosted CorpFlowAI fonts

Canonical source of truth: **`docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md`** § 6 *Phase B step 2*.

Decision lineage: Anton, Operator Bridge **`#249`** — *"use defaults"* (2026-05-29) → *"proceed with step 2"* (2026-05-30).

## Files

| File | Purpose | Size | Provenance |
|---|---|---|---|
| `InterVariable.woff2` | Inter Variable (upright, weights 100–900) self-hosted woff2 | ~344 KB | rsms/inter v4.1 release zip → `web/InterVariable.woff2` |
| `OFL.txt` | SIL Open Font License 1.1 — required redistribution notice | ~4 KB | rsms/inter v4.1 release zip → `LICENSE.txt` |

## Provenance — `InterVariable.woff2`

| Field | Value |
|---|---|
| Upstream project | [rsms/inter](https://github.com/rsms/inter) |
| Release tag | `v4.1` |
| Release URL | `https://github.com/rsms/inter/releases/tag/v4.1` |
| Release-zip download URL | `https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip` |
| Path inside zip | `web/InterVariable.woff2` |
| Variable axes | weight `wght` 100–900 (continuous) |
| Italic? | **No** — italic axis is intentionally **not** shipped (no apex page uses italic Inter; ship-the-minimum). Re-evaluate when first italic usage lands in apex components. |
| File SHA-256 (committed) | `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3` |
| Release-zip SHA-256 | `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e` |
| Date placed in repo | 2026-05-30 |

## Provenance — `OFL.txt`

| Field | Value |
|---|---|
| Source | rsms/inter v4.1 release-zip → `LICENSE.txt` (root of the zip) |
| Licence | SIL Open Font License (OFL) 1.1 |
| Copyright | Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter) |
| Why renamed | Conventional name for the OFL bundle in self-hosted font folders. The contents are byte-identical to the upstream `LICENSE.txt`. |

## How the runtime uses these files

1. **`@font-face` declaration** lives in `pages/_document.js` `<Head>` as a single `<style>` block. It declares `font-family: 'Inter'`, `font-weight: 100 900`, `font-style: normal`, `font-display: swap`, and `src: url('/assets/fonts/InterVariable.woff2') format('woff2-variations'), url('/assets/fonts/InterVariable.woff2') format('woff2')`.
2. **No `<link rel="preload">`.** This is deliberate. Apex pages (`components/CorpFlowPublicHome.js`, `components/AiLeadRescueLanding.js`, `components/PublicPolicyLayout.js`, `components/AiLeadRescueAdmin*.js`) declare inline `font-family: 'Inter, ui-sans-serif, system-ui, ...'` and the browser will fetch `InterVariable.woff2` only when those rules match — i.e. on apex requests. Tenant brands (Lux components — `T.fontUi`, `T.fontDisplay`) and operator surfaces (`/change`, `/change-v2`, factory views) do **not** reference `'Inter'`, so the woff2 is **not** downloaded for those visitors. Skipping preload is what preserves that scoping; adding it later is a deliberate apex-perf choice, not a default.
3. **`font-display: swap`.** Apex paint stays on the system fallback (`ui-sans-serif` / `system-ui` / `BlinkMacSystemFont` / `Segoe UI`) until Inter is available; then the page swaps. No invisible-text-on-load (FOIT). The brand-identity doctrine note in `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *Typography direction* records this.

## How to update

When a new Inter release ships and we want to refresh:

1. Download the new release zip from `https://github.com/rsms/inter/releases/<tag>`.
2. Verify the zip SHA-256 against the GitHub release-asset SHA shown by `gh api repos/rsms/inter/releases/<tag>`.
3. Extract `web/InterVariable.woff2` and overwrite `public/assets/fonts/InterVariable.woff2`.
4. Replace `OFL.txt` with the new release zip's `LICENSE.txt` (in case the OFL notice updates).
5. Update **this README** with the new release tag, both SHA-256s, and the date.
6. Run `npm run build`; verify the apex `/` and `/lead-rescue` URLs still serve `200` and the new font (DevTools Network filter `Type: Font`, expect `InterVariable.woff2`, status `200`, MIME `font/woff2`).
7. Open a small docs+asset PR and follow the Delivery Reality Audit pattern in `.cursor/rules/delivery-reality.mdc`.

Do **not** convert this folder to a third-party CDN reference (`fonts.googleapis.com`, `rsms.me/inter`, etc.) without a **separate proposal**: hosting third-party fonts re-introduces a sub-processor, cookie, and cache-busting trust boundary that the data-map (`docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`) currently does not include.
