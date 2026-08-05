/**
 * CIPC Desk — Annual Returns specialist-review surface (#761).
 *
 * Preferred live URL (corpflow_test):
 *   https://cipc.corpflowai.com/annual-returns
 *
 * Also allowed on policy-aligned host:
 *   https://cipc-desk.corpflowai.com/annual-returns
 *
 * Host-gated to CIPC Desk standing hosts, DB-mapped cipc-desk hosts, or
 * Vercel Preview (engineering smoke only). Other hosts → 404.
 *
 * Feedback: existing POST /api/tenant/intake → Postgres `leads` (tenant-scoped).
 * No schema, auth, email runtime, secrets, or public launch.
 */

import { PrismaClient } from '@prisma/client';

import CipcDeskAnnualReturnsReview from '../components/CipcDeskAnnualReturnsReview.js';
import {
  CIPCDESK_TENANT_ID,
  isCipcDeskStandingTestHost,
  normalizeHostname,
} from '../lib/server/cipc-desk-runtime.js';

/**
 * @param {import('next').GetServerSidePropsContext} ctx
 */
export async function getServerSideProps(ctx) {
  const rawHost = ctx?.req?.headers?.['x-forwarded-host'] || ctx?.req?.headers?.host || '';
  const host = normalizeHostname(rawHost);
  const vercelEnv = String(process.env.VERCEL_ENV || '')
    .trim()
    .toLowerCase();

  if (isCipcDeskStandingTestHost(host)) {
    return { props: { host, access: 'standing_test_host' } };
  }

  if (vercelEnv === 'preview') {
    return { props: { host, access: 'vercel_preview_env' } };
  }

  // DB host map: allow only when enabled row maps to cipc-desk.
  if (host) {
    const prisma = new PrismaClient();
    try {
      const row = await prisma.tenantHostname.findUnique({
        where: { host },
        select: { tenantId: true, enabled: true },
      });
      if (row && row.enabled === true && String(row.tenantId).trim() === CIPCDESK_TENANT_ID) {
        return { props: { host, access: 'tenant_hostname_map' } };
      }
    } catch {
      // Fail closed to notFound below.
    } finally {
      try {
        await prisma.$disconnect();
      } catch {
        /* ignore */
      }
    }
  }

  return { notFound: true };
}

export default function AnnualReturnsPage() {
  return <CipcDeskAnnualReturnsReview />;
}
