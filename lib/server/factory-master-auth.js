/**
 * Verify factory master credentials on incoming API requests (no I/O).
 */

import crypto from 'crypto';
import { cfg } from './runtime-config.js';
import { getSessionFromRequest } from './session.js';

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeStringEquals(a, b) {
  try {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

/**
 * Accepts `Authorization: Bearer <MASTER_ADMIN_KEY>` or `x-session-token` header.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
export function verifyFactoryMasterAuth(req) {
  // Preferred: admin session cookie (avoids pasting master key into browsers).
  const sess = getSessionFromRequest(req);
  if (sess?.ok && sess.payload?.typ === 'admin') {
    return true;
  }

  const master = (cfg('MASTER_ADMIN_KEY', '') || cfg('ADMIN_PIN', '')).toString();
  let token = '';
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (auth && /^\s*Bearer\s+/i.test(String(auth))) {
    token = String(auth).replace(/^\s*Bearer\s+/i, '').trim();
  }
  const xst = req.headers?.['x-session-token'];
  if (!token && xst) token = String(xst).trim();
  if (!token || !master) return false;
  return timingSafeStringEquals(token, master);
}
