/**
 * LuxeMaurice `/properties` public copy + URL helpers (no React).
 * Used by `components/LuxeMauricePropertiesDirectory.js` and node tests.
 */

/** Public copy — audited in `node-tests/luxe-maurice-properties-directory.test.mjs`. */
export const LUX_PROPERTIES_PUBLIC_COPY = {
  pageTitle: 'Properties · Luxurious Mauritius',
  emptyKicker: 'Private property showcase',
  emptyTitle: 'A quiet moment before the first reveal',
  emptyBody:
    'The first LuxeMaurice property is being prepared for client review. When it is ready, it will appear here with the same discretion you expect from a private acquisition desk.',
  emptyCta: 'Speak with the concierge',
  listKicker: 'Curated inventory',
  listTitle: 'Private introductions',
  listSubtitle:
    'Each listing is prepared for review before it appears publicly. Enquire for availability, terms, and next steps.',
  cardCtaDetails: 'Overview',
  cardCtaConcierge: 'Enquire',
  headerTagline: 'Private acquisitions',
};

const FORBIDDEN = ['corpflow', 'tenant', 'tenant_id', 'draft', 'demo', 'idx', 'mls', 'saas'];

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
