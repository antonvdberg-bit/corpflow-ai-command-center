/**
 * CorpFlowAI "photo + glass" presentation tokens (Human-First Beauty Layer).
 *
 * Single source of truth for the frosted-glass visual system described in
 * docs/marketing/CORPFLOW_VISUAL_STANDARD_HUMAN_FIRST_BEAUTY_LAYER.md and the
 * Product A adoption packet docs/product/PRODUCT_A_BEAUTY_LAYER_IMPLEMENTATION_PACKET_V1.md.
 *
 * These are presentation-only values layered on the canonical v1 palette
 * (teal #2dd4bf accent, #06111f base, #eef6ff body). No runtime/business
 * behaviour lives here.
 */

export const GLASS_TOKENS = Object.freeze({
  // Warm-tinted, light scrim. Deliberately gentle so the photographic
  // foundation stays clearly visible above the fold; per-panel glass (not a
  // heavy global veil) does the readability work. Slightly stronger at the
  // bottom to anchor the footer.
  scrimDark:
    'linear-gradient(180deg, rgba(12,9,7,0.22) 0%, rgba(12,9,7,0.30) 48%, rgba(12,9,7,0.52) 100%)',
  scrimLight:
    'linear-gradient(180deg, rgba(248,250,252,0.10) 0%, rgba(248,250,252,0.55) 100%)',
  // Translucent enough that the photo reads THROUGH the frosted panel, opaque
  // enough to hold white text at AA over the warm placeholder.
  glassFill: 'rgba(10,16,26,0.56)',
  glassFillStrong: 'rgba(9,14,22,0.68)',
  glassBorder: 'rgba(255,255,255,0.22)',
  glassBlur: '24px',
  // Drop shadow for depth + an inset top highlight + inset hairline so the
  // panel edges catch light and read unmistakably as glass.
  glassShadow:
    '0 30px 90px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(255,255,255,0.04)',
  glassRadius: 24,
  // Opaque fallback used when transparency/blur is disabled by the OS.
  solidFallback: '#0f1b2e',
  accent: '#2dd4bf',
  onAccent: '#031018',
  text: '#eef6ff',
  textMuted: '#d3e0ee',
});

/**
 * Build the inline style object for a frosted glass panel. Callers may
 * override opacity (fill), tint (border), thickness (blur), radius, padding,
 * shadow, and text colour per the standard's "panels may vary" rule — within
 * combinations that still pass WCAG AA contrast.
 *
 * @param {{fill?:string,border?:string,blur?:string,radius?:number,padding?:number|string,shadow?:string,color?:string}} [opts]
 * @returns {React.CSSProperties}
 */
export function glassPanelStyle(opts = {}) {
  const t = GLASS_TOKENS;
  const blur = opts.blur || t.glassBlur;
  // blur + saturate is what makes a translucent panel read as *frosted* glass
  // (colour from the photo bleeds through and is gently intensified) rather
  // than a flat tinted card.
  const filter = `blur(${blur}) saturate(135%)`;
  return {
    position: 'relative',
    border: `1px solid ${opts.border || t.glassBorder}`,
    borderRadius: opts.radius ?? t.glassRadius,
    background: opts.fill || t.glassFill,
    boxShadow: opts.shadow || t.glassShadow,
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
    color: opts.color || t.text,
    padding: opts.padding ?? 22,
  };
}

/**
 * Global CSS that every page using the glass system should render once.
 * Provides the accessibility fallbacks the standard requires:
 *  - prefers-reduced-transparency: drop blur + use an opaque surface so
 *    text never sits on a translucent layer for users who disable it;
 *  - prefers-reduced-motion: disable transitions on glass surfaces.
 *
 * Targets the `.cf-glass` class applied by <GlassPanel>.
 */
export const GLASS_GLOBAL_CSS = [
  '@media (prefers-reduced-transparency: reduce){',
  '.cf-glass{background:' + GLASS_TOKENS.solidFallback + ' !important;',
  'backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}',
  '}',
  '@media (prefers-reduced-motion: reduce){',
  '.cf-glass,.cf-glass *{transition:none !important;animation:none !important;}',
  '}',
].join('');
