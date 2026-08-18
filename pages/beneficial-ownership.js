import React from 'react';
import { PrismaClient } from '@prisma/client';

import CipcDeskBeneficialOwnershipReview from '../components/CipcDeskBeneficialOwnershipReview.js';
import {
  buildCipcDeskBeneficialOwnershipReviewContent,
  resolveCipcDeskBeneficialOwnershipPageAccess,
} from '../lib/cipc-desk/beneficial-ownership-review.js';
import { resolveCipcDeskTenantIdFromHost } from '../lib/server/cipc-desk-runtime.js';
import { verifyTenantPreviewToken } from '../lib/server/tenant-preview-token.js';
import { isGhostHost } from '../lib/server/ghost-host.js';

function normalizeHost(req) {
  try {
    const raw = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toString();
    return raw.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  } catch {
    return '';
  }
}

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

function parseSearchParam(req, name) {
  try {
    const raw = req?.url || '';
    const u = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://localhost');
    return (u.searchParams.get(name) || '').trim();
  } catch {
    return '';
  }
}

/**
 * CIPC Desk Beneficial Ownership specialist-review surface (#981).
 * Standing URL: https://cipc.corpflowai.com/beneficial-ownership (corpflow_test only).
 */
export default function BeneficialOwnershipPage({ content }) {
  return <CipcDeskBeneficialOwnershipReview content={content} />;
}

export async function getServerSideProps({ req }) {
  const host = normalizeHost(req);
  if (host && isGhostHost(host)) {
    return { redirect: { destination: '/log-stream.html', permanent: false } };
  }

  if (!host) {
    return { notFound: true };
  }

  const root = String(process.env.CORPFLOW_ROOT_DOMAIN || 'corpflowai.com')
    .toLowerCase()
    .replace(/^\./, '')
    .trim();
  if (host === root || host === `www.${root}`) {
    return { notFound: true };
  }

  const prisma = new PrismaClient();
  try {
    const row = await prisma.tenantHostname.findUnique({
      where: { host },
      select: { tenantId: true, enabled: true },
    });
    let tenantIdFromDb = row && row.enabled === true ? safeStr(row.tenantId) : '';

    let previewTenantId = '';
    if (!tenantIdFromDb && !resolveCipcDeskTenantIdFromHost(host)) {
      const cfPreview = parseSearchParam(req, 'cf_preview');
      if (cfPreview) {
        const verified = verifyTenantPreviewToken(cfPreview);
        if (verified.ok) {
          const tExists = await prisma.tenant.findUnique({
            where: { tenantId: verified.tenantId },
            select: { tenantId: true },
          });
          if (tExists?.tenantId) previewTenantId = safeStr(tExists.tenantId);
        }
      }
    }

    const access = resolveCipcDeskBeneficialOwnershipPageAccess({
      host,
      tenantIdFromDb,
      previewTenantId,
    });

    if (!access.allowed) {
      return { notFound: true };
    }

    return {
      props: {
        content: buildCipcDeskBeneficialOwnershipReviewContent(),
      },
    };
  } catch {
    // Fail closed for non-CIPC hosts if DB is unavailable; standing hosts still resolve without DB.
    const access = resolveCipcDeskBeneficialOwnershipPageAccess({ host });
    if (!access.allowed) {
      return { notFound: true };
    }
    return {
      props: {
        content: buildCipcDeskBeneficialOwnershipReviewContent(),
      },
    };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
