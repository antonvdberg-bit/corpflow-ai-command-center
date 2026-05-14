import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { PrismaClient } from '@prisma/client';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import { resolveLuxPropertyRef } from '../lib/client/luxe-maurice-property-resolve.js';
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
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {import('http').IncomingMessage} req
 */
async function resolveLuxTenantId(prisma, req, host) {
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
  return tenantId;
}

export default function PropertiesIndexPage({ properties }) {
  return (
    <>
      <Head>
        <title>Properties — LuxeMaurice</title>
        <meta
          name="description"
          content="Published catalogue entries (Postgres-backed). Demonstration and operator-managed rows may be present until client-approved inventory is live."
        />
      </Head>
      <div style={{ minHeight: '100vh', background: T.canvas, color: T.ink, fontFamily: T.fontBody }}>
        <header style={{ padding: '24px 20px', borderBottom: `1px solid ${T.hairline}` }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.inkMuted }}>
              LuxeMaurice
            </div>
            <h1 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>Properties</h1>
            <p style={{ margin: '12px 0 0', fontSize: 15, color: T.inkMuted, maxWidth: 720 }}>
              Published listings from the LuxeMaurice catalogue (server-filtered). This index is a thin slice for the P0
              Reality Gate; imagery follows governed media routes on each property detail where linked.
            </p>
          </div>
        </header>
        <main style={{ padding: '28px 20px 48px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {properties.length === 0 ? (
              <p style={{ color: T.inkMuted }}>No published properties yet. Check back after operators publish catalogue rows.</p>
            ) : (
              properties.map((p) => {
                const ref = resolveLuxPropertyRef(p.slug);
                return (
                  <article
                    key={p.slug}
                    style={{
                      border: `1px solid ${T.hairline}`,
                      borderRadius: 12,
                      padding: 20,
                      background: T.surface,
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: 20 }}>{p.title}</h2>
                    <div style={{ marginTop: 6, fontSize: 14, color: T.inkMuted }}>
                      {p.region_label} · {p.property_type}
                      {p.listing_status ? <span> · {p.listing_status}</span> : null}
                    </div>
                    {p.short_teaser ? (
                      <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.5 }}>{p.short_teaser}</p>
                    ) : null}
                    <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {ref ? (
                        <Link href={`/property/${encodeURIComponent(p.slug)}`} style={{ color: T.accent, fontWeight: 650 }}>
                          View property
                        </Link>
                      ) : null}
                      <Link
                        href={ref ? `/concierge?property=${encodeURIComponent(p.slug)}` : '/concierge'}
                        style={{ color: T.accent, fontWeight: 650 }}
                      >
                        Concierge enquiry
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </main>
      </div>
    </>
  );
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

    const tenantId = await resolveLuxTenantId(prisma, req, host);
    if (tenantId !== 'luxe-maurice') {
      return { notFound: true };
    }

    const rows = await prisma.luxListing.findMany({
      where: { tenantId: 'luxe-maurice', visibilityStatus: 'published' },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      select: {
        slug: true,
        title: true,
        regionLabel: true,
        propertyType: true,
        listingStatus: true,
        shortTeaser: true,
      },
    });

    const properties = rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      region_label: r.regionLabel,
      property_type: r.propertyType,
      listing_status: r.listingStatus,
      short_teaser: r.shortTeaser,
    }));

    return { props: { properties } };
  } catch {
    return { notFound: true };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
