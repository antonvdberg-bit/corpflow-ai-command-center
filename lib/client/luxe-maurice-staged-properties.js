/**
 * Staged curated listings for LuxeMaurice (`lux.corpflowai.com`) — Phase 2 first slice.
 * Single source for SSR, property cards, concierge context, and CMP allowlist validation.
 * Not IDX; slugs are stable editorial ids only.
 */

/**
 * @typedef {{
 *   slug: string,
 *   title: string,
 *   region: string,
 *   property_type: string,
 *   status: string,
 *   group: string,
 *   teaser: string,
 *   source?: 'manual_curated',
 *   price_range?: string | null,
 *   summary?: string,
 *   highlights?: string[],
 *   images?: { hero?: string | null },
 *   demo?: true,
 * }} LuxStagedProperty
 */

/** @type {LuxStagedProperty[]} */
export const LUXE_MAURICE_STAGED_PROPERTIES = [
  {
    slug: 'lm-nc-ridge',
    title: 'North Coast Ridge Residences',
    region: 'North Mauritius',
    property_type: 'Residences',
    status: 'Private preview',
    group: 'north',
    teaser: 'Beach-close apartments with services nearby — developer inventory by private introduction.',
  },
  {
    slug: 'lm-villa-belombre',
    title: 'Bel Ombre villa enclave',
    region: 'South & heritage coast',
    property_type: 'Villas',
    status: 'Details on request',
    group: 'villa',
    teaser: 'Low-density plots and ocean outlooks; floorplans and previews through concierge only.',
  },
  {
    slug: 'lm-pent-plateau',
    title: 'Plateau super-prime penthouse',
    region: 'Central plateau',
    property_type: 'Penthouse',
    status: 'Private preview',
    group: 'north',
    teaser: 'A single staged super-prime line — availability confirmed with the developer.',
  },
  {
    slug: 'lm-pipeline-q4',
    title: 'Pipeline — Q4 release',
    region: 'Island-wide',
    property_type: 'Mixed',
    status: 'Register interest',
    group: 'pipeline',
    teaser: 'Join the early list for the next developer-backed release; terms on agreement only.',
  },
  {
    slug: 'lm-phase2d-manual-demo',
    title: 'Le Château — manual workflow demonstration',
    region: 'Moka foothills',
    property_type: 'Estate villa',
    status: 'Private preview',
    group: 'villa',
    teaser: 'Placeholder for Phase 2D manual curated intake — replace with client-approved copy when ready.',
    source: 'manual_curated',
    price_range: 'On application',
    summary:
      'Demonstration-only entry for the LuxeMaurice manual curated workflow. It is not a binding offer, not confirmed inventory, and exists until operators replace it with client-approved property data. Availability, pricing, and documentation are shared only through the private concierge after verification.',
    highlights: [
      'Illustrative estate-scale layout — not a measured survey',
      'Operator replaces this block after client intake PR',
    ],
    demo: true,
  },
];

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

/**
 * @param {unknown} slug
 * @returns {boolean}
 */
export function isLuxStagedPropertySlug(slug) {
  const s = slug != null ? String(slug).trim().toLowerCase() : '';
  return SLUG_RE.test(s) && LUXE_MAURICE_STAGED_PROPERTIES.some((p) => p.slug === s);
}

/**
 * @param {unknown} slug
 * @returns {LuxStagedProperty | null}
 */
export function findLuxStagedPropertyBySlug(slug) {
  const s = slug != null ? String(slug).trim().toLowerCase() : '';
  if (!SLUG_RE.test(s)) return null;
  return LUXE_MAURICE_STAGED_PROPERTIES.find((p) => p.slug === s) || null;
}

/**
 * @param {'all' | 'north' | 'villa' | 'pipeline'} group
 * @returns {LuxStagedProperty[]}
 */
export function filterLuxStagedPropertiesByGroup(group) {
  const g = String(group || 'all').trim().toLowerCase();
  if (g === 'all') return [...LUXE_MAURICE_STAGED_PROPERTIES];
  return LUXE_MAURICE_STAGED_PROPERTIES.filter((p) => p.group === g);
}

/**
 * Demo / placeholder entries are illustrative material that operators replace once
 * Jan supplies real opportunity data. They must never appear on public LuxeMaurice
 * surfaces (`/`, `/properties`, `/property/[slug]`, `/concierge`) as if they were
 * real inventory. They remain in the catalog so editor-preview routes and audit
 * tooling can still reach them.
 *
 * @param {unknown} entry
 */
export function isLuxStagedDemoEntry(entry) {
  return entry != null && typeof entry === 'object' && entry.demo === true;
}

/**
 * @param {unknown} slug
 */
export function isLuxStagedDemoSlug(slug) {
  const s = slug != null ? String(slug).trim().toLowerCase() : '';
  if (!SLUG_RE.test(s)) return false;
  const found = LUXE_MAURICE_STAGED_PROPERTIES.find((p) => p.slug === s);
  return !!found && isLuxStagedDemoEntry(found);
}

/**
 * Public-facing view of the staged catalog. Strips entries marked `demo: true` so
 * they cannot be rendered on `/` / `/properties` / `/property/[slug]` as real inventory.
 *
 * @param {LuxStagedProperty[] | null | undefined} list — defaults to the canonical staged catalog
 * @returns {LuxStagedProperty[]}
 */
export function getPublicLuxStagedProperties(list) {
  const src = Array.isArray(list) ? list : LUXE_MAURICE_STAGED_PROPERTIES;
  return src.filter((p) => !isLuxStagedDemoEntry(p));
}
