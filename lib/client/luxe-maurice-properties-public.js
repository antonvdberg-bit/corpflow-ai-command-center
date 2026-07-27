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
    'A small curated set of Mauritius opportunities — invitation only, not a public catalogue. Each card shows region, type, status, and positioning for orientation. Full details and terms follow only after a private-access request is reviewed.',
  cardCtaDetails: 'Opportunity memorandum',
  cardCtaConcierge: 'Request private access',
  headerTagline: 'Invited. Not advertised.',
  guidanceTitle: 'How private opportunities are presented',
  guidanceBody:
    'This is a private-access platform, not an open property portal. Opportunities are prepared for review, then introduced with discretion. Request private access when you wish an advisor to qualify your enquiry and select what can be shared next.',
  journeyTitle: 'What happens after you request access',
  journeyBody:
    'Your request is received, qualified by advisory, matched to suitable private information, and followed up under controlled introduction — never as an open-market listing response.',
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
