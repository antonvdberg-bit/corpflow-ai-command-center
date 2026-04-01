/**
 * Single Vercel serverless entry for /api/* (Hobby 12-function cap).
 * Routes via `__path` from vercel.json rewrite, or from URL path after /api/.
 */
import '../lib/server/suppress-node-deprecations.js';
import { PrismaClient } from '@prisma/client';

import adminLeadsHandler from '../lib/server/admin-leads.js';
import auditHandler from '../lib/server/audit.js';
import billingSentinelHandler from '../lib/server/billing-sentinel.js';
import cmpHandler from '../lib/cmp/router.js';
import feedbackHandler from '../lib/server/feedback.js';
import legalSearchHandler from '../lib/server/legal-search.js';
import mainHandler from '../lib/server/main.js';
import provisionHandler from '../lib/server/provision.js';
import webhookHandler from '../lib/server/webhook.js';
import tenantsOverviewHandler from '../lib/server/tenants-overview.js';
import postgresFactorySchemaHandler from '../lib/server/postgres-factory-schema.js';
import tenantHostMapUpsertHandler from '../lib/server/tenant-host-map.js';
import {
  handleAuthLogin,
  handleAuthLogout,
  handleAuthMe,
  handleAuthPasswordResetConfirm,
  handleAuthPasswordResetRequest,
} from '../lib/server/auth.js';
import { buildCorpflowHostContext } from '../lib/server/host-tenant-context.js';
import { cfg, runtimeConfigDiagnostics } from '../lib/server/runtime-config.js';
import { getSessionFromRequest } from '../lib/server/session.js';

const prisma = new PrismaClient();

