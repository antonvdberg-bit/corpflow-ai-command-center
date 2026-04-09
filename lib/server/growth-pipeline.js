/**
 * Tenant Growth Pipeline — market segments, target accounts, contacts, and planned touchpoints.
 * Auth: tenant session (typ=tenant) scoped to session tenant_id; factory admin may pass tenant_id query/body.
 *
 * Routes (via /api/factory_router?__path=...):
 *   GET  growth/overview
 *   GET  growth/segments
 *   POST growth/segments
 *   PATCH growth/segment
 *   GET  growth/companies?segment_id=
 *   POST growth/companies
 *   GET  growth/contacts?company_id=
 *   POST growth/contacts
 *   GET  growth/touchpoints?contact_id=
 *   POST growth/touchpoints
 *   POST growth/seed-demo  — idempotent Mauritius / maritime AML research segment for effective tenant
 */

import { PrismaClient } from '@prisma/client';

import { getSessionFromRequest } from './session.js';
import { getTenantHostSessionConflict } from './tenant-host-session-gate.js';

const prisma = new PrismaClient();

function json(res, status, body) {
  res.status(status).json(body);
}

function firstQuery(query, key) {
  if (!query || typeof query !== 'object') return undefined;
  const v = query[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {{ admin: boolean, tenantId: string | null } | null}
 */
function resolveGrowthScope(req) {
  const sess = getSessionFromRequest(req);
  if (sess?.ok === true && sess.payload?.typ === 'admin') {
    return { admin: true, tenantId: null };
  }
  if (sess?.ok === true && sess.payload?.typ === 'tenant' && sess.payload?.tenant_id) {
    return { admin: false, tenantId: String(sess.payload.tenant_id).trim() };
  }
  return null;
}

/**
 * @param {{ admin: boolean, tenantId: string | null }} scope
 * @param {import('http').IncomingMessage} req
 * @param {Record<string, unknown>} [body]
 * @returns {string | null}
 */
function effectiveTenantId(scope, req, body) {
  if (scope.admin) {
    const q = firstQuery(req.query, 'tenant_id');
    const b = body && typeof body === 'object' ? body.tenant_id : undefined;
    const t = (q != null && String(q).trim() !== '' ? String(q) : b != null ? String(b) : '').trim();
    return t || null;
  }
  return scope.tenantId;
}

function toInt(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

const DEMO_SEGMENT_SLUG = 'mauritius-maritime-aml-research-2026';

const DEMO_THESIS = `Research hypothesis (not legal advice): Public budget and policy commentary in Mauritius for 2025–2026 highlights continued emphasis on anti–money laundering (AML), countering the financing of terrorism (CFT), and tax-base integrity—including minimum tax concepts such as QDMTT where applicable. Maritime logistics and port-adjacent operators may face elevated expectations for auditable controls, data lineage, and governance evidence.

CorpFlow AI hypothesis: organizations in this sector may benefit from agentic governance patterns (human-in-the-loop approvals, immutable audit trails, policy-as-code) paired with delivery automation. Validate with qualified counsel and each prospect’s facts before any outreach claims.

Outreach stance: educate with questions and references to their public filings / industry context; avoid asserting legal obligations without verification.`;

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} pathSeg
 * @returns {Promise<void>}
 */
export async function growthPipelineHandler(req, res, pathSeg) {
  const scope = resolveGrowthScope(req);
  if (!scope) {
    return json(res, 401, {
      error: 'LOGIN_REQUIRED',
      hint: 'Sign in as a tenant user, or as factory admin with ?tenant_id= on requests.',
    });
  }

  if (!scope.admin) {
    const hostSessConflict = getTenantHostSessionConflict(req);
    if (hostSessConflict) {
      return json(res, 403, {
        error: 'TENANT_HOST_SESSION_MISMATCH',
        host_tenant_id: hostSessConflict.host_tenant_id,
        session_tenant_id: hostSessConflict.session_tenant_id,
        hint:
          'Your session is for another workspace. Open /login, use Logout, then sign in again on this hostname.',
      });
    }
  }

  const route = String(pathSeg || '')
    .replace(/^growth\/?/i, '')
    .replace(/\/+$/, '')
    .toLowerCase();

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { error: 'INVALID_JSON' });
    }
  }
  if (body && typeof body !== 'object') body = {};

  try {
    // Core/admin: list “in progress” work across tenants (no tenant_id required).
    if (route === 'in-progress') {
      if (!scope.admin) {
        return json(res, 403, { error: 'ADMIN_REQUIRED' });
      }
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return json(res, 405, { error: 'Method not allowed' });
      }

      const qTenant = firstQuery(req.query, 'tenant_id');
      const tenantId = qTenant != null && String(qTenant).trim() !== '' ? String(qTenant).trim() : null;
      const limitRaw = firstQuery(req.query, 'limit');
      const limit = Math.max(1, Math.min(200, toInt(limitRaw, 80)));

      // “In progress” heuristic:
      // - Touchpoints not sent yet (drafts/scheduled) OR newly created within recent window.
      const now = Date.now();
      const createdAfterDaysRaw = firstQuery(req.query, 'created_after_days');
      const createdAfterDays = Math.max(1, Math.min(365, toInt(createdAfterDaysRaw, 90)));
      const createdAfter = new Date(now - createdAfterDays * 24 * 60 * 60 * 1000);

      const where = {
        ...(tenantId ? { tenantId } : {}),
        OR: [{ sentAt: null }, { createdAt: { gte: createdAfter } }],
      };

      const rows = await prisma.growthTouchpoint.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        include: {
          contact: {
            select: {
              id: true,
              fullName: true,
              roleTitle: true,
              status: true,
              company: {
                select: {
                  id: true,
                  name: true,
                  country: true,
                  status: true,
                  segment: { select: { id: true, name: true, slug: true, status: true } },
                },
              },
            },
          },
        },
      });

      const tenantIds = Array.from(
        new Set(
          rows
            .map((r) => (r && typeof r === 'object' ? r.tenantId : null))
            .filter((t) => typeof t === 'string' && t.trim() !== '')
        )
      );
      const tenants = await prisma.tenant.findMany({
        where: { tenantId: { in: tenantIds } },
        select: { tenantId: true, name: true, slug: true, tenantStatus: true, lifecycle: true },
      });
      const tenantById = new Map(tenants.map((t) => [t.tenantId, t]));

      return json(res, 200, {
        ok: true,
        scope: 'admin',
        filters: { tenant_id: tenantId, created_after_days: createdAfterDays, limit },
        tenants: tenants.sort((a, b) => String(a.tenantId).localeCompare(String(b.tenantId))),
        in_progress: rows.map((t) => ({
          id: t.id,
          tenant_id: t.tenantId,
          tenant: tenantById.get(t.tenantId) || null,
          channel: t.channel,
          stage: t.stage,
          subject: t.subject,
          scheduled_at: t.scheduledAt ? t.scheduledAt.toISOString() : null,
          sent_at: t.sentAt ? t.sentAt.toISOString() : null,
          created_at: t.createdAt ? t.createdAt.toISOString() : null,
          updated_at: t.updatedAt ? t.updatedAt.toISOString() : null,
          contact: t.contact || null,
        })),
      });
    }

    const tenantId = effectiveTenantId(scope, req, body);
    if (!tenantId) {
      return json(res, 400, {
        error: 'TENANT_ID_REQUIRED',
        hint: scope.admin ? 'Pass tenant_id as query or JSON body (factory admin).' : 'Missing tenant on session.',
      });
    }

    if (route === 'overview' || route === '') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return json(res, 405, { error: 'Method not allowed' });
      }
      const [segments, companies, contacts, touchpoints] = await Promise.all([
        prisma.growthSegment.count({ where: { tenantId } }),
        prisma.growthCompany.count({ where: { tenantId } }),
        prisma.growthContact.count({ where: { tenantId } }),
        prisma.growthTouchpoint.count({ where: { tenantId } }),
      ]);
      return json(res, 200, {
        ok: true,
        tenant_id: tenantId,
        counts: { segments, companies, contacts, touchpoints },
      });
    }

    if (route === 'segments') {
      if (req.method === 'GET') {
        const rows = await prisma.growthSegment.findMany({
          where: { tenantId },
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
          include: { _count: { select: { companies: true } } },
        });
        return json(res, 200, { ok: true, segments: rows });
      }
      if (req.method === 'POST') {
        const slug = String(body.slug || '').trim().toLowerCase().replace(/\s+/g, '-');
        const name = String(body.name || '').trim();
        if (!slug || !name) return json(res, 400, { error: 'slug and name required' });
        const row = await prisma.growthSegment.create({
          data: {
            tenantId,
            slug,
            name,
            thesisMd: String(body.thesis_md || body.thesisMd || ''),
            regionTags: body.region_tags != null ? String(body.region_tags) : null,
            industryTags: body.industry_tags != null ? String(body.industry_tags) : null,
            priority: Number(body.priority) || 0,
            status: String(body.status || 'active'),
          },
        });
        return json(res, 201, { ok: true, segment: row });
      }
      res.setHeader('Allow', 'GET, POST');
      return json(res, 405, { error: 'Method not allowed' });
    }

    if (route === 'segment') {
      if (req.method !== 'PATCH') {
        res.setHeader('Allow', 'PATCH');
        return json(res, 405, { error: 'Method not allowed' });
      }
      const id = String(body.id || '').trim();
      if (!id) return json(res, 400, { error: 'id required' });
      const existing = await prisma.growthSegment.findFirst({ where: { id, tenantId } });
      if (!existing) return json(res, 404, { error: 'Segment not found' });
      const row = await prisma.growthSegment.update({
        where: { id },
        data: {
          ...(body.name != null ? { name: String(body.name) } : {}),
          ...(body.thesis_md != null || body.thesisMd != null
            ? { thesisMd: String(body.thesis_md ?? body.thesisMd) }
            : {}),
          ...(body.region_tags != null ? { regionTags: String(body.region_tags) } : {}),
          ...(body.industry_tags != null ? { industryTags: String(body.industry_tags) } : {}),
          ...(body.priority != null ? { priority: Number(body.priority) || 0 } : {}),
          ...(body.status != null ? { status: String(body.status) } : {}),
        },
      });
      return json(res, 200, { ok: true, segment: row });
    }

    if (route === 'companies') {
      if (req.method === 'GET') {
        const segmentId = firstQuery(req.query, 'segment_id');
        const where = { tenantId, ...(segmentId ? { segmentId: String(segmentId) } : {}) };
        const rows = await prisma.growthCompany.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          include: { _count: { select: { contacts: true } } },
        });
        return json(res, 200, { ok: true, companies: rows });
      }
      if (req.method === 'POST') {
        const name = String(body.name || '').trim();
        if (!name) return json(res, 400, { error: 'name required' });
        const row = await prisma.growthCompany.create({
          data: {
            tenantId,
            segmentId: body.segment_id ? String(body.segment_id) : null,
            name,
            website: body.website != null ? String(body.website) : null,
            country: body.country != null ? String(body.country) : null,
            notes: body.notes != null ? String(body.notes) : null,
            status: String(body.status || 'research'),
            source: String(body.source || 'manual'),
          },
        });
        return json(res, 201, { ok: true, company: row });
      }
      res.setHeader('Allow', 'GET, POST');
      return json(res, 405, { error: 'Method not allowed' });
    }

    if (route === 'contacts') {
      if (req.method === 'GET') {
        const companyId = firstQuery(req.query, 'company_id');
        if (!companyId) return json(res, 400, { error: 'company_id query required' });
        const rows = await prisma.growthContact.findMany({
          where: { tenantId, companyId: String(companyId) },
          orderBy: { updatedAt: 'desc' },
          include: { _count: { select: { touchpoints: true } } },
        });
        return json(res, 200, { ok: true, contacts: rows });
      }
      if (req.method === 'POST') {
        const companyId = String(body.company_id || '').trim();
        const fullName = String(body.full_name || body.fullName || '').trim();
        if (!companyId || !fullName) return json(res, 400, { error: 'company_id and full_name required' });
        const parent = await prisma.growthCompany.findFirst({ where: { id: companyId, tenantId } });
        if (!parent) return json(res, 404, { error: 'Company not found' });
        const row = await prisma.growthContact.create({
          data: {
            tenantId,
            companyId,
            fullName,
            roleTitle: body.role_title != null ? String(body.role_title) : null,
            email: body.email != null ? String(body.email) : null,
            linkedinUrl: body.linkedin_url != null ? String(body.linkedin_url) : null,
            notes: body.notes != null ? String(body.notes) : null,
            consentBasis: body.consent_basis != null ? String(body.consent_basis) : null,
            status: String(body.status || 'identified'),
          },
        });
        return json(res, 201, { ok: true, contact: row });
      }
      res.setHeader('Allow', 'GET, POST');
      return json(res, 405, { error: 'Method not allowed' });
    }

    if (route === 'touchpoints') {
      if (req.method === 'GET') {
        const contactId = firstQuery(req.query, 'contact_id');
        if (!contactId) return json(res, 400, { error: 'contact_id query required' });
        const rows = await prisma.growthTouchpoint.findMany({
          where: { tenantId, contactId: String(contactId) },
          orderBy: { createdAt: 'desc' },
        });
        return json(res, 200, { ok: true, touchpoints: rows });
      }
      if (req.method === 'POST') {
        const contactId = String(body.contact_id || '').trim();
        const channel = String(body.channel || '').trim();
        if (!contactId || !channel) return json(res, 400, { error: 'contact_id and channel required' });
        const parent = await prisma.growthContact.findFirst({ where: { id: contactId, tenantId } });
        if (!parent) return json(res, 404, { error: 'Contact not found' });
        const row = await prisma.growthTouchpoint.create({
          data: {
            tenantId,
            contactId,
            channel,
            subject: body.subject != null ? String(body.subject) : null,
            bodyMd: String(body.body_md || body.bodyMd || ''),
            stage: String(body.stage || 'awareness'),
            scheduledAt: body.scheduled_at ? new Date(String(body.scheduled_at)) : null,
            sentAt: body.sent_at ? new Date(String(body.sent_at)) : null,
          },
        });
        return json(res, 201, { ok: true, touchpoint: row });
      }
      res.setHeader('Allow', 'GET, POST');
      return json(res, 405, { error: 'Method not allowed' });
    }

    if (route === 'seed-demo') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return json(res, 405, { error: 'Method not allowed' });
      }
      let segment = await prisma.growthSegment.findUnique({
        where: { tenantId_slug: { tenantId, slug: DEMO_SEGMENT_SLUG } },
      });
      if (!segment) {
        segment = await prisma.growthSegment.create({
          data: {
            tenantId,
            slug: DEMO_SEGMENT_SLUG,
            name: 'Mauritius — maritime / logistics (AML & governance research)',
            thesisMd: DEMO_THESIS,
            regionTags: 'MU, EU trade partners',
            industryTags: 'maritime logistics, port services, freight forwarding',
            priority: 10,
            status: 'active',
          },
        });
      }
      let company = await prisma.growthCompany.findFirst({
        where: { tenantId, segmentId: segment.id, name: 'Demo — Port & Logistics Holdings (replace)' },
      });
      if (!company) {
        company = await prisma.growthCompany.create({
          data: {
            tenantId,
            segmentId: segment.id,
            name: 'Demo — Port & Logistics Holdings (replace)',
            website: 'https://example.invalid',
            country: 'MU',
            notes:
              'Replace with a real target after your own research. Do not send outreach until consent/lawful basis is documented.',
            status: 'research',
            source: 'seed-demo',
          },
        });
      }
      let contact = await prisma.growthContact.findFirst({
        where: { tenantId, companyId: company.id, fullName: 'Demo — Chief Compliance Officer (replace)' },
      });
      if (!contact) {
        contact = await prisma.growthContact.create({
          data: {
            tenantId,
            companyId: company.id,
            fullName: 'Demo — Chief Compliance Officer (replace)',
            roleTitle: 'Chief Compliance Officer',
            email: null,
            linkedinUrl: null,
            notes: 'Replace with verified professional; record lawful basis before contact.',
            consentBasis: null,
            status: 'identified',
          },
        });
      }
      let tp = await prisma.growthTouchpoint.findFirst({
        where: { tenantId, contactId: contact.id, channel: 'email_draft' },
      });
      if (!tp) {
        tp = await prisma.growthTouchpoint.create({
          data: {
            tenantId,
            contactId: contact.id,
            channel: 'email_draft',
            subject: '[Draft] Governance evidence & auditable automation',
            bodyMd: `Hi {{first_name}},

We’re researching how maritime operators are preparing for stronger AML/CFT evidence expectations and more automated assurance workflows—not legal advice on your situation.

If improving audit readiness and operator-in-the-loop controls is on your roadmap, would a 20-minute fit conversation make sense next week?

— {{sender_name}}
CorpFlow AI`,
            stage: 'awareness',
          },
        });
      }
      return json(res, 200, {
        ok: true,
        seeded: true,
        segment_id: segment.id,
        company_id: company.id,
        contact_id: contact.id,
        touchpoint_id: tp.id,
      });
    }

    return json(res, 404, { error: 'Unknown growth route', route });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(res, 500, { error: 'GROWTH_PIPELINE_FAILED', detail: msg });
  }
}
