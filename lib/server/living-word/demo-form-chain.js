/**
 * Living Word Mauritius — TEST DEMO form chain (Form 1 → email → Form 2).
 *
 * Pure module: validation, in-memory session tokens, URL builders, status helpers.
 * No DB, no GHL, no WhatsApp/SMS, no canonical member writes.
 */

import { randomBytes } from 'node:crypto';

import { PROVISIONAL_SANDBOX_ENUMS } from './member-update-schema.js';

export const DEMO_LABEL = '[LIVING WORD — TEST DEMO]';
export const LIVING_WORD_TENANT_ID = 'living-word-mauritius';
export const FORM_CHAIN_SOURCE = 'living_word_demo_form_chain_v1';
export const LOGO_PATH = '/assets/tenants/living-word-mauritius/living-word-church-logo.png';

export const FORM1_ROUTE = '/living-word/form-1';
export const FORM2_ROUTE = '/living-word/form-2';
export const DEMO_HUB_ROUTE = '/living-word/demo';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { token: string, createdAt: number, form1: Record<string, unknown>, form2: Record<string, unknown> | null, emailStatus: string | null }>} */
const sessionsByToken = new Map();

/** Last blocked email preview for operator inspection (no PII beyond test submit). */
let lastBlockedEmailPreview = null;

export const FORM1_MEMBER_TYPES = Object.freeze([
  { value: 'member', label: 'Member' },
  { value: 'regular_attender', label: 'Regular attender' },
  { value: 'visitor', label: 'Visitor' },
]);

export const FORM2_COMM_PREFS = Object.freeze(
  PROVISIONAL_SANDBOX_ENUMS.preferred_communication
    .filter((v) => v !== 'whatsapp' && v !== 'sms')
    .concat(['email', 'phone']),
);

const UNIQUE_COMM_PREFS = [...new Set(FORM2_COMM_PREFS)];

/**
 * TEST DEMO recipients only — synthetic @example.test or explicit demo allowlist entries.
 *
 * @param {string} email
 * @returns {boolean}
 */
export function isAllowedDemoRecipient(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return false;
  if (normalized.endsWith('@example.test')) return true;
  if (normalized === 'demo@livingword.test') return true;
  return false;
}

function trimStr(v, maxLen) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normalizeEmail(v) {
  return trimStr(v, 254).toLowerCase();
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, data: Record<string, unknown> } | { ok: false, error: string, field?: string }}
 */
export function validateForm1Body(body) {
  const src = body && typeof body === 'object' ? body : {};
  const first_name = trimStr(src.first_name, 80);
  const last_name = trimStr(src.last_name, 80);
  const email = normalizeEmail(src.email);
  const phone = trimStr(src.phone, 32);
  const member_type = trimStr(src.member_type, 40);
  const ready_to_serve = Boolean(src.ready_to_serve);
  const consent_demo = Boolean(src.consent_demo);

  if (!first_name) return { ok: false, error: 'required_field', field: 'first_name' };
  if (!last_name) return { ok: false, error: 'required_field', field: 'last_name' };
  if (!email) return { ok: false, error: 'required_field', field: 'email' };
  if (!phone) return { ok: false, error: 'required_field', field: 'phone' };
  if (!member_type) return { ok: false, error: 'required_field', field: 'member_type' };
  if (!consent_demo) return { ok: false, error: 'consent_required', field: 'consent_demo' };
  if (!isAllowedDemoRecipient(email)) {
    return { ok: false, error: 'demo_recipient_not_allowed', field: 'email' };
  }
  const allowedTypes = FORM1_MEMBER_TYPES.map((t) => t.value);
  if (!allowedTypes.includes(member_type)) {
    return { ok: false, error: 'invalid_enum', field: 'member_type' };
  }

  return {
    ok: true,
    data: {
      first_name,
      last_name,
      email,
      phone,
      member_type,
      ready_to_serve,
      consent_demo,
    },
  };
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, data: Record<string, unknown> } | { ok: false, error: string, field?: string }}
 */
