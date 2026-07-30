import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

import { cfg } from './runtime-config.js';
import { ensureCipcDeskPreviewTenantSeeded } from './cipc-desk-preview-seed.js';
import {
  CIPCDESK_TENANT_ID,
  normalizeHostname,
  resolveCipcDeskWorkflowAccess,
} from './cipc-desk-runtime.js';
import {
  inferCipcDeskFromEmailText,
  resolveCipcDeskPublicBaseUrl,
} from './cipc-desk-email-interpret.js';

import {
  ensureClientDecisionsForTicket,
  resolveClientDecisionsMintPath,
} from '../cmp/_lib/client-decisions-client.js';
import {
  CLIENT_DECISIONS_ACCESS_KEY,
  buildNewClientDecisionsAccessRecord,
  generatePlainClientDecisionsToken,
} from '../cmp/_lib/client-decisions-magic-link.js';

export { inferCipcDeskFromEmailText, resolveCipcDeskPublicBaseUrl };

function str(v) {
  return v != null ? String(v).trim() : '';
}

function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/**
 * POST /api/cipc-desk/email-intake
 * Creates a synthetic CMP ticket + returns a one-time client decisions magic link URL.
 */
export default async function cipcDeskEmailIntakeHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const reqHost = normalizeHostname(req?.headers?.['x-forwarded-host'] || req?.headers?.host);
  const access = resolveCipcDeskWorkflowAccess({
    tenantId: CIPCDESK_TENANT_ID,
    host: reqHost,
    vercelEnv: process.env.VERCEL_ENV,
  });
  if (!access.allowed) {
    return res.status(403).json({
      error: 'CIPC_DESK_STANDING_OR_PREVIEW_REQUIRED',
      reason: access.reason,
      hint: 'Use standing hosts cipc.corpflowai.com / cipc-desk.corpflowai.com on the Production spine (or Preview env).',
    });
  }

  const ctxTenant = req?.corpflowContext?.tenant_id ? String(req.corpflowContext.tenant_id).trim() : '';
  const tenantId = ctxTenant || CIPCDESK_TENANT_ID;
  if (tenantId !== CIPCDESK_TENANT_ID) {
    return res.status(400).json({ error: 'TENANT_SCOPE_MISMATCH', expected: CIPCDESK_TENANT_ID, got: tenantId });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : null;
  if (!body) return res.status(400).json({ error: 'Missing JSON body' });

  const emailText = str(body.email_text || body.emailText || body.text || body.message);
  if (!emailText) return res.status(400).json({ error: 'email_text is required' });

  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  const prisma = new PrismaClient();
  try {
    // Best-effort: ensure tenant + seed exists, even if /api/ui/context was never called.
    await ensureCipcDeskPreviewTenantSeeded({
      tenantId,
      host: reqHost,
      prisma,
    });

    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

    const emailHash = crypto.createHash('sha256').update(String(emailText).slice(0, 20000), 'utf8').digest('hex');
    const candidates = await prisma.cmpTicket.findMany({
      where: { tenantId, status: 'Approved', stage: 'Build' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, consoleJson: true },
    });
    const existing = candidates.find((r) => {
      const cj = asObj(r.consoleJson);
      const cv = asObj(cj.client_view);
      const cipc = asObj(cv.cipc_desk);
      return cipc.source_email_hash === emailHash && cipc.preview_source === 'email-intake';
    });

    let ticketId = existing?.id ? String(existing.id) : '';
    if (!ticketId) {
      const interpreted = inferCipcDeskFromEmailText(emailText);
      const checklistItems = interpreted.checklistItems;

      const consoleJson = {
        locale: 'en',
        seed_source: 'cipc-desk-email-intake',
        brief: {
          summary: `CIPC Desk · ${interpreted.service.serviceTitle}`,
          service: interpreted.service.serviceSlug,
          requested_change: interpreted.service.requestedChange,
          acceptance_criteria: [
            'Operator can review scope and draft a validated next step',
            'Client can submit guided decisions via one-time link',
          ],
          missing_information: ['Confirm matter scope + identifiers (provisional)'],
        },
        messages: [],
        client_view: {
          cipc_desk: {
            seed_marker: 'cipc-desk-email-intake-v1',
            preview_source: 'email-intake',
            source_email_hash: emailHash,
            client_route: interpreted.clientRoute,
            checklist: { items: checklistItems },
            client_reply_draft: interpreted.clientReplyDraft,
            attachments: attachments.map((a, idx) => {
              const o = asObj(a);
              return {
                file_name: str(o.file_name || o.fileName || o.name) || `attachment_${idx + 1}`,
                content_type: str(o.content_type || o.contentType || o.type) || null,
                note: str(o.note) || null,
              };
            }),
          },
        },
        client_decisions: {
          items: interpreted.clientDecisionsItems,
        },
      };

      const created = await prisma.cmpTicket.create({
        data: {
          tenantId,
          status: 'Approved',
          stage: 'Build',
          title: `CIPC Desk · ${interpreted.service.serviceTitle}`,
          description: 'CIPC Desk · email-first intake (fictional data · corpflow_test)',
          locale: 'en',
          brief: consoleJson?.brief?.summary ? String(consoleJson.brief.summary) : undefined,
          consoleJson,
        },
        select: { id: true },
      });

      ticketId = String(created?.id || '').trim();
      if (!ticketId) return res.status(503).json({ error: 'TICKET_CREATE_FAILED' });
    }

    const row = await prisma.cmpTicket.findUnique({ where: { id: ticketId } });
    if (!row) return res.status(404).json({ error: 'Ticket not found' });

    const normSeed = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
    const seeded = ensureClientDecisionsForTicket(ticketId, normSeed);
    const cd = seeded.client_decisions && typeof seeded.client_decisions === 'object' ? seeded.client_decisions : {};
    const items = Array.isArray(cd.items) ? cd.items : [];
    if (!items.length) return res.status(409).json({ error: 'CLIENT_DECISIONS_NOT_CONFIGURED' });

    const plain = generatePlainClientDecisionsToken();
    const { access, expires_at } = buildNewClientDecisionsAccessRecord(plain);

    const updated = ensureClientDecisionsForTicket(ticketId, {
      ...(seeded || {}),
      [CLIENT_DECISIONS_ACCESS_KEY]: access,
    });

    await prisma.cmpTicket.update({
      where: { id: ticketId },
      data: {
        consoleJson: updated,
        locale: updated.locale,
        brief: updated?.brief?.summary ? String(updated.brief.summary) : undefined,
      },
    });

    const base = resolveCipcDeskPublicBaseUrl(req);
    const pathBase = resolveClientDecisionsMintPath(ticketId, typeof body.client_path === 'string' ? body.client_path : '');
    const path = `${pathBase}?id=${encodeURIComponent(ticketId)}&token=${encodeURIComponent(plain)}`;
    const magic_link_url = base ? `${base}${path}` : '';
    if (!magic_link_url) return res.status(503).json({ error: 'PUBLIC_BASE_URL_UNAVAILABLE' });

    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      magic_link_url,
      expires_at,
      source: 'email_intake',
    });
  } catch (e) {
    return res.status(500).json({ error: 'email-intake failed', detail: String(e?.message || e) });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
