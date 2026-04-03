/**
 * Factory-only: diagnose tenant email/password login blockers (no secrets returned).
 *
 * POST /api/factory/tenant-login-debug
 * Headers: Authorization: Bearer MASTER_ADMIN_KEY (or admin session cookie)
 * Body: { "email": "user@example.com" }
 */

import { PrismaClient } from '@prisma/client';

import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';

function normalizeEmailish(s) {
  return String(s || '').trim().toLowerCase();
}

export default async function tenantLoginDebugHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(401).json({ error: 'FACTORY_AUTH_REQUIRED' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = normalizeEmailish(body.email || body.username || '');
  if (!email) {
    return res.status(400).json({ error: 'email_required', hint: 'JSON body: { "email": "you@company.com" }' });
  }

  const sovereignSessionSecretSet = Boolean(String(cfg('SOVEREIGN_SESSION_SECRET', '')).trim());
  const postgresUrlSet = Boolean(String(cfg('POSTGRES_URL', '')).trim());
  const authBackend = String(cfg('CORPFLOW_AUTH_BACKEND', 'postgres')).trim().toLowerCase();

  const prisma = new PrismaClient();
  let authUser = null;
  try {
    const row = await prisma.authUser.findUnique({
      where: { username: email },
      select: {
        enabled: true,
        level: true,
        tenantId: true,
        passwordHash: true,
        passwordSalt: true,
      },
    });
    if (!row) {
      authUser = { found: false };
    } else {
      authUser = {
        found: true,
        enabled: row.enabled,
        level: row.level,
        tenant_id: row.tenantId,
        has_password_hash: Boolean(row.passwordHash && String(row.passwordHash).trim()),
        has_password_salt: Boolean(row.passwordSalt && String(row.passwordSalt).trim()),
      };
    }
  } catch (e) {
    authUser = { found: false, prisma_error: e instanceof Error ? e.message : String(e) };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  const checklist = {
    can_issue_session_cookie: sovereignSessionSecretSet,
    can_read_auth_table: postgresUrlSet && authBackend === 'postgres',
    user_row_ready:
      authUser &&
      authUser.found &&
      authUser.enabled !== false &&
      String(authUser.level || '').toLowerCase() === 'tenant' &&
      Boolean(authUser.tenant_id) &&
      authUser.has_password_hash &&
      authUser.has_password_salt,
  };

  return res.status(200).json({
    ok: true,
    email_checked: email,
    env: {
      SOVEREIGN_SESSION_SECRET_set: sovereignSessionSecretSet,
      POSTGRES_URL_set: postgresUrlSet,
      CORPFLOW_AUTH_BACKEND: authBackend || 'postgres',
    },
    auth_user: authUser,
    checklist,
    hint:
      !sovereignSessionSecretSet
        ? 'Set SOVEREIGN_SESSION_SECRET on Vercel — without it login returns SESSION_SECRET_MISSING and no cookie.'
        : !postgresUrlSet
          ? 'Set POSTGRES_URL on Vercel to the same database where you ran the provision script.'
          : authUser && !authUser.found
            ? 'No auth_users row for this email — run scripts/provision-tenant-test-access.mjs with POSTGRES_URL pointing at this deployment’s database.'
            : authUser && authUser.found && String(authUser.level || '').toLowerCase() !== 'tenant'
              ? 'This user is not level=tenant — tenant UI login expects auth_users.level = tenant.'
              : authUser && authUser.found && !authUser.has_password_hash
                ? 'password_hash is empty — re-run provision with --username and --password or --gen-password.'
                : checklist.user_row_ready
                  ? 'Row looks OK — if login still fails, the typed password does not match what was provisioned; re-run provision with a new password.'
                  : null,
  });
}
