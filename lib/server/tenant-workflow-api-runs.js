/**
 * GET /api/factory/tenant-workflows/runs — factory master list (read-only).
 */

import { PrismaClient } from '@prisma/client';

import { verifyFactoryMasterAuth } from './factory-master-auth.js';

const defaultPrisma = new PrismaClient();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @returns {Promise<void>}
 */
export async function handleTenantWorkflowRunsList(req, res, prisma = defaultPrisma) {
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

  const status = pickQuery(q, 'status');
  const workflowKey = pickQuery(q, 'workflow_key');
  const limitRaw = pickQuery(q, 'limit');
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(limitRaw || DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));

  /** @type {Record<string, unknown>} */
  const where = { tenantId };
  if (status) where.status = status;
  if (workflowKey) where.workflowKey = workflowKey;

  try {
    const rows = await prisma.workflowRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        tenantId: true,
        workflowKey: true,
        workflowVersion: true,
        sourceEventId: true,
        sourceEventType: true,
        sourceThreadId: true,
        idempotencyKey: true,
        status: true,
        currentStepKey: true,
        contextJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.status(200).json({ ok: true, count: rows.length, runs: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: 'workflow_runs_list_failed', detail: msg });
  }
}