function firstQuery(query, key) {
  if (!query || typeof query !== 'object') return undefined;
  const v = query[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function normalizeRoutingPath(req) {
  let pathSeg = firstQuery(req.query, '__path');
  if (pathSeg != null && String(pathSeg).trim() !== '') {
    return String(pathSeg).replace(/^\/+/, '').replace(/\/+$/, '');
  }
  try {
    const raw = req.url || '/';
    const u = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://localhost');
    return u.pathname.replace(/^\/api\//, '').replace(/\/$/, '') || '';
  } catch (_) {
    return '';
  }
}

/**
 * Sync tenant hint from Host (no I/O). Sets req.corpflowContext for downstream handlers (e.g. CMP).
 *
 * **Surface rules:** `surface: "core"` = factory ops host (no client tenant derived from subdomain).
 * See `lib/server/host-tenant-context.js`.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {void}
 */
function attachTenantFromHost(req) {
  req.corpflowContext = buildCorpflowHostContext(req);
}

async function attachTenantFromHostPg(req) {
  // Start with the sync, no-I/O resolver.
  attachTenantFromHost(req);

  const ctx = req.corpflowContext;
  if (!ctx || ctx.surface !== 'tenant' || !ctx.host) return;

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return;

  try {
    const row = await prisma.tenantHostname.findUnique({
      where: { host: String(ctx.host).toLowerCase() },
      select: { tenantId: true, mode: true, enabled: true },
    });
    if (!row || row.enabled !== true) return;
    const tenantId = String(row.tenantId || '').trim();
    if (!tenantId) return;

    req.corpflowContext = {
      ...ctx,
      surface: 'tenant',
      tenant_id: tenantId,
      host_slug: tenantId,
    };
    // Provide mode hint to UI context.
    req.corpflowUiMode = row.mode ? String(row.mode).trim().toLowerCase() : null;
  } catch (_) {
    // best-effort only
  }
}

/**
 * After vercel rewrite, pathname is /api/factory_router; CMP router expects
 * `action` in query or legacy pathname segments — set action from __path when needed.
 *
 * @param {import('http').IncomingMessage} req
 * @param {string} pathSeg
 * @returns {void}
 */
function prepareCmpRequest(req, pathSeg) {
  const q = { ...(req.query || {}) };
  delete q.__path;
  const cmpRest = pathSeg.replace(/^cmp\/?/, '');
  if (cmpRest && cmpRest !== 'router') {
    const hasAction = q.action != null && String(q.action).trim() !== '';
    if (!hasAction) {
      const parts = cmpRest.split('/').filter(Boolean);
      q.action = parts[parts.length - 1] || '';
    }
  }
  req.query = q;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function handleHealth(req, res) {
  return res.status(200).json({ status: 'operational', model: 'llama-3.3-70b-versatile' });
}

/**
 * Factory health: report required env presence (no secret values).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function handleFactoryHealth(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const runtime_config = runtimeConfigDiagnostics();
  const coreRaw = cfg('CORPFLOW_CORE_HOSTS', '').trim();
  const coreHostCount = coreRaw
    ? coreRaw.split(',').map((s) => s.trim()).filter(Boolean).length
    : 0;

  const required = {
    sovereign: ['MASTER_ADMIN_KEY', 'SOVEREIGN_SESSION_SECRET'],
    database: ['POSTGRES_URL'],
  };

  const flat = Array.from(
    new Set(Object.values(required).flat().map((k) => String(k))),
  );

  /** @type {Record<string, boolean>} */
  const present = {};
  for (const k of flat) {
    const v = cfg(k, '');
    present[k] = v != null && String(v).trim() !== '';
  }

  const ok = flat.every((k) => present[k] === true);

  return res.status(ok ? 200 : 503).json({
    ok,
    required_env: required,
    runtime_config,
    tenancy_boundary: {
      core_hosts_configured: coreHostCount > 0,
      core_host_count: coreHostCount,
      default_apex_tenant_id: cfg('CORPFLOW_DEFAULT_TENANT_ID', 'root'),
      tenant_host_map_configured: Boolean(cfg('CORPFLOW_TENANT_HOST_MAP', '').trim()),
      root_domain: cfg('CORPFLOW_ROOT_DOMAIN', 'corpflowai.com'),
    },
    present,
    hint: ok
      ? 'All required env vars present.'
      : runtime_config.present && !runtime_config.parse_ok
        ? 'CORPFLOW_RUNTIME_CONFIG_JSON is present but invalid JSON. See runtime_config.parse_error; use strict JSON (no trailing commas, double quotes only).'
        : 'Set missing env vars in Vercel Environment Variables.',
  });
}

/**
 * Groq chat — parity with former `api/index.py` FastAPI route.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function handleChat(req, res) {
  const message = firstQuery(req.query, 'message');
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return res.status(200).json({ response: 'API Key missing. Please set GROQ_API_KEY in Vercel.' });
  }
  if (!message || String(message).trim() === '') {
    return res.status(400).json({ error: 'Missing query parameter: message' });
  }
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'You are the Serenity Wellness Concierge. You are professional, empathetic, and luxury-focused. You assist clients in Mauritius with beauty and wellness inquiries.',
          },
          { role: 'user', content: String(message) },
        ],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const errText =
        data?.error?.message || data?.message || `groq_http_${r.status}`;
      return res.status(200).json({ response: `System error: ${errText}` });
    }
    const text = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ response: text });
  } catch (e) {
    return res.status(200).json({ response: `System error: ${String(e?.message || e)}` });
  }
}

/**
 * Dashboard stats for `results.html` (legacy path; uses Prisma when available).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function handleStats(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const rows = leads.map((lead) => ({
      name: lead.name || lead.email || 'Lead',
      status: lead.status || 'NEW',
    }));
    return res.status(200).json({ count: rows.length, leads: rows });
  } catch (e) {
    return res.status(500).json({ error: 'STATS_FAILED', details: String(e?.message || e) });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

function resolveUiMode(host, surface) {
  // Prefer DB-provided ui mode if present.
  // Note: attachTenantFromHostPg sets req.corpflowUiMode.
  const mapRaw = String(cfg('CORPFLOW_HOST_MODE_MAP', '')).trim();
  if (mapRaw) {
    try {
      const m = JSON.parse(mapRaw);
      if (m && typeof m === 'object') {
        const v = m[String(host || '').toLowerCase()];
        if (typeof v === 'string' && v.trim() !== '') return v.trim().toLowerCase();
      }
    } catch (_) {
      // ignore invalid JSON
    }
  }
  if (surface === 'core') return 'core';
  return 'client';
}

async function handleUiContext(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const ctx = req.corpflowContext || buildCorpflowHostContext(req);
  const sess = getSessionFromRequest(req);
  const session = sess?.ok
    ? {
        logged_in: true,
        level: sess.payload?.typ || 'unknown',
        tenant_id: sess.payload?.tenant_id != null ? String(sess.payload.tenant_id) : null,
      }
    : { logged_in: false, level: 'anonymous', tenant_id: null };

  const mode =
    req.corpflowUiMode ||
    resolveUiMode(ctx.host, ctx.surface);
  const rootDomain = String(cfg('CORPFLOW_ROOT_DOMAIN', '')).trim();
  const suggestedTenantConsoleUrl =
    ctx.surface === 'core' && rootDomain ? `https://${rootDomain}/change` : null;
  return res.status(200).json({
    ok: true,
    host: ctx.host,
    surface: ctx.surface,
    tenant_id: ctx.tenant_id,
    mode,
    session,
    root_domain: rootDomain || null,
    suggested_tenant_console_url: suggestedTenantConsoleUrl,
  });
}

export default async function handler(req, res) {
  const pathSeg = normalizeRoutingPath(req);
  await attachTenantFromHostPg(req);

  if (!pathSeg || pathSeg === 'factory_router') {
    return res.status(200).json({ ok: true, service: 'factory_router' });
  }

  if (pathSeg === 'health') {
    return handleHealth(req, res);
  }
  if (pathSeg === 'factory/health') {
    return handleFactoryHealth(req, res);
  }
  if (pathSeg === 'chat') {
    return handleChat(req, res);
  }
  if (pathSeg === 'stats') {
    return handleStats(req, res);
  }
  if (pathSeg === 'ui/context') {
    return handleUiContext(req, res);
  }

  if (pathSeg.startsWith('cmp') || pathSeg.startsWith('cmp/')) {
    prepareCmpRequest(req, pathSeg);
    return cmpHandler(req, res);
  }

  if (pathSeg === 'factory/tenants-overview') {
    return tenantsOverviewHandler(req, res);
  }
  if (pathSeg === 'factory/postgres/ensure-schema') {
    return postgresFactorySchemaHandler(req, res);
  }
  if (pathSeg === 'factory/host-map/upsert') {
    return tenantHostMapUpsertHandler(req, res);
  }

  switch (pathSeg) {
    case 'auth/login':
      return handleAuthLogin(req, res);
    case 'auth/password-reset/request':
      return handleAuthPasswordResetRequest(req, res);
    case 'auth/password-reset/confirm':
      return handleAuthPasswordResetConfirm(req, res);
    case 'auth/me':
      return handleAuthMe(req, res);
    case 'auth/logout':
      return handleAuthLogout(req, res);
    case 'main':
      return mainHandler(req, res);
    case 'intake':
      return mainHandler(req, res);
    case 'audit':
      return auditHandler(req, res);
    case 'feedback':
      return feedbackHandler(req, res);
    case 'admin-leads':
      return adminLeadsHandler(req, res);
    case 'legal-search':
      return legalSearchHandler(req, res);
    case 'provision':
      return provisionHandler(req, res);
    case 'webhook':
      return webhookHandler(req, res);
    case 'cron/billing-sentinel':
      return billingSentinelHandler(req, res);
    default:
      return res.status(404).json({ error: 'Unknown route', path: pathSeg });
  }
}
