#!/usr/bin/env node
/**
 * #696 — Provision dedicated Cursor test identities (admin + Lux tenant).
 *
 * Reuses existing auth_users + user_tenant_memberships. No schema change.
 * Does NOT write secrets to git, chat, or artifacts. Password is printed once
 * to stdout when --gen-password is used (operator copies into password manager
 * / Cursor protected runtime env — never into the PR).
 *
 * Safety:
 *   - Default is --dry-run (no writes).
 *   - Real writes require --apply.
 *   - Admin identity is created with factory_master=false (least privilege).
 *   - Does not set CORPFLOW_ADMIN_* env bootstrap credentials.
 *
 * Usage (PowerShell, repo root, POSTGRES_URL = production Neon):
 *
 *   node scripts/provision-cursor-test-access.mjs
 *   node scripts/provision-cursor-test-access.mjs --apply --gen-password
 *   node scripts/provision-cursor-test-access.mjs --apply --admin-only --gen-password
 *   node scripts/provision-cursor-test-access.mjs --apply --lux-only --gen-password
 *   node scripts/provision-cursor-test-access.mjs --apply --disable
 *   node scripts/provision-cursor-test-access.mjs --apply --enable
 *
 * Then store passwords only in the approved secret store / Cursor runtime secrets
 * under the names documented in docs/operations/CURSOR_TEST_ACCESS_V1.md.
 */

import './bootstrap-repo-env.mjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  CURSOR_TEST_ADMIN,
  CURSOR_TEST_LUX,
  CURSOR_TEST_LABELS,
  CURSOR_TEST_LABEL_NOTES,
  CURSOR_TEST_ENV_NAMES,
  CURSOR_TEST_DEFAULT_URLS,
  PROVISION_EVENT_TYPE,
} from './lib/cursor-test-access-ids.mjs';

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

function normalizePostgresUrlForPrisma(raw) {
  let u = String(raw ?? '').trim();
  while (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1).trim();
  }
  if (u.startsWith('prisma+postgres://')) {
    u = `postgresql://${u.slice('prisma+postgres://'.length)}`;
  }
  return u;
}

function exitIfInvalidPostgresUrl(url) {
  if (!url) {
    console.error('ERROR: POSTGRES_URL is empty. Set it to the same Neon URL as Vercel Production.');
    process.exit(1);
  }
  if (!(url.startsWith('postgresql://') || url.startsWith('postgres://'))) {
    console.error('ERROR: POSTGRES_URL must start with postgresql:// or postgres://');
    process.exit(1);
  }
}

function parseArgs(argv) {
  const out = {
    dryRun: true,
    apply: false,
    genPassword: false,
    adminOnly: false,
    luxOnly: false,
    disable: false,
    enable: false,
    help: false,
    adminPassword: '',
    luxPassword: '',
  };
  for (const a of argv) {
    if (a === '-h' || a === '--help') out.help = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--apply') {
      out.apply = true;
      out.dryRun = false;
    } else if (a === '--gen-password') out.genPassword = true;
    else if (a === '--admin-only') out.adminOnly = true;
    else if (a === '--lux-only') out.luxOnly = true;
    else if (a === '--disable') out.disable = true;
    else if (a === '--enable') out.enable = true;
    else if (a.startsWith('--admin-password=')) out.adminPassword = a.slice('--admin-password='.length);
    else if (a.startsWith('--lux-password=')) out.luxPassword = a.slice('--lux-password='.length);
  }
  return out;
}

function printWalletCard({ name, url, username, password, level, tenantId, labels, envUser, envPass }) {
  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  SAVE IN YOUR PASSWORD MANAGER (copy this block once)');
  console.log('══════════════════════════════════════════════════════════');
  console.log('Name:     ', name);
  console.log('URL:      ', url);
  console.log('Username: ', username);
  console.log('Password: ', password || '(not printed — use the value you passed)');
  console.log('Level:    ', level);
  if (tenantId) console.log('Tenant:   ', tenantId);
  console.log('Labels:   ', labels.join(', '));
  console.log('Env user: ', envUser);
  console.log('Env pass: ', envPass);
  console.log('══════════════════════════════════════════════════════════');
  console.log('');
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ username: string, level: string, tenantId: string | null, factoryMaster: boolean, enabled: boolean, password: string | null, rotatePassword: boolean }} spec
 */
