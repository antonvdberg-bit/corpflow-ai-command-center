#!/usr/bin/env node
/**
 * Ensure Postgres `tenant_hostnames` maps CIPC Desk standing test hosts → `cipc-desk`.
 *
 *   Short alias (preferred for operators):  cipc.corpflowai.com
 *   Policy-aligned (prefix = tenant_id):    cipc-desk.corpflowai.com
 *
 * Does not change DNS or Vercel domain settings. Anton adds both hostnames on the
 * existing Vercel project + DNS, then runs this script (or factory hostname upsert).
 *
 * Usage:
 *   node scripts/upsert-cipc-desk-hostnames.mjs --dry-run
 *   node scripts/upsert-cipc-desk-hostnames.mjs
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

import { CIPCDESK_TENANT_ID, CIPC_DESK_STANDING_HOSTS } from '../lib/server/cipc-desk-runtime.js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

const HOSTS = [
  { host: CIPC_DESK_STANDING_HOSTS[0], note: 'short standing test hostname (operator preference)' },
  { host: CIPC_DESK_STANDING_HOSTS[1], note: 'policy-aligned hostname (prefix = tenant_id)' },
];

for (const { host, note } of HOSTS) {
  if (dryRun) {
    console.log(`[dry-run] would upsert ${host} → ${CIPCDESK_TENANT_ID} (${note})`);
    continue;
  }
  await prisma.tenantHostname.upsert({
    where: { host },
    create: { host, tenantId: CIPCDESK_TENANT_ID, enabled: true },
    update: { tenantId: CIPCDESK_TENANT_ID, enabled: true },
  });
  console.log(`OK: ${host} → ${CIPCDESK_TENANT_ID} (${note})`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      dry_run: dryRun,
      tenant_id: CIPCDESK_TENANT_ID,
      hosts: HOSTS.map((h) => h.host),
      fictional_data_only: true,
      note: 'Add the same hostnames on the existing Vercel project + DNS before live use.',
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
