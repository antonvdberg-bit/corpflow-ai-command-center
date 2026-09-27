import React from 'react';
import { PrismaClient } from '@prisma/client';

import CipcDeskPartnerFunnel from '../components/CipcDeskPartnerFunnel.js';
import BusinessAdminDeskPartnerLanding from '../components/BusinessAdminDeskPartnerLanding.js';
import {
  buildCipcDeskPartnerFunnelContent,
  resolveCipcDeskPartnerFunnelPageAccess,
} from '../lib/cipc-desk/partner-funnel.js';
import {
  isBusinessAdminDeskPublicHost,
  isCipcDeskStandingTestHost,
  resolveCipcDeskTenantIdFromHost,
} from '../lib/server/cipc-desk-runtime.js';
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
 * Business Admin Desk commercial partner funnel (#986).
 * Standing URL after publish: https://cipc.corpflowai.com/partners (corpflow_test only).
 * Not a public launch. Specialist-review pages are unchanged.
 */
export default function PartnersPage({ content, publicProduction = false, stagedPublic = false }) {
  if (stagedPublic) return <BusinessAdminDeskPartnerLanding internalReview />;
  return <CipcDeskPartnerFunnel content={content} publicProduction={publicProduction} />;
}

export async function getServerSideProps({ req }) {
  const host = normalizeHost(req);
  if (host && isGhostHost(host)) {
    return { redirect: { destination: '/log-stream.html', permanent: false } };
  }

  if (!host) {
    return { notFound: true };
  }

  // Stable internal staging surface. Append ?specialist=1 to access the existing detailed partner funnel.
  if (isCipcDeskStandingTestHost(host) && parseSearchParam(req, 'specialist') !== '1') {
    return { props: { stagedPublic: true, publicProduction: false, content: null } };
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

    const access = resolveCipcDeskPartnerFunnelPageAccess({
      host,
      tenantIdFromDb,
      previewTenantId,
    });

    if (!access.allowed) {
      return { notFound: true };
    }

    return {
      props: {
        content: buildCipcDeskPartnerFunnelContent(),
        publicProduction: isBusinessAdminDeskPublicHost(host),
      },
    };
  } catch {
    const access = resolveCipcDeskPartnerFunnelPageAccess({ host });
    if (!access.allowed) {
      return { notFound: true };
    }
    return {
      props: {
        content: buildCipcDeskPartnerFunnelContent(),
        publicProduction: isBusinessAdminDeskPublicHost(host),
      },
    };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
