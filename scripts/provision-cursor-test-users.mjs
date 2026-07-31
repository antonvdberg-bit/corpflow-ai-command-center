#!/usr/bin/env node
/**
 * Provision dedicated Cursor test identities (#696) into existing auth_users
 * (+ optional user_tenant_memberships for the Lux tenant user).
 *
 * Does NOT:
 *   - change schema
 *   - write passwords to files, git, or env stores
 *   - promote factory_master
 *   - send email / WhatsApp / SMS
 *   - deploy
 *
 * Passwords are printed once as a wallet card when --gen-password is used.
 * Anton (or an approved operator) stores them in the secret vault / Cursor
 * protected runtime only.
 *
 * Usage:
 *   # Preview only (no DB writes):
 *   node scripts/provision-cursor-test-users.mjs --dry-run
 *
 *   # Create/rotate both identities (requires POSTGRES_URL = Vercel Production DB):
 *   node scripts/provision-cursor-test-users.mjs --gen-password
 *
 *   # One identity:
 *   node scripts/provision-cursor-test-users.mjs --only=lux --gen-password
 *   node scripts/provision-cursor-test-users.mjs --only=admin --gen-password
 *
 *   # Disable both (enabled=false; sessions stop working after cookie TTL / next login):
 *   node scripts/provision-cursor-test-users.mjs --disable
 *
 *   # Re-enable:
 *   node scripts/provision-cursor-test-users.mjs --enable
 */

import './bootstrap-repo-env.mjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  CURSOR_TEST_IDENTITIES,
  CURSOR_TEST_MEMBERSHIP_NOTES,
  CURSOR_TEST_METADATA_LABELS,
  CURSOR_TEST_RUNTIME_ENV,
  formatCursorTestAccessIdentityLines,
} from './lib/cursor-test-users-spec.mjs';

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
 * @param {string | undefined} raw
 * @returns {string}
 */
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

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{
   *   help: boolean,
   *   dryRun: boolean,
   *   genPassword: boolean,
   *   disable: boolean,
   *   enable: boolean,
   *   only: 'all' | 'admin' | 'lux',
   *   adminPassword: string,
   *   luxPassword: string,
   * }} */
  const out = {
    help: false,
    dryRun: false,
    genPassword: false,
    disable: false,
    enable: false,
    only: 'all',
    adminPassword: '',
    luxPassword: '',
  };
  for (const a of argv) {
    if (a === '-h' || a === '--help') out.help = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--gen-password') out.genPassword = true;
    else if (a === '--disable') out.disable = true;
    else if (a === '--enable') out.enable = true;
    else if (a.startsWith('--only=')) {
      const v = a.slice('--only='.length).trim().toLowerCase();
      if (v === 'admin' || v === 'lux' || v === 'all') out.only = v;
      else {
        console.error(`ERROR: --only must be admin|lux|all (got ${v})`);
        process.exit(1);
      }
    } else if (a.startsWith('--admin-password=')) {
      out.adminPassword = a.slice('--admin-password='.length);
    } else if (a.startsWith('--lux-password=')) {
      out.luxPassword = a.slice('--lux-password='.length);
    }
  }
  return out;
}

/**
 * @param {'admin' | 'lux'} key
 * @returns {string}
 */
function runtimeUsernameEnv(key) {
  return key === 'admin'
    ? CURSOR_TEST_RUNTIME_ENV.adminUsername
    : CURSOR_TEST_RUNTIME_ENV.luxUsername;
}

/**
 * @param {'admin' | 'lux'} key
 * @returns {string}
 */
