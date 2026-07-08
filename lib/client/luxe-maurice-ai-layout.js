/**
 * Shared layout tokens for LuxeMaurice AI v2 preview routes.
 * Mobile-first spacing, CTA visibility, and multi-channel positioning helpers.
 */

import { LUXE_MAURICE_BRAND_TOKENS as T } from './luxe-maurice-brand-theme.js';

export const LUXE_MAURICE_AI_BASE = '/client/luxe-maurice-ai';

export const LUXE_MAURICE_AI_SECTION_PAD = 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 56px)';

export const LUXE_MAURICE_AI_MULTI_CHANNEL_TAGLINE =
  'Multi-channel private access — residences, yachts, aviation, island experiences, and advisory introductions.';

/** Primary CTA — full width on narrow viewports via minWidth + flex. */
export function luxeMauriceAiCtaPrimary(extra = {}) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 'min(100%, 280px)',
    padding: '14px 24px',
    background: T.gold,
    color: T.charcoal,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
    ...extra,
  };
}

/** Secondary CTA — outline, same touch target. */
export function luxeMauriceAiCtaSecondary(extra = {}) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 'min(100%, 280px)',
    padding: '14px 24px',
    border: `1px solid ${T.hairline}`,
    color: T.ivory,
    background: 'rgba(17, 17, 17, 0.35)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    boxSizing: 'border-box',
    ...extra,
  };
}

/** Horizontal CTA row — stacks naturally via flexWrap. */
export const LUXE_MAURICE_AI_CTA_ROW = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 28,
  width: '100%',
};

/** Category chip in nav / filters. */
export function luxeMauriceAiCategoryChip(active = false) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 40,
    padding: '8px 14px',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    color: active ? T.charcoal : T.ivoryMuted,
    background: active ? T.gold : 'transparent',
    border: `1px solid ${active ? T.gold : T.hairlineSoft}`,
    whiteSpace: 'nowrap',
  };
}

/** Properties catalogue filter href. */
export function luxeMauriceAiCatalogueCategoryHref(categoryKey) {
  if (!categoryKey) return `${LUXE_MAURICE_AI_BASE}/properties`;
  return `${LUXE_MAURICE_AI_BASE}/properties?category=${encodeURIComponent(categoryKey)}`;
}

/** Buyer request with pre-selected category. */
export function luxeMauriceAiBuyerCategoryHref(categoryKey) {
  if (!categoryKey) return `${LUXE_MAURICE_AI_BASE}/buyer`;
  return `${LUXE_MAURICE_AI_BASE}/buyer?category=${encodeURIComponent(categoryKey)}`;
}
