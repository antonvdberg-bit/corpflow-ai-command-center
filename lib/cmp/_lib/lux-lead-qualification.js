/**
 * Lux private-client qualification view (issue #685 Slice B).
 * Stored in leads.qualification_json.private_client_qualification — no schema migration.
 * Derives display values from operator-captured fields plus existing property_interest / access_request.
 */

/** @type {readonly string[]} */
export const LUX_PRIVATE_CLIENT_QUAL_FIELDS = Object.freeze([
  'buyer_objective',
  'preferred_area',
  'property_type',
  'budget_band',
  'timing',
  'residency_investment_interest',
  'confidentiality_preference',
]);

const FIELD_LABEL = {
  buyer_objective: 'Buyer objective',
  preferred_area: 'Preferred area',
  property_type: 'Property type',
  budget_band: 'Budget band',
  timing: 'Timing',
  residency_investment_interest: 'Residency / investment interest',
  confidentiality_preference: 'Confidentiality preference',
};

function safeStr(v, max = 500) {
  if (v == null) return '';
  return String(v).trim().slice(0, max);
}

function nonempty(v) {
  const s = safeStr(v);
  return s ? s : null;
}

/**
 * Format access_request budget into a single band string.
 * @param {{ budget_min?: unknown, budget_max?: unknown, currency_code?: unknown }} ar
 */
