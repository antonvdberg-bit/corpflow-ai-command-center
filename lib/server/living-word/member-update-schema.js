/**
 * Living Word — Member Update Flow v1 (test-tenant pilot) — field schema.
 *
 * Pure module: field allowlist, PROVISIONAL sandbox enums, exclusion denylist,
 * validation, prefill mapping, and blank-overwrite-safe merge. No DB, no GHL,
 * no network. Source of truth for what the flow may collect.
 *
 * Allowlist is derived from the merged design doc
 * `artifacts/quality-audits/2026-06-11-living-word-mauritius/member-update-flow-schema-form-design-v1.md`
 * (PR #480). No fields are added beyond that allowlist.
 *
 * Serving fields are plain booleans only (ready-to-serve / interested-in-serving).
 * There is intentionally NO team assignment, rota, leader allocation, or routing.
 */

export const LIVING_WORD_TENANT_ID = 'living-word-mauritius';

export const MEMBER_UPDATE_FORM_ID = 'member_update_v1';
export const MEMBER_UPDATE_SOURCE = 'member_update_v1';

/**
 * PROVISIONAL sandbox enums.
 *
 * These are NOT sourced from GHL and must NOT be treated as the church's real
 * option sets. They exist only so the test-tenant pilot can render selects.
 * Real values require an operator-supplied / church-approved enum set before
 * any production use (design doc §6 Q2).
 */
export const PROVISIONAL_ENUMS_ARE_NOT_GHL_TRUTH = true;

export const PROVISIONAL_SANDBOX_ENUMS = Object.freeze({
  preferred_communication: ['email', 'whatsapp', 'phone', 'sms'],
  member_type: ['member', 'regular_attender', 'visitor'],
  gender: ['female', 'male', 'prefer_not_to_say'],
});

/**
 * Step 1 (identify) accepted keys.
 */
export const IDENTIFY_FIELDS = Object.freeze(['first_name', 'last_name', 'email', 'phone']);

/**
 * @typedef {object} FieldDef
 * @property {string} key
 * @property {'text'|'email'|'tel'|'select'|'checkbox'} type
 * @property {boolean} required
 * @property {boolean} prefill
 * @property {string} [enumKey]
 * @property {number} [maxLen]
 */

/**
 * Step 2 (update) field allowlist. Anything not here is rejected on submit.
 * @type {ReadonlyArray<FieldDef>}
 */
export const UPDATE_FIELDS = Object.freeze([
  { key: 'first_name', type: 'text', required: true, prefill: true, maxLen: 80 },
  { key: 'last_name', type: 'text', required: true, prefill: true, maxLen: 80 },
  { key: 'email', type: 'email', required: true, prefill: true, maxLen: 254 },
  { key: 'phone', type: 'tel', required: true, prefill: true, maxLen: 32 },
  { key: 'email_secondary', type: 'email', required: false, prefill: true, maxLen: 254 },
  { key: 'phone_secondary', type: 'tel', required: false, prefill: true, maxLen: 32 },
  { key: 'preferred_communication', type: 'select', required: false, prefill: true, enumKey: 'preferred_communication' },
  { key: 'member_type', type: 'select', required: false, prefill: true, enumKey: 'member_type' },
  { key: 'gender', type: 'select', required: false, prefill: true, enumKey: 'gender' },
  { key: 'address_line_1', type: 'text', required: false, prefill: true, maxLen: 160 },
  { key: 'city', type: 'text', required: false, prefill: true, maxLen: 80 },
  { key: 'emergency_contact_name', type: 'text', required: false, prefill: true, maxLen: 120 },
  { key: 'emergency_contact_phone', type: 'tel', required: false, prefill: true, maxLen: 32 },
  { key: 'opt_in_church_comms', type: 'checkbox', required: false, prefill: true },
  { key: 'ready_to_serve', type: 'checkbox', required: false, prefill: true },
  { key: 'interested_in_serving', type: 'checkbox', required: false, prefill: true },
  { key: 'consent_acknowledged', type: 'checkbox', required: true, prefill: false },
]);

