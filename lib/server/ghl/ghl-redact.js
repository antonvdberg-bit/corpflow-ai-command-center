/**
 * Redact PII from GHL probe outputs — safe for logs and repo artifacts.
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\+?\d[\d\s().-]{6,}\d/g;

/** @type {Set<string>} */
const PII_KEYS = new Set([
  'email',
  'phone',
  'firstName',
  'first_name',
  'lastName',
  'last_name',
  'name',
  'address1',
  'address',
  'city',
  'postalCode',
  'postal_code',
  'companyName',
  'website',
  'dateOfBirth',
  'source',
  'assignedTo',
]);

/**
 * @param {unknown} value
 * @returns {unknown}
 */
export function redactScalar(value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  let s = value;
  if (EMAIL_RE.test(s)) {
    EMAIL_RE.lastIndex = 0;
    s = s.replace(EMAIL_RE, '[redacted-email]');
  }
  if (PHONE_RE.test(s)) {
    PHONE_RE.lastIndex = 0;
    s = s.replace(PHONE_RE, '[redacted-phone]');
  }
  if (/^[^@\s]+@[^@\s]+$/.test(value)) return '[redacted-email]';
  return s;
}

/**
 * @param {string} _value
 * @returns {string}
 */
export function redactName(_value) {
  return '[redacted-name]';
}

/**
 * @param {string} _value
 * @returns {string}
 */
export function redactEmail(_value) {
  return '[redacted-email]';
}

/**
 * @param {string} _value
 * @returns {string}
 */
export function redactPhone(_value) {
  return '[redacted-phone]';
}

/**
 * Deep redact known PII keys; leaves ids and structural metadata.
 * @param {unknown} input
 * @param {{ depth?: number }} [opts]
 * @returns {unknown}
 */
export function redactDeep(input, opts = {}) {
  const depth = opts.depth ?? 0;
  if (depth > 12) return '[truncated]';
  if (input == null || typeof input !== 'object') {
    return typeof input === 'string' ? redactScalar(input) : input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactDeep(item, { depth: depth + 1 }));
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, val] of Object.entries(input)) {
    const lk = key.toLowerCase();
    if (PII_KEYS.has(key) || PII_KEYS.has(lk)) {
      if (lk.includes('email')) out[key] = redactEmail(String(val ?? ''));
      else if (lk.includes('phone')) out[key] = redactPhone(String(val ?? ''));
      else if (lk.includes('name')) out[key] = redactName(String(val ?? ''));
      else out[key] = '[redacted]';
    } else if (key === 'customFields' && Array.isArray(val)) {
      out[key] = val.map((cf) => {
        if (!cf || typeof cf !== 'object') return cf;
        return {
          id: cf.id,
          key: cf.key,
          fieldKey: cf.fieldKey,
          value: '[redacted]',
        };
      });
    } else {
      out[key] = redactDeep(val, { depth: depth + 1 });
    }
  }
  return out;
}

/**
 * Field names present on a contact object (no values).
 * @param {Record<string, unknown> | null | undefined} contact
 * @returns {string[]}
 */
export function extractContactFieldNames(contact) {
  if (!contact || typeof contact !== 'object') return [];
  return Object.keys(contact).sort();
}

/**
 * Ensure JSON string does not contain a secret substring.
 * @param {unknown} obj
 * @param {string[]} forbiddenSubstrings
 */
export function assertNoForbiddenSubstrings(obj, forbiddenSubstrings) {
  const text = JSON.stringify(obj);
  for (const needle of forbiddenSubstrings) {
    if (needle && text.includes(needle)) {
      throw new Error('secret_leak_detected');
    }
  }
}
