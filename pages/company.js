import React from 'react';
import { PrismaClient } from '@prisma/client';

import CipcDeskDirectSmeFunnel from '../components/CipcDeskDirectSmeFunnel.js';
import {
  buildCipcDeskDirectSmeFunnelContent,
  isCipcDeskDirectSmeProofQuery,
  resolveCipcDeskDirectSmePageAccess,
} from '../lib/cipc-desk/direct-sme-funnel.js';
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
 * CIPC Desk direct-SME buyer funnel (#1152).
 * Standing URL after publish: https://cipc.corpflowai.com/company (corpflow_test only).
 * Not a public launch. Specialist-review pages are unchanged.
 */
export default function CompanyPage({ content, proofMode }) {
  return <CipcDeskDirectSmeFunnel content={content} proofMode={proofMode === true} />;
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

  const proofMode = isCipcDeskDirectSmeProofQuery(parseSearchParam(req, 'proof'));

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

    const access = resolveCipcDeskDirectSmePageAccess({
      host,
      tenantIdFromDb,
      previewTenantId,
    });

    if (!access.allowed) {
      return { notFound: true };
    }

    return {
      props: {
        content: buildCipcDeskDirectSmeFunnelContent(),
        proofMode,
      },
    };
  } catch {
    const access = resolveCipcDeskDirectSmePageAccess({ host });
    if (!access.allowed) {
      return { notFound: true };
    }
    return {
      props: {
        content: buildCipcDeskDirectSmeFunnelContent(),
        proofMode,
      },
    };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
