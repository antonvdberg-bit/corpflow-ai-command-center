import React from 'react';
import { PrismaClient } from '@prisma/client';

import CipcDeskAnnualReturnsReview from '../components/CipcDeskAnnualReturnsReview.js';
import {
  buildCipcDeskAnnualReturnsReviewContent,
  resolveCipcDeskAnnualReturnsPageAccess,
} from '../lib/cipc-desk/annual-returns-review.js';
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
 * CIPC Desk Annual Returns specialist-review surface (#761 / #791).
 * Standing URL: https://cipc.corpflowai.com/annual-returns (corpflow_test only).
 * Content reflects Sarah-approved Annual Returns v1 decisions (2026-08-07).
 */
export default function AnnualReturnsPage({ content }) {
  return <CipcDeskAnnualReturnsReview content={content} />;
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

    const access = resolveCipcDeskAnnualReturnsPageAccess({
      host,
      tenantIdFromDb,
      previewTenantId,
    });

    if (!access.allowed) {
      return { notFound: true };
    }

    return {
      props: {
        content: buildCipcDeskAnnualReturnsReviewContent(),
      },
    };
  } catch {
    // Fail closed for non-CIPC hosts if DB is unavailable; standing hosts still resolve without DB.
    const access = resolveCipcDeskAnnualReturnsPageAccess({ host });
    if (!access.allowed) {
      return { notFound: true };
    }
    return {
      props: {
        content: buildCipcDeskAnnualReturnsReviewContent(),
      },
    };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
