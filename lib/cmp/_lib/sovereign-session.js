/**
 * HMAC-signed sovereign tenant session tokens (no external JWT lib).
 */

import crypto from 'crypto';

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqualsString(a, b) {
  try {
    const ab = Buffer.from(String(a), 'utf8');
    const bb = Buffer.from(String(b), 'utf8');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} payload - must include exp (unix seconds)
 * @param {string} secret
 * @returns {string}
 */
export function signSovereignSession(payload, secret) {
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

/**
 * @param {string} token
 * @param {string} secret
 * @returns {{ ok: true, payload: Record<string, unknown> } | { ok: false, payload: null }}
 */
export function verifySovereignSessionToken(token, secret) {
  if (!token || !secret || typeof token !== 'string' || typeof secret !== 'string') {
    return { ok: false, payload: null };
  }
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, payload: null };
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return { ok: false, payload: null };
  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  if (!timingSafeEqualsString(sig, expected)) return { ok: false, payload: null };
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(json);
    if (!payload || typeof payload !== 'object') return { ok: false, payload: null };
    const exp = Number(payload.exp);
    if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) {
      return { ok: false, payload: null };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, payload: null };
  }
}

/**
 * @returns {string}
 */
export function getSovereignSessionSecret() {
  return (process.env.SOVEREIGN_SESSION_SECRET || '').toString();
}
