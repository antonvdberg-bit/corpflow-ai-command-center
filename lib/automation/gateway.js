/**
 * Automation gateway: single ingest + playbook surface for agents and webhooks.
 */

import { PrismaClient } from '@prisma/client';

import { timingSafeStringEquals, verifyFactoryMasterAuth } from '../server/factory-master-auth.js';
import { cfg } from '../server/runtime-config.js';
import { emitTelemetry } from '../cmp/_lib/telemetry.js';
import { classifyEventRisk, tierRequiresApprovalSecret } from './risk.js';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {{ ok: true, body: Record<string, unknown> } | { ok: false, error: string }}
 */
function parseJsonBody(req) {
  const body = req.body;
  if (body && typeof body === 'object') return { ok: true, body };
  return { ok: false, error: 'Missing JSON body (Vercel must parse it).' };
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function verifyIngestSecret(req) {
  if (verifyFactoryMasterAuth(req)) return true;
  const expected = String(cfg('CORPFLOW_AUTOMATION_INGEST_SECRET', '')).trim();
  if (!expected) return false;
  const h = req.headers?.['x-corpflow-automation-secret'];
  const got = h != null ? String(h).trim() : '';
  return timingSafeStringEquals(got, expected);
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function verifyApprovalSecret(req) {
  const expected = String(cfg('CORPFLOW_AUTOMATION_APPROVAL_SECRET', '')).trim();
  if (!expected) return false;
  const h = req.headers?.['x-corpflow-automation-approval'];
  const got = h != null ? String(h).trim() : '';
  return timingSafeStringEquals(got, expected);
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * @param {string} tenantId
 * @returns {string}
 */
export function resolveTenantScope(tenantId) {
  const t = str(tenantId);
  return t || 'global';
}

/**
 * Best-effort forward to an external orchestrator (e.g. n8n).
 *
 * @param {Record<string, unknown>} envelope
 * @returns {Promise<void>}
 */
async function forwardEnvelope(envelope) {
  const url = String(cfg('CORPFLOW_AUTOMATION_FORWARD_URL', '')).trim();
  if (!url) return;
  const secret = String(cfg('CORPFLOW_AUTOMATION_FORWARD_SECRET', '')).trim();
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-corpflow-automation-forward-secret': secret } : {}),
      },
      body: JSON.stringify(envelope),
    });
  } catch {
    // best-effort
  }
}

