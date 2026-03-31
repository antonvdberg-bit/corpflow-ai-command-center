import crypto from 'crypto';

import { cfg } from './runtime-config.js';
import { PrismaClient } from '@prisma/client';
import { createBaserowClient } from '../cmp/_lib/baserow.js';
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
    const derived = computePasswordHash(pw, creds.passwordSalt);
    return timingSafeStringEquals(derived, creds.passwordHash);
  }
  return false;
}

async function tryBaserowAuthUserLogin({ level, username, password, tenantId }) {
  const tableId = String(cfg('BASEROW_AUTH_USERS_TABLE_ID', '')).trim();
  if (!tableId) return { ok: false, code: 'AUTH_TABLE_NOT_CONFIGURED' };

  const usernameField = String(cfg('BASEROW_AUTH_USERNAME_FIELD', 'username')).trim() || 'username';
  const hashField = String(cfg('BASEROW_AUTH_PASSWORD_HASH_FIELD', 'password_hash')).trim() || 'password_hash';
  const saltField = String(cfg('BASEROW_AUTH_PASSWORD_SALT_FIELD', 'password_salt')).trim() || 'password_salt';
  const levelField = String(cfg('BASEROW_AUTH_LEVEL_FIELD', 'level')).trim() || 'level';
  const tenantIdField = String(cfg('BASEROW_AUTH_TENANT_ID_FIELD', 'tenant_id')).trim() || 'tenant_id';
  const enabledField = String(cfg('BASEROW_AUTH_ENABLED_FIELD', 'enabled')).trim() || 'enabled';

  const client = createBaserowClient({ defaultTableId: tableId });

  const filters = [{ field: usernameField, type: 'equal', value: username }];
  const rows = await client.listRows(tableId, {
    size: 5,
    filters: { filter_type: 'AND', filters },
  });
  const row = rows?.results?.[0] || null;
  if (!row) return { ok: false, code: 'USER_NOT_FOUND' };

  const isEnabled = row?.[enabledField];
  if (isEnabled === false) return { ok: false, code: 'USER_DISABLED' };

  const rowLevelRaw = row?.[levelField];
  const rowLevel = String(
    typeof rowLevelRaw === 'object' && rowLevelRaw && 'value' in rowLevelRaw ? rowLevelRaw.value : rowLevelRaw || '',
  )
    .trim()
    .toLowerCase();

  if (rowLevel === 'disabled') return { ok: false, code: 'USER_DISABLED' };
  if (rowLevel && rowLevel !== level) return { ok: false, code: 'LEVEL_MISMATCH' };

  if (level === 'tenant') {
    const rowTenantId = String(row?.[tenantIdField] || '').trim();
    if (!rowTenantId) return { ok: false, code: 'TENANT_ID_NOT_SET' };
    if (tenantId && rowTenantId !== tenantId) return { ok: false, code: 'TENANT_MISMATCH' };
  }

  const salt = String(row?.[saltField] || '').trim();
  const expectedHash = String(row?.[hashField] || '').trim();
  if (!salt || !expectedHash) return { ok: false, code: 'PASSWORD_NOT_PROVISIONED' };

  const derived = computePasswordHash(password, salt);
  if (!derived || !timingSafeStringEquals(derived, expectedHash)) return { ok: false, code: 'INVALID_CREDENTIALS' };

  return {
    ok: true,
    user: {
      id: row?.id || null,
      level: rowLevel || level,
      username: String(row?.[usernameField] || username || '').trim(),
      tenant_id: level === 'tenant' ? String(row?.[tenantIdField] || tenantId || '').trim() : null,
    },
  };
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

    // Preferred: Postgres auth_users — but if the table is missing or DB errors, fall through so
    // env admin (CORPFLOW_ADMIN_*) can still log in and use "Ensure Postgres tables" on /login.
    try {
      const pg = await tryPostgresAuthUserLogin({ level: 'admin', username: u, password: p, tenantId: null });
      if (pg.ok) {
        const signed = signSession({ typ: 'admin', username: pg.user.username, user_id: pg.user.id }, { ttlSec });
        if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
        setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
        return res.status(200).json({ ok: true, level: 'admin', expires_sec: ttlSec, source: 'postgres' });
      }
    } catch {
      // e.g. relation auth_users does not exist, or Prisma cannot connect — try Baserow / env below.
    }

    // Preferred: Baserow-backed auth users table (if configured).
    try {
      const br = await tryBaserowAuthUserLogin({ level: 'admin', username: u, password: p, tenantId: null });
      if (br.ok) {
        const signed = signSession({ typ: 'admin', username: br.user.username, user_id: br.user.id }, { ttlSec });
        if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
        setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
        return res.status(200).json({ ok: true, level: 'admin', expires_sec: ttlSec, source: 'baserow' });
      }
    } catch {
      // Baserow unavailable — try env admin below.
    }

    // Fallback: env-based admin creds (legacy / bootstrap).
    const creds = getAdminCreds();
    if (!creds.username) {
      return deny(res, 503, 'ADMIN_LOGIN_DISABLED', {
        hint:
          'Set CORPFLOW_ADMIN_USERNAME and CORPFLOW_ADMIN_PASSWORD in Vercel (bootstrap until Postgres auth_users exists), or provision auth_users in Postgres.',
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

    if (username && password) {
      const pg = await tryPostgresAuthUserLogin({ level: 'tenant', username, password, tenantId });
      if (pg.ok) {
        const signed = signSession(
          { typ: 'tenant', tenant_id: pg.user.tenant_id, username: pg.user.username, user_id: pg.user.id },
          { ttlSec },
        );
        if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
        setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
        return res.status(200).json({ ok: true, level: 'tenant', tenant_id: pg.user.tenant_id, expires_sec: ttlSec, source: 'postgres' });
      }
      // If postgres is enabled but credentials failed, fail fast (don't fall back to PIN silently).
      const backend = String(cfg('CORPFLOW_AUTH_BACKEND', 'postgres')).trim().toLowerCase();
      const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
      if (backend === 'postgres' && pgUrl) return deny(res, 401, pg.code || 'INVALID_CREDENTIALS');
    }

    // Preferred: Baserow-backed AuthUsers username/password for tenant (if provided).
    if (username && password) {
      const br = await tryBaserowAuthUserLogin({ level: 'tenant', username, password, tenantId });
      if (!br.ok) return deny(res, 401, br.code || 'INVALID_CREDENTIALS');
      const signed = signSession(
        { typ: 'tenant', tenant_id: br.user.tenant_id, username: br.user.username, user_id: br.user.id },
        { ttlSec },
      );
      if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
      setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
      return res.status(200).json({ ok: true, level: 'tenant', tenant_id: br.user.tenant_id, expires_sec: ttlSec, source: 'baserow' });
    }

    // Fallback: existing tenant PIN flow.
    if (!pin) return deny(res, 400, 'Provide either (username+password) or pin.');

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
    return res.status(200).json({ ok: true, level: 'tenant', tenant_id: tenantId, expires_sec: ttlSec, source: 'pin' });
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

