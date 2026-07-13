/**
 * Governed CorpFlowAI public hero / trust-band visual slots.
 * Source masters: artifacts/visual-sources/corpflow-public/ (1024px draft — NEEDS_ANTON ≥2400).
 * Runtime: PublicMarketingPhotoGlassShell base + -768 variants.
 */

/** @typedef {{
 *   id: string,
 *   base: string,
 *   objectPositionDesktop: string,
 *   objectPositionMobile: string,
 *   alt: string,
 *   route: string,
 * }} CorpflowPublicVisualSlot */

/** @type {Record<'home'|'contact'|'about'|'process'|'trust', CorpflowPublicVisualSlot>} */
export const CORPFLOW_PUBLIC_VISUALS = {
  home: {
    id: 'corpflow-home-hero',
    base: '/assets/visuals/corpflow-home-hero',
    objectPositionDesktop: '68% center',
    objectPositionMobile: '68% center',
    alt: 'Coastal city and waterfront at sunset with a subtle digital network overlay.',
    route: '/',
  },
  contact: {
    id: 'corpflow-contact-hero',
    base: '/assets/visuals/corpflow-contact-hero',
    objectPositionDesktop: '72% center',
    objectPositionMobile: '72% center',
    alt: 'Warm coastal skyline at sunset with a restrained technology network motif.',
    route: '/contact',
  },
  about: {
    id: 'corpflow-about-hero',
    base: '/assets/visuals/corpflow-about-hero',
    objectPositionDesktop: '70% center',
    objectPositionMobile: '70% center',
    alt: 'Elevated coastal city view at sunset with a subtle connected-network overlay.',
    route: '/about',
  },
  process: {
    id: 'corpflow-process-hero',
    base: '/assets/visuals/corpflow-process-hero',
    objectPositionDesktop: '72% center',
    objectPositionMobile: '72% center',
    alt: 'Modern waterfront terrace and skyline with directional digital light trails.',
    route: '/process',
  },
  trust: {
    id: 'corpflow-trust-band',
    base: '/assets/visuals/corpflow-trust-band',
    objectPositionDesktop: '75% center',
    objectPositionMobile: '75% center',
    alt: 'Abstract blue waterfront horizon with a subtle connected-network pattern.',
    route: '/',
  },
};

/**
 * Build PublicMarketingPhotoGlassShell hero props for a slot.
 * @param {keyof typeof CORPFLOW_PUBLIC_VISUALS} key
 * @param {{ mobile?: boolean }} [opts]
 */
export function buildPublicVisualHero(key, opts = {}) {
  const slot = CORPFLOW_PUBLIC_VISUALS[key];
  if (!slot) return null;
  const base = slot.base;
  const objectPosition = opts.mobile ? slot.objectPositionMobile : slot.objectPositionDesktop;
  return {
    base,
    objectPosition,
    alt: '', // decorative — meaning carried by page HTML (accessibility.decorative in manifest)
    sources: [
      { type: 'image/avif', media: '(max-width: 768px)', srcSet: `${base}-768.avif` },
      { type: 'image/webp', media: '(max-width: 768px)', srcSet: `${base}-768.webp` },
      { media: '(max-width: 768px)', srcSet: `${base}-768.jpg` },
      { type: 'image/avif', srcSet: `${base}.avif` },
      { type: 'image/webp', srcSet: `${base}.webp` },
    ],
    preloadSrcSet: `${base}-768.avif 768w, ${base}.avif 1024w`,
    fallbackSrc: `${base}.jpg`,
  };
}

/** Desktop left-weighted readability overlay guidance (applied as CSS layer when used). */
export const CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP =
  'linear-gradient(90deg, rgba(3, 15, 34, 0.96) 0%, rgba(3, 15, 34, 0.88) 34%, rgba(3, 15, 34, 0.42) 62%, rgba(3, 15, 34, 0.12) 100%)';

export const CORPFLOW_PUBLIC_HERO_SCRIM_MOBILE =
  'linear-gradient(180deg, rgba(3, 15, 34, 0.9) 0%, rgba(3, 15, 34, 0.82) 62%, rgba(3, 15, 34, 0.72) 100%)';

export const CORPFLOW_PUBLIC_TRUST_SCRIM =
  'linear-gradient(180deg, rgba(3, 15, 34, 0.78) 0%, rgba(3, 15, 34, 0.88) 100%)';
