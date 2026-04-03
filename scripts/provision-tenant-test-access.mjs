#!/usr/bin/env node
/**
 * Grant tenant-level access for UX testing (same session as "Client / Tenant" on /login).
 *
 * Does NOT use the admin web UI. Requires Postgres credentials once (same DB as production).
 *
 * Usage (PowerShell, from repo root):
 *
 *   $env:POSTGRES_URL="postgresql://..."   # paste from Vercel → Settings → Environment Variables
 *   node scripts/provision-tenant-test-access.mjs --tenant=luxe-maurice --pin
 *
 * Issue email + password login (optional alternative to PIN):
 *
 *   node scripts/provision-tenant-test-access.mjs --tenant=luxe-maurice --username=you@example.com --password="YourStrongPass"
 *
 * Auto-generate a strong password and print a "wallet card" for your password manager:
 *
 *   node scripts/provision-tenant-test-access.mjs --tenant=luxe-maurice --username=you@corpflowai.com --gen-password
 *
 * Both in one run:
 *
 *   node scripts/provision-tenant-test-access.mjs --tenant=luxe-maurice --pin --username=you@example.com --password="YourStrongPass"
 *
 * Then open {tenant login URL}/login (from tenant_hostnames, tenants.fqdn, or CORPFLOW_TENANT_LOGIN_BASE_URL).
 *
 * Password safety: never paste your real password in chat or tickets. Use the same password on /login that you
 * passed to --password. If you forget it, run this script again with the same --username and a new --password.
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

/** Same algorithm as lib/cmp/_lib/tenant-pin.js (inlined so Node does not warn about package.json "type"). */
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function generateSecureTenantPin() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashPinForStorage(pin) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pin), salt, 64, SCRYPT_PARAMS);
  return `v1:${salt.toString('hex')}:${hash.toString('hex')}`;
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

/** Strong random password for auth_users (print once; store in 1Password / Bitwarden). */
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
 * Resolve where operators should open /login for this tenant (no hardcoded host).
 * Order: CORPFLOW_TENANT_LOGIN_BASE_URL → tenants.fqdn → first enabled tenant_hostnames.host.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @returns {Promise<string>} Origin like https://lux.example.com, or '' if unknown
 */
