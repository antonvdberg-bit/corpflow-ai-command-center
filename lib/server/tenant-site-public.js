/**
 * Tenant public site API: read website draft for the current host/tenant.
 *
 * Route: GET /api/tenant/site
 *
 * Returns a tenant-scoped JSON draft (no cross-tenant access).
 */

import { PrismaClient } from '@prisma/client';

function str(v) {
  return v != null ? String(v).trim() : '';
}

function resolveTenantIdFromReq(req) {
  try {
    const ctx = req?.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return null;
    const tid = str(ctx.tenant_id);
    return tid || null;
  } catch {
    return null;
  }
}

function defaultSite(tenantId, host) {
  const brand = tenantId ? str(tenantId).replace(/[-_]+/g, ' ') : 'CorpFlow';
  return {
    tenant_id: tenantId || null,
    host: host || null,
    languages: ['en', 'fr', 'ru'],
    lang_default: 'en',
    theme: {
      primary: '#0ea5e9',
      accent: '#22c55e',
      background: '#020617',
      surface: '#0b1220',
      text: '#e2e8f0',
      muted: '#94a3b8',
    },
    hero: {
      title: brand,
      subtitle: 'Luxury property in Mauritius — draft preview powered by CorpFlow.',
      cta_label: 'Request changes',
      cta_href: '/change',
    },
    sections: {
      about: { title: 'About', body: '' },
      services: { title: 'Developments', items: [] },
      contact: { title: 'Contact', email: null, phone: null, website: host ? `https://${host}` : null },
    },
    media: { hero_image_url: null, gallery: [], logo_url: null },
  };
}

export default async function tenantSitePublicHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tenantId = resolveTenantIdFromReq(req);
  if (!tenantId) {
    return res.status(200).json({ ok: true, tenant_id: null, site: null });
  }

  const host = str(req?.corpflowContext?.host);
  const prisma = new PrismaClient();
  try {
    const persona = await prisma.tenantPersona.findUnique({
      where: { tenantId },
      select: { personaJson: true },
    });
    const pj = persona?.personaJson && typeof persona.personaJson === 'object' ? persona.personaJson : {};
    const draft =
      pj && typeof pj === 'object' && pj.website_draft && typeof pj.website_draft === 'object'
        ? pj.website_draft
        : null;

    const site = { ...defaultSite(tenantId, host), ...(draft || {}) };
    return res.status(200).json({ ok: true, tenant_id: tenantId, site });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'TENANT_SITE_READ_FAILED', detail: msg });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

