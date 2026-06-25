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
  // enough to hold white text at AA over the warm photograph.
  glassFill: 'rgba(10,16,26,0.56)',
  glassFillStrong: 'rgba(9,14,22,0.68)',
  // Subtle, lighter surface for low-priority chrome (e.g. the footer): still
  // legible, but clearly recessed beneath the content panels.
  glassFillSoft: 'rgba(10,16,26,0.50)',
  glassBorder: 'rgba(255,255,255,0.22)',
  glassBlur: '24px',
  // Interior sheen: a soft top-left light edge fading to nothing, layered ABOVE
  // the fill so each panel reads as a dimensional sheet of glass catching light
  // rather than a flat tinted card. Kept low-opacity so it never harms AA.
  glassSheen:
    'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 18%, rgba(255,255,255,0) 52%)',
  glassRadius: 24,
  // Opaque fallback used when transparency/blur is disabled by the OS.
  solidFallback: '#0f1b2e',
  // System/affordance accent (focus rings, eyebrows, success state).
  accent: '#2dd4bf',
  onAccent: '#031018',
  // Premium warm action accent — champagne→bronze gradient that harmonises with
  // the warm medspa photograph. Solid (opaque) by design: the primary CTA must
  // never be translucent. Dark text keeps it well above AA on the light fill.
  ctaWarm: 'linear-gradient(135deg, #f3cd8a 0%, #d79a4a 100%)',
  ctaWarmText: '#2a1a08',
  ctaWarmShadow: '0 12px 26px rgba(150,100,28,0.40)',
  text: '#eef6ff',
  textMuted: '#d3e0ee',
});

/**
 * Layered, soft drop shadow + inset highlights that give a glass panel real
 * depth. `elevation` separates the z-depth of panels (1 = recessed/secondary,
 * 2 = default content, 3 = primary hero/form). Higher elevation = a deeper but
 * still-soft cast shadow, so the eye reads a clear stack of glass sheets.
 *
 * @param {1|2|3} [elevation]
 * @returns {string}
 */
export function glassElevationShadow(elevation = 2) {
  // Two cast layers per panel: a tight AMBIENT shadow that crisply lifts the
  // card off the photograph, plus a large, soft KEY shadow that reads as the
  // panel floating above the background. Higher elevation = a deeper, softer
  // rear shadow and stronger separation from the image.
  const [ambient, key] =
    {
      1: ['0 2px 10px rgba(0,0,0,0.26)', '0 18px 46px rgba(0,0,0,0.36)'],
      2: ['0 4px 14px rgba(0,0,0,0.30)', '0 34px 80px rgba(0,0,0,0.48)'],
      3: ['0 8px 22px rgba(0,0,0,0.34)', '0 56px 132px rgba(0,0,0,0.58)'],
    }[elevation] || ['0 4px 14px rgba(0,0,0,0.30)', '0 34px 80px rgba(0,0,0,0.48)'];
  // ambient + key (rear depth) + crisp top light edge + hairline rim + soft
  // inner bottom shade so the lower lip of the glass reads as real thickness,
  // not a flat card.
  return [
    ambient,
    key,
    'inset 0 1px 0 rgba(255,255,255,0.24)',
    'inset 0 0 0 1px rgba(255,255,255,0.05)',
    'inset 0 -24px 48px rgba(0,0,0,0.14)',
  ].join(', ');
}

/**
 * Subtle vertical lift (px) per elevation so primary panels (hero/form) sit
 * slightly higher than secondary/recessed ones — a gentle z-stagger that
 * reinforces depth. Applied as a `translateY`, so it never affects layout/CLS.
 * Deliberately small to stay premium, not gimmicky.
 *
 * @param {1|2|3} [elevation]
 * @returns {number}
 */
export function glassElevationLift(elevation = 2) {
  return { 1: 0, 2: 1, 3: 3 }[elevation] ?? 1;
}

/**
 * Build the inline style object for a frosted glass panel. Callers may
 * override opacity (fill), tint (border), thickness (blur), radius, padding,
 * shadow, elevation (z-depth), text colour, and the interior sheen per the
 * standard's "panels may vary" rule — within combinations that still pass
 * WCAG AA contrast.
 *
 * The fill is composited UNDER a low-opacity sheen gradient so the panel reads
 * as layered, dimensional glass (top-left light edge + soft interior fade),
 * while `elevation` drives a deeper/softer cast shadow for clear z-separation
 * between hero, form, and secondary cards.
 *
 * @param {{fill?:string,border?:string,blur?:string,radius?:number,padding?:number|string,shadow?:string,color?:string,elevation?:1|2|3,sheen?:string|false,lift?:boolean}} [opts]
 * @returns {React.CSSProperties}
 */
export function glassPanelStyle(opts = {}) {
  const t = GLASS_TOKENS;
  const blur = opts.blur || t.glassBlur;
  // blur + saturate is what makes a translucent panel read as *frosted* glass
  // (colour from the photo bleeds through and is gently intensified) rather
  // than a flat tinted card.
  const filter = `blur(${blur}) saturate(140%)`;
  const fill = opts.fill || t.glassFill;
  // sheen sits on top of the fill (first background layer paints last on top).
  const sheen = opts.sheen === false ? null : opts.sheen || t.glassSheen;
  const background = sheen ? `${sheen}, ${fill}` : fill;
  const elevation = opts.elevation ?? 2;
  // translateY lift (visual only, no layout/CLS impact) reinforces the z-stack.
  const lift = opts.lift === false ? 0 : glassElevationLift(elevation);
  return {
    position: 'relative',
    border: `1px solid ${opts.border || t.glassBorder}`,
    borderRadius: opts.radius ?? t.glassRadius,
    background,
    boxShadow: opts.shadow || glassElevationShadow(elevation),
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
    transform: lift ? `translateY(-${lift}px)` : undefined,
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
