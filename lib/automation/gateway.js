/**
 * Automation gateway: single ingest + playbook surface for agents and webhooks.
 */

import { PrismaClient } from '@prisma/client';

import { timingSafeStringEquals, verifyFactoryMasterAuth } from '../server/factory-master-auth.js';
import { cfg } from '../server/runtime-config.js';
import { executeTenantBootstrap } from '../server/tenant-onboarding-bootstrap.js';
import { emitTelemetry } from '../cmp/_lib/telemetry.js';
import { forwardAutomationEnvelope } from './forward.js';
import { classifyEventRisk, tierRequiresApprovalSecret } from './risk.js';
import { resolveTenantScope } from './scope.js';

export { resolveTenantScope };

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
  let payloadForStore = b.payload != null && typeof b.payload === 'object' ? b.payload : {};

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

    let tenantIdForRow = tenantId;
    let tenantScopeForRow = tenantScope;
    /** @type {Record<string, unknown> | null} */
    let bootstrapResponseExtra = null;

    if (eventType === 'tenant.bootstrap.execute') {
      const enabled = String(cfg('CORPFLOW_AUTOMATION_TENANT_BOOTSTRAP', '')).toLowerCase() === 'true';
      if (!enabled) {
        return res.status(403).json({
          error: 'TENANT_BOOTSTRAP_INGEST_DISABLED',
          hint: 'Set CORPFLOW_AUTOMATION_TENANT_BOOTSTRAP=true to allow tenant.bootstrap.execute via ingest.',
        });
      }
      const inner = { ...(/** @type {Record<string, unknown>} */ (payloadForStore)) };
      if (!str(inner.tenant_id || inner.tenantId) && tenantIdRaw) {
        inner.tenant_id = tenantIdRaw;
      }
      const bootstrapResult = await executeTenantBootstrap(prisma, inner, {
        emitAutomationMirror: false,
        ingestSource: true,
      });
      if (bootstrapResult.ok === false) {
        return res.status(bootstrapResult.error === 'POSTGRES_URL_MISSING' ? 503 : 400).json({
          error: 'TENANT_BOOTSTRAP_FAILED',
          ...bootstrapResult,
        });
      }
      const tidFromResult = str(
        (/** @type {{ tenant?: { tenant_id?: string } }} */ (bootstrapResult)).tenant?.tenant_id || '',
      );
      tenantIdForRow = tidFromResult || tenantId;
      tenantScopeForRow = resolveTenantScope(tenantIdForRow || '');
      payloadForStore = {
        bootstrap: {
          tenant_id: tenantIdForRow,
          hostnames: bootstrapResult.hostnames,
          pin_issued: Boolean(bootstrapResult.pin_print_once),
          password_issued: Boolean(bootstrapResult.password_print_once),
          primary_username: bootstrapResult.primary_username ?? null,
          leads_marked: bootstrapResult.leads_marked ?? 0,
        },
      };
      bootstrapResponseExtra = {
        tenant: bootstrapResult.tenant,
        hostnames: bootstrapResult.hostnames,
        leads_marked: bootstrapResult.leads_marked,
        pin_print_once: bootstrapResult.pin_print_once,
        password_print_once: bootstrapResult.password_print_once,
        pin_warning: bootstrapResult.pin_warning,
        password_warning: bootstrapResult.password_warning,
        primary_username: bootstrapResult.primary_username,
      };
    }

    if (eventType === 'automation.playbook.upsert') {
      const slug = str((/** @type {Record<string, unknown>} */ (payloadForStore)).slug);
      const title = str((/** @type {Record<string, unknown>} */ (payloadForStore)).title);
      const bodyMd = str((/** @type {Record<string, unknown>} */ (payloadForStore)).body_md);
      const tags = (/** @type {Record<string, unknown>} */ (payloadForStore)).tags;
      if (!slug || !title) {
        return res.status(400).json({ error: 'playbook upsert requires payload.slug and payload.title' });
      }
      await prisma.automationPlaybook.upsert({
        where: {
          tenantScope_slug: { tenantScope: tenantScopeForRow, slug },
        },
        create: {
          tenantScope: tenantScopeForRow,
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
        tenantId: tenantIdForRow,
        tenantScope: tenantScopeForRow,
        source: source || 'ingest',
        eventType,
        correlationId: correlationId || null,
        idempotencyKey: idempotencyKey || null,
        riskTier,
        status: 'accepted',
        payload: payloadForStore,
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
      tenant_id: tenantIdForRow,
      tenant_scope: tenantScopeForRow,
      event_type: eventType,
      correlation_id: correlationId || null,
      risk_tier: riskTier,
      source: source || 'ingest',
      payload: payloadForStore,
    };
    await forwardAutomationEnvelope(envelope);

    /** @type {Record<string, unknown>} */
    const ingestOut = {
      ok: true,
      id: row.id,
      occurred_at: row.occurredAt,
      tenant_scope: row.tenantScope,
      event_type: row.eventType,
      risk_tier: row.riskTier,
      status: row.status,
    };
    if (bootstrapResponseExtra) {
      ingestOut.bootstrap = bootstrapResponseExtra;
    }
    return res.status(200).json(ingestOut);
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

/**
 * GET /api/automation/events — factory master only (operator / agent tail).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleAutomationEventsList(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }

  const q = req.query || {};
  const scopeRaw = Array.isArray(q.tenant_scope) ? q.tenant_scope[0] : q.tenant_scope;
  const limitRaw = Array.isArray(q.limit) ? q.limit[0] : q.limit;
  const tenantScope = scopeRaw != null ? str(scopeRaw) : '';
  const limit = Math.min(200, Math.max(1, parseInt(String(limitRaw || '50'), 10) || 50));

  const prisma = new PrismaClient();
  try {
    const where = tenantScope ? { tenantScope } : {};
    const rows = await prisma.automationEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit,
      select: {
        id: true,
        occurredAt: true,
        tenantId: true,
        tenantScope: true,
        source: true,
        eventType: true,
        correlationId: true,
        idempotencyKey: true,
        riskTier: true,
        status: true,
        payload: true,
      },
    });
    return res.status(200).json({ ok: true, count: rows.length, events: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'AUTOMATION_EVENTS_FAILED', detail: msg });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