export const UPDATE_FIELD_KEYS = Object.freeze(UPDATE_FIELDS.map((f) => f.key));

/** Keys that may be prefilled from a matched record (excludes consent). */
export const PREFILLABLE_KEYS = Object.freeze(UPDATE_FIELDS.filter((f) => f.prefill).map((f) => f.key));

/**
 * Mapping from CorpFlow field -> GHL contact field/key, for prefill provenance.
 * Reference only; this build performs NO GHL calls and NO import.
 */
export const GHL_PREFILL_MAP = Object.freeze({
  first_name: 'firstName',
  last_name: 'lastName',
  email: 'email',
  phone: 'phone',
  email_secondary: 'contact.email_2',
  phone_secondary: 'contact.phone_2',
  preferred_communication: 'contact.preferred_communication',
  member_type: 'contact.member_type',
  gender: 'contact.gender_sex_1',
  address_line_1: 'address1',
  city: 'city',
  emergency_contact_name: 'contact.emergency_contact_person_name',
  emergency_contact_phone: 'contact.emergency_contact_phone_number',
  opt_in_church_comms: 'contact.add_me_to_church_communications_for_updates_and_events',
  ready_to_serve: 'contact.ready_to_serve',
  interested_in_serving: 'contact.i_am_ready_to_serve_on_a_team_s',
});

/**
 * Explicit exclusion denylist (defense-in-depth). Submissions containing any
 * key matching these patterns are rejected with the offending category, even
 * though the allowlist would already drop unknown keys.
 *
 * @type {ReadonlyArray<{ category: string, test: (key: string) => boolean }>}
 */
export const EXCLUSION_RULES = Object.freeze([
  { category: 'youth_or_children', test: (k) => /(trinity[_-]?kids|youth|child|children|minor)/i.test(k) },
  { category: 'prayer_or_counselling', test: (k) => /(prayer|counsel)/i.test(k) },
  { category: 'free_text_notes', test: (k) => /(note|notes|free[_-]?text|message|comment|update_your_profile)/i.test(k) },
  { category: 'medical_legal_financial', test: (k) => /(medical|health|diagnos|legal|financ|salary|income|bank)/i.test(k) },
  { category: 'donation_or_payment', test: (k) => /(donat|pledge|payment|charity|tithe|offering)/i.test(k) },
  { category: 'business_network', test: (k) => /(business|company|network)/i.test(k) },
  { category: 'team_assignment_or_routing', test: (k) => /(leader|rota|roster|assign|routing|allocat|team_)/i.test(k) },
]);

function str(v) {
  return v == null ? '' : String(v).trim();
}

