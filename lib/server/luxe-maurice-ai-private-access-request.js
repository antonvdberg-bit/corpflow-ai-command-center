/**
 * LuxeMaurice AI v2 — server-side private access request persistence.
 *
 * Route: POST /api/lux/luxe-maurice-ai/private-access-request
 *
 * Writes to existing CorpFlow `leads` table (tenant_id = luxe-maurice).
 * No new schema. No external send. No client-supplied tenant override.
 */

import { defaultLuxOperatorWorkflow } from '../cmp/_lib/lux-lead-operator-workflow.js';
import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { getSessionFromRequest } from './session.js';
import {
  buildLivePrivateAccessConfirmation,
  buildPrivateAccessLeadCreateInput,
  buildPrivateAccessLeadListWhere,
  LUXE_MAURICE_AI_TENANT_SLUG,
  mapLeadRowToAdvisorPipelineItem,
  resolveLuxeMauriceAccessRequestTenant,
  validatePrivateAccessRequestBody,
} from '../luxe-maurice-ai/private-access-request.js';

/**
 * LuxeMaurice advisor pipeline list — tenant session required on Lux host.
 * @param {import('http').IncomingMessage & { corpflowContext?: Record<string, unknown> }} req
 * @returns {{ ok: true, tenantId: string } | { ok: false, status: number, error: string, hint?: string }}
 */
export function resolveLuxeMauriceAdvisorPipelineSession(req) {
  const tenantGate = resolveLuxeMauriceAccessRequestTenant(req);
  if (!tenantGate.ok) return tenantGate;

  const sess = getSessionFromRequest(req);
  if (!(sess?.ok === true && sess.payload?.typ === 'tenant')) {
    return {
      ok: false,
      status: 403,
      error: 'LUX_ADVISOR_PIPELINE_SESSION_REQUIRED',
      hint: 'Sign in to LuxeMaurice to view private access requests in the advisor workspace.',
    };
  }

  const sessionTenant = String(sess.payload.tenant_id || '').trim();
  const actingTenant =
    sess.payload.acting_tenant_id != null ? String(sess.payload.acting_tenant_id).trim() : sessionTenant;
  const effectiveTenant = actingTenant || sessionTenant;

  if (effectiveTenant !== LUXE_MAURICE_AI_TENANT_SLUG) {
    return {
      ok: false,
      status: 403,
      error: 'LUX_ADVISOR_PIPELINE_SESSION_REQUIRED',
      hint: 'LuxeMaurice tenant session required for the advisor workspace.',
    };
  }

  return { ok: true, tenantId: tenantGate.tenantId };
}

/**
 * @param {import('http').IncomingMessage & { body?: unknown, corpflowContext?: Record<string, unknown> }} req
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function handleLuxeMauriceAiPrivateAccessRequest(req, res, prisma) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const tenantGate = resolveLuxeMauriceAccessRequestTenant(req);
  if (!tenantGate.ok) {
    return res.status(tenantGate.status).json({ ok: false, error: tenantGate.error });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
    }
  }

  const validated = validatePrivateAccessRequestBody(body);
  if (!validated.ok) {
    return res.status(400).json({
      ok: false,
      error: validated.error,
      field: validated.field || null,
    });
  }

  const nowIso = new Date().toISOString();
  const workflow = defaultLuxOperatorWorkflow(nowIso);
  workflow.activity = [
    {
      at: nowIso,
      actor_label: 'luxe_maurice_ai',
      kind: 'lead_created',
      detail: { channel: 'private_access_request' },
    },
  ];

  const createInput = buildPrivateAccessLeadCreateInput(
    validated.data,
    tenantGate.tenantId,
    nowIso,
    workflow,
  );

  try {
    const lead = await prisma.lead.create({
      data: createInput,
      select: { id: true, createdAt: true, status: true },
    });

    const confirmation = buildLivePrivateAccessConfirmation(lead, validated.data);

    void recordTrustedAutomationEvent(prisma, {
      tenantId: tenantGate.tenantId,
      eventType: 'lux.private_access_request.created',
      correlationId: lead.id,
      idempotencyKey: `lux.private_access_request.created:${lead.id}`,
      source: 'api/lux/luxe-maurice-ai/private-access-request',
      payload: {
        lead_id: lead.id,
        reference_id: confirmation.reference_id,
        access_category: validated.data.access_category || null,
      },
    });

    return res.status(200).json(confirmation);
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: 'PRIVATE_ACCESS_REQUEST_PERSIST_FAILED',
    });
  }
}

/**
 * List persisted LuxeMaurice private access requests for the advisor pipeline.
 *
 * Route: GET /api/lux/luxe-maurice-ai/private-access-requests
 *
 * @param {import('http').IncomingMessage & { query?: Record<string, unknown>, corpflowContext?: Record<string, unknown> }} req
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function handleLuxeMauriceAiPrivateAccessRequestsList(req, res, prisma) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const sessionGate = resolveLuxeMauriceAdvisorPipelineSession(req);
  if (!sessionGate.ok) {
    return res.status(sessionGate.status).json({
      ok: false,
      error: sessionGate.error,
      hint: sessionGate.hint || null,
    });
  }

  const lim = Number(req.query?.limit || 50);
  const take = Number.isFinite(lim) ? Math.max(1, Math.min(100, Math.trunc(lim))) : 50;

  try {
    const rows = await prisma.lead.findMany({
      where: buildPrivateAccessLeadListWhere(sessionGate.tenantId),
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        listing: true,
        intent: true,
        qualificationJson: true,
        createdAt: true,
      },
    });

    const requests = rows
      .map((row) => mapLeadRowToAdvisorPipelineItem(row))
      .filter((item) => item != null);

    return res.status(200).json({
      ok: true,
      tenant_id: sessionGate.tenantId,
      count: requests.length,
      requests,
    });
  } catch {
    return res.status(500).json({
      ok: false,
      error: 'PRIVATE_ACCESS_REQUESTS_LIST_FAILED',
    });
  }
}
