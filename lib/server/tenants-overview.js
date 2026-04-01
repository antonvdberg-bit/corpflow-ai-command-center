/**
 * GET factory/tenants-overview — Postgres `tenants` table (factory auth only).
 */

import { PrismaClient } from '@prisma/client';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { emitLogicFailure } from '../cmp/_lib/telemetry.js';
import { cfg } from './runtime-config.js';

const prisma = new PrismaClient();

/**
 * @returns {Record<string, string>} tenant_id -> fqdn
 */
function buildTenantIdToHostMap() {
  const raw = process.env.CORPFLOW_TENANT_HOST_MAP || '{}';
  try {
    const m = JSON.parse(raw);
    if (!m || typeof m !== 'object') return {};
    /** @type {Record<string, string>} */
    const rev = {};
    for (const [host, tid] of Object.entries(m)) {
      if (typeof tid === 'string' && tid.trim() !== '' && typeof host === 'string') {
        rev[tid.trim()] = host.trim().toLowerCase();
      }
    }
    return rev;
  } catch {
    return {};
  }
}

/**
 * @param {string} tenantId
 * @returns {string}
 */
function slugFromTenantId(tenantId) {
  const prefix = (process.env.CORPFLOW_TENANT_SLUG_PREFIX || '').toString();
  const tid = String(tenantId);
  if (prefix && tid.startsWith(prefix)) return tid.slice(prefix.length);
  return tid;
}

/**
 * @param {string} tenantId
 * @param {Record<string, string>} idToHost
 * @returns {string}
 */
function deriveFqdn(tenantId, idToHost) {
  const tid = String(tenantId).trim();
  if (idToHost[tid]) return idToHost[tid];
  const root = (process.env.CORPFLOW_ROOT_DOMAIN || 'corpflowai.com').toLowerCase().replace(/^\./, '');
  return `${slugFromTenantId(tid)}.${root}`;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export default async function tenantsOverviewHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }

  const backend = String(cfg('CORPFLOW_TENANTS_BACKEND', 'postgres')).trim().toLowerCase();
  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (backend !== 'postgres' || !pgUrl) {
    return res.status(503).json({
      error: 'TENANTS_OVERVIEW_POSTGRES_REQUIRED',
      hint: 'Set CORPFLOW_TENANTS_BACKEND=postgres and POSTGRES_URL.',
    });
  }

  try {
    const rows = await prisma.tenant.findMany({ take: 500, orderBy: { updatedAt: 'desc' } });
    const idToHost = buildTenantIdToHostMap();
    const tenants = rows.map((t) => {
      const life = String(t.lifecycle || '').toLowerCase();
      const st = String(t.tenantStatus || '').toLowerCase();
      let status = 'Build';
      if (t.executionOnly) status = 'Execution-Only';
      else if (life.includes('publish') || st.includes('publish') || st === 'published') status = 'Published';
      else if (life.includes('build') || st.includes('build')) status = 'Build';

      return {
        row_id: t.id,
        tenant_id: t.tenantId,
        host_slug: slugFromTenantId(t.tenantId),
        fqdn: t.fqdn || deriveFqdn(t.tenantId, idToHost),
        status,
        sovereign_key: t.sovereignPinHash ? 'hashed' : 'missing',
      };
    });
    return res.status(200).json({ ok: true, tenants, count: tenants.length, source: 'postgres' });
  } catch (e) {
    emitLogicFailure({
      source: 'api/factory/tenants-overview',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'tenants-overview' },
    });
    return res.status(500).json({ error: 'tenants-overview failed', detail: String(e?.message || e) });
  }
}
