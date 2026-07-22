/**
 * Lux tenant marketing tokens — CorpFlowAI host only.
 *
 * Client-facing rename stage 1 (#619): public surfaces now present the renamed
 * brand as Rare & Exclusive / Rare & Exclusive Collection while technical
 * identifiers, filenames, imports, tenant_id, and host mappings remain stable.
 *
 * Permanent logo / monogram / graphics remain a separate client approval gate.
 */
export const LUXE_MAURICE_BRAND_TOKENS = {
  /* Brand colours — retained from the existing approved luxury palette. */
  charcoal: '#111111',
  ivory: '#F4EFE8',
  gold: '#A8842C',
  stone: '#6B6256',

  /* Derived layering — strictly inside the four-colour system. */
  charcoalSoft: '#1A1817',
  charcoalDeep: '#0A0A0A',
  ivorySoft: '#E8E2D6',
  ivoryMuted: 'rgba(244, 239, 232, 0.72)',
  ivoryPage: '#F4EFE8',
  stoneSoft: '#8A8278',
  goldDeep: '#7A5F1C',
  goldSoft: 'rgba(168, 132, 44, 0.18)',
  hairline: 'rgba(168, 132, 44, 0.32)',
  hairlineSoft: 'rgba(244, 239, 232, 0.16)',
  hairlineStone: 'rgba(107, 98, 86, 0.22)',

  /* Typography — existing luxury editorial treatment retained. */
  fontDisplay:
    '"Cormorant Garamond", Georgia, "Times New Roman", serif',
  fontBody:
    '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

  radiusEditorial: 2,
  radiusLg: 4,
  radiusMd: 2,

  /* Legacy aliases — admin/operator surfaces only. */
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
  fontUi:
    '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

  /* Editorial-era public aliases. */
  goldEditorial: '#A8842C',
  goldEditorialDeep: '#7A5F1C',
  divider: 'rgba(168, 132, 44, 0.32)',
  dividerSoft: 'rgba(244, 239, 232, 0.16)',
};

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

/** Temporary text-only wordmark signature for stage 1. */
export const LUXE_MAURICE_BRAND_SIGNATURE = 'Rare & Exclusive Collection';

/** Public strapline retaining Mauritius positioning per client-response plan. */
export const LUXE_MAURICE_BRAND_STRAPLINE =
  'Private Wealth & Lifestyle Platform for Mauritius';
