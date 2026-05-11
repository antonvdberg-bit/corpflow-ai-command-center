import React from 'react';

import LuxeMauricePropertyDetailPage from '../../components/LuxeMauricePropertyDetailPage.js';
import { resolveLuxPropertyRef } from '../../lib/client/luxe-maurice-property-resolve.js';
import { PrismaClient } from '@prisma/client';
import { verifyTenantPreviewToken } from '../../lib/server/tenant-preview-token.js';
import { isGhostHost } from '../../lib/server/ghost-host.js';

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

export default function PropertySlugPage({ property }) {
  return <LuxeMauricePropertyDetailPage property={property} />;
}

export async function getServerSideProps({ req, params }) {
  const host = normalizeHost(req);
  if (host && isGhostHost(host)) {
    return { redirect: { destination: '/log-stream.html', permanent: false } };
  }

  const raw = params?.slug != null ? String(params.slug).trim() : '';
  if (!raw || raw.length > 80) {
    return { notFound: true };
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

    if (tenantId !== 'luxe-maurice') {
      return { notFound: true };
    }

    const resolved = resolveLuxPropertyRef(raw);
    if (!resolved) {
      return { notFound: true };
    }

    // Phase 4C.3: best-effort pick most-recent published hero image (operator-published only).
    // We intentionally scan a bounded number of recent Lux request tickets to avoid JSONB query complexity.
    let publishedHero = null;
    try {
      const recent = await prisma.cmpTicket.findMany({
        where: { tenantId: 'luxe-maurice' },
        orderBy: { createdAt: 'desc' },
        take: 80,
        select: { consoleJson: true },
      });
      /** @type {{ attachment_id: string, public_caption: string | null, public_alt_text: string | null }[]} */
      const candidates = [];
      for (const r of recent) {
        const cj = r.consoleJson && typeof r.consoleJson === 'object' ? r.consoleJson : {};
        const meta = cj.lux_request_meta && typeof cj.lux_request_meta === 'object' ? cj.lux_request_meta : null;
        const list = meta && Array.isArray(meta.attachments) ? meta.attachments : [];
        for (const a of list) {
          if (!a || String(a.review_status || '').toLowerCase() !== 'reviewed') continue;
          if (String(a.attachment_id || '').trim() === '') continue;
          const links = Array.isArray(a.property_links) ? a.property_links : [];
          const match = links.find(
            (pl) =>
              pl &&
              String(pl.property_slug || '').toLowerCase() === String(resolved.ref).toLowerCase() &&
              String(pl.intended_slot || '').toLowerCase() === 'hero' &&
              String(pl.publish_status || '').toLowerCase() === 'published',
          );
          if (match) {
            candidates.push({
              attachment_id: String(a.attachment_id),
              public_caption: match.public_caption != null ? String(match.public_caption).slice(0, 180) : null,
              public_alt_text: match.public_alt_text != null ? String(match.public_alt_text).slice(0, 180) : null,
            });
          }
        }
      }
      const first = candidates[0] || null;
      if (first) {
        const att = await prisma.cmpTicketAttachment.findUnique({
          where: { id: first.attachment_id },
          select: { id: true, tenantId: true, contentType: true },
        });
        if (att && String(att.tenantId || '').trim() === 'luxe-maurice' && String(att.contentType || '').toLowerCase().startsWith('image/')) {
          publishedHero = {
            src: `/api/lux/property-media?property=${encodeURIComponent(resolved.ref)}&attachment=${encodeURIComponent(
              att.id,
            )}&slot=hero`,
            alt: first.public_alt_text || '',
            caption: first.public_caption || null,
          };
        }
      }
    } catch {
      // fail-soft: property page still loads without published hero.
      publishedHero = null;
    }

    const pr = resolved.price_range != null ? String(resolved.price_range).trim() : '';
    const price_display = pr ? pr : 'On application';

    return {
      props: {
        property: {
          ref: resolved.ref,
          title: resolved.title,
          location: resolved.location,
          property_type: resolved.property_type,
          status: resolved.status,
          price_display,
          discovery_source: resolved.discovery_source,
          summary_text: resolved.summary_text,
          highlights: Array.isArray(resolved.highlights) ? resolved.highlights : [],
          hero_image: resolved.hero_image != null ? String(resolved.hero_image) : null,
          published_hero: publishedHero,
        },
      },
    };
  } catch {
    return { notFound: true };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