function isBlank(v) {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

export function normalizeEmail(v) {
  return str(v).toLowerCase();
}

export function normalizePhone(v) {
  const s = str(v);
  if (!s) return '';
  // Keep leading +, strip spaces and separators. No country inference here.
  const plus = s.startsWith('+') ? '+' : '';
  return plus + s.replace(/[^\d]/g, '');
}

function isValidEmail(v) {
  const s = str(v);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

/**
 * Find the first exclusion category triggered by a set of keys.
 * @param {string[]} keys
 * @returns {{ key: string, category: string } | null}
 */
export function findExcludedKey(keys) {
  for (const key of keys) {
    for (const rule of EXCLUSION_RULES) {
      if (rule.test(key)) return { key, category: rule.category };
    }
  }
  return null;
}

/**
 * Validate the Step 1 identify body.
 * @param {Record<string, unknown>} body
 */
export function validateIdentifyBody(body) {
  const b = body && typeof body === 'object' ? body : {};
  const submittedKeys = Object.keys(b);
  const excluded = findExcludedKey(submittedKeys);
  if (excluded) {
    return { ok: false, error: 'excluded_field', category: excluded.category, field: excluded.key };
  }

  const first_name = str(b.first_name);
  const last_name = str(b.last_name);
  const email = normalizeEmail(b.email);
  const phone = normalizePhone(b.phone);

  if (!first_name || !last_name) {
    return { ok: false, error: 'name_required', field: !first_name ? 'first_name' : 'last_name' };
  }
  if (!email && !phone) {
    return { ok: false, error: 'contact_key_required', field: 'email' };
  }
  if (email && !isValidEmail(email)) {
    return { ok: false, error: 'invalid_email', field: 'email' };
  }

  return { ok: true, data: { first_name, last_name, email, phone } };
}

/**
 * Validate the Step 2 update body against the allowlist + exclusion denylist.
 * @param {Record<string, unknown>} body
 */
export function validateUpdateBody(body) {
  const b = body && typeof body === 'object' ? body : {};
  const submittedKeys = Object.keys(b);

  // Defense-in-depth: explicit exclusion categories first (clear error).
  const excluded = findExcludedKey(submittedKeys);
  if (excluded) {
    return { ok: false, error: 'excluded_field', category: excluded.category, field: excluded.key };
  }

  // Allowlist: reject any unknown key.
  const allow = new Set(UPDATE_FIELD_KEYS);
  for (const key of submittedKeys) {
    if (!allow.has(key)) {
      return { ok: false, error: 'unknown_field', field: key };
    }
  }

  /** @type {Record<string, unknown>} */
  const data = {};
  for (const def of UPDATE_FIELDS) {
    const raw = b[def.key];

    if (def.type === 'checkbox') {
      data[def.key] = raw === true || raw === 'true' || raw === 'on' || raw === 1;
      continue;
    }

    let value = str(raw);
    if (def.type === 'email' && value) value = normalizeEmail(value);
    if (def.type === 'tel' && value) value = normalizePhone(value);

    if (def.type === 'select' && value) {
      const allowed = PROVISIONAL_SANDBOX_ENUMS[def.enumKey] || [];
      if (!allowed.includes(value)) {
        return { ok: false, error: 'invalid_option', field: def.key };
      }
    }

    if (def.required && !value) {
      return { ok: false, error: 'required_field', field: def.key };
    }
    if (def.type === 'email' && value && !isValidEmail(value)) {
      return { ok: false, error: 'invalid_email', field: def.key };
    }
    if (def.maxLen && value.length > def.maxLen) {
      return { ok: false, error: 'too_long', field: def.key };
    }
    data[def.key] = value;
  }

  if (data.consent_acknowledged !== true) {
    return { ok: false, error: 'consent_required', field: 'consent_acknowledged' };
  }

  return { ok: true, data };
}

/**
 * Compute a blank-overwrite-safe proposed update.
 *
 * - Never nulls/erases a populated existing field with a blank submission.
 * - Returns the proposed merged record plus a per-field change list for operator review.
 * - Does NOT write anything; canonical write is gated on operator approval.
 *
 * @param {Record<string, unknown>} existing  matched record (may be empty for unconfirmed)
 * @param {Record<string, unknown>} submitted  validated update data
 */
export function computeProposedUpdate(existing, submitted) {
  const ex = existing && typeof existing === 'object' ? existing : {};
  const proposed = { ...ex };
  /** @type {Array<{ field: string, from: unknown, to: unknown }>} */
  const changes = [];

  for (const def of UPDATE_FIELDS) {
    if (def.key === 'consent_acknowledged') continue;
    const incoming = submitted[def.key];

    if (def.type === 'checkbox') {
      if (ex[def.key] !== incoming) {
        changes.push({ field: def.key, from: ex[def.key] ?? false, to: incoming });
      }
      proposed[def.key] = incoming;
      continue;
    }

    // Blank submitted value: keep existing, never erase.
    if (isBlank(incoming)) {
      proposed[def.key] = ex[def.key] ?? '';
      continue;
    }

    if (str(ex[def.key]) !== str(incoming)) {
      changes.push({ field: def.key, from: ex[def.key] ?? '', to: incoming });
    }
    proposed[def.key] = incoming;
  }

  return { proposed, changes };
}

/**
 * Build a prefill object (allowlisted prefillable keys only) from a matched record.
 * @param {Record<string, unknown>} record
 */
export function buildPrefill(record) {
  const r = record && typeof record === 'object' ? record : {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of PREFILLABLE_KEYS) {
    if (r[key] !== undefined) out[key] = r[key];
  }
  return out;
}
