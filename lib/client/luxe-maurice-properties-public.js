/**
 * Rare & Exclusive Collection `/properties` public copy + URL helpers (no React).
 * Used by `components/LuxeMauricePropertiesDirectory.js` and node tests.
 *
 * Public brand presentation: Rare & Exclusive Collection (Issues #633 / #636).
 * Technical tenant identifiers remain `luxe-maurice` / lux.corpflowai.com.
 */

/** Public copy — audited in `node-tests/luxe-maurice-properties-directory.test.mjs`. */
export const LUX_PROPERTIES_PUBLIC_COPY = {
  pageTitle: 'Private Opportunities · Rare & Exclusive Collection',
  emptyKicker: 'Private opportunities',
  emptyTitle: 'A quiet moment before the next reveal',
  emptyBody:
    'Private opportunities are being prepared for client review. When the next opportunity is ready, it will appear here with the same discretion you expect from a private advisory desk.',
  emptyCta: 'Request a private consultation',
  listKicker: 'Curated opportunities',
  listTitle: 'Private introductions',
  listSubtitle:
    'Each opportunity is prepared for review before it appears. Cards show region, type, and status for orientation — availability and terms are confirmed privately. Invitation only.',
  cardCtaDetails: 'Opportunity overview',
  cardCtaConcierge: 'Request private access',
  headerTagline: 'Invited. Not advertised.',
  guidanceTitle: 'How private opportunities are presented',
  guidanceBody:
    'This directory is not an open listing feed. It is a curated set of introductions for clients who arrive by invitation. Speak with a private advisor before making any decision.',
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
