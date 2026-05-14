import React from 'react';

import LuxeMauricePropertiesDirectory from '../components/LuxeMauricePropertiesDirectory.js';
import {
  fetchPublishedLuxListingsPublic,
  isLuxListingPublicTenantId,
} from '../lib/server/lux-listing-published-query.js';
import { collectPublishedLuxCardMediaByPropertyRefs } from '../lib/server/lux-published-property-media.js';
import { PrismaClient } from '@prisma/client';
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

export default function LuxPropertiesPage(props) {
  return <LuxeMauricePropertiesDirectory listings={props.listings} cardMediaBySlug={props.cardMediaBySlug} />;
}

export async function getServerSideProps({ req }) {
  const host = normalizeHost(req);
  if (host && isGhostHost(host)) {
    return { redirect: { destination: '/log-stream.html', permanent: false } };
  }

  const prisma = new PrismaClient();
  try {
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

    const row = await prisma.tenantHostname.findUnique({
      where: { host },
      select: { tenantId: true, enabled: true },
    });
    let tenantId = row && row.enabled === true ? safeStr(row.tenantId) : '';
    if (!tenantId) {
      const cfPreview = parseSearchParam(req, 'cf_preview');
      if (cfPreview) {
        const verified = verifyTenantPreviewToken(cfPreview);
        if (verified.ok) {
          const tExists = await prisma.tenant.findUnique({
            where: { tenantId: verified.tenantId },
            select: { tenantId: true },
          });
          if (tExists?.tenantId) tenantId = safeStr(tExists.tenantId);
        }
      }
    }

    if (!isLuxListingPublicTenantId(tenantId)) {
      return { notFound: true };
    }

    const listings = await fetchPublishedLuxListingsPublic(prisma);
    const refs = listings.map((l) => l.slug).filter(Boolean);
    /** @type {Map<string, { src: string, src_set?: string, alt: string, caption?: string | null }>} */
    let cardMap = new Map();
    try {
      cardMap = await collectPublishedLuxCardMediaByPropertyRefs(prisma, refs, { allowUnresolvedPropertySlugs: true });
    } catch {
      cardMap = new Map();
    }
    const cardMediaBySlug = Object.fromEntries([...cardMap.entries()]);

    return {
      props: {
        listings,
        cardMediaBySlug,
      },
    };
  } catch {
    return { notFound: true };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
