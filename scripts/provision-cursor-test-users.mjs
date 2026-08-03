#!/usr/bin/env node
/**
 * Provision dedicated Cursor test identities (#696) into existing auth_users
 * (+ user_tenant_memberships for the generic tenant smoke user).
 *
 * Approved identities:
 *   - cursor-test-admin@corpflowai.com
 *   - cursor-test-tenant@corpflowai.com  (generic tenant smoke; NOT Lux-only)
 *
 * Does NOT:
 *   - change schema
 *   - write passwords to files, git, or env stores
 *   - promote factory_master
 *   - send email / WhatsApp / SMS
 *   - deploy
 *   - provision cursor-test-lux@corpflowai.com
 *   - auto-grant every tenant membership
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
 *   # One identity + optional extra approved memberships:
 *   node scripts/provision-cursor-test-users.mjs --only=tenant --tenants=luxe-maurice --gen-password
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
  APPROVED_CORPFLOW_TEST_TENANTS,
  CURSOR_TEST_IDENTITIES,
  CURSOR_TEST_MEMBERSHIP_NOTES,
  CURSOR_TEST_METADATA_LABELS,
  CURSOR_TEST_RUNTIME_ENV,
  FORBIDDEN_CURSOR_TEST_USERNAMES,
  buildCursorTestProvisionPlan,
  formatCursorTestAccessIdentityLines,
  isForbiddenCursorTestUsername,
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
   *   only: 'all' | 'admin' | 'tenant',
   *   tenants: string,
   *   primaryTenant: string,
   *   adminPassword: string,
   *   tenantPassword: string,
   * }} */
  const out = {
    help: false,
    dryRun: false,
    genPassword: false,
    disable: false,
    enable: false,
    only: 'all',
    tenants: '',
    primaryTenant: '',
    adminPassword: '',
    tenantPassword: '',
  };
  for (const a of argv) {
    if (a === '-h' || a === '--help') out.help = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--gen-password') out.genPassword = true;
    else if (a === '--disable') out.disable = true;
    else if (a === '--enable') out.enable = true;
    else if (a.startsWith('--only=')) {
      const v = a.slice('--only='.length).trim().toLowerCase();
      if (v === 'lux') {
        console.error(
          'ERROR: --only=lux is rejected. Use --only=tenant for cursor-test-tenant@corpflowai.com. Do not provision cursor-test-lux@corpflowai.com.',
        );
        process.exit(1);
      }
      if (v === 'admin' || v === 'tenant' || v === 'all') out.only = v;
      else {
        console.error(`ERROR: --only must be admin|tenant|all (got ${v})`);
        process.exit(1);
      }
    } else if (a.startsWith('--tenants=')) {
      out.tenants = a.slice('--tenants='.length);
    } else if (a.startsWith('--primary-tenant=')) {
      out.primaryTenant = a.slice('--primary-tenant='.length);
    } else if (a.startsWith('--admin-password=')) {
      out.adminPassword = a.slice('--admin-password='.length);
    } else if (a.startsWith('--tenant-password=')) {
      out.tenantPassword = a.slice('--tenant-password='.length);
    } else if (a.startsWith('--lux-password=')) {
      console.error(
        'ERROR: --lux-password is rejected. Use --tenant-password=... (generic tenant smoke).',
      );
      process.exit(1);
    }
  }
  return out;
}

/**
 * @param {'admin' | 'tenant'} key
 * @returns {string}
 */
function runtimeUsernameEnv(key) {
  return key === 'admin'
    ? CURSOR_TEST_RUNTIME_ENV.adminUsername
    : CURSOR_TEST_RUNTIME_ENV.tenantUsername;
}

/**
 * @param {'admin' | 'tenant'} key
 * @returns {string}
 */
function runtimePasswordEnv(key) {
  return key === 'admin'
    ? CURSOR_TEST_RUNTIME_ENV.adminPassword
    : CURSOR_TEST_RUNTIME_ENV.tenantPassword;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ username: string, level: string, primaryTenantId: string | null, factoryMaster: boolean }} identity
 * @param {string} password
 * @param {boolean} dryRun
 */
