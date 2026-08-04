/**
 * Enquiry profile helpers for the AI receptionist prototype.
 * Pure functions — safe for browser and Node. Disk loading lives in profile-load.mjs.
 */

/** @typedef {'lead_rescue' | 'website_rescue' | 'workflow_admin_improvement' | 'ai_receptionist_chatbot' | 'other_unsure'} ServiceInterest */

export const DEFAULT_PROFILE_ID = 'corpflowai-general';

export const SERVICE_INTEREST_VALUES = /** @type {ServiceInterest[]} */ ([
  'lead_rescue',
  'website_rescue',
  'workflow_admin_improvement',
  'ai_receptionist_chatbot',
  'other_unsure',
]);

/**
 * @param {object} raw
 */
export function normalizeProfile(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Profile must be an object');
  }
  const id = String(raw.id || '').trim() || DEFAULT_PROFILE_ID;
  const fields = raw.fields && typeof raw.fields === 'object' ? raw.fields : {};
  const field_order = Array.isArray(raw.field_order)
    ? raw.field_order.map(String)
    : Object.keys(fields);

  for (const key of field_order) {
    if (!fields[key] || typeof fields[key] !== 'object') {
      throw new Error(`Profile ${id} missing field definition for "${key}"`);
    }
  }

  const supported =
    raw.supported_service_areas && typeof raw.supported_service_areas === 'object'
      ? raw.supported_service_areas
      : {};

  return {
    id,
    name: String(raw.name || id),
    version: Number(raw.version) || 1,
    greeting: String(raw.greeting || ''),
    service_focus: Array.isArray(raw.service_focus) ? raw.service_focus.map(String) : [],
    supported_service_areas: supported,
    field_order,
    fields,
    escalation_language:
      raw.escalation_language && typeof raw.escalation_language === 'object'
        ? raw.escalation_language
        : {},
    safe_disclaimers: Array.isArray(raw.safe_disclaimers)
      ? raw.safe_disclaimers.map(String)
      : [],
    final_review_prompt: String(
      raw.final_review_prompt ||
        'Please review the captured details and say “confirm” or tell me what to edit.',
    ),
    edit_help: String(raw.edit_help || ''),
    claims_policy:
      raw.claims_policy && typeof raw.claims_policy === 'object' ? raw.claims_policy : {},
  };
}

/**
 * Map free-text service interest to a structured value.
 * @param {string} text
 * @param {ReturnType<typeof normalizeProfile> | null} [profile]
 * @returns {{ value: ServiceInterest | null, error?: string, caveat?: string | null }}
 */
export function parseServiceInterest(text, profile = null) {
  const lower = String(text || '').toLowerCase().trim();
  if (!lower) {
    return { value: null, error: 'Please choose a service area from the list.' };
  }

  /** @type {ServiceInterest | null} */
  let value = null;
  if (
    /\b(lead[_\s-]?rescue|missed (website )?leads|inbound leads|lead capture|lead recovery)\b/.test(
      lower,
    )
  ) {
    value = 'lead_rescue';
  } else if (
    /\b(website[_\s-]?rescue|website (problem|issues?|migration|redesign)|digital presence)\b/.test(
      lower,
    )
  ) {
    value = 'website_rescue';
  } else if (
    /\b(workflow|admin(istration)?|process improvement|follow[- ]?ups?|repetitive (admin|tasks?))\b/.test(
      lower,
    )
  ) {
    value = 'workflow_admin_improvement';
  } else if (
    /\b(ai[- ]?receptionist|receptionist|chatbot|voice bot|phone bot)\b/.test(lower)
  ) {
    value = 'ai_receptionist_chatbot';
  } else if (/\b(other|unsure|not sure|don'?t know|anything|general)\b/.test(lower)) {
    value = 'other_unsure';
  } else if (SERVICE_INTEREST_VALUES.includes(/** @type {ServiceInterest} */ (lower))) {
    value = /** @type {ServiceInterest} */ (lower);
  }

  if (!value) {
    return {
      value: null,
      error:
        'Please choose Lead Rescue, Website Rescue, workflow or admin improvement, AI receptionist or chatbot, or other/unsure.',
    };
  }

  const area = profile?.supported_service_areas?.[value];
  const caveat = area?.prototype_caveat ? String(area.prototype_caveat) : null;
  return { value, caveat };
}

/**
 * @param {ReturnType<typeof normalizeProfile>} profile
 * @param {string} fieldKey
 */
export function fieldPrompt(profile, fieldKey) {
  const def = profile.fields?.[fieldKey];
  return def?.prompt || `Please provide ${fieldKey}.`;
}

/**
 * @param {ReturnType<typeof normalizeProfile>} profile
 * @param {string | null} serviceInterest
 */
export function needPromptForService(profile, serviceInterest) {
  const area = serviceInterest
    ? profile.supported_service_areas?.[serviceInterest]
    : null;
  if (area?.need_hint) return String(area.need_hint);
  return fieldPrompt(profile, 'need');
}

/**
 * @param {ReturnType<typeof normalizeProfile>} profile
 * @param {string} fieldKey
 */
export function isFieldRequired(profile, fieldKey) {
  return Boolean(profile.fields?.[fieldKey]?.required);
}

/**
 * Human label for a service interest value.
 * @param {ReturnType<typeof normalizeProfile>} profile
 * @param {string | null} serviceInterest
 */
export function serviceInterestLabel(profile, serviceInterest) {
  if (!serviceInterest) return '(not set)';
  const area = profile.supported_service_areas?.[serviceInterest];
  return area?.label || serviceInterest;
}