export function validateForm2Body(body) {
  const src = body && typeof body === 'object' ? body : {};
  const email_confirm = normalizeEmail(src.email_confirm);
  const address_line_1 = trimStr(src.address_line_1, 160);
  const city = trimStr(src.city, 80);
  const preferred_communication = trimStr(src.preferred_communication, 32);
  const interested_in_serving = Boolean(src.interested_in_serving);
  const ready_to_serve = Boolean(src.ready_to_serve);
  const consent_acknowledged = Boolean(src.consent_acknowledged);

  if (!email_confirm) return { ok: false, error: 'required_field', field: 'email_confirm' };
  if (!address_line_1) return { ok: false, error: 'required_field', field: 'address_line_1' };
  if (!city) return { ok: false, error: 'required_field', field: 'city' };
  if (!preferred_communication) {
    return { ok: false, error: 'required_field', field: 'preferred_communication' };
  }
  if (!UNIQUE_COMM_PREFS.includes(preferred_communication)) {
    return { ok: false, error: 'invalid_enum', field: 'preferred_communication' };
  }
  if (!consent_acknowledged) {
    return { ok: false, error: 'consent_required', field: 'consent_acknowledged' };
  }

  return {
    ok: true,
    data: {
      email_confirm,
      address_line_1,
      city,
      preferred_communication,
      interested_in_serving,
      ready_to_serve,
      consent_acknowledged,
    },
  };
}

function purgeExpiredSessions(now = Date.now()) {
  for (const [token, session] of sessionsByToken.entries()) {
    if (now - session.createdAt > TOKEN_TTL_MS) sessionsByToken.delete(token);
  }
}

function newToken() {
  return randomBytes(24).toString('hex');
}

/**
 * @param {Record<string, unknown>} form1Data
 * @returns {{ token: string, session: object }}
 */
export function createForm1Session(form1Data) {
  purgeExpiredSessions();
  const token = newToken();
  const session = {
    token,
    createdAt: Date.now(),
    form1: { ...form1Data },
    form2: null,
    emailStatus: null,
  };
  sessionsByToken.set(token, session);
  return { token, session };
}

/**
 * @param {string} token
 * @returns {object | null}
 */
export function getSessionByToken(token) {
  purgeExpiredSessions();
  const key = String(token || '').trim();
  if (!key) return null;
  const session = sessionsByToken.get(key);
  if (!session) return null;
  if (Date.now() - session.createdAt > TOKEN_TTL_MS) {
    sessionsByToken.delete(key);
    return null;
  }
  return session;
}

/**
 * @param {string} token
 * @param {Record<string, unknown>} form2Data
 * @param {string} emailStatus
 */
export function attachForm2ToSession(token, form2Data, emailStatus) {
  const session = getSessionByToken(token);
  if (!session) return null;
  session.form2 = { ...form2Data };
  session.emailStatus = emailStatus;
  return session;
}

/**
 * @param {string} token
 * @param {string} [emailStatus]
 */
export function markSessionEmailStatus(token, emailStatus) {
  const session = getSessionByToken(token);
  if (!session) return null;
  session.emailStatus = emailStatus;
  return session;
}

/**
 * @param {string} token
 * @returns {string}
 */
export function buildForm2Path(token) {
  return `${FORM2_ROUTE}?token=${encodeURIComponent(token)}`;
}

/**
 * @param {string} publicBaseUrl
 * @param {string} token
 * @returns {string}
 */
export function buildForm2Url(publicBaseUrl, token) {
  const base = String(publicBaseUrl || '').replace(/\/+$/, '');
  const path = buildForm2Path(token);
  return base ? `${base}${path}` : path;
}

/**
 * @param {{ emailConfigured: boolean, emailOk: boolean, emailBlocked: boolean, sessionCount: number }} args
 * @returns {'READY' | 'PARTIAL' | 'BLOCKED'}
 */
export function computeDemoChainVerdict(args) {
  const { emailConfigured, emailOk, emailBlocked } = args;
  if (emailBlocked || !emailConfigured) return 'BLOCKED';
  if (emailOk) return 'READY';
  return 'PARTIAL';
}

/**
 * @param {Record<string, unknown> | null} preview
 */
export function setLastBlockedEmailPreview(preview) {
  lastBlockedEmailPreview = preview;
}

/** @returns {Record<string, unknown> | null} */
export function getLastBlockedEmailPreview() {
  return lastBlockedEmailPreview;
}

/** @returns {number} */
export function getActiveSessionCount() {
  purgeExpiredSessions();
  return sessionsByToken.size;
}

/** Test-only reset. */
export function _resetDemoFormChainStoreForTests() {
  sessionsByToken.clear();
  lastBlockedEmailPreview = null;
}
