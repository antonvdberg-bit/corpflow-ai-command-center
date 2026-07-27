/**
 * Staged curated listings for LuxeMaurice (`lux.corpflowai.com`) — Phase 2 first slice.
 * Single source for SSR, property cards, concierge context, and CMP allowlist validation.
 * Not IDX; slugs are stable editorial ids only.
 *
 * Issue #645 (PR A): public MVP uses this curated set when published `lux_listings`
 * are empty — no schema/env changes. Demo entries stay stripped from public surfaces.
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
    teaser:
      'Beach-close residences with services nearby — introduced privately, not listed on open portals.',
    price_range: 'On application',
    summary:
      'A curated north-coast residence line prepared for private review. Orientation covers setting, service proximity, and the developer introduction path. Floorplans, pricing bands, and availability are confirmed only after a private-access request is qualified by advisory.',
    highlights: [
      'North Mauritius coastal living with services and leisure within easy reach',
      'Developer-backed inventory shared by private introduction only',
      'Orientation memorandum first — full packs reserved for qualified enquiries',
      'Next step: request private details through Rare & Exclusive Collection advisory',
    ],
  },
  {
    slug: 'lm-villa-belombre',
    title: 'Bel Ombre villa enclave',
    region: 'South & heritage coast',
    property_type: 'Villas',
    status: 'Details on request',
    group: 'villa',
    teaser:
      'Low-density villa context on the south and heritage coast — outlooks and plots reviewed with a private advisor.',
    price_range: 'On application',
    summary:
      'A discreet villa enclave opportunity on the quieter south and heritage coast. This memorandum frames density, outlook character, and the controlled path to site context. Measured surveys, terms, and viewing logistics remain advisory-gated.',
    highlights: [
      'South & heritage coast positioning for privacy-forward living',
      'Low-density villa character — not a volume coastal catalogue',
      'Site context and floorplans shared after qualification',
      'Next step: request a private introduction via the concierge desk',
    ],
  },
  {
    slug: 'lm-pent-plateau',
    title: 'Plateau super-prime penthouse',
    region: 'Central plateau',
    property_type: 'Penthouse',
    status: 'Private preview',
    group: 'north',
    teaser:
      'A single staged super-prime penthouse line on the central plateau — availability confirmed with the developer.',
    price_range: 'On application',
    summary:
      'One carefully staged super-prime penthouse introduction on the central plateau. Prepared as a private opportunity memorandum: elevation, privacy, and long-horizon living context. Confirmation of availability and commercial terms proceeds only through advisory review.',
    highlights: [
      'Central plateau setting with elevation and privacy emphasis',
      'Single-line introduction — not a multi-unit public listing strip',
      'Developer confirmation required before any viewing path',
      'Next step: request private access for a controlled briefing',
    ],
  },
  {
    slug: 'lm-pipeline-q4',
    title: 'Pipeline — Q4 release',
    region: 'Island-wide',
    property_type: 'Mixed',
    status: 'Register interest',
    group: 'pipeline',
    teaser:
      'Early interest list for the next curated release — terms and inventory disclosed only after qualification.',
    price_range: 'On application',
    summary:
      'A pipeline register for clients who want early notice of the next curated Mauritius release. This is not open inventory. Suitable matches are selected after your intent is reviewed; materials are shared under controlled follow-up.',
    highlights: [
      'Island-wide pipeline — completed residences and select partnerships',
      'Register interest first; materials are not broadcast',
      'Advisory qualifies timing, budget band, and lifestyle fit',
      'Next step: request private access to join the controlled interest list',
    ],
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

/**
 * Map a staged curated entry to the public `/properties` card row shape
 * (aligned with `fetchPublishedLuxListingsPublic` / `toPublicListRow`).
 *
 * @param {LuxStagedProperty} entry
 */
export function stagedPropertyToPublicListingRow(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const slug = entry.slug != null ? String(entry.slug).trim() : '';
  if (!slug) return null;
  const highlights = Array.isArray(entry.highlights)
    ? entry.highlights.map((h) => String(h).trim()).filter(Boolean).slice(0, 8)
    : [];
  return {
    slug,
    title: entry.title != null ? String(entry.title) : '',
    region_label: entry.region != null ? String(entry.region) : '',
    property_type: entry.property_type != null ? String(entry.property_type) : '',
    listing_status: entry.status != null ? String(entry.status) : '',
    price_range: entry.price_range != null ? String(entry.price_range) : null,
    short_teaser: entry.teaser != null ? String(entry.teaser) : '',
    highlights,
    bedrooms: null,
    bathrooms: null,
    area_sqm: null,
    published_at: null,
    source: 'staged_curated',
  };
}

/**
 * Public curated opportunity cards for `/properties` when published DB rows are absent.
 * Never includes demo entries.
 *
 * @returns {ReturnType<typeof stagedPropertyToPublicListingRow>[]}
 */
export function getPublicLuxStagedListingRows() {
  return getPublicLuxStagedProperties()
    .map(stagedPropertyToPublicListingRow)
    .filter(Boolean);
}
