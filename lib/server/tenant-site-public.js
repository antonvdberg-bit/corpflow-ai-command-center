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
    meta: { page_title: 'Lux Mauritius · Preview' },
    languages: ['en', 'fr', 'ru'],
    lang_default: 'en',
    theme: {
      primary: '#d4af37', // gold
      accent: '#ffffff',
      background: '#0a0a0a',
      surface: '#0f0f10',
      text: '#f5f5f5',
      muted: '#bdbdbd',
    },
    hero: {
      /** Nav / logo wordmark (uppercased in UI). */
      title: 'Lux Mauritius',
      /** Large headline (H1), e.g. luxemaurice.com style. */
      headline: 'Luxurious Mauritius',
      /** Subhead under headline. */
      tagline: 'Discover Exclusive Luxury Properties in Mauritius',
      cta_label: 'Upcoming Properties',
      cta_href: '#enquire',
    },
    sections: {
      band_title: 'Buy direct from the developer',
      about: {
        title: 'Why Mauritius?',
        body:
          "People are increasingly buying luxury properties in Mauritius due to the island's stunning natural beauty, favorable climate, and high-quality lifestyle.",
      },
      services: { title: 'Upcoming properties', items: [] },
      contact: { title: 'Contact', email: null, phone: null, website: host ? `https://${host}` : null },
    },
    media: { hero_image_url: null, gallery: [], logo_url: null },
  };
}

/**
 * Deep-merge draft into defaults so partial saves never wipe nested hero/sections.
 *
 * @param {Record<string, unknown>} base
 * @param {Record<string, unknown>} draft
 * @returns {Record<string, unknown>}
 */
export function mergeSiteDraft(base, draft) {
  if (!draft || typeof draft !== 'object') return base;
  const out = { ...base, ...draft };
  if (draft.meta && typeof draft.meta === 'object') {
    out.meta = { ...(base.meta && typeof base.meta === 'object' ? base.meta : {}), ...draft.meta };
  }
  if (draft.theme && typeof draft.theme === 'object') {
    out.theme = { ...(base.theme && typeof base.theme === 'object' ? base.theme : {}), ...draft.theme };
  }
  if (draft.hero && typeof draft.hero === 'object') {
    out.hero = { ...(base.hero && typeof base.hero === 'object' ? base.hero : {}), ...draft.hero };
  }
  if (draft.media && typeof draft.media === 'object') {
    out.media = { ...(base.media && typeof base.media === 'object' ? base.media : {}), ...draft.media };
  }
  if (draft.sections && typeof draft.sections === 'object') {
    const bSec = base.sections && typeof base.sections === 'object' ? base.sections : {};
    const dSec = draft.sections;
    out.sections = { ...bSec, ...dSec };
    if (dSec.about && typeof dSec.about === 'object') {
      out.sections.about = {
        ...(bSec.about && typeof bSec.about === 'object' ? bSec.about : {}),
        ...dSec.about,
      };
    }
    if (dSec.services && typeof dSec.services === 'object') {
      out.sections.services = {
        ...(bSec.services && typeof bSec.services === 'object' ? bSec.services : {}),
        ...dSec.services,
      };
    }
    if (dSec.contact && typeof dSec.contact === 'object') {
      out.sections.contact = {
        ...(bSec.contact && typeof bSec.contact === 'object' ? bSec.contact : {}),
        ...dSec.contact,
      };
    }
  }
  return out;
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

    const base = defaultSite(tenantId, host);
    const site = mergeSiteDraft(base, draft || {});
    return res.status(200).json({ ok: true, tenant_id: tenantId, site });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'TENANT_SITE_READ_FAILED', detail: msg });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