async function upsertAuthUser(prisma, identity, password, dryRun) {
  const username = identity.username;
  if (isForbiddenCursorTestUsername(username)) {
    console.error(`ERROR: refusing to provision forbidden username: ${username}`);
    process.exit(1);
  }
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
      `[dry-run] WOULD-UPSERT auth_users username=${username} level=${identity.level} tenant_id=${
        identity.primaryTenantId ?? 'null'
      } factory_master=false existing=${existing ? existing.id : 'no'}`,
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
      level: identity.level,
      tenantId: identity.primaryTenantId,
      enabled: true,
      factoryMaster: false,
    },
    update: {
      passwordHash: hash,
      passwordSalt: salt,
      level: identity.level,
      tenantId: identity.primaryTenantId,
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
async function ensureTenantMembership(prisma, userId, tenantId, dryRun) {
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
 * @param {'admin' | 'tenant'} key
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
  if (key === 'tenant') {
    console.log(
      `Alias:    ${CURSOR_TEST_RUNTIME_ENV.luxAliasUsername} / ${CURSOR_TEST_RUNTIME_ENV.luxAliasPassword} (temporary; map to this generic tenant user)`,
    );
  }
  console.log(`Password: ${password}`);
  console.log('══════════════════════════════════════════════════════════');
  console.log('Do not paste this block into GitHub, chat, PR, or artifacts.');
  console.log('');
}

/**
 * Friendly display names for known corpflow_test tenants (create stub if missing).
 * @param {string} tenantId
 */
function tenantDisplayName(tenantId) {
  if (tenantId === 'luxe-maurice') return 'Luxe Maurice';
  if (tenantId === 'cipc-desk') return 'CIPC Desk';
  return tenantId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`
provision-cursor-test-users.mjs  (#696 — generic tenant smoke model)

  --dry-run                 Print intended writes; no DB mutation
  --gen-password            Generate strong unique passwords; print wallet cards once
  --only=admin|tenant|all   Default all  (lux is REJECTED)
  --tenants=id,id           Approved memberships for tenant smoke (default: luxe-maurice)
                            Allowlist: ${APPROVED_CORPFLOW_TEST_TENANTS.join(', ')}
  --primary-tenant=id       auth_users.tenant_id for tenant smoke (must be in --tenants)
  --admin-password=...      Explicit admin password (avoid; prefer --gen-password)
  --tenant-password=...     Explicit tenant password (avoid; prefer --gen-password)
  --disable                 Set enabled=false on selected identities
  --enable                  Set enabled=true on selected identities

Env: POSTGRES_URL required for non-dry-run (same Neon DB as Vercel Production).

Canonical usernames:
  ${CURSOR_TEST_IDENTITIES.admin.username}
  ${CURSOR_TEST_IDENTITIES.tenant.username}

Forbidden (will not provision):
  ${FORBIDDEN_CURSOR_TEST_USERNAMES.join(', ')}

Runtime env names (values never committed):
  ${CURSOR_TEST_RUNTIME_ENV.adminUsername} / ${CURSOR_TEST_RUNTIME_ENV.adminPassword}
  ${CURSOR_TEST_RUNTIME_ENV.tenantUsername} / ${CURSOR_TEST_RUNTIME_ENV.tenantPassword}
  Temporary Lux aliases (map to generic tenant smoke): ${CURSOR_TEST_RUNTIME_ENV.luxAliasUsername} / ${CURSOR_TEST_RUNTIME_ENV.luxAliasPassword}
`);
    process.exit(0);
  }

  if (args.disable && args.enable) {
    console.error('ERROR: use either --disable or --enable, not both');
    process.exit(1);
  }

  const plan = buildCursorTestProvisionPlan({
    only: args.only,
    membershipTenants: args.tenants || undefined,
    primaryTenantId: args.primaryTenant || undefined,
  });
  if (!plan.ok) {
    console.error('ERROR: invalid provision plan:');
    for (const e of plan.errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const mutatingPassword = !args.disable && !args.enable;
  if (
    mutatingPassword &&
    !args.dryRun &&
    !args.genPassword &&
    !args.adminPassword &&
    !args.tenantPassword
  ) {
    console.error(
      'ERROR: use --gen-password (recommended) or explicit --*-password=...; or --dry-run',
    );
    process.exit(1);
  }

  if (args.genPassword && (args.adminPassword || args.tenantPassword)) {
    console.error('ERROR: use either --gen-password or explicit --*-password, not both');
    process.exit(1);
  }

  const keys = /** @type {Array<'admin' | 'tenant'>} */ (plan.identities.map((i) => i.key));
  const tenantIdentity = plan.identities.find((i) => i.key === 'tenant') || null;

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
    for (const identity of plan.identities) {
      console.log(
        `[dry-run] WOULD-UPSERT auth_users username=${identity.username} level=${identity.level} tenant_id=${
          identity.primaryTenantId ?? 'null'
        } factory_master=false`,
      );
      if (identity.key === 'tenant') {
        for (const tid of identity.membershipTenantIds) {
          console.log(
            `[dry-run] WOULD-UPSERT tenants.tenant_id=${tid} + membership notes=${CURSOR_TEST_MEMBERSHIP_NOTES}`,
          );
        }
      }
    }
    console.log('');
    console.log('--- non-secret identity summary ---');
    for (const line of formatCursorTestAccessIdentityLines({
      tenantMembershipTenantIds: tenantIdentity?.membershipTenantIds || null,
      tenantMembershipNotes: tenantIdentity ? CURSOR_TEST_MEMBERSHIP_NOTES : null,
    })) {
      console.log(line);
    }
    console.log('--- end summary ---');
    console.log('[provision] DRY-RUN complete (offline).');
    return;
  }

  const prisma = new PrismaClient();
  /** @type {{
   *   admin: any,
   *   tenant: any,
   *   tenantMembershipNotes: string | null,
   *   tenantMembershipTenantIds: string[] | null,
   * }} */
  const evidence = {
    admin: null,
    tenant: null,
    tenantMembershipNotes: null,
    tenantMembershipTenantIds: null,
  };

  try {
    if (args.disable || args.enable) {
      const enabled = Boolean(args.enable);
      for (const identity of plan.identities) {
        const row = await setEnabled(prisma, identity.username, enabled, args.dryRun);
        evidence[identity.key] = row;
        console.log(
          `[provision] ${enabled ? 'enable' : 'disable'} username=${identity.username} id=${row.id} dry_run=${args.dryRun}`,
        );
      }
    } else {
      if (tenantIdentity && !args.dryRun) {
        for (const tid of tenantIdentity.membershipTenantIds) {
          await prisma.tenant.upsert({
            where: { tenantId: tid },
            update: {},
            create: {
              tenantId: tid,
              slug: tid,
              name: tenantDisplayName(tid),
            },
          });
        }
      } else if (tenantIdentity && args.dryRun) {
        for (const tid of tenantIdentity.membershipTenantIds) {
          console.log(`[dry-run] WOULD-UPSERT tenants.tenant_id=${tid} (no-op if exists)`);
        }
      }

      for (const identity of plan.identities) {
        let password = identity.key === 'admin' ? args.adminPassword : args.tenantPassword;
        if (args.genPassword || args.dryRun) {
          password = password || generateRandomLoginPassword();
        }
        if (!password) {
          console.error(`ERROR: missing password for ${identity.key}; use --gen-password`);
          process.exit(1);
        }

        const row = await upsertAuthUser(prisma, identity, password, args.dryRun);
        evidence[identity.key] = row || {
          id: '(dry-run)',
          username: identity.username,
          level: identity.level,
          tenantId: identity.primaryTenantId,
          factoryMaster: false,
          enabled: true,
        };

        if (identity.key === 'tenant') {
          const userId = evidence.tenant?.id;
          /** @type {string[]} */
          const granted = [];
          let lastNotes = null;
          for (const tid of identity.membershipTenantIds) {
            if (userId && userId !== '(dry-run)') {
              const mem = await ensureTenantMembership(prisma, userId, tid, args.dryRun);
              lastNotes = mem?.notes || CURSOR_TEST_MEMBERSHIP_NOTES;
              granted.push(tid);
            } else {
              console.log(
                `[dry-run] WOULD-INSERT/UPDATE user_tenant_memberships tenant_id=${tid} notes=${CURSOR_TEST_MEMBERSHIP_NOTES}`,
              );
              lastNotes = CURSOR_TEST_MEMBERSHIP_NOTES;
              granted.push(tid);
            }
          }
          evidence.tenantMembershipNotes = lastNotes;
          evidence.tenantMembershipTenantIds = granted;
        }

        if (!args.dryRun && args.genPassword) {
          printWalletCard(identity.key, password, evidence[identity.key]);
        } else if (!args.dryRun && password) {
          console.log(
            `[provision] password set for ${identity.username} (not printed — you supplied --${identity.key}-password)`,
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
