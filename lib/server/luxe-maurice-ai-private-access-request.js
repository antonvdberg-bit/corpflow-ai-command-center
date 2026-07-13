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
import {
  buildLivePrivateAccessConfirmation,
  buildPrivateAccessLeadCreateInput,
  resolveLuxeMauriceAccessRequestTenant,
  validatePrivateAccessRequestBody,
} from '../luxe-maurice-ai/private-access-request.js';

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
