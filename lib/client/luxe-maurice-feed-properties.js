/**
 * Legacy preview-only `lxf-*` reference set (historical Phase 2B).
 *
 * Repositioned 2026-06-11 (LuxeMaurice Private Wealth & Lifestyle Platform):
 * this module is **no longer rendered on public surfaces**. The homepage and
 * `/properties` do not list these entries. The module is kept only so that
 * direct navigation to an `lxf-*` slug (e.g. an old bookmark) continues to
 * resolve via `resolveLuxPropertyRef` for backward compatibility; the public
 * detail page presents the same private-opportunity overview shell. No
 * external real-estate feed (IDX / MLS) integration is required for active
 * delivery.
 */

/** @typedef {{ id: string, title: string, location: string, property_type: string, price_range?: string | null, status?: string | null }} LuxFeedProperty */

/** @type {LuxFeedProperty[]} */
export const LUXE_MAURICE_FEED_PROPERTIES = [
  {
    id: 'lxf-grand-baie-apt',
    title: 'Coastal apartments — Grand Baie corridor',
    location: 'Grand Baie',
    property_type: 'Apartment',
    price_range: 'From approx. USD 720k',
    status: 'Market preview (mock feed)',
  },
  {
    id: 'lxf-tamarin-villa',
    title: 'West coast villa — Tamarin foothills',
    location: 'Tamarin / Black River',
    property_type: 'Villa',
    price_range: 'USD 1.8M – 2.4M (indicative)',
    status: 'Market preview (mock feed)',
  },
  {
    id: 'lxf-poste-lafayette',
    title: 'North-east beachfront stack',
    location: 'Poste Lafayette',
    property_type: 'Penthouse',
    price_range: 'On application',
    status: 'Market preview (mock feed)',
  },
];

const FEED_ID_RE = /^lxf-[a-z0-9-]{1,56}$/;

/**
 * @param {unknown} id
 * @returns {boolean}
 */
export function isLuxFeedPropertyId(id) {
  const s = id != null ? String(id).trim().toLowerCase() : '';
  return FEED_ID_RE.test(s) && LUXE_MAURICE_FEED_PROPERTIES.some((p) => p.id === s);
}

/**
 * @param {unknown} id
 * @returns {LuxFeedProperty | null}
 */
export function findLuxFeedPropertyById(id) {
  const s = id != null ? String(id).trim().toLowerCase() : '';
  if (!FEED_ID_RE.test(s)) return null;
  return LUXE_MAURICE_FEED_PROPERTIES.find((p) => p.id === s) || null;
}