async function upsertAuthUser(prisma, spec, dryRun) {
  const username = String(spec.username).trim().toLowerCase();
  const existing = await prisma.authUser.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      level: true,
      tenantId: true,
      factoryMaster: true,
      enabled: true,
    },
  });

  /** @type {Record<string, unknown>} */
  const data = {
    level: spec.level,
    tenantId: spec.tenantId,
    factoryMaster: spec.factoryMaster,
    enabled: spec.enabled,
  };

  if (spec.rotatePassword && spec.password) {
    const salt = newSaltHex();
    const hash = computePasswordHash(spec.password, salt);
    if (!hash) throw new Error('password hash failed');
    data.passwordSalt = salt;
    data.passwordHash = hash;
  }

  if (dryRun) {
    console.log(
      `[dry-run] WOULD-${existing ? 'UPDATE' : 'CREATE'} auth_users username=${username} level=${spec.level} tenant_id=${spec.tenantId ?? '(null)'} factory_master=${spec.factoryMaster} enabled=${spec.enabled} rotate_password=${Boolean(spec.rotatePassword)}`,
    );
    return {
      id: existing?.id || '(new)',
      username,
      created: !existing,
      updated: Boolean(existing),
    };
  }

  if (existing) {
    const updated = await prisma.authUser.update({
      where: { id: existing.id },
      data,
      select: { id: true, username: true, level: true, tenantId: true, factoryMaster: true, enabled: true },
    });
    console.log(
      `[apply] UPDATED auth_users id=${updated.id} username=${updated.username} level=${updated.level} tenant_id=${updated.tenantId ?? '(null)'} factory_master=${updated.factoryMaster} enabled=${updated.enabled}`,
    );
    return { id: updated.id, username: updated.username, created: false, updated: true };
  }

  if (!spec.password) {
    throw new Error(`Cannot create ${username} without a password. Pass --gen-password or --*-password=.`);
  }
  const salt = newSaltHex();
  const hash = computePasswordHash(spec.password, salt);
  if (!hash) throw new Error('password hash failed');
  const created = await prisma.authUser.create({
    data: {
      username,
      passwordHash: hash,
      passwordSalt: salt,
      level: spec.level,
      tenantId: spec.tenantId,
      factoryMaster: spec.factoryMaster,
      enabled: spec.enabled,
    },
    select: { id: true, username: true, level: true, tenantId: true, factoryMaster: true, enabled: true },
  });
  console.log(
    `[apply] CREATED auth_users id=${created.id} username=${created.username} level=${created.level} tenant_id=${created.tenantId ?? '(null)'} factory_master=${created.factoryMaster} enabled=${created.enabled}`,
  );
  return { id: created.id, username: created.username, created: true, updated: false };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 * @param {string} tenantId
 * @param {boolean} dryRun
 */
async function ensureLuxMembership(prisma, userId, tenantId, dryRun) {
  if (userId === '(new)') {
    console.log(
      `[dry-run] WOULD-ENSURE user_tenant_memberships user=(new) tenant_id=${tenantId} notes=${CURSOR_TEST_LABEL_NOTES}`,
    );
    return;
  }
  const existing = await prisma.userTenantMembership.findFirst({
    where: { userId, tenantId, revokedAt: null },
    select: { id: true, notes: true, enabled: true },
  });
  if (dryRun) {
    console.log(
      `[dry-run] WOULD-${existing ? 'UPDATE-NOTES' : 'CREATE'} user_tenant_memberships user_id=${userId} tenant_id=${tenantId}`,
    );
    return;
  }
  if (existing) {
    await prisma.userTenantMembership.update({
      where: { id: existing.id },
      data: {
        enabled: true,
        notes: CURSOR_TEST_LABEL_NOTES,
        role: CURSOR_TEST_LUX.membershipRole,
      },
    });
    console.log(`[apply] UPDATED membership id=${existing.id} user_id=${userId} tenant_id=${tenantId}`);
    return;
  }
  const row = await prisma.userTenantMembership.create({
    data: {
      userId,
      tenantId,
      role: CURSOR_TEST_LUX.membershipRole,
      enabled: true,
      grantedBy: 'system',
      notes: CURSOR_TEST_LABEL_NOTES,
    },
    select: { id: true },
  });
  console.log(`[apply] CREATED membership id=${row.id} user_id=${userId} tenant_id=${tenantId}`);
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object} payload
 * @param {boolean} dryRun
 */
