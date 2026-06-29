/**
 * Living Word — Member Update Flow v1 (test-tenant pilot) — identify/match.
 *
 * Pure module. Matches an identify payload against a list of candidate records
 * (synthetic seed in this build). No DB, no GHL, no network.
 *
 * Match priority: exact email, then exact phone, then first+last name.
 * Returns a status the operator can act on; never auto-confirms.
 *
 *   matched      — exactly one confident match (email or phone)
 *   ambiguous    — more than one candidate matched (operator must disambiguate)
 *   unconfirmed  — no confident match (treat as new / needs operator review)
 */

import { normalizeEmail, normalizePhone } from './member-update-schema.js';

function nameKey(first, last) {
  return `${String(first || '').trim().toLowerCase()}|${String(last || '').trim().toLowerCase()}`;
}

/**
 * @param {{ first_name?: string, last_name?: string, email?: string, phone?: string }} identify
 * @param {Array<Record<string, unknown>>} candidates
 */
export function matchMember(identify, candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  const email = normalizeEmail(identify?.email);
  const phone = normalizePhone(identify?.phone);
  const nk = nameKey(identify?.first_name, identify?.last_name);

  if (email) {
    const byEmail = list.filter((r) => normalizeEmail(r.email) === email);
    if (byEmail.length === 1) return result('matched', byEmail[0], 'email');
    if (byEmail.length > 1) return result('ambiguous', null, 'email', byEmail);
  }

  if (phone) {
    const byPhone = list.filter((r) => normalizePhone(r.phone) === phone);
    if (byPhone.length === 1) return result('matched', byPhone[0], 'phone');
    if (byPhone.length > 1) return result('ambiguous', null, 'phone', byPhone);
  }

  const byName = list.filter((r) => nameKey(r.first_name, r.last_name) === nk);
  if (byName.length === 1) return result('matched', byName[0], 'name');
  if (byName.length > 1) return result('ambiguous', null, 'name', byName);

  return result('unconfirmed', null, 'none');
}

/**
 * @param {'matched'|'ambiguous'|'unconfirmed'} status
 * @param {Record<string, unknown> | null} record
 * @param {'email'|'phone'|'name'|'none'} matchedBy
 * @param {Array<Record<string, unknown>>} [candidates]
 */
function result(status, record, matchedBy, candidates) {
  return {
    status,
    matched_by: matchedBy,
    record: record || null,
    candidate_count: candidates ? candidates.length : record ? 1 : 0,
  };
}
