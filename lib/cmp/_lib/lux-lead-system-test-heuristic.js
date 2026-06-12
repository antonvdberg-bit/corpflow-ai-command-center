/**
 * Pure heuristic for "is this LuxeMaurice concierge lead a system / test / smoke /
 * placeholder lead?". Used by `handleConciergeLeadsList` to mark each lead row with
 * `system_generated: boolean` so `/change` can default-hide them from the LEADS · New
 * counts strip without losing audit access (a `Show internal/test` toggle still
 * surfaces them).
 *
 * Detection signals (any one is sufficient — conservative on real leads):
 *
 *   1. Contact carries a placeholder / invalid TLD typical of repo smoke tests:
 *      `example.com`, `example.invalid`, `placeholder.local`, `corpflowai.invalid`,
 *      `noreply@`, `donotreply@`, or contains the literal words `smoke` /
 *      `fixture` / `placeholder`.
 *
 *   2. Name matches a known repo fixture / verification pattern: `PHASE<digits>`,
 *      `Phase <digit>`, or a word-bounded `(test|smoke|qa|fixture|verify|automated|sample|seed)`.
 *
 *   3. Message body matches the same word-bounded test pattern.
 *
 *   4. `qualificationJson` carries an explicit flag (`smoke|test|is_test|synthetic`)
 *      OR `qualificationJson.source` matches the test pattern.
 *
 *   5. `listing` references the `lm-phase2d-manual-demo` slug (the only demo /
 *      placeholder property in the staged catalog; flagged via the same module
 *      as `lib/client/luxe-maurice-staged-properties.js#isLuxStagedDemoSlug`).
 *
 * Non-goals: this is **not** an anti-fraud filter, it is a noise filter for the
 * operator desk. Real client leads will never match: they have real email domains,
 * real names, and never use `Phase 2D smoke` style language. The audit script
 * `scripts/lux-leads-inspect.mjs` was used to validate the patterns against live
 * data on 2026-06-12 (14 noise rows flagged, 2 real `Jan` rows passed through).
 */

const TEST_NAME_RE =
  /\b(test|smoke|qa|fixture|verify|automated|sample|seed|placeholder)\b|\bphase\s*\d|phase\d/i;

const TEST_MESSAGE_RE =
  /\b(test|smoke|seed|fixture|automated|verify|sample|qa|placeholder|synthetic)\b|\bphase\s*\d|phase\d/i;

const TEST_CONTACT_RE =
  /(@example\.com|@example\.invalid|@placeholder\.local|\.invalid\b|noreply@|donotreply@|smoke|fixture|placeholder)/i;

const TEST_SOURCE_RE =
  /\b(smoke|test|seed|automation|fixture|synthetic|verification|placeholder)\b/i;

const LEGACY_DEMO_LISTING_SLUG = 'lm-phase2d-manual-demo';

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/**
 * Classify a single lead row. Pure: no DB / fs / env / network reads.
 *
 * @param {{
 *   name?: string|null,
 *   contact?: string|null,
 *   message?: string|null,
 *   listing?: string|null,
 *   intent?: string|null,
 *   qualificationJson?: unknown,
 * }} lead
 * @returns {{ system_generated: boolean, reason?: string }}
 */
export function classifyLuxLeadSystemTest(lead) {
  if (!lead || typeof lead !== 'object') return { system_generated: false };
  const name = String(lead.name || '').trim();
  const contact = String(lead.contact || '').trim();
  const message = String(lead.message || '').trim();
  const listing = String(lead.listing || '').trim().toLowerCase();
  const qj = asObj(lead.qualificationJson);

  if (TEST_CONTACT_RE.test(contact)) return { system_generated: true, reason: 'placeholder-contact' };
  if (TEST_NAME_RE.test(name)) return { system_generated: true, reason: 'test-name-pattern' };
  if (TEST_MESSAGE_RE.test(message)) return { system_generated: true, reason: 'test-message-pattern' };
  if (qj.smoke === true || qj.test === true || qj.is_test === true || qj.synthetic === true) {
    return { system_generated: true, reason: 'qualification-flag' };
  }
  if (qj.source != null && TEST_SOURCE_RE.test(String(qj.source))) {
    return { system_generated: true, reason: 'qualification-source' };
  }
  if (listing && listing === LEGACY_DEMO_LISTING_SLUG) {
    return { system_generated: true, reason: 'demo-listing-reference' };
  }
  return { system_generated: false };
}

/**
 * Convenience predicate for callers that just want a boolean.
 *
 * @param {Parameters<typeof classifyLuxLeadSystemTest>[0]} lead
 */
export function isLuxLeadSystemTest(lead) {
  return classifyLuxLeadSystemTest(lead).system_generated;
}
