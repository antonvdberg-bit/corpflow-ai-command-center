import crypto from 'crypto';

import { cfg } from './runtime-config.js';
import { PrismaClient } from '@prisma/client';
import { verifyPinAgainstStored } from '../cmp/_lib/tenant-pin.js';
import {
  clearCookie,
  CORPFLOW_SESSION_COOKIE,
  getSessionFromRequest,
  setCookie,
  signSession,
} from './session.js';

const prisma = new PrismaClient();

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

function computePasswordHash(password, salt) {
  const pw = String(password || '').trim();
  const s = String(salt || '').trim();
  if (!pw || !s) return '';
  return crypto.pbkdf2Sync(pw, s, 120000, 32, 'sha256').toString('hex');
}

function getAdminCreds() {
  const username = String(cfg('CORPFLOW_ADMIN_USERNAME', '')).trim();
  const password = String(cfg('CORPFLOW_ADMIN_PASSWORD', '')).trim();
  const passwordHash = String(cfg('CORPFLOW_ADMIN_PASSWORD_HASH', '')).trim();
  const passwordSalt = String(cfg('CORPFLOW_ADMIN_PASSWORD_SALT', '')).trim();
  return { username, password, passwordHash, passwordSalt };
}

function verifyAdminPassword(inputPassword, creds) {
  const pw = String(inputPassword || '').trim();
  if (!pw) return false;
  if (creds.password && timingSafeStringEquals(pw, creds.password)) return true;
  if (creds.passwordHash && creds.passwordSalt) {
    const derived = computePasswordHash(pw, creds.passwordSalt);
    return timingSafeStringEquals(derived, creds.passwordHash);
  }
  return false;
}

async function tryPostgresAuthUserLogin({ level, username, password, tenantId }) {
  const backend = String(cfg('CORPFLOW_AUTH_BACKEND', 'postgres')).trim().toLowerCase();
  if (backend !== 'postgres') return { ok: false, code: 'POSTGRES_AUTH_DISABLED' };
  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return { ok: false, code: 'POSTGRES_URL_MISSING' };

  const u = String(username || '').trim();
  const p = String(password || '').trim();
  if (!u || !p) return { ok: false, code: 'MISSING_CREDENTIALS' };

  const row = await prisma.authUser.findUnique({ where: { username: u } });
  if (!row) return { ok: false, code: 'USER_NOT_FOUND' };
  if (row.enabled === false) return { ok: false, code: 'USER_DISABLED' };

  const rowLevel = String(row.level || '').trim().toLowerCase();
  if (!rowLevel) return { ok: false, code: 'LEVEL_NOT_SET' };
  if (rowLevel === 'disabled') return { ok: false, code: 'USER_DISABLED' };
  if (rowLevel !== level) return { ok: false, code: 'LEVEL_MISMATCH' };

  if (level === 'tenant') {
    const rowTenantId = String(row.tenantId || '').trim();
    if (!rowTenantId) return { ok: false, code: 'TENANT_ID_NOT_SET' };
    if (tenantId && rowTenantId !== String(tenantId)) return { ok: false, code: 'TENANT_MISMATCH' };
  }

  const derived = computePasswordHash(p, row.passwordSalt);
  if (!derived || !timingSafeStringEquals(derived, row.passwordHash)) return { ok: false, code: 'INVALID_CREDENTIALS' };

  return {
    ok: true,
    user: {
      id: row.id,
      level: rowLevel,
      username: row.username,
      tenant_id: row.tenantId || null,
    },
  };
}

/**
 * Tenant PIN vs `tenants.sovereign_pin_hash` (scrypt v1 or legacy plaintext for migration).
 *
 * @param {string} tenantId
 * @param {string} pin
 * @returns {Promise<{ ok: true, tenant_id: string, row_id: string } | { ok: false, code: string }>}
 */
