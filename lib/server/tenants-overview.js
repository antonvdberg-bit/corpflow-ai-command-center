/**
 * GET factory/tenants-overview — Baserow tenant table for master console (factory auth only).
 */

import { listBaserowTableAllRows, BaserowError } from '../cmp/_lib/baserow.js';
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
 * @param {unknown} pinFieldValue
 * @returns {'hashed' | 'missing' | 'legacy_plain'}
 */
function sovereignKeyStatus(pinFieldValue) {
  const s = pinFieldValue != null ? String(pinFieldValue) : '';
  if (!s.trim()) return 'missing';
  if (s.startsWith('v1:')) return 'hashed';
  return 'legacy_plain';
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ lifecycleField: string, statusField: string, executionOnlyField: string }} fields
 * @returns {'Build' | 'Published' | 'Execution-Only'}
 */
function inferStatus(row, fields) {
  const execRaw = row[fields.executionOnlyField];
  const lifeRaw = row[fields.lifecycleField];
  const statusRaw = row[fields.statusField];

  if (
    execRaw === true ||
    String(execRaw).toLowerCase() === 'true' ||
    String(execRaw).toLowerCase() === 'yes' ||
    String(lifeRaw).toUpperCase().replace(/[-\s]/g, '_') === 'EXECUTION_ONLY' ||
    String(statusRaw).toUpperCase().replace(/[-\s]/g, '_') === 'EXECUTION_ONLY'
  ) {
    return 'Execution-Only';
  }

  const life = String(lifeRaw || '').toLowerCase();
  const st = String(statusRaw || '').toLowerCase();
  if (life.includes('publish') || st.includes('publish') || life === 'live_published' || st === 'published') {
    return 'Published';
  }
  if (life.includes('build') || st.includes('build')) {
    return 'Build';
  }
  return 'Build';
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
  if (backend === 'postgres' && pgUrl) {
    try {
      const rows = await prisma.tenant.findMany({ take: 500, orderBy: { updatedAt: 'desc' } });
      const idToHost = buildTenantIdToHostMap();
      const tenants = rows.map((t) => ({
        row_id: t.id,
        tenant_id: t.tenantId,
        host_slug: slugFromTenantId(t.tenantId),
        fqdn: t.fqdn || deriveFqdn(t.tenantId, idToHost),
        status: t.executionOnly ? 'Execution-Only' : String(t.lifecycle || '').toLowerCase().includes('publish') ? 'Published' : 'Build',
        sovereign_key: t.sovereignPinHash ? 'hashed' : 'missing',
      }));
      return res.status(200).json({ ok: true, tenants, count: tenants.length, source: 'postgres' });
    } catch (e) {
      return res.status(503).json({ error: 'POSTGRES_TENANTS_FAILED', detail: String(e?.message || e) });
    }
  }

  const tableId = (process.env.BASEROW_TENANT_TABLE_ID || '').toString().trim();
  if (!tableId) {
    return res.status(503).json({ error: 'BASEROW_TENANT_TABLE_ID is not configured' });
  }

  const tenantField = (process.env.BASEROW_TENANT_ID_FIELD || 'tenant_id').toString();
  const pinField = (process.env.BASEROW_TENANT_PIN_FIELD || 'sovereign_pin').toString();
  const lifecycleField = (process.env.BASEROW_TENANT_LIFECYCLE_FIELD || 'lifecycle').toString();
  const statusField = (process.env.BASEROW_TENANT_STATUS_FIELD || 'tenant_status').toString();
  const executionOnlyField = (process.env.BASEROW_TENANT_EXECUTION_ONLY_FIELD || 'execution_only').toString();

  try {
    const data = await listBaserowTableAllRows(tableId, { page: 1, size: 200 });
    const results = data?.results ?? data?.data ?? [];
    const idToHost = buildTenantIdToHostMap();

    /** @type {Array<Record<string, unknown>>} */
    const tenants = [];

    if (!Array.isArray(results)) {
      return res.status(200).json({ ok: true, tenants: [], count: 0 });
    }

    for (const row of results) {
      if (!row || typeof row !== 'object') continue;
      const tenantId = row[tenantField] != null ? String(row[tenantField]).trim() : '';
      if (!tenantId) continue;
      const rowId = row.id != null ? String(row.id) : '';
      const sk = sovereignKeyStatus(row[pinField]);

      tenants.push({
        row_id: rowId,
        tenant_id: tenantId,
        host_slug: slugFromTenantId(tenantId),
        fqdn: deriveFqdn(tenantId, idToHost),
        status: inferStatus(row, {
          lifecycleField,
          statusField,
          executionOnlyField,
        }),
        sovereign_key: sk,
      });
    }

    return res.status(200).json({ ok: true, tenants, count: tenants.length });
  } catch (e) {
    if (e instanceof BaserowError) {
      return res.status(e.status >= 400 && e.status < 600 ? e.status : 502).json({
        error: e.message,
        detail: e.body,
      });
    }
    emitLogicFailure({
      source: 'api/factory/tenants-overview',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'tenants-overview' },
    });
    return res.status(500).json({ error: 'tenants-overview failed', detail: String(e?.message || e) });
  }
}
