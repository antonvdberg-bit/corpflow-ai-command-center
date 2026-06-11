/**
 * LuxeMaurice (luxe-maurice) tenant marketing tokens — CorpFlowAI host only.
 * Used by `components/LuxeMauriceTenantPresentation.js`, `pages/concierge.js`,
 * `components/LuxeMauricePropertiesDirectory.js`, and
 * `components/LuxeMauricePropertyDetailPage.js`.
 * Not applied to Core, apex CorpFlow marketing, or other tenants.
 *
 * Palette direction (2026-06-11 — Private Wealth & Lifestyle Platform):
 * editorial dark charcoal for hero / cinematic bands, warm ivory for
 * content sections, restrained gold for headings and dividers. Pre-existing
 * sand / brown tokens are retained for backward compatibility with existing
 * admin / form surfaces; new editorial tokens drive the public client surfaces.
 */
export const LUXE_MAURICE_BRAND_TOKENS = {
  pageBg: '#faf6ef',
  sand: '#f2ebe0',
  white: '#ffffff',
  ink: '#1c1917',
  inkMuted: '#5c5347',
  heroDeep: '#3d3428',
  heroMid: '#5c4d3d',
  gold: '#b8952e',
  goldDeep: '#8a6f1c',
  border: 'rgba(28, 25, 23, 0.12)',
  borderStrong: 'rgba(28, 25, 23, 0.2)',
  placeholder: 'linear-gradient(135deg, #e8e0d4 0%, #d8cfc0 100%)',
  radiusLg: 20,
  radiusMd: 14,
  fontUi: 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontDisplay: 'Georgia, "Times New Roman", serif',

  /* Editorial — dark charcoal / gold / ivory (vision-aligned 2026-06-11) */
  charcoal: '#141210',
  charcoalDeep: '#0b0a09',
  charcoalSoft: '#1f1c19',
  ivory: '#f5efe4',
  ivorySoft: '#ece4d3',
  ivoryMuted: 'rgba(245, 239, 228, 0.72)',
  goldEditorial: '#c9a44a',
  goldEditorialDeep: '#a4842f',
  divider: 'rgba(201, 164, 74, 0.32)',
  dividerSoft: 'rgba(245, 239, 228, 0.18)',
};
