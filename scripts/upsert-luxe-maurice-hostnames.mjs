#!/usr/bin/env node
/**
 * Ensure Postgres `tenant_hostnames` maps both official Lux host and optional alias to `luxe-maurice`.
 *
 *   Official:  lux.corpflowai.com
 *   Alias:     luxe.corpflowai.com (optional; also add both domains to the same Vercel project)
 *
 * Usage:
 *   node scripts/upsert-luxe-maurice-hostnames.mjs
 *   node scripts/upsert-luxe-maurice-hostnames.mjs --dry-run
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

const TENANT_ID = 'luxe-maurice';
const HOSTS = [
  { host: 'lux.corpflowai.com', note: 'official production hostname' },
  { host: 'luxe.corpflowai.com', note: 'optional alias (same tenant)' },
];

for (const { host, note } of HOSTS) {
  if (dryRun) {
    console.log(`[dry-run] would upsert ${host} → ${TENANT_ID} (${note})`);
    continue;
  }
  await prisma.tenantHostname.upsert({
    where: { host },
    create: { host, tenantId: TENANT_ID, enabled: true },
    update: { tenantId: TENANT_ID, enabled: true },
  });
  console.log(`OK: ${host} → ${TENANT_ID} (${note})`);
}

console.log(JSON.stringify({ ok: true, dry_run: dryRun, tenant_id: TENANT_ID, hosts: HOSTS.map((h) => h.host) }, null, 2));
await prisma.$disconnect();