async function tryPostgresTenantPinLogin(tenantId, pin) {
  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return { ok: false, code: 'POSTGRES_URL_MISSING' };

  const row = await prisma.tenant.findUnique({ where: { tenantId } });
  if (!row) return { ok: false, code: 'TENANT_NOT_FOUND' };

  const stored = row.sovereignPinHash != null ? String(row.sovereignPinHash) : '';
  if (!stored.trim()) return { ok: false, code: 'TENANT_PIN_NOT_PROVISIONED' };
  if (!verifyPinAgainstStored(pin, stored)) return { ok: false, code: 'INVALID_PIN' };

  return { ok: true, tenant_id: tenantId, row_id: row.id };
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
    const u = String(body?.username || '').trim();
    const p = String(body?.password || '').trim();
    if (!u || !p) return deny(res, 400, 'username and password required');

    try {
      const pg = await tryPostgresAuthUserLogin({ level: 'admin', username: u, password: p, tenantId: null });
      if (pg.ok) {
        const signed = signSession({ typ: 'admin', username: pg.user.username, user_id: pg.user.id }, { ttlSec });
        if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
        setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
        return res.status(200).json({ ok: true, level: 'admin', expires_sec: ttlSec, source: 'postgres' });
      }
    } catch {
      /* relation missing or DB down — fall through to env admin */
    }

    const creds = getAdminCreds();
    if (!creds.username) {
      return deny(res, 503, 'ADMIN_LOGIN_DISABLED', {
        hint:
          'Set CORPFLOW_ADMIN_USERNAME and CORPFLOW_ADMIN_PASSWORD in Vercel (bootstrap), or create rows in Postgres auth_users.',
      });
    }
    if (!timingSafeStringEquals(u, creds.username) || !verifyAdminPassword(p, creds)) return deny(res, 401, 'INVALID_CREDENTIALS');

    const signed = signSession({ typ: 'admin', username: u }, { ttlSec });
    if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
    setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
    return res.status(200).json({ ok: true, level: 'admin', expires_sec: ttlSec, source: 'env' });
  }

  if (level === 'tenant') {
    const tenantId = String(body?.tenant_id || body?.tenantId || '').trim();
    const pin = String(body?.pin || '').trim();
    const username = String(body?.username || '').trim();
    const password = String(body?.password || '').trim();
    if (!tenantId) return deny(res, 400, 'tenant_id required');

    const backend = String(cfg('CORPFLOW_AUTH_BACKEND', 'postgres')).trim().toLowerCase();
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();

    if (username && password) {
      if (backend !== 'postgres' || !pgUrl) {
        return deny(res, 503, 'TENANT_AUTH_POSTGRES_REQUIRED', {
          hint: 'Set CORPFLOW_AUTH_BACKEND=postgres and POSTGRES_URL; manage tenant users in auth_users.',
        });
      }
      const pg = await tryPostgresAuthUserLogin({ level: 'tenant', username, password, tenantId });
      if (pg.ok) {
        const signed = signSession(
          { typ: 'tenant', tenant_id: pg.user.tenant_id, username: pg.user.username, user_id: pg.user.id },
          { ttlSec },
        );
        if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
        setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
        return res.status(200).json({
          ok: true,
          level: 'tenant',
          tenant_id: pg.user.tenant_id,
          expires_sec: ttlSec,
          source: 'postgres',
        });
      }
      return deny(res, 401, pg.code || 'INVALID_CREDENTIALS');
    }

    if (!pin) return deny(res, 400, 'Provide either (username+password) or pin.');

    if (!pgUrl) {
      return deny(res, 503, 'POSTGRES_URL_MISSING', {
        hint: 'Tenant PIN is verified against Postgres tenants.sovereign_pin_hash.',
      });
    }

    const pinResult = await tryPostgresTenantPinLogin(tenantId, pin);
    if (!pinResult.ok) {
      const code = pinResult.code || 'INVALID_PIN';
      const status = code === 'TENANT_NOT_FOUND' ? 404 : code === 'TENANT_PIN_NOT_PROVISIONED' ? 403 : 401;
      return deny(res, status, code);
    }

    const signed = signSession(
      { typ: 'tenant', tenant_id: pinResult.tenant_id, row_id: pinResult.row_id },
      { ttlSec },
    );
    if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
    setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
    return res.status(200).json({
      ok: true,
      level: 'tenant',
      tenant_id: pinResult.tenant_id,
      expires_sec: ttlSec,
      source: 'pin',
    });
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
