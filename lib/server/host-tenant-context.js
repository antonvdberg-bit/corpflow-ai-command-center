/**
 * Derives request tenancy from Host headers (sync, no I/O).
 *
 * **CORE vs tenant (explicit boundary):**
 * - Hostnames listed in `CORPFLOW_CORE_HOSTS` are factory/ops surfaces. They MUST NOT
 *   derive a client `tenant_id` from the subdomain (e.g. `core` → avoids tenant `core`).
 * - All other hosts resolve tenants via optional `CORPFLOW_TENANT_HOST_MAP`, then
 *   `{slug}.CORPFLOW_ROOT_DOMAIN`, then apex + `CORPFLOW_DEFAULT_TENANT_ID`.
 */

import { cfg } from './runtime-config.js';

/**
 * @typedef {'core' | 'tenant'} CorpflowSurface
 * @typedef {{ host: string, surface: CorpflowSurface, tenant_id: string | null, host_slug: string | null }} CorpflowHostContext
 */

/**
 * Parse comma-separated host list from env (lowercased, no port).
 *
 * @param {string} raw
 * @returns {string[]}
 */
function parseHostList(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/:\d+$/, ''))
    .filter(Boolean);
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {CorpflowHostContext}
 */
export function buildCorpflowHostContext(req) {
  const raw = (req.headers['x-forwarded-host'] || req.headers.host || '').toString()
    .split(',')[0]
    .trim()
    .toLowerCase();
  const host = raw.replace(/:\d+$/, '');
  const rootDomain = cfg('CORPFLOW_ROOT_DOMAIN', 'corpflowai.com')
    .toLowerCase()
    .replace(/^\./, '');

  /** @type {CorpflowHostContext} */
  const ctx = {
    host,
    surface: 'tenant',
    tenant_id: null,
    host_slug: null,
  };

  if (!host) {
    return ctx;
  }

  const coreHosts = parseHostList(cfg('CORPFLOW_CORE_HOSTS', ''));
  if (coreHosts.length > 0 && coreHosts.includes(host)) {
    ctx.surface = 'core';
    ctx.tenant_id = null;
    ctx.host_slug = 'core';
    return ctx;
  }

  const mapJson = cfg('CORPFLOW_TENANT_HOST_MAP', '');
  if (mapJson) {
    try {
      const m = JSON.parse(mapJson);
      if (m && typeof m === 'object' && typeof m[host] === 'string' && m[host].trim() !== '') {
        ctx.tenant_id = m[host].trim();
        ctx.host_slug = ctx.tenant_id;
        return ctx;
      }
    } catch (_) {
      /* ignore invalid map */
    }
  }

  if (host.endsWith(`.${rootDomain}`)) {
    const sub = host.slice(0, -(rootDomain.length + 1));
    if (sub && !sub.includes('.')) {
      ctx.host_slug = sub;
      const prefix = cfg('CORPFLOW_TENANT_SLUG_PREFIX', '');
      ctx.tenant_id = `${prefix}${sub}`;
    }
    return ctx;
  }

  if (host === rootDomain) {
    ctx.host_slug = 'apex';
    ctx.tenant_id = (cfg('CORPFLOW_DEFAULT_TENANT_ID', 'root') || 'root').toString();
  }

  return ctx;
}
