/**
 * LuxeMaurice `/properties` public copy + URL helpers (no React).
 * Used by `components/LuxeMauricePropertiesDirectory.js` and node tests.
 *
 * Repositioned 2026-06-11 to the *Private Opportunities* framing under the
 * LuxeMaurice Private Wealth & Lifestyle Platform direction
 * (see `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_2030.md`).
 */

/** Public copy — audited in `node-tests/luxe-maurice-properties-directory.test.mjs`. */
export const LUX_PROPERTIES_PUBLIC_COPY = {
  pageTitle: 'Private Opportunities · LuxeMaurice',
  emptyKicker: 'Private opportunities',
  emptyTitle: 'A quiet moment before the next reveal',
  emptyBody:
    'Private opportunities are being prepared for client review. When the next opportunity is ready, it will appear here with the same discretion you expect from a private advisory desk.',
  emptyCta: 'Request a private consultation',
  listKicker: 'Curated · private opportunities',
  listTitle: 'Private introductions',
  listSubtitle:
    'Each opportunity is prepared for review before it appears publicly. Speak with a private advisor for availability, terms, and next steps.',
  cardCtaDetails: 'Opportunity overview',
  cardCtaConcierge: 'Request a private consultation',
  headerTagline: 'Invited. Not advertised.',
};

const FORBIDDEN = [
  'corpflow',
  'tenant',
  'tenant_id',
  'draft',
  'demo',
  'idx',
  'mls',
  'saas',
  'realtor platform',
  'real estate platform',
  'property feed',
  'feed-first',
];

export function luxPropertiesCopyAuditGuard(extraStrings = []) {
  const blob = [...Object.values(LUX_PROPERTIES_PUBLIC_COPY), ...extraStrings].join('\n').toLowerCase();
  for (const w of FORBIDDEN) {
    if (blob.includes(w)) return { ok: false, term: w };
  }
  return { ok: true };
}

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * @param {string | null | undefined} slug
 */
export function buildLuxPropertyConciergeHref(slug) {
  const s = safeStr(slug);
  if (!s) return '/concierge?intent=property';
  return `/concierge?intent=property&property=${encodeURIComponent(s)}`;
}
