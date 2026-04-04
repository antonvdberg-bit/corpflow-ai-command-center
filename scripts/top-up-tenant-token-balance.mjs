#!/usr/bin/env node
/**
 * Set or increase tenant pre-paid token balance (USD) in Postgres `tenant_personas`.
 * Same database as production Change Console / approve-build debits.
 *
 * Usage (PowerShell):
 *   $env:POSTGRES_URL="postgresql://..."
 *   node scripts/top-up-tenant-token-balance.mjs --tenant=corpflowai --usd=2500
 *
 * Set absolute balance (default):
 *   node scripts/top-up-tenant-token-balance.mjs --tenant=corpflowai --usd=500
 *
 * Add to existing balance:
 *   node scripts/top-up-tenant-token-balance.mjs --tenant=corpflowai --add-usd=100
 */

import { PrismaClient } from '@prisma/client';

function arg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const tenantId = String(arg('tenant') || '').trim();
const usdRaw = arg('usd');
const addRaw = arg('add-usd');

if (!tenantId) {
  console.error('Usage: node scripts/top-up-tenant-token-balance.mjs --tenant=TENANT_ID --usd=N  OR  --add-usd=N');
  process.exit(1);
}

const pg = String(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '').trim();
if (!pg) {
  console.error('POSTGRES_URL (or POSTGRES_PRISMA_URL) must be set.');
  process.exit(1);
}

const usd = usdRaw !== '' ? Number(usdRaw) : NaN;
const addUsd = addRaw !== '' ? Number(addRaw) : NaN;

if (!Number.isFinite(usd) && !Number.isFinite(addUsd)) {
  console.error('Provide --usd=N (set balance) or --add-usd=N (increment).');
  process.exit(1);
}

if (Number.isFinite(usd) && Number.isFinite(addUsd)) {
  console.error('Use only one of --usd or --add-usd.');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const existing = await prisma.tenantPersona.findUnique({
    where: { tenantId },
    select: { tokenCreditBalanceUsd: true },
  });

  const prev = existing ? Number(existing.tokenCreditBalanceUsd) : 0;
  const next = Number.isFinite(addUsd) ? prev + addUsd : usd;

  if (!Number.isFinite(next) || next < 0) {
    console.error('Resulting balance must be a non-negative number.');
    process.exit(1);
  }

  if (hasFlag('dry-run')) {
    console.log(JSON.stringify({ tenant_id: tenantId, previous_usd: prev, new_usd: next, dry_run: true }, null, 2));
    process.exit(0);
  }

  const row = await prisma.tenantPersona.upsert({
    where: { tenantId },
    create: {
      tenantId,
      tokenCreditBalanceUsd: next,
      personaJson: {},
    },
    update: { tokenCreditBalanceUsd: next },
    select: { tenantId: true, tokenCreditBalanceUsd: true },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        tenant_id: row.tenantId,
        previous_usd: prev,
        token_credit_balance_usd: row.tokenCreditBalanceUsd,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
} finally {
  await prisma.$disconnect().catch(() => {});
}