async function resolveTenantLoginBaseUrl(prisma, tenantId) {
  const env = String(process.env.CORPFLOW_TENANT_LOGIN_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (env) return env;

  const row = await prisma.tenant.findUnique({
    where: { tenantId },
    select: { fqdn: true },
  });
  const fqdn = row?.fqdn != null ? String(row.fqdn).trim() : '';
  if (fqdn) {
    const host = fqdn.replace(/^https?:\/\//i, '').split('/')[0].trim();
    if (host) return `https://${host}`;
  }

  const th = await prisma.tenantHostname.findFirst({
    where: { tenantId, enabled: true },
    orderBy: { createdAt: 'asc' },
    select: { host: true },
  });
  if (th?.host) {
    const h = String(th.host).trim();
    if (h) return `https://${h}`;
  }
  return '';
}

function parseArgs(argv) {
  const out = {
    tenant: process.env.TENANT_ID || '',
    pin: false,
    username: '',
    password: '',
    genPassword: false,
  };
  for (const a of argv) {
    if (a === '--pin') out.pin = true;
    else if (a === '--gen-password') out.genPassword = true;
    else if (a.startsWith('--tenant=')) out.tenant = a.slice('--tenant='.length).trim();
    else if (a.startsWith('--username=')) out.username = a.slice('--username='.length).trim();
    else if (a.startsWith('--password=')) out.password = a.slice('--password='.length).trim();
    else if (a === '-h' || a === '--help') out.help = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`
provision-tenant-test-access.mjs

  --tenant=id             Tenant id (required unless TENANT_ID env is set)
  --pin                   Generate a new 6-digit PIN and store hash on tenants.sovereign_pin_hash
  --username=email        Create/update auth_users row (level=tenant)
  --password=secret       With --username (unless --gen-password)
  --gen-password          With --username: generate password, print wallet card, save to DB

Env: POSTGRES_URL required (same as Vercel production DB for Lux host mapping to work).
`);
    process.exit(0);
  }

  if (!process.env.POSTGRES_URL || !String(process.env.POSTGRES_URL).trim()) {
    console.error('ERROR: Set POSTGRES_URL to your Postgres connection string (e.g. copy from Vercel env).');
    process.exit(1);
  }

  if (!args.pin && !args.username) {
    console.error('ERROR: Specify --pin and/or --username=... (--password and/or --gen-password)');
    process.exit(1);
  }

  if (args.genPassword && !args.username) {
    console.error('ERROR: --gen-password requires --username=...');
    process.exit(1);
  }

  if (args.username && args.genPassword && args.password) {
    console.error('ERROR: Use either --password=... or --gen-password, not both');
    process.exit(1);
  }

  if (args.username && args.genPassword) {
    args.password = generateRandomLoginPassword();
  }

  if (args.username && !args.password) {
    console.error('ERROR: --password=... or --gen-password is required with --username');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const tid = String(args.tenant || '').trim();
  if (!tid) {
    console.error('ERROR: Set --tenant=... or TENANT_ID in the environment.');
    process.exit(1);
  }

  try {
    await prisma.tenant.upsert({
      where: { tenantId: tid },
      update: {},
      create: {
        tenantId: tid,
        slug: tid.replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || tid,
        name: tid,
      },
    });

    const loginBase = await resolveTenantLoginBaseUrl(prisma, tid);
    const loginUrl = loginBase ? `${loginBase}/login` : '';
    const tenantMeta = await prisma.tenant.findUnique({
      where: { tenantId: tid },
      select: { name: true },
    });
    const tenantLabel = (tenantMeta?.name && String(tenantMeta.name).trim()) || tid;

    if (args.pin) {
      const plain = generateSecureTenantPin();
      const hashed = hashPinForStorage(plain);
      await prisma.tenant.update({
        where: { tenantId: tid },
        data: { sovereignPinHash: hashed },
      });
      console.log('');
      console.log('=== Tenant PIN (copy now; not stored in plaintext) ===');
      console.log('Tenant ID:', tid);
      console.log('PIN:      ', plain);
      console.log('');
      if (loginUrl) {
        console.log('Login at:', loginUrl);
      } else {
        console.log(
          'Login URL: (unknown — set CORPFLOW_TENANT_LOGIN_BASE_URL, tenants.fqdn, or tenant_hostnames for this tenant)',
        );
      }
      console.log('  → Client / Tenant → Tenant ID + PIN');
      console.log('');
    }

    if (args.username) {
      const username = String(args.username).trim().toLowerCase();
      const salt = newSaltHex();
      const hash = computePasswordHash(args.password, salt);
      if (!hash) {
        console.error('ERROR: password hash failed');
        process.exit(1);
      }
      await prisma.authUser.upsert({
        where: { username },
        create: {
          username,
          passwordHash: hash,
          passwordSalt: salt,
          level: 'tenant',
          tenantId: tid,
          enabled: true,
        },
        update: {
          passwordHash: hash,
          passwordSalt: salt,
          level: 'tenant',
          tenantId: tid,
          enabled: true,
        },
      });
      const walletLoginUrl = loginUrl || '(set CORPFLOW_TENANT_LOGIN_BASE_URL or DB host mapping)';
      console.log('');
      console.log('══════════════════════════════════════════════════════════');
      console.log('  SAVE IN YOUR PASSWORD MANAGER (copy this block once)');
      console.log('══════════════════════════════════════════════════════════');
      console.log('Name:      ' + tenantLabel + ' (' + tid + ')');
      console.log('URL:      ', walletLoginUrl);
      console.log('Tenant:   ', tid);
      console.log('Username: ', username);
      if (args.genPassword) {
        console.log('Password: ', args.password);
      } else {
        console.log('Password: (not printed — use the value you passed to --password=...)');
      }
      console.log('══════════════════════════════════════════════════════════');
      console.log('');
      console.log('Open:', walletLoginUrl);
      console.log('  → Client / Tenant → Tenant ID + Email + Password');
      console.log('');
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