/**
 * POST /api/automation/ingest
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleAutomationIngest(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyIngestSecret(req)) {
    return res.status(403).json({ error: 'Automation ingest authentication required.' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }
  const b = parsed.body;
  const eventType = str(b.event_type);
  if (!eventType) {
    return res.status(400).json({ error: 'event_type is required' });
  }

  const tenantIdRaw = b.tenant_id != null ? str(b.tenant_id) : '';
  const tenantId = tenantIdRaw || null;
  const tenantScope = resolveTenantScope(tenantIdRaw);
  const idempotencyKey = b.idempotency_key != null ? str(b.idempotency_key) : '';
  const correlationId = b.correlation_id != null ? str(b.correlation_id) : '';
  const source = b.source != null ? str(b.source) : 'ingest';
  const payload = b.payload != null && typeof b.payload === 'object' ? b.payload : {};

  const riskTier = classifyEventRisk(eventType);
  if (tierRequiresApprovalSecret(riskTier) && !verifyApprovalSecret(req)) {
    return res.status(403).json({
      error: 'APPROVAL_REQUIRED',
      hint: 'High-risk event types require header x-corpflow-automation-approval matching CORPFLOW_AUTOMATION_APPROVAL_SECRET.',
      risk_tier: riskTier,
      event_type: eventType,
    });
  }

  const prisma = new PrismaClient();
  try {
    if (idempotencyKey) {
      const existing = await prisma.automationEvent.findUnique({
        where: {
          automation_events_scope_idem: {
            tenantScope,
            idempotencyKey,
          },
        },
        select: { id: true, status: true, occurredAt: true },
      });
      if (existing) {
        return res.status(200).json({
          ok: true,
          deduped: true,
          id: existing.id,
          status: existing.status,
          occurred_at: existing.occurredAt?.toISOString?.() || null,
        });
      }
    }

    if (eventType === 'automation.playbook.upsert') {
      const slug = str((/** @type {Record<string, unknown>} */ (payload)).slug);
      const title = str((/** @type {Record<string, unknown>} */ (payload)).title);
      const bodyMd = str((/** @type {Record<string, unknown>} */ (payload)).body_md);
      const tags = (/** @type {Record<string, unknown>} */ (payload)).tags;
      if (!slug || !title) {
        return res.status(400).json({ error: 'playbook upsert requires payload.slug and payload.title' });
      }
      await prisma.automationPlaybook.upsert({
        where: {
          tenantScope_slug: { tenantScope, slug },
        },
        create: {
          tenantScope,
          slug,
          title,
          bodyMd: bodyMd || '',
          tags: tags != null && typeof tags === 'object' ? tags : undefined,
        },
        update: {
          title,
          bodyMd: bodyMd || '',
          tags: tags != null && typeof tags === 'object' ? tags : undefined,
        },
      });
    }

    const row = await prisma.automationEvent.create({
      data: {
        tenantId,
        tenantScope,
        source: source || 'ingest',
        eventType,
        correlationId: correlationId || null,
        idempotencyKey: idempotencyKey || null,
        riskTier,
        status: 'accepted',
        payload,
      },
      select: {
        id: true,
        occurredAt: true,
        tenantScope: true,
        eventType: true,
        riskTier: true,
        status: true,
      },
    });

    emitTelemetry({
      event_type: 'automation.ingest',
      payload: {
        automation_event_id: row.id,
        tenant_scope: row.tenantScope,
        event_type: row.eventType,
        risk_tier: row.riskTier,
      },
      cmp: { ticket_id: 'n/a', action: 'automation_ingest' },
    });

    const envelope = {
      schema: 'corpflow.automation.envelope.v1',
      id: row.id,
      occurred_at: row.occurredAt?.toISOString?.() || new Date().toISOString(),
      tenant_id: tenantId,
      tenant_scope: tenantScope,
      event_type: eventType,
      correlation_id: correlationId || null,
      risk_tier: riskTier,
      payload,
    };
    await forwardEnvelope(envelope);

    return res.status(200).json({
      ok: true,
      id: row.id,
      occurred_at: row.occurredAt,
      tenant_scope: row.tenantScope,
      event_type: row.eventType,
      risk_tier: row.riskTier,
      status: row.status,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (String(msg).includes('Unique constraint') || String(msg).includes('unique constraint')) {
      if (idempotencyKey) {
        const existing = await prisma.automationEvent.findUnique({
          where: {
            automation_events_scope_idem: { tenantScope, idempotencyKey },
          },
          select: { id: true, status: true, occurredAt: true },
        });
        if (existing) {
          return res.status(200).json({
            ok: true,
            deduped: true,
            id: existing.id,
            status: existing.status,
            occurred_at: existing.occurredAt?.toISOString?.() || null,
          });
        }
      }
    }
    return res.status(500).json({ error: 'AUTOMATION_INGEST_FAILED', detail: msg });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

/**
 * GET /api/automation/playbooks — factory master only.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleAutomationPlaybooksList(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }

  const q = req.query || {};
  const scopeRaw = Array.isArray(q.tenant_scope) ? q.tenant_scope[0] : q.tenant_scope;
  const searchRaw = Array.isArray(q.q) ? q.q[0] : q.q;
  const tenantScope = scopeRaw != null ? str(scopeRaw) : '';
  const search = searchRaw != null ? str(searchRaw).toLowerCase() : '';

  const prisma = new PrismaClient();
  try {
    const where = tenantScope
      ? { tenantScope }
      : {};
    const rows = await prisma.automationPlaybook.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        tenantScope: true,
        slug: true,
        title: true,
        bodyMd: true,
        tags: true,
        updatedAt: true,
      },
    });
    const filtered = search
      ? rows.filter(
          (r) =>
            r.slug.toLowerCase().includes(search) ||
            r.title.toLowerCase().includes(search) ||
            r.bodyMd.toLowerCase().includes(search),
        )
      : rows;
    return res.status(200).json({ ok: true, count: filtered.length, playbooks: filtered });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'AUTOMATION_PLAYBOOKS_FAILED', detail: msg });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