async function writeProvisionAudit(prisma, payload, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] WOULD-WRITE automation_events event_type=${PROVISION_EVENT_TYPE}`);
    return;
  }
  try {
    await prisma.automationEvent.create({
      data: {
        tenantScope: 'global',
        tenantId: null,
        source: 'provision-cursor-test-access',
        eventType: PROVISION_EVENT_TYPE,
        riskTier: 'low',
        status: 'accepted',
        correlationId: `cursor-test-access-${Date.now()}`,
        payload,
      },
    });
    console.log(`[apply] Wrote automation_events ${PROVISION_EVENT_TYPE} (no secrets in payload)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[apply] WARN: automation_events write skipped: ${msg}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`
provision-cursor-test-access.mjs  (#696)

  (default)               Dry-run: print planned rows, no DB writes
  --apply                 Perform upserts (required for real provisioning)
  --gen-password          Generate strong passwords; print wallet cards once
  --admin-password=...    Explicit admin password (prefer --gen-password)
  --lux-password=...      Explicit lux password (prefer --gen-password)
  --admin-only            Only cursor-test-admin
  --lux-only              Only cursor-test-lux
  --disable               Set enabled=false (no password rotation)
  --enable                Set enabled=true

Identities:
  ${CURSOR_TEST_ADMIN.username}  level=admin  factory_master=false
  ${CURSOR_TEST_LUX.username}    level=tenant tenant_id=${CURSOR_TEST_LUX.tenantId}

Labels (membership notes / audit payload): ${CURSOR_TEST_LABELS.join(', ')}

Env after handoff (values NOT written by this script):
  ${CURSOR_TEST_ENV_NAMES.adminUsername} / ${CURSOR_TEST_ENV_NAMES.adminPassword}
  ${CURSOR_TEST_ENV_NAMES.luxUsername} / ${CURSOR_TEST_ENV_NAMES.luxPassword}
`);
    process.exit(0);
  }

  if (args.adminOnly && args.luxOnly) {
    console.error('ERROR: Use at most one of --admin-only / --lux-only');
    process.exit(1);
  }
  if (args.disable && args.enable) {
    console.error('ERROR: Use at most one of --disable / --enable');
    process.exit(1);
  }
  if (args.adminPassword && args.genPassword && !args.luxOnly) {
    console.error('ERROR: Do not combine --admin-password with --gen-password for admin');
    process.exit(1);
  }
  if (args.luxPassword && args.genPassword && !args.adminOnly) {
    console.error('ERROR: Do not combine --lux-password with --gen-password for lux');
    process.exit(1);
  }

  const doAdmin = !args.luxOnly;
  const doLux = !args.adminOnly;
  const enabled = args.disable ? false : true;
  // When neither --disable nor --enable, default enabled=true on upsert.
  const forceEnabled = args.disable || args.enable ? enabled : true;

  const rotatePassword = !args.disable && (args.genPassword || Boolean(args.adminPassword) || Boolean(args.luxPassword));
  // Creating new users always needs a password when applying.
  const needPasswordMaterial = args.apply && !args.disable;

  let adminPassword = args.adminPassword || '';
  let luxPassword = args.luxPassword || '';
  if (args.genPassword) {
    if (doAdmin && !adminPassword) adminPassword = generateRandomLoginPassword();
    if (doLux && !luxPassword) luxPassword = generateRandomLoginPassword();
  }

  const pgUrl = normalizePostgresUrlForPrisma(process.env.POSTGRES_URL);
  exitIfInvalidPostgresUrl(pgUrl);
  process.env.POSTGRES_URL = pgUrl;

  console.log(
    `[provision-cursor-test-access] mode=${args.apply ? 'APPLY' : 'DRY-RUN'} admin=${doAdmin} lux=${doLux} rotate_password=${rotatePassword} enabled=${forceEnabled}`,
  );
  console.log(`[provision-cursor-test-access] labels=${CURSOR_TEST_LABELS.join(',')}`);

  const prisma = new PrismaClient();
  /** @type {Record<string, unknown>} */
  const auditPayload = {
    issue: 696,
    labels: [...CURSOR_TEST_LABELS],
    mode: args.apply ? 'apply' : 'dry_run',
    identities: [],
    factory_master_admin: false,
    note: 'Passwords are never stored in this event payload.',
  };

  try {
    if (doLux) {
      const tid = CURSOR_TEST_LUX.tenantId;
      const tenant = await prisma.tenant.findUnique({
        where: { tenantId: tid },
        select: { tenantId: true, name: true },
      });
      if (!tenant) {
        console.error(
          `ERROR: tenant ${tid} not found. Create/host-map Lux first (docs/operations/TENANT_CLIENT_LOGIN.md).`,
        );
        process.exit(1);
      }
    }

    if (doAdmin) {
      const existing = await prisma.authUser.findUnique({
        where: { username: CURSOR_TEST_ADMIN.username },
        select: { id: true },
      });
      if (needPasswordMaterial && !existing && !adminPassword) {
        console.error('ERROR: Creating admin requires --gen-password or --admin-password=...');
        process.exit(1);
      }
      const adminResult = await upsertAuthUser(
        prisma,
        {
          username: CURSOR_TEST_ADMIN.username,
          level: CURSOR_TEST_ADMIN.level,
          tenantId: CURSOR_TEST_ADMIN.tenantId,
          factoryMaster: CURSOR_TEST_ADMIN.factoryMaster,
          enabled: forceEnabled,
          password: adminPassword || null,
          rotatePassword: Boolean(adminPassword) && (rotatePassword || !existing),
        },
        !args.apply,
      );
      /** @type {any[]} */ (auditPayload.identities).push({
        handle: CURSOR_TEST_ADMIN.handle,
        username: CURSOR_TEST_ADMIN.username,
        user_id: adminResult.id,
        level: CURSOR_TEST_ADMIN.level,
        factory_master: false,
        tenant_id: null,
        enabled: forceEnabled,
        labels: [...CURSOR_TEST_LABELS],
      });
      if (args.apply && adminPassword && (rotatePassword || adminResult.created)) {
        printWalletCard({
          name: 'CorpFlow Cursor Test Admin (#696)',
          url: `${CURSOR_TEST_DEFAULT_URLS.adminBaseUrl}/login`,
          username: CURSOR_TEST_ADMIN.username,
          password: adminPassword,
          level: 'admin',
          tenantId: null,
          labels: [...CURSOR_TEST_LABELS],
          envUser: CURSOR_TEST_ENV_NAMES.adminUsername,
          envPass: CURSOR_TEST_ENV_NAMES.adminPassword,
        });
      }
    }

    if (doLux) {
      const existing = await prisma.authUser.findUnique({
        where: { username: CURSOR_TEST_LUX.username },
        select: { id: true },
      });
      if (needPasswordMaterial && !existing && !luxPassword) {
        console.error('ERROR: Creating lux tenant user requires --gen-password or --lux-password=...');
        process.exit(1);
      }
      const luxResult = await upsertAuthUser(
        prisma,
        {
          username: CURSOR_TEST_LUX.username,
          level: CURSOR_TEST_LUX.level,
          tenantId: CURSOR_TEST_LUX.tenantId,
          factoryMaster: CURSOR_TEST_LUX.factoryMaster,
          enabled: forceEnabled,
          password: luxPassword || null,
          rotatePassword: Boolean(luxPassword) && (rotatePassword || !existing),
        },
        !args.apply,
      );
      await ensureLuxMembership(prisma, luxResult.id, CURSOR_TEST_LUX.tenantId, !args.apply);
      /** @type {any[]} */ (auditPayload.identities).push({
        handle: CURSOR_TEST_LUX.handle,
        username: CURSOR_TEST_LUX.username,
        user_id: luxResult.id,
        level: CURSOR_TEST_LUX.level,
        factory_master: false,
        tenant_id: CURSOR_TEST_LUX.tenantId,
        membership_notes: CURSOR_TEST_LABEL_NOTES,
        enabled: forceEnabled,
        labels: [...CURSOR_TEST_LABELS],
      });
      if (args.apply && luxPassword && (rotatePassword || luxResult.created)) {
        printWalletCard({
          name: 'CorpFlow Cursor Test Lux (#696)',
          url: `${CURSOR_TEST_DEFAULT_URLS.luxBaseUrl}/login`,
          username: CURSOR_TEST_LUX.username,
          password: luxPassword,
          level: 'tenant',
          tenantId: CURSOR_TEST_LUX.tenantId,
          labels: [...CURSOR_TEST_LABELS],
          envUser: CURSOR_TEST_ENV_NAMES.luxUsername,
          envPass: CURSOR_TEST_ENV_NAMES.luxPassword,
        });
      }
    }

    await writeProvisionAudit(prisma, auditPayload, !args.apply);

    console.log('');
    console.log('Next (operator — protected secrets handoff, not this PR):');
    console.log(`  1. Store wallet-card passwords in 1Password / Bitwarden (Cursor test vault).`);
    console.log(`  2. Set Cursor protected runtime / .env.local (gitignored):`);
    console.log(`       ${CURSOR_TEST_ENV_NAMES.adminUsername}=${CURSOR_TEST_ADMIN.username}`);
    console.log(`       ${CURSOR_TEST_ENV_NAMES.adminPassword}=<from wallet card>`);
    console.log(`       ${CURSOR_TEST_ENV_NAMES.luxUsername}=${CURSOR_TEST_LUX.username}`);
    console.log(`       ${CURSOR_TEST_ENV_NAMES.luxPassword}=<from wallet card>`);
    console.log(`  3. Run: npm run verify:cursor-test-access`);
    console.log(`  4. Fill CURSOR TEST ACCESS READY packet in docs/operations/CURSOR_TEST_ACCESS_V1.md`);
    if (!args.apply) {
      console.log('');
      console.log('DRY-RUN complete. Re-run with --apply --gen-password to write rows.');
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