function runtimePasswordEnv(key) {
  return key === 'admin'
    ? CURSOR_TEST_RUNTIME_ENV.adminPassword
    : CURSOR_TEST_RUNTIME_ENV.luxPassword;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {typeof CURSOR_TEST_IDENTITIES.admin | typeof CURSOR_TEST_IDENTITIES.lux} spec
 * @param {string} password
 * @param {boolean} dryRun
 */
async function upsertAuthUser(prisma, spec, password, dryRun) {
  const username = spec.username;
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

  if (dryRun) {
    console.log(
      `[dry-run] WOULD-UPSERT auth_users username=${username} level=${spec.level} tenant_id=${
        spec.tenantId ?? 'null'
      } factory_master=${spec.factoryMaster} existing=${existing ? existing.id : 'no'}`,
    );
    return existing;
  }

  const salt = newSaltHex();
  const hash = computePasswordHash(password, salt);
  if (!hash) {
    console.error(`ERROR: password hash failed for ${username}`);
    process.exit(1);
  }

  const row = await prisma.authUser.upsert({
    where: { username },
    create: {
      username,
      passwordHash: hash,
      passwordSalt: salt,
      level: spec.level,
      tenantId: spec.tenantId,
      enabled: true,
      factoryMaster: false,
    },
    update: {
      passwordHash: hash,
      passwordSalt: salt,
      level: spec.level,
      tenantId: spec.tenantId,
      enabled: true,
      // Never promote. Explicitly keep false on every provision rotate.
      factoryMaster: false,
    },
    select: {
      id: true,
      username: true,
      level: true,
      tenantId: true,
      factoryMaster: true,
      enabled: true,
    },
  });
  return row;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 * @param {string} tenantId
 * @param {boolean} dryRun
 */
async function ensureLuxMembership(prisma, userId, tenantId, dryRun) {
  const existing = await prisma.userTenantMembership.findFirst({
    where: { userId, tenantId, revokedAt: null },
    select: { id: true, notes: true, role: true, enabled: true },
  });

  if (dryRun) {
    console.log(
      `[dry-run] WOULD-${existing ? 'UPDATE-NOTES' : 'INSERT'} user_tenant_memberships user_id=${userId} tenant_id=${tenantId} notes=${CURSOR_TEST_MEMBERSHIP_NOTES}`,
    );
    return existing;
  }

  if (existing) {
    return prisma.userTenantMembership.update({
      where: { id: existing.id },
      data: {
        notes: CURSOR_TEST_MEMBERSHIP_NOTES,
        role: 'member',
        enabled: true,
        revokedAt: null,
        disabledAt: null,
      },
      select: { id: true, notes: true, role: true, enabled: true },
    });
  }

  return prisma.userTenantMembership.create({
    data: {
      userId,
      tenantId,
      role: 'member',
      enabled: true,
      grantedBy: 'system',
      notes: CURSOR_TEST_MEMBERSHIP_NOTES,
    },
    select: { id: true, notes: true, role: true, enabled: true },
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} username
 * @param {boolean} enabled
 * @param {boolean} dryRun
 */
async function setEnabled(prisma, username, enabled, dryRun) {
  const existing = await prisma.authUser.findUnique({
    where: { username },
    select: { id: true, enabled: true },
  });
  if (!existing) {
    console.error(`ERROR: cannot ${enabled ? 'enable' : 'disable'}; user missing: ${username}`);
    process.exit(1);
  }
  if (dryRun) {
    console.log(
      `[dry-run] WOULD-SET enabled=${enabled} username=${username} id=${existing.id} was=${existing.enabled}`,
    );
    return existing;
  }
  return prisma.authUser.update({
    where: { id: existing.id },
    data: { enabled },
    select: { id: true, username: true, enabled: true, level: true, tenantId: true, factoryMaster: true },
  });
}

/**
 * @param {'admin' | 'lux'} key
 * @param {string} password
 * @param {{ id?: string }} row
 */
function printWalletCard(key, password, row) {
  const spec = CURSOR_TEST_IDENTITIES[key];
  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  SAVE IN SECRET STORE / CURSOR PROTECTED RUNTIME (once)');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`Identity: ${spec.key}`);
  console.log(`Labels:   ${CURSOR_TEST_METADATA_LABELS.join(', ')}`);
  console.log(`URL:      ${spec.loginHostHint}`);
  console.log(`User ID:  ${row?.id || '(dry-run)'}`);
  console.log(`Username: ${spec.username}`);
  console.log(`Env user: ${runtimeUsernameEnv(key)}`);
  console.log(`Env pass: ${runtimePasswordEnv(key)}`);
  console.log(`Password: ${password}`);
  console.log('══════════════════════════════════════════════════════════');
  console.log('Do not paste this block into GitHub, chat, PR, or artifacts.');
  console.log('');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`
provision-cursor-test-users.mjs  (#696)

  --dry-run                 Print intended writes; no DB mutation
  --gen-password            Generate strong unique passwords; print wallet cards once
  --only=admin|lux|all      Default all
  --admin-password=...      Explicit admin password (avoid; prefer --gen-password)
  --lux-password=...        Explicit lux password (avoid; prefer --gen-password)
  --disable                 Set enabled=false on selected identities
  --enable                  Set enabled=true on selected identities

Env: POSTGRES_URL required for non-dry-run (same Neon DB as Vercel Production).

Canonical usernames:
  ${CURSOR_TEST_IDENTITIES.admin.username}
  ${CURSOR_TEST_IDENTITIES.lux.username}

Runtime env names (values never committed):
  ${CURSOR_TEST_RUNTIME_ENV.adminUsername} / ${CURSOR_TEST_RUNTIME_ENV.adminPassword}
  ${CURSOR_TEST_RUNTIME_ENV.luxUsername} / ${CURSOR_TEST_RUNTIME_ENV.luxPassword}
`);
    process.exit(0);
  }

  if (args.disable && args.enable) {
    console.error('ERROR: use either --disable or --enable, not both');
    process.exit(1);
  }

  const mutatingPassword = !args.disable && !args.enable;
  if (mutatingPassword && !args.dryRun && !args.genPassword && !args.adminPassword && !args.luxPassword) {
    console.error('ERROR: use --gen-password (recommended) or explicit --*-password=...; or --dry-run');
    process.exit(1);
  }

  if (args.genPassword && (args.adminPassword || args.luxPassword)) {
    console.error('ERROR: use either --gen-password or explicit --*-password, not both');
    process.exit(1);
  }

  const keys =
    args.only === 'all'
      ? /** @type {Array<'admin' | 'lux'>} */ (['admin', 'lux'])
      : /** @type {Array<'admin' | 'lux'>} */ ([args.only]);

  const pgUrl = normalizePostgresUrlForPrisma(process.env.POSTGRES_URL);
  const pgOk = Boolean(pgUrl && (pgUrl.startsWith('postgresql://') || pgUrl.startsWith('postgres://')));
  if (!args.dryRun) {
    if (!pgOk) {
      console.error('ERROR: POSTGRES_URL must be set to the Vercel Production Postgres URL.');
      console.error('  This is a protected operator step. Do not put the URL in git or chat.');
      process.exit(1);
    }
    process.env.POSTGRES_URL = pgUrl;
  } else if (pgOk) {
    process.env.POSTGRES_URL = pgUrl;
  }

  /** Offline dry-run: no POSTGRES_URL — print the plan only. */
  if (args.dryRun && !pgOk) {
    console.log('[dry-run] offline (POSTGRES_URL not set) — printing plan only; no DB contact.');
    for (const key of keys) {
      const spec = CURSOR_TEST_IDENTITIES[key];
      console.log(
        `[dry-run] WOULD-UPSERT auth_users username=${spec.username} level=${spec.level} tenant_id=${
          spec.tenantId ?? 'null'
        } factory_master=${spec.factoryMaster}`,
      );
      if (key === 'lux') {
        console.log(
          `[dry-run] WOULD-UPSERT tenants.tenant_id=${spec.tenantId} + membership notes=${CURSOR_TEST_MEMBERSHIP_NOTES}`,
        );
      }
    }
    console.log('');
    console.log('--- non-secret identity summary ---');
    for (const line of formatCursorTestAccessIdentityLines({})) {
      console.log(line);
    }
    console.log('--- end summary ---');
    console.log('[provision] DRY-RUN complete (offline).');
    return;
  }

  const prisma = new PrismaClient();
  /** @type {{ admin: any, lux: any, luxMembershipNotes: string | null }} */
  const evidence = { admin: null, lux: null, luxMembershipNotes: null };

  try {
    if (args.disable || args.enable) {
      const enabled = Boolean(args.enable);
      for (const key of keys) {
        const spec = CURSOR_TEST_IDENTITIES[key];
        const row = await setEnabled(prisma, spec.username, enabled, args.dryRun);
        evidence[key] = row;
        console.log(
          `[provision] ${enabled ? 'enable' : 'disable'} username=${spec.username} id=${row.id} dry_run=${args.dryRun}`,
        );
      }
    } else {
      // Ensure Lux tenant row exists before membership (tenant path only).
      if (keys.includes('lux') && !args.dryRun) {
        const tid = CURSOR_TEST_IDENTITIES.lux.tenantId;
        await prisma.tenant.upsert({
          where: { tenantId: tid },
          update: {},
          create: {
            tenantId: tid,
            slug: tid,
            name: 'Luxe Maurice',
          },
        });
      } else if (keys.includes('lux') && args.dryRun) {
        console.log(
          `[dry-run] WOULD-UPSERT tenants.tenant_id=${CURSOR_TEST_IDENTITIES.lux.tenantId} (no-op if exists)`,
        );
      }

      for (const key of keys) {
        const spec = CURSOR_TEST_IDENTITIES[key];
        let password = key === 'admin' ? args.adminPassword : args.luxPassword;
        if (args.genPassword || args.dryRun) {
          password = password || generateRandomLoginPassword();
        }
        if (!password) {
          console.error(`ERROR: missing password for ${key}; use --gen-password`);
          process.exit(1);
        }

        const row = await upsertAuthUser(prisma, spec, password, args.dryRun);
        evidence[key] = row || {
          id: '(dry-run)',
          username: spec.username,
          level: spec.level,
          tenantId: spec.tenantId,
          factoryMaster: false,
          enabled: true,
        };

        if (key === 'lux') {
          const userId = evidence.lux?.id;
          if (userId && userId !== '(dry-run)') {
            const mem = await ensureLuxMembership(
              prisma,
              userId,
              /** @type {string} */ (spec.tenantId),
              args.dryRun,
            );
            evidence.luxMembershipNotes = mem?.notes || CURSOR_TEST_MEMBERSHIP_NOTES;
          } else {
            console.log(
              `[dry-run] WOULD-INSERT/UPDATE user_tenant_memberships tenant_id=${spec.tenantId} notes=${CURSOR_TEST_MEMBERSHIP_NOTES}`,
            );
            evidence.luxMembershipNotes = CURSOR_TEST_MEMBERSHIP_NOTES;
          }
        }

        if (!args.dryRun && args.genPassword) {
          printWalletCard(key, password, evidence[key]);
        } else if (!args.dryRun && password) {
          console.log(
            `[provision] password set for ${spec.username} (not printed — you supplied --${key}-password)`,
          );
        }
      }
    }

    console.log('');
    console.log('--- non-secret identity summary ---');
    for (const line of formatCursorTestAccessIdentityLines(evidence)) {
      console.log(line);
    }
    console.log('--- end summary ---');
    console.log('');
    console.log(
      args.dryRun
        ? '[provision] DRY-RUN complete. Re-run without --dry-run on an operator machine with POSTGRES_URL to apply.'
        : '[provision] Done. Store wallet-card passwords in the approved secret store only. Next: npm run verify:cursor-test-users',
    );
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