export function formatAccessRequestBudgetBand(ar) {
  if (!ar || typeof ar !== 'object') return null;
  const cur = safeStr(ar.currency_code, 8) || 'USD';
  const min = ar.budget_min != null && Number.isFinite(Number(ar.budget_min)) ? Number(ar.budget_min) : null;
  const max = ar.budget_max != null && Number.isFinite(Number(ar.budget_max)) ? Number(ar.budget_max) : null;
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${cur} ${min.toLocaleString()} – ${max.toLocaleString()}`;
  if (min != null) return `${cur} ${min.toLocaleString()}+`;
  return `Up to ${cur} ${max.toLocaleString()}`;
}

/**
 * Parse Seeking: / intent tags from concierge freeform message when structured fields absent.
 * @param {unknown} message
 */
function inferFromMessage(message) {
  const m = message != null ? String(message) : '';
  /** @type {Record<string, string | null>} */
  const out = {
    buyer_objective: null,
    residency_investment_interest: null,
    timing: null,
  };
  const seeking = m.match(/^\s*Seeking:\s*(.+)$/im);
  if (seeking && seeking[1]) out.buyer_objective = safeStr(seeking[1], 500) || null;
  const accessIntent = m.match(/^\s*Access intent:\s*(.+)$/im);
  if (accessIntent && accessIntent[1]) {
    out.timing = out.timing || safeStr(accessIntent[1], 500) || null;
    out.buyer_objective = out.buyer_objective || safeStr(accessIntent[1], 500) || null;
  }
  const lower = m.toLowerCase();
  const tags = [];
  if (/\bresiden(cy|tial|ce)\b/.test(lower)) tags.push('residency');
  if (/\binvest(ment|or)?\b/.test(lower)) tags.push('investment');
  if (tags.length) out.residency_investment_interest = tags.join(' + ');
  return out;
}

/**
 * @param {unknown} qj
 */
export function parsePrivateClientQualification(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const raw =
    root.private_client_qualification && typeof root.private_client_qualification === 'object'
      ? root.private_client_qualification
      : {};
  /** @type {Record<string, string | null>} */
  const fields = {};
  for (const k of LUX_PRIVATE_CLIENT_QUAL_FIELDS) {
    fields[k] = nonempty(raw[k]);
  }
  return {
    ...fields,
    updated_at: nonempty(raw.updated_at) ? String(raw.updated_at).slice(0, 40) : null,
    updated_by: nonempty(raw.updated_by) ? String(raw.updated_by).slice(0, 320) : null,
  };
}

/**
 * Build operator-facing qualification view: captured + derived + missing + next action.
 * @param {{
 *   qualificationJson?: unknown,
 *   message?: unknown,
 *   intent?: unknown,
 *   listing?: unknown,
 *   property_interest?: unknown,
 * }} leadLike — list row or raw lead with qualificationJson
 */
export function buildLuxPrivateClientQualificationView(leadLike) {
  const qj =
    leadLike?.qualificationJson && typeof leadLike.qualificationJson === 'object'
      ? leadLike.qualificationJson
      : leadLike?.qualification_json && typeof leadLike.qualification_json === 'object'
        ? leadLike.qualification_json
        : {};
  const captured = parsePrivateClientQualification(qj);
  const pi =
    (leadLike?.property_interest && typeof leadLike.property_interest === 'object'
      ? leadLike.property_interest
      : null) ||
    (qj.property_interest && typeof qj.property_interest === 'object' ? qj.property_interest : null);
  const ar = qj.access_request && typeof qj.access_request === 'object' ? qj.access_request : null;
  const inferred = inferFromMessage(leadLike?.message);

  /** @type {Record<string, { value: string | null, source: 'captured' | 'property_interest' | 'access_request' | 'message' | null }>} */
  const fields = {};

  const setField = (key, value, source) => {
    const v = nonempty(value);
    if (v) {
      fields[key] = { value: v, source };
      return;
    }
    if (!fields[key]) fields[key] = { value: null, source: null };
  };

  for (const k of LUX_PRIVATE_CLIENT_QUAL_FIELDS) {
    setField(k, captured[k], captured[k] ? 'captured' : null);
  }

  // Fallbacks only fill empty captured fields.
  if (!fields.buyer_objective?.value) {
    setField('buyer_objective', ar?.access_intent || ar?.access_category || inferred.buyer_objective, ar?.access_intent || ar?.access_category ? 'access_request' : inferred.buyer_objective ? 'message' : null);
  }
  if (!fields.preferred_area?.value) {
    setField('preferred_area', pi?.region || ar?.desired_location, pi?.region ? 'property_interest' : ar?.desired_location ? 'access_request' : null);
  }
  if (!fields.property_type?.value) {
    setField('property_type', pi?.property_type || ar?.property_type, pi?.property_type ? 'property_interest' : ar?.property_type ? 'access_request' : null);
  }
  if (!fields.budget_band?.value) {
    const band = pi?.price_range || formatAccessRequestBudgetBand(ar);
    setField('budget_band', band, pi?.price_range ? 'property_interest' : band ? 'access_request' : null);
  }
  if (!fields.timing?.value) {
    setField('timing', ar?.access_intent || inferred.timing, ar?.access_intent ? 'access_request' : inferred.timing ? 'message' : null);
  }
  if (!fields.residency_investment_interest?.value) {
    setField(
      'residency_investment_interest',
      ar?.access_category || inferred.residency_investment_interest,
      ar?.access_category ? 'access_request' : inferred.residency_investment_interest ? 'message' : null,
    );
  }
  // confidentiality_preference: only from captured (no existing structured source)

  const missing = LUX_PRIVATE_CLIENT_QUAL_FIELDS.filter((k) => !fields[k]?.value).map((k) => ({
    key: k,
    label: FIELD_LABEL[k] || k,
  }));

  const filledCount = LUX_PRIVATE_CLIENT_QUAL_FIELDS.length - missing.length;
  let recommended_next_action = 'Capture missing private-client qualification fields.';
  if (missing.length === 0) {
    recommended_next_action = 'Qualification complete — advance stage to Qualified and prepare a shortlist invitation.';
  } else if (missing.length <= 2) {
    recommended_next_action = `Ask for: ${missing.map((m) => m.label).join(', ')}.`;
  } else if (filledCount === 0) {
    recommended_next_action = 'Start qualification call — capture objective, area, budget band, and timing.';
  } else {
    recommended_next_action = `Priority gaps: ${missing
      .slice(0, 3)
      .map((m) => m.label)
      .join(', ')}.`;
  }

  /** @type {Record<string, string | null>} */
  const values = {};
  /** @type {Record<string, string | null>} */
  const sources = {};
  for (const k of LUX_PRIVATE_CLIENT_QUAL_FIELDS) {
    values[k] = fields[k]?.value || null;
    sources[k] = fields[k]?.source || null;
  }

  return {
    fields: values,
    field_sources: sources,
    field_labels: { ...FIELD_LABEL },
    missing,
    missing_count: missing.length,
    filled_count: filledCount,
    complete: missing.length === 0,
    recommended_next_action,
    updated_at: captured.updated_at,
    updated_by: captured.updated_by,
  };
}

/**
 * Merge operator-captured qualification into qualification_json (no schema change).
 * @param {Record<string, unknown>} qualificationJson
 * @param {Record<string, unknown>} patchFields
 * @param {string} actorLabel
 * @param {string} nowIso
 */
export function mergePrivateClientQualificationPatch(qualificationJson, patchFields, actorLabel, nowIso) {
  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const prev = parsePrivateClientQualification(qj);
  const src = patchFields && typeof patchFields === 'object' ? patchFields : {};
  /** @type {Record<string, string | null>} */
  const next = {};
  let changed = false;
  for (const k of LUX_PRIVATE_CLIENT_QUAL_FIELDS) {
    if (src[k] !== undefined) {
      const v = src[k] === null || src[k] === '' ? null : safeStr(src[k], 500) || null;
      next[k] = v;
      if ((prev[k] || null) !== v) changed = true;
    } else {
      next[k] = prev[k] || null;
    }
  }
  if (!changed) return { qj, changed: false };

  qj.private_client_qualification = {
    ...next,
    updated_at: nowIso,
    updated_by: safeStr(actorLabel, 320) || 'unknown',
  };
  return { qj, changed: true };
}

export function luxPrivateClientQualFieldLabel(key) {
  return FIELD_LABEL[key] || String(key || '');
}
