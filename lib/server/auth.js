import crypto from 'crypto';

import { cfg } from './runtime-config.js';
import { createBaserowClient } from '../cmp/_lib/baserow.js';
import { verifyPinAgainstStored } from '../cmp/_lib/tenant-pin.js';
import {
  clearCookie,
  CORPFLOW_SESSION_COOKIE,
  getSessionFromRequest,
  setCookie,
  signSession,
} from './session.js';

function deny(res, status, error, extra) {
  const payload = { error };
  if (extra) Object.assign(payload, extra);
  return res.status(status).json(payload);
}

function parseJsonBody(req) {
  const body = req.body;
  if (body && typeof body === 'object') return { ok: true, body };
  return { ok: false, error: 'Missing JSON body (Vercel must parse it).' };
}

function timingSafeStringEquals(a, b) {
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

function getAdminCreds() {
  const username = String(cfg('CORPFLOW_ADMIN_USERNAME', '')).trim();
  const password = String(cfg('CORPFLOW_ADMIN_PASSWORD', '')).trim();
  // Optional: if you want hashed password later.
  const passwordHash = String(cfg('CORPFLOW_ADMIN_PASSWORD_HASH', '')).trim();
  const passwordSalt = String(cfg('CORPFLOW_ADMIN_PASSWORD_SALT', '')).trim();
  return { username, password, passwordHash, passwordSalt };
}

function verifyAdminPassword(inputPassword, creds) {
  const pw = String(inputPassword || '').trim();
  if (!pw) return false;
  if (creds.password && timingSafeStringEquals(pw, creds.password)) return true;
  if (creds.passwordHash && creds.passwordSalt) {
    const derived = crypto.pbkdf2Sync(pw, creds.passwordSalt, 120000, 32, 'sha256').toString('hex');
    return timingSafeStringEquals(derived, creds.passwordHash);
  }
  return false;
}

export async function handleAuthLogin(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const level = String(body?.level || '').trim().toLowerCase();
  const ttlSec = Math.min(86400, Math.max(600, parseInt(cfg('CORPFLOW_SESSION_TTL_SEC', '43200'), 10) || 43200));

  if (level === 'admin') {
    const creds = getAdminCreds();
    const u = String(body?.username || '').trim();
    const p = String(body?.password || '').trim();
    if (!creds.username) {
      return deny(res, 503, 'ADMIN_LOGIN_DISABLED', {
        hint: 'Set CORPFLOW_ADMIN_USERNAME and CORPFLOW_ADMIN_PASSWORD (or *_HASH/_SALT) in Vercel.',
      });
    }
    if (!timingSafeStringEquals(u, creds.username) || !verifyAdminPassword(p, creds)) {
      return deny(res, 401, 'INVALID_CREDENTIALS');
    }
    const signed = signSession({ typ: 'admin', username: u }, { ttlSec });
    if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
    setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
    return res.status(200).json({ ok: true, level: 'admin', expires_sec: ttlSec });
  }

  if (level === 'tenant') {
    const tenantId = String(body?.tenant_id || body?.tenantId || '').trim();
    const pin = String(body?.pin || '').trim();
    if (!tenantId || !pin) return deny(res, 400, 'tenant_id and pin required');

    const tableId = String(cfg('BASEROW_TENANT_TABLE_ID', '')).trim();
    const idField = String(cfg('BASEROW_TENANT_ID_FIELD', 'tenant_id')).trim() || 'tenant_id';
    const pinField = String(cfg('BASEROW_TENANT_PIN_FIELD', 'sovereign_pin')).trim() || 'sovereign_pin';
    if (!tableId) return deny(res, 503, 'BASEROW_TENANT_TABLE_ID missing');

    const client = createBaserowClient({ defaultTableId: tableId });
    // Find tenant row by field match.
    const rows = await client.listRows(tableId, {
      size: 5,
      filters: { filter_type: 'AND', filters: [{ field: idField, type: 'equal', value: tenantId }] },
    });
    const row = rows?.results?.[0] || null;
    if (!row) return deny(res, 404, 'TENANT_NOT_FOUND');
    const stored = String(row?.[pinField] || '').trim();
    if (!stored) return deny(res, 403, 'TENANT_PIN_NOT_PROVISIONED');
    if (!verifyPinAgainstStored(pin, stored)) return deny(res, 401, 'INVALID_PIN');

    const signed = signSession({ typ: 'tenant', tenant_id: tenantId, row_id: row?.id || null }, { ttlSec });
    if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
    setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
    return res.status(200).json({ ok: true, level: 'tenant', tenant_id: tenantId, expires_sec: ttlSec });
  }

  return deny(res, 400, 'INVALID_LEVEL', { allowed: ['admin', 'tenant'] });
}

export async function handleAuthMe(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const s = getSessionFromRequest(req);
  if (!s.ok) return res.status(200).json({ ok: true, logged_in: false });
  const p = s.payload || {};
  return res.status(200).json({
    ok: true,
    logged_in: true,
    level: p.typ || null,
    username: p.username || null,
    tenant_id: p.tenant_id || null,
    exp: p.exp || null,
  });
}

export async function handleAuthLogout(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  clearCookie(res, CORPFLOW_SESSION_COOKIE);
  return res.status(200).json({ ok: true });
}

