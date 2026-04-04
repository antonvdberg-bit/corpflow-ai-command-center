/**
 * Factory-only: list auth_users (no secrets) and set passwords (never reveal old passwords).
 *
 * GET  /api/factory/auth-users/list?tenant_id=optional&username=optional (email; exact match)
 * POST /api/factory/auth-users/set-password  { username, new_password? , generate?: true, create_if_missing?, tenant_id?, level? }
 */

import crypto from 'crypto';

import { PrismaClient } from '@prisma/client';

import { verifyFactoryMasterAuth } from './factory-master-auth.js';

const prisma = new PrismaClient();

function normalizeEmailish(s) {
  return String(s || '').trim().toLowerCase();
}

function computePasswordHash(password, salt) {
  const pw = String(password || '').trim();
  const s = String(salt || '').trim();
  if (!pw || !s) return '';
  return crypto.pbkdf2Sync(pw, s, 120000, 32, 'sha256').toString('hex');
}

function newSaltHex() {
  return crypto.randomBytes(16).toString('hex');
}

function generateRandomLoginPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const buf = crypto.randomBytes(24);
  let out = '';
  for (let i = 0; i < 24; i += 1) {
    out += chars[buf[i] % chars.length];
  }
  return out;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleFactoryAuthUsersList(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(401).json({ error: 'FACTORY_AUTH_REQUIRED' });
  }

  const tenantFilter = String(req.query?.tenant_id || req.query?.tenantId || '').trim();
  const usernameFilter = normalizeEmailish(req.query?.username || req.query?.email || '');
  /** @type {{ tenantId?: string; username?: string }} */
  const where = {};
  if (tenantFilter) where.tenantId = tenantFilter;
  if (usernameFilter) where.username = usernameFilter;

  try {
    const rows = await prisma.authUser.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        username: true,
        level: true,
        tenantId: true,
        enabled: true,
        createdAt: true,
        lastLoginAt: true,
        passwordHash: true,
        passwordSalt: true,
      },
    });

    const users = rows.map((r) => ({
      id: r.id,
      username: r.username,
      level: r.level,
      tenant_id: r.tenantId,
      enabled: r.enabled,
      created_at: r.createdAt,
      last_login_at: r.lastLoginAt,
      /** Whether a password is stored (you cannot read it back — only reset). */
      password_saved: Boolean(
        r.passwordHash && String(r.passwordHash).trim() && r.passwordSalt && String(r.passwordSalt).trim(),
      ),
    }));

    return res.status(200).json({ ok: true, users, count: users.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'AUTH_USERS_LIST_FAILED', detail: msg });
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleFactoryAuthUsersSetPassword(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(401).json({ error: 'FACTORY_AUTH_REQUIRED' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const username = normalizeEmailish(body.username || '');
  const generate = body.generate === true || body.gen_password === true;
  const createIfMissing = body.create_if_missing === true || body.createIfMissing === true;
  const tenantIdCreate = String(body.tenant_id || body.tenantId || '').trim();
  const levelCreate = String(body.level || 'tenant').trim() || 'tenant';
  let newPassword = String(body.new_password || body.newPassword || '').trim();

  if (!username) {
    return res.status(400).json({ error: 'username_required' });
  }

  if (generate) {
    newPassword = generateRandomLoginPassword();
  }

  if (!newPassword || newPassword.length < 10) {
    return res.status(400).json({
      error: 'password_invalid',
      hint: 'Use generate: true or new_password with at least 10 characters.',
    });
  }

  try {
    const row = await prisma.authUser.findUnique({
      where: { username },
      select: { id: true, username: true },
    });
    if (!row && !createIfMissing) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', username });
    }
    if (!row && createIfMissing && !tenantIdCreate) {
      return res.status(400).json({
        error: 'tenant_id_required_for_create',
        hint: 'When create_if_missing is true, pass tenant_id matching the workspace you onboarded.',
      });
    }

    const salt = newSaltHex();
    const hash = computePasswordHash(newPassword, salt);
    if (!hash) {
      return res.status(500).json({ error: 'HASH_FAILED' });
    }

    if (row) {
      await prisma.authUser.update({
        where: { id: row.id },
        data: { passwordSalt: salt, passwordHash: hash },
      });
    } else {
      await prisma.authUser.create({
        data: {
          username,
          passwordSalt: salt,
          passwordHash: hash,
          level: levelCreate,
          tenantId: tenantIdCreate,
          enabled: true,
        },
      });
    }

    const out = {
      ok: true,
      username,
      message: row ? 'Password updated.' : 'Login account created.',
      created: !row,
    };
    if (generate) {
      Object.assign(out, {
        password_print_once: newPassword,
        warning: 'Copy this password now. It is not stored in plaintext and cannot be shown again.',
      });
    }
    return res.status(200).json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'SET_PASSWORD_FAILED', detail: msg });
  }
}
