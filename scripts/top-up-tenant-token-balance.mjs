#!/usr/bin/env node
/**
 * Set tenant wallet and/or `billing_exempt` in Postgres `tenant_personas` (indexed by tenant_id).
 *
 * Usage (PowerShell):
 *   $env:POSTGRES_URL="postgresql://..."
 *   node scripts/top-up-tenant-token-balance.mjs --tenant=corpflowai --usd=2500
 *   node scripts/top-up-tenant-token-balance.mjs --tenant=corpflowai --add-usd=100
 *   node scripts/top-up-tenant-token-balance.mjs --tenant=acme --billing-exempt=true
 *   node scripts/top-up-tenant-token-balance.mjs --tenant=acme --billing-exempt=false --usd=500
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
const beRaw = arg('billing-exempt');

if (!tenantId) {
  console.error(
    'Usage: node scripts/top-up-tenant-token-balance.mjs --tenant=TENANT_ID [--usd=N | --add-usd=N] [--billing-exempt=true|false]',
  );
  process.exit(1);
}

const pg = String(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '').trim();
if (!pg) {
  console.error('POSTGRES_URL (or POSTGRES_PRISMA_URL) must be set.');
  process.exit(1);
}

const usd = usdRaw !== '' ? Number(usdRaw) : NaN;
const addUsd = addRaw !== '' ? Number(addRaw) : NaN;

/** @type {boolean | null} */
let billingExemptNew = null;
if (beRaw !== '') {
  const v = String(beRaw).toLowerCase();
  if (v === 'true' || v === '1') billingExemptNew = true;
  else if (v === 'false' || v === '0') billingExemptNew = false;
  else {
    console.error('--billing-exempt must be true or false');
    process.exit(1);
  }
}

if (!Number.isFinite(usd) && !Number.isFinite(addUsd) && billingExemptNew === null) {
  console.error('Provide at least one of: --usd=N, --add-usd=N, --billing-exempt=true|false');
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
    select: { tokenCreditBalanceUsd: true, billingExempt: true },
  });

  const prevBal = existing ? Number(existing.tokenCreditBalanceUsd) : 0;
  const prevExempt = existing ? existing.billingExempt === true : false;

  let nextBal = prevBal;
  if (Number.isFinite(addUsd)) nextBal = prevBal + addUsd;
  else if (Number.isFinite(usd)) nextBal = usd;

  if (!Number.isFinite(nextBal) || nextBal < 0) {
    console.error('Resulting balance must be a non-negative number.');
    process.exit(1);
  }

  const nextExempt = billingExemptNew !== null ? billingExemptNew : prevExempt;

  if (hasFlag('dry-run')) {
    console.log(
      JSON.stringify(
        {
          tenant_id: tenantId,
          previous_usd: prevBal,
          new_usd: nextBal,
          previous_billing_exempt: prevExempt,
          new_billing_exempt: nextExempt,
          dry_run: true,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const row = await prisma.tenantPersona.upsert({
    where: { tenantId },
    create: {
      tenantId,
      tokenCreditBalanceUsd: nextBal,
      billingExempt: nextExempt,
      personaJson: {},
    },
    update: {
      ...(Number.isFinite(usd) || Number.isFinite(addUsd) ? { tokenCreditBalanceUsd: nextBal } : {}),
      ...(billingExemptNew !== null ? { billingExempt: billingExemptNew } : {}),
    },
    select: { tenantId: true, tokenCreditBalanceUsd: true, billingExempt: true },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        tenant_id: row.tenantId,
        token_credit_balance_usd: row.tokenCreditBalanceUsd,
        billing_exempt: row.billingExempt === true,
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
