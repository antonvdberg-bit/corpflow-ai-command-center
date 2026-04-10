#!/usr/bin/env node
/**
 * Set `tenant_personas.billing_exempt = true` for tenant **luxe-maurice** (Lux primary tenant).
 * Does **not** change `token_credit_balance_usd`. There is no “exempt all tenants” path here.
 *
 * Prerequisites: production (or target) Postgres reachable via env.
 *
 * PowerShell:
 *   $env:POSTGRES_URL = "postgresql://..."
 *   node scripts/set-luxe-maurice-billing-exempt.mjs
 *
 * Optional:
 *   node scripts/set-luxe-maurice-billing-exempt.mjs --dry-run
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const TENANT_ID = 'luxe-maurice';
const dryRun = process.argv.includes('--dry-run');

const pg = String(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '').trim();
if (!pg) {
  console.error('POSTGRES_URL (or POSTGRES_PRISMA_URL) must be set.');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const existing = await prisma.tenantPersona.findUnique({
    where: { tenantId: TENANT_ID },
    select: { tokenCreditBalanceUsd: true, billingExempt: true },
  });

  const prevBal = existing ? Number(existing.tokenCreditBalanceUsd) : 0;
  const prevExempt = existing ? existing.billingExempt === true : false;

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          tenant_id: TENANT_ID,
          dry_run: true,
          previous_token_credit_balance_usd: prevBal,
          previous_billing_exempt: prevExempt,
          would_set_billing_exempt: true,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const row = await prisma.tenantPersona.upsert({
    where: { tenantId: TENANT_ID },
    create: {
      tenantId: TENANT_ID,
      tokenCreditBalanceUsd: Number.isFinite(prevBal) ? prevBal : 0,
      billingExempt: true,
      personaJson: {},
    },
    update: {
      billingExempt: true,
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
