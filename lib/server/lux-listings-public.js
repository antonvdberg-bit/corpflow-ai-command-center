/**
 * Public read-only JSON for LuxeMaurice Postgres listings (Phase 2 slice A).
 *
 * Routes (via `api/factory_router.js`):
 * - GET /api/lux/listings — published rows for tenant `luxe-maurice`, Lux marketing host only.
 * - GET /api/lux/listing?slug=<ref> — single published row.
 *
 * Writes / editor UI are out of scope for this slice.
 */

import {
  fetchPublishedLuxListingDetailPublic,
  fetchPublishedLuxListingsPublic,
  normalizeLuxListingSlugQuery,
} from './lux-listing-published-query.js';

export { normalizeLuxListingSlugQuery };

const LUX_TENANT = 'luxe-maurice';

function firstQuery(query, key) {
  if (!query || typeof query !== 'object') return '';
  const v = query[key];
  if (Array.isArray(v)) return v[0] || '';
  return v || '';
}

function getTenantIdFromHostContext(req) {
  try {
    const ctx = req?.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return '';
    return ctx.tenant_id != null ? String(ctx.tenant_id).trim() : '';
  } catch {
    return '';
  }
}

function sendJson(res, statusCode, body) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;
  res.end(JSON.stringify(body));
}

/**
 * @param {import('http').IncomingMessage & { query?: Record<string, unknown> }} req
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} pathSeg
 * @returns {Promise<boolean>} true when this module handled the request
 */
export async function tryHandleLuxListingsPublicRead(req, res, prisma, pathSeg) {
  if (pathSeg !== 'lux/listings' && pathSeg !== 'lux/listing') {
    return false;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    return true;
  }

  const hostTid = getTenantIdFromHostContext(req);
  if (hostTid !== LUX_TENANT) {
    sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
    return true;
  }

  if (pathSeg === 'lux/listings') {
    try {
      const listings = await fetchPublishedLuxListingsPublic(prisma);
      sendJson(res, 200, { ok: true, listings });
    } catch {
      sendJson(res, 500, { ok: false, error: 'SERVER_ERROR' });
    }
    return true;
  }

  const slug = normalizeLuxListingSlugQuery(firstQuery(req.query, 'slug'));
  if (!slug) {
    sendJson(res, 400, { ok: false, error: 'SLUG_REQUIRED' });
    return true;
  }

  try {
    const listing = await fetchPublishedLuxListingDetailPublic(prisma, slug);
    if (!listing) {
      sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
      return true;
    }
    sendJson(res, 200, { ok: true, listing });
  } catch {
    sendJson(res, 500, { ok: false, error: 'SERVER_ERROR' });
  }
  return true;
}
