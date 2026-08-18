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
  ensureClientDecisionsForTicket,
  resolveClientDecisionsMintPath,
} from '../cmp/_lib/client-decisions-client.js';
import {
  CLIENT_DECISIONS_ACCESS_KEY,
  buildNewClientDecisionsAccessRecord,
  generatePlainClientDecisionsToken,
} from '../cmp/_lib/client-decisions-magic-link.js';

function str(v) {
  return v != null ? String(v).trim() : '';
}

function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

function inferCipcDeskFromEmailText(emailText) {
  const raw = String(emailText || '');
  const lower = raw.toLowerCase();

  const isProfessionalPartner =
    /(accountant|tax practitioner|tax\s+practitioner|auditor|firm|professional\s+partner|company\s+secretary)/i.test(lower);
  const clientRoute = isProfessionalPartner ? 'professional_partner' : 'direct_sme';

  /** @type {{ serviceSlug: string, serviceTitle: string, requestedChange: string }} */
  let service = null;

  const has = (re) => re.test(lower);

  if (has(/partner overflow\s*\/\s*white-label enquiry|overflow\s*\/\s*white-label|fractional\s*\/\s*white-label/i)) {
    service = {
      serviceSlug: 'monthly-cipc-administration-support',
      serviceTitle: 'Fractional / white-label company-secretarial support (provisional)',
      requestedChange: 'Scope overflow / white-label partner support (provisional)',
    };
  } else if (has(/(director\s+appointment|appointment\s+of\s+director|appoint(ed)?\s+director)/i) || has(/resign(ed|ation)?\s+director|resign(ed|ation)?\s+of\s+director/i)) {
    service = {
      serviceSlug: 'director-appointments-resignations',
      serviceTitle: 'Director appointments & resignations (provisional)',
      requestedChange: 'Process director appointment/resignation matter (provisional)',
    };
  } else if (has(/beneficial\s+ownership|ubo\b|beneficial\s+owner/i)) {
    service = {
      serviceSlug: 'beneficial-ownership-submissions',
      serviceTitle: 'Beneficial ownership submissions (provisional)',
      requestedChange: 'Prepare beneficial ownership submission matter (provisional)',
    };
  } else if (has(/registered\s+address|change\s+of\s+address|address\s+change/i)) {
    service = {
      serviceSlug: 'registered-address-changes',
      serviceTitle: 'Registered-address changes (provisional)',
      requestedChange: 'Prepare registered-address change matter (provisional)',
    };
  } else if (has(/annual\s+returns?|a.r\\b/i)) {
    service = {
      serviceSlug: 'annual-returns',
      serviceTitle: 'Annual returns (provisional)',
      requestedChange: 'Prepare annual returns matter (provisional)',
    };
  } else if (has(/amendment|alteration|maintenance|company\s+amend|maintenance\s+support/i)) {
    service = {
      serviceSlug: 'company-amendments-maintenance',
      serviceTitle: 'Company amendments & maintenance (provisional)',
      requestedChange: 'Prepare company amendments / maintenance matter (provisional)',
    };
  } else if (has(/statutory\s+records|document\s+retrieval|retrieve\s+records|records\s+retrieval/i)) {
    service = {
      serviceSlug: 'statutory-records-document-retrieval',
      serviceTitle: 'Statutory records & document retrieval (provisional)',
      requestedChange: 'Retrieve / prepare statutory records (provisional)',
    };
  } else if (has(/monthly|administration\s+support|cipc\s+administration\s+support/i)) {
    service = {
      serviceSlug: 'monthly-cipc-administration-support',
      serviceTitle: 'Monthly CIPC administration support (provisional)',
      requestedChange: 'Prepare monthly administration support plan (provisional)',
    };
  }

  if (!service) {
    service = {
      serviceSlug: 'private-company-registration',
      serviceTitle: 'Private-company registration (provisional)',
      requestedChange: 'Submit and confirm first-slice scope for private-company registration (provisional)',
    };
  }

  const checklistItems = [
    { key: 'scope_confirmed', label: 'Service scope confirmed by Serah (provisional)', status: 'pending' },
    { key: 'required_info_captured', label: 'Required matter info captured (provisional)', status: 'pending' },
    { key: 'documents_and_turnaround', label: 'Documents + turnaround drafted for validation', status: 'pending' },
    { key: 'client_reply_draft_ready', label: 'Client reply draft prepared for guided decisions', status: 'pending' },
  ];

  const clientReplyDraft =
    `Thanks — we received your email for ${service.serviceTitle}.\n\n` +
    `Next: Serah will validate the exact scope and confirm required information before any filing steps are treated as confirmed. ` +
    `To help us draft a safer first-slice plan, please ensure your email includes the company identifiers you already have (if any).`;

  const clientDecisionsItems = [
    {
      key: 'first_slice_outcome',
      status: 'answered',
      answer: `First slice outcome: ${service.serviceTitle}`,
    },
    {
      key: 'first_market_or_country',
      status: 'answered',
      answer: 'South Africa (CIPC)',
    },
    {
      key: 'listings_feed_or_idx_provider_status',
      status: 'waived',
      answer: 'Not applicable for CIPC Desk',
    },
    {
      key: 'human_handoff_owner_and_hours',
      status: 'pending',
      answer: '',
    },
  ];

  return {
    clientRoute,
    service,
    checklistItems,
    clientReplyDraft,
    clientDecisionsItems,
  };
}

function inferPublicBaseUrl(req) {
  const explicit = String(cfg('CORPFLOW_PUBLIC_BASE_URL', '')).trim();
  let base = explicit ? explicit.replace(/\/+$/, '') : '';
  if (!base) {
    try {
      const proto =
        String(req.headers['x-forwarded-proto'] || 'https')
          .split(',')[0]
          .trim() || 'https';
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
        .split(',')[0]
        .trim()
        .replace(/:\d+$/, '');
      if (host) base = `${proto}://${host}`;
    } catch {
      /* ignore */
    }
  }
  return base;
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
          description: 'CIPC Desk · email-first intake (fictional data preview)',
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

    const base = inferPublicBaseUrl(req);
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

