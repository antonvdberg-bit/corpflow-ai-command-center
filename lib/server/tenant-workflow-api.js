/**
 * Factory API — tenant workflow operator list + step status updates.
 *
 * GET  /api/factory/tenant-workflows/steps
 * PATCH /api/factory/tenant-workflows/step-update
 */

import { PrismaClient } from '@prisma/client';

import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import {
  loadTenantWorkflowStepsForOperator,
  patchTenantWorkflowStepStatus,
} from './tenant-workflow/operator.js';

const defaultPrisma = new PrismaClient();

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * @param {Record<string, unknown>} query
 * @param {string} key
 * @returns {string}
 */
function pickQuery(query, key) {
  const v = query?.[key];
  if (Array.isArray(v)) return v[0] != null ? String(v[0]).trim() : '';
  return v != null ? String(v).trim() : '';
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Record<string, unknown> | null}
 */
function parseJsonBody(req) {
  const body = req.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return /** @type {Record<string, unknown>} */ (body);
  }
  return null;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @returns {Promise<void>}
 */
export async function handleTenantWorkflowStepsList(req, res, prisma = defaultPrisma) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ ok: false, error: 'factory_master_required' });
  }

  const q = req.query || {};
  const tenantId = pickQuery(q, 'tenant_id');
  if (!tenantId) {
    return res.status(400).json({ ok: false, error: 'tenant_id_required' });
  }

  const status = pickQuery(q, 'status') || 'open';
  const workflowKey = pickQuery(q, 'workflow_key');
  const limitRaw = pickQuery(q, 'limit');
  const limit = parseInt(String(limitRaw || '50'), 10) || 50;

  const out = await loadTenantWorkflowStepsForOperator(prisma, {
    tenantId,
    status,
    workflowKey: workflowKey || undefined,
    limit,
  });

  if (!out.ok) {
    return res.status(500).json(out);
  }
  return res.status(200).json({ ok: true, count: out.count, steps: out.steps });
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @returns {Promise<void>}
 */
export async function handleTenantWorkflowStepUpdate(req, res, prisma = defaultPrisma) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ ok: false, error: 'factory_master_required' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ ok: false, error: 'json_body_required' });
  }

  const tenantId = str(body.tenant_id);
  const stepId = str(body.step_id);
  const status = str(body.status);

  const out = await patchTenantWorkflowStepStatus(prisma, { tenantId, stepId, status });
  if (!out.ok) {
    return res.status(out.http_status || 500).json(out);
  }
  return res.status(200).json(out);
}

// Re-export runs list from prior module for factory_router compatibility
export { handleTenantWorkflowRunsList } from './tenant-workflow-api-runs.js';
