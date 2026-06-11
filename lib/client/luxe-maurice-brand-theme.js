/**
 * LuxeMaurice (luxe-maurice) tenant marketing tokens — CorpFlowAI host only.
 * Used by `components/LuxeMauriceTenantPresentation.js`, `pages/concierge.js`,
 * `components/LuxeMauricePropertiesDirectory.js`, and
 * `components/LuxeMauricePropertyDetailPage.js`.
 * Not applied to Core, apex CorpFlow marketing, or other tenants.
 *
 * Brand fidelity (2026-06-11 — LuxeMaurice brand guideline, client-approved):
 *
 *   Charcoal #111111   Ivory #F4EFE8   Gold #A8842C   Stone #6B6256
 *
 *   Headings  Cormorant Garamond (Regular / Medium / Semibold)
 *             Fallback: Georgia, "Times New Roman", serif
 *   Body      Inter (Regular / Medium / Semibold)
 *             Fallback: system-ui, -apple-system, Segoe UI, Roboto, sans-serif
 *
 *   Design language pillars
 *     Exclusive    — Invitation only
 *     Strategic    — Forward thinking
 *     Private      — Discreet & secure
 *     Extraordinary — Exceptional quality
 *
 * Design rules from the brand guideline:
 *   - Large areas of negative space.
 *   - Avoid hard borders where possible (prefer gold or ivory hairlines).
 *   - Avoid bright white. Avoid bright blue. Avoid generic web gradients.
 *   - Do not introduce random colours outside the four-colour system.
 *
 * Pre-existing `sand` / `pageBg` / `heroDeep` / `heroMid` tokens are kept
 * for backward compatibility with the LuxeMaurice **admin / editor** surfaces
 * (`components/LuxeMauricePropertiesAdminApp.js`) so existing operator
 * workflows do not visually regress while the **public** surfaces are
 * redesigned to the editorial dark / gold / ivory brand guideline. New
 * editorial tokens drive every public client surface.
 */
export const LUXE_MAURICE_BRAND_TOKENS = {
  /* ─── Brand colours — authoritative spec ────────────────────────────── */
  charcoal: '#111111',
  ivory: '#F4EFE8',
  gold: '#A8842C',
  stone: '#6B6256',

  /* ─── Derived layering — strictly inside the four-colour system ───── */
  /** Slightly lifted off the pure-charcoal page, for quiet bands. */
  charcoalSoft: '#1A1817',
  /** Deeper than the brand charcoal, for hero edges and footer plate. */
  charcoalDeep: '#0A0A0A',
  /** Slightly cooler ivory, used for inverted (light-on-dark inverted) bands. */
  ivorySoft: '#E8E2D6',
  /** Ivory on charcoal, soft secondary text. */
  ivoryMuted: 'rgba(244, 239, 232, 0.72)',
  /** Ivory used as the page color where we want a touch of warmth. */
  ivoryPage: '#F4EFE8',
  /** Stone on ivory — quiet body / caption text on light bands. */
  stoneSoft: '#8A8278',
  /** Gold variants — darker for legibility on ivory, soft for hairlines. */
  goldDeep: '#7A5F1C',
  goldSoft: 'rgba(168, 132, 44, 0.18)',
  /** Gold hairline — preferred over solid borders on dark bands. */
  hairline: 'rgba(168, 132, 44, 0.32)',
  /** Ivory hairline — preferred over solid borders on light bands. */
  hairlineSoft: 'rgba(244, 239, 232, 0.16)',
  /** Stone hairline — quiet structural divider on ivory bands. */
  hairlineStone: 'rgba(107, 98, 86, 0.22)',

  /* ─── Typography — exact spec from the brand guideline ──────────────── */
  fontDisplay:
    '"Cormorant Garamond", Georgia, "Times New Roman", serif',
  fontBody:
    '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

  /* ─── Editorial spacing + radii ─────────────────────────────────────── */
  /** Editorial works at near-zero radii. Reserved for cards / inputs where
   *  a chrome-less hairline would be visually weaker than a soft round. */
  radiusEditorial: 2,
  radiusLg: 4,
  radiusMd: 2,

  /* ─── Legacy aliases — admin surfaces only ──────────────────────────── */
  pageBg: '#faf6ef',
  sand: '#f2ebe0',
  white: '#ffffff',
  ink: '#1c1917',
  inkMuted: '#5c5347',
  heroDeep: '#3d3428',
  heroMid: '#5c4d3d',
  border: 'rgba(28, 25, 23, 0.12)',
  borderStrong: 'rgba(28, 25, 23, 0.2)',
  placeholder: 'linear-gradient(135deg, #e8e0d4 0%, #d8cfc0 100%)',
  /** Backward-compat alias of body font, kept so admin components that
   *  still import `T.fontUi` keep rendering until they are migrated. */
  fontUi:
    '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

  /* ─── Editorial-era public aliases ─────────────────────────────────── */
  /** Backward-compat aliases for code committed in PR #343 that referenced
   *  `goldEditorial` / `goldEditorialDeep` / `divider` / `dividerSoft`.
   *  New code should use the named brand tokens above. */
  goldEditorial: '#A8842C',
  goldEditorialDeep: '#7A5F1C',
  divider: 'rgba(168, 132, 44, 0.32)',
  dividerSoft: 'rgba(244, 239, 232, 0.16)',
};

/**
 * Design-language pillars from the brand guideline.
 * Used on the homepage and (selectively) in the footer / advisory copy.
 */
export const LUXE_MAURICE_DESIGN_PILLARS = Object.freeze([
  Object.freeze({
    key: 'exclusive',
    label: 'Exclusive',
    sub: 'Invitation only',
  }),
  Object.freeze({
    key: 'strategic',
    label: 'Strategic',
    sub: 'Forward thinking',
  }),
  Object.freeze({
    key: 'private',
    label: 'Private',
    sub: 'Discreet & secure',
  }),
  Object.freeze({
    key: 'extraordinary',
    label: 'Extraordinary',
    sub: 'Exceptional quality',
  }),
]);

/**
 * Brand signature, as used on the wordmark plates.
 * Surface-local copy may inline this, but tests pin the canonical value here.
 */
export const LUXE_MAURICE_BRAND_SIGNATURE = 'Private. Curated. Considered.';

/**
 * Brand strapline used under the wordmark in the guideline.
 */
export const LUXE_MAURICE_BRAND_STRAPLINE =
  'A Private Wealth & Lifestyle Platform for Mauritius';
