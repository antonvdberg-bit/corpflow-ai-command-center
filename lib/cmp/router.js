import {
  createBaserowClient,
  BaserowError,
  getBaserowRowGeneric,
  listBaserowTableAllRows,
  updateBaserowRowGeneric,
} from './_lib/baserow.js';
import { signSovereignSession, verifySovereignSessionToken, getSovereignSessionSecret } from './_lib/sovereign-session.js';
import { generateSecureTenantPin, hashPinForStorage, verifyPinAgainstStored } from './_lib/tenant-pin.js';
import { recordSovereignAuditEvent } from '../server/audit.js';
import { readTenantTelemetryTail } from '../server/tenant-telemetry-tail.js';
import { initialTicketPayload, getCmpFieldMap, approveBuildPayload } from './_lib/cmp-fields.js';
import { computeMarketValueCost } from './_lib/costing-engine.js';
import {
  buildImpactSummary,
  inferComplexityFromDescription,
  inferRiskFromDescription,
} from './_lib/preview-heuristics.js';
import { buildClarificationQuestions } from './_lib/ai-interview.js';
import {
  dispatchCmpSandboxStart,
  notifyCmpAutomationWebhook,
} from './_lib/github-dispatch.js';
import { emitLogicFailure } from './_lib/telemetry.js';
import { verifyRigorNode, verifyRigorBypassEthics } from './_lib/verify-rigor-node.js';
import { debitTokenCreditBalance, getTokenCreditBalance } from '../factory/costing.js';
import { getSessionFromRequest } from '../server/session.js';
import { PrismaClient } from '@prisma/client';
import { cfg } from '../server/runtime-config.js';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Vercel serverless functions run with `process.cwd()` at the repo root (`/var/task`).
// Avoid `import.meta.url` so this module can execute under CJS-wrapped runtimes.
const REPO_ROOT = path.resolve(process.cwd());
const SECRETS_MANIFEST_PATH = path.join(REPO_ROOT, 'vanguard', 'secrets-manifest.json');

const DORMANT_GATE_ENABLED =
  String(process.env.DORMANT_GATE_ENABLED || 'true').toLowerCase() === 'true';

function timingSafeEquals(a, b) {
  try {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch (_) {
    return false;
  }
}

function readJsonFileSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function getClientIdFromBody(body) {
  return (
    body?.client_id ||
    body?.clientId ||
    body?.tenant_id ||
    body?.tenantId ||
    null
  );
}

function getClientTier(clientId) {
  if (!clientId) return 'PERIODIC';
  const manifest = readJsonFileSafe(SECRETS_MANIFEST_PATH);
  const tenantAccess = manifest?.tenant_access?.[clientId];
  const tier = tenantAccess?.client_tier;
  if (tier === 'STATIC' || tier === 'PERIODIC' || tier === 'EVOLVING') return tier;
  return 'PERIODIC';
}

function getClusterEnabled(clientId, subUserId, clusterName) {
  if (!clientId || !subUserId) return false;
  // Prefer staff-matrix.json (if tenant provides it) to determine staff cluster membership.
  const staffMatrixPath1 = path.join(REPO_ROOT, 'tenants', clientId, 'config', 'staff-matrix.json');
  const staffMatrixPath2 = path.join(REPO_ROOT, 'tenants', clientId, 'config', 'staff_matrix.json');
  const staffMatrix =
    readJsonFileSafe(staffMatrixPath1) || readJsonFileSafe(staffMatrixPath2) || null;

  const fromMatrix = staffMatrix?.staff_members?.[subUserId]?.clusters_enabled;
  if (Array.isArray(fromMatrix)) {
    if (fromMatrix.includes(clusterName)) return true;
    // Back-compat: allow "Comms" <-> "Operations" when tenant uses different naming.
    if (clusterName === 'Comms' && fromMatrix.includes('Operations')) return true;
    if (clusterName === 'Operations' && fromMatrix.includes('Comms')) return true;
    return false;
  }

  // Backwards-compatible fallback to secrets-manifest access_clusters.
  const manifest = readJsonFileSafe(SECRETS_MANIFEST_PATH);
  const accessClusters = manifest?.tenant_access?.[clientId]?.access_clusters;
  const enabled = accessClusters?.sub_users?.[subUserId]?.clusters_enabled || [];
  return Array.isArray(enabled) && enabled.includes(clusterName);
}

function loadStaffMatrixForTenant(clientId) {
  const staffMatrixPath1 = path.join(REPO_ROOT, 'tenants', clientId, 'config', 'staff-matrix.json');
  const staffMatrixPath2 = path.join(REPO_ROOT, 'tenants', clientId, 'config', 'staff_matrix.json');
  return readJsonFileSafe(staffMatrixPath1) || readJsonFileSafe(staffMatrixPath2) || null;
}

function getAuthorizedRepWhatsAppNumbers(clientId) {
  const sm = loadStaffMatrixForTenant(clientId);
  const fromMatrix =
    sm?.authorized_representatives?.map((r) => r?.contact_details?.whatsapp_number).filter(Boolean) || [];
  const normalized = fromMatrix
    .map((n) => String(n).trim())
    .filter((n) => n !== '');
  return normalized;
}

function isAuthorizedRepresentative(clientId, staffId) {
  const sm = loadStaffMatrixForTenant(clientId);
  if (sm?.authorized_representatives && Array.isArray(sm.authorized_representatives)) {
    if (sm.authorized_representatives.some((r) => String(r?.staff_id || '') === String(staffId))) {
      return true;
    }
  }

  // Fallback: use secrets-manifest client_admins as "Authorized Representatives".
  const manifest = readJsonFileSafe(SECRETS_MANIFEST_PATH);
  const accessClusters = manifest?.tenant_access?.[clientId]?.access_clusters;
  const clientAdmins = accessClusters?.client_admins || [];
  return clientAdmins.includes(staffId);
}

function requiredClusterForAction(action) {
  if (action === 'evolution-request') return 'Financials';
  if (action === 'market-research') return 'Marketing';
  if (action === 'supplier-onboard') return 'Comms';
  return null;
}

function getSubUserId(req) {
  const headerVal =
    req?.headers?.get?.('x-subuser-id') ||
    req?.headers?.['x-subuser-id'] ||
    req?.query?.sub_user_id ||
    req?.body?.sub_user_id ||
    req?.body?.subUserId ||
    null;
  return headerVal ? String(headerVal) : null;
}

function requireDormantGate(req, res, action) {
  if (!DORMANT_GATE_ENABLED) return true;
  if (verifyDormantGateCredentials(req, action)) return true;

  emitLogicFailure({
    source: 'api/cmp/router.js:dormant-gate',
    severity: 'warning',
    error: new Error(`Dormant Gate blocked action=${action}`),
    cmp: { ticket_id: 'n/a', action },
    recommended_action:
      'Provide factory master token, or (if allowed for this action) a valid sovereign session JWT.',
  });

  return deny(res, 403, 'Dormant Gate: session token required.', { action });
}

/**
 * Factory master only (tenant sovereign JWT must not provision PINs).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} action
 * @returns {true | import('http').ServerResponse}
 */
function requireFactoryMasterOnly(req, res, action) {
  if (!DORMANT_GATE_ENABLED) return true;
  if (verifyFactoryMasterToken(req)) return true;

  emitLogicFailure({
    source: 'api/cmp/router.js:factory-master-only',
    severity: 'warning',
    error: new Error(`Factory master required for action=${action}`),
    cmp: { ticket_id: 'n/a', action },
    recommended_action: 'Provide MASTER_ADMIN_KEY or ADMIN_PIN via token / x-session-token.',
  });

  return deny(res, 403, 'Factory master token required.', { action });
}

function redactPotentialSecrets(input) {
  const redactKeys = ['token', 'api_key', 'apikey', 'secret', 'auth_token', 'access_token', 'password'];

  if (input == null) return input;
  if (typeof input !== 'object') return input;

  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        const lk = String(k).toLowerCase();
        if (redactKeys.includes(lk) || lk.endsWith('_token') || lk.includes('password')) {
          out[k] = '[REDACTED]';
        } else {
          out[k] = walk(val);
        }
      }
      return out;
    }
    return v;
  };

  return walk(input);
}

/**
 * Factory master lane: query/body `token` or `x-session-token` header vs env secret.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function verifyFactoryMasterToken(req) {
  const token =
    (req.query?.token ||
      req.body?.token ||
      req.headers?.get?.('x-session-token') ||
      req.headers?.['x-session-token'] ||
      '')?.toString();
  const master = (process.env.MASTER_ADMIN_KEY || process.env.ADMIN_PIN || '').toString();
  if (!token || !master) return false;
  return timingSafeEquals(token, master);
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
function extractSovereignBearer(req) {
  const h =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    req.headers?.get?.('authorization');
  const s = h ? String(h) : '';
  if (/^\s*Bearer\s+/i.test(s)) {
    return s.replace(/^\s*Bearer\s+/i, '').trim();
  }
  const xh = req.headers?.['x-sovereign-session'] || req.headers?.get?.('x-sovereign-session');
  return xh ? String(xh).trim() : '';
}

/**
 * @param {string} action
 * @returns {boolean}
 */
function tenantJwtSatisfiesDormantGate(action) {
  const raw = process.env.CORPFLOW_TENANT_JWT_DORMANT_ACTIONS || '';
  const set = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return set.has(String(action || '').toLowerCase());
}

/**
 * Tenant sovereign lane: Bearer / x-sovereign-session HMAC token from bootstrap.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {{ ok: boolean, payload?: Record<string, unknown> | null }}
 */
function verifyTenantSovereignJwt(req) {
  const secret = getSovereignSessionSecret();
  if (!secret) return { ok: false, payload: null };
  const token = extractSovereignBearer(req);
  if (!token) return { ok: false, payload: null };
  const v = verifySovereignSessionToken(token, secret);
  if (!v.ok || v.payload?.typ !== 'sovereign') return { ok: false, payload: null };
  return { ok: true, payload: v.payload };
}

/**
 * Two-lane dormant gate: factory_master (env) or tenant_sovereign (JWT) when action is allowlisted.
 *
 * @param {import('http').IncomingMessage} req
 * @param {string} action
 * @returns {boolean}
 */
function verifyDormantGateCredentials(req, action) {
  if (!DORMANT_GATE_ENABLED) return true;
  // Prefer cookie sessions (admin or tenant) so users never paste long secrets into the UI.
  const sess = getSessionFromRequest(req);
  if (sess?.ok && sess.payload?.typ === 'admin') return true;
  // Tenants may list their own tickets without extra JWT allowlist env.
  if (sess?.ok && sess.payload?.typ === 'tenant' && String(action || '').toLowerCase() === 'ticket-list') {
    return true;
  }
  if (sess?.ok && sess.payload?.typ === 'tenant' && tenantJwtSatisfiesDormantGate(action)) return true;
  if (verifyFactoryMasterToken(req)) return true;
  if (tenantJwtSatisfiesDormantGate(action)) {
    const t = verifyTenantSovereignJwt(req);
    return t.ok === true;
  }
  return false;
}

function deny(res, status, error, extra) {
  const payload = { error };
  if (extra) Object.assign(payload, extra);
  return res.status(status).json(payload);
}

function verifyRigorViaPython({
  description,
  costUsd,
  clientId,
  action,
  ticketId,
  authorizedRepWhatsAppNumbers,
  clientAcknowledged,
  rigorReportId,
}) {
  const scriptPath = path.join(REPO_ROOT, 'vanguard', 'verify-rigor.py');

  const repNums = Array.isArray(authorizedRepWhatsAppNumbers)
    ? authorizedRepWhatsAppNumbers
    : [];

  const args = [
    scriptPath,
    '--description',
    String(description || ''),
    '--cost_usd',
    String(costUsd ?? 0),
    '--client_id',
    clientId || 'root',
    '--action',
    action,
    '--ticket_id',
    ticketId || 'n/a',
    '--authorized_rep_whatsapp_numbers',
    repNums.join(','),
  ];

  if (clientAcknowledged) args.push('--client_acknowledged');
  if (rigorReportId) {
    args.push('--rigor_report_id');
    args.push(String(rigorReportId));
  }

  const result = spawnSync(
    'python',
    args,
    { encoding: 'utf8' }
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || '').toString();
    throw new Error(`verify-rigor failed (exit ${result.status}): ${stderr.slice(0, 500)}`);
  }

  const stdout = (result.stdout || '').toString().trim();
  try {
    return JSON.parse(stdout);
  } catch (e) {
    throw new Error(`verify-rigor returned non-JSON output: ${stdout.slice(0, 500)}`);
  }
}

/**
 * @param {unknown} e
 * @returns {boolean}
 */
function isPythonSpawnEnoent(e) {
  if (!e) return false;
  if (typeof e === 'object' && e !== null && 'code' in e && String(/** @type {{ code?: unknown }} */ (e).code) === 'ENOENT') {
    return true;
  }
  const m = e instanceof Error ? e.message : String(e);
  const lower = m.toLowerCase();
  return lower.includes('enoent') && (lower.includes('python') || lower.includes('spawn'));
}

/**
 * Vanguard gate: Python verifier when available; on Vercel (no `python`) auto-falls back to Node.
 *
 * Env `CORPFLOW_VANGUARD_MODE`:
 * - `auto` (default): try Python, then Node on ENOENT
 * - `node`: Node heuristic only (budget + keyword/length ethical score)
 * - `python`: Python only (throws if unavailable)
 * - `off` / `disabled`: ethics bypass — **still enforces** HARD_BUDGET_CAP_USD (dangerous)
 *
 * @param {Parameters<typeof verifyRigorViaPython>[0]} opts
 * @returns {ReturnType<typeof verifyRigorViaPython>}
 */
function resolveVerifyRigorVerdict(opts) {
  const mode = String(cfg('CORPFLOW_VANGUARD_MODE', 'auto')).trim().toLowerCase();
  if (mode === 'off' || mode === 'disabled') {
    return verifyRigorBypassEthics({ costUsd: opts.costUsd });
  }
  if (mode === 'node') {
    return verifyRigorNode(opts);
  }
  if (mode === 'python') {
    return verifyRigorViaPython(opts);
  }
  try {
    return verifyRigorViaPython(opts);
  } catch (e) {
    if (isPythonSpawnEnoent(e)) {
      emitLogicFailure({
        source: 'api/cmp/router.js:resolveVerifyRigorVerdict',
        severity: 'warning',
        error: e instanceof Error ? e : new Error(String(e)),
        cmp: { ticket_id: opts.ticketId || 'n/a', action: opts.action || 'verify-rigor' },
        recommended_action:
          'Python executable not found (typical on Vercel). Fell back to Node ethical heuristic. Set CORPFLOW_VANGUARD_MODE=node to skip the Python attempt.',
        meta: { fallback_engine: 'node' },
      });
      return verifyRigorNode(opts);
    }
    throw e;
  }
}

function ensureTenantProvisionedViaPython(tenantId) {
  const scriptPath = path.join(REPO_ROOT, 'core', 'engine', 'provisioning.py');
  const result = spawnSync(
    'python',
    [scriptPath, '--tenant_id', String(tenantId || 'root')],
    { encoding: 'utf8' }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = (result.stderr || '').toString();
    throw new Error(`provisioning failed (exit ${result.status}): ${stderr.slice(0, 500)}`);
  }
  const stdout = (result.stdout || '').toString().trim();
  if (!stdout) return {};
  try {
    return JSON.parse(stdout);
  } catch (_) {
    return {};
  }
}

/**
 * Single CMP serverless entry (Hobby-friendly). Routed via:
 * - `vercel.json` rewrite: `/api/cmp/...` → `/api/factory_router?__path=cmp/...` (query preserved)
 * - Optional: `?action=ticket-create` on `/api/cmp/router`
 */
function resolveAction(req) {
  let a = req.query?.action;
  if (Array.isArray(a)) a = a[0];
  if (a != null && String(a).trim() !== '') {
    return String(a).replace(/\.js$/i, '').trim().toLowerCase();
  }
  try {
    const raw = req.url || '/';
    const u = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://localhost');
    const fromQ = u.searchParams.get('action');
    if (fromQ) return fromQ.replace(/\.js$/i, '').trim().toLowerCase();
    const parts = u.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('cmp');
    if (i >= 0 && parts[i + 1]) {
      const seg = parts[i + 1].replace(/\.js$/i, '').toLowerCase();
      if (seg !== 'router') return seg;
    }
  } catch (_) {}
  return '';
}

function parseJsonBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return { ok: false, error: 'Invalid JSON body' };
    }
  }
  return { ok: true, body: body ?? {} };
}

/**
 * Use inline description if present; otherwise load from CMP storage (Postgres or Baserow).
 *
 * @param {string} ticketId
 * @param {unknown} inlineDescription
 * @returns {Promise<string>}
 */
async function resolveCmpDescriptionFromTicket(ticketId, inlineDescription) {
  let description = typeof inlineDescription === 'string' ? inlineDescription.trim() : '';
  if (description) return description;
  const tid = ticketId != null ? String(ticketId).trim() : '';
  if (!tid) return '';

  const backend = String(cfg('CORPFLOW_CMP_BACKEND', 'postgres')).trim().toLowerCase();
  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (backend === 'postgres' && pgUrl) {
    const t = await prisma.cmpTicket.findUnique({ where: { id: tid } });
    return typeof t?.description === 'string' ? t.description.trim() : '';
  }
  try {
    const client = createBaserowClient({});
    const row = await client.getRow(undefined, tid);
    const f = getCmpFieldMap();
    const d = row?.[f.description] ?? row?.Description ?? row?.description ?? '';
    return typeof d === 'string' ? d.trim() : '';
  } catch {
    return '';
  }
}

async function handleTicketCreate(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'ticket-create');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }

  try {
    const clientId = getClientIdFromBody(body);
    const backend = String(cfg('CORPFLOW_CMP_BACKEND', 'postgres')).trim().toLowerCase();
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();

    if (backend === 'postgres' && pgUrl) {
      const row = await prisma.cmpTicket.create({
        data: {
          tenantId: clientId ? String(clientId) : null,
          description,
          status: 'Open',
          stage: 'Intake',
          locale: typeof body?.locale === 'string' ? body.locale.trim() : null,
          consoleJson: {
            locale: typeof body?.locale === 'string' && body.locale.trim() ? body.locale.trim() : 'en',
            brief: {},
            messages: [],
          },
        },
      });
      return res.status(200).json({ ticket_id: row.id, source: 'postgres' });
    }

    const client = createBaserowClient({ tenantId: clientId || null });
    const fields = initialTicketPayload(description);
    const clientField = process.env.BASEROW_CMP_CLIENT_ID_FIELD;
    if (clientField && body.client_id) fields[clientField] = String(body.client_id);
    const siteField = process.env.BASEROW_CMP_SITE_ID_FIELD;
    if (siteField && body.site_id) fields[siteField] = String(body.site_id);

    const row = await client.createRow(undefined, fields);
    const ticketId = row?.id != null ? String(row.id) : null;
    if (!ticketId) return res.status(502).json({ error: 'Baserow did not return a row id' });

    return res.status(200).json({ ticket_id: ticketId, source: 'baserow', baserow_row: row });
  } catch (e) {
    if (e instanceof BaserowError) {
      emitLogicFailure({
        source: 'api/cmp/router.js:ticket-create',
        severity: 'error',
        error: e,
        cmp: { ticket_id: 'n/a', action: 'ticket-create' },
      });
      return res.status(e.status >= 400 && e.status < 600 ? e.status : 502).json({
        error: e.message,
        detail: e.body,
      });
    }
    emitLogicFailure({
      source: 'api/cmp/router.js:ticket-create',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'ticket-create' },
      recommended_action: 'Retry with a valid payload (description required) and verify BASEROW env vars.',
    });
    console.error('ticket-create', e);
    return res.status(500).json({ error: 'Ticket create failed', detail: String(e?.message || e) });
  }
}

async function handleTicketGet(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'ticket-get');
  if (guard !== true) return guard;

  const id = req.query?.id;
  if (!id || String(id).trim() === '') {
    return res.status(400).json({ error: 'id query parameter is required' });
  }

  try {
    const backend = String(cfg('CORPFLOW_CMP_BACKEND', 'postgres')).trim().toLowerCase();
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    if (backend === 'postgres' && pgUrl) {
      const row = await prisma.cmpTicket.findUnique({ where: { id: String(id) } });
      if (!row) return res.status(404).json({ error: 'Ticket not found' });
      return res.status(200).json({
        ticket_id: row.id,
        description: row.description || '',
        status: row.status || '',
        stage: row.stage || '',
        source: 'postgres',
      });
    }

    const clientId = req?.headers?.['x-client-id'] || req?.query?.client_id || null;
    const client = createBaserowClient({ tenantId: clientId || null });
    const row = await client.getRow(undefined, id);
    const f = getCmpFieldMap();
    const description = row[f.description] ?? row.Description ?? '';
    const status = row[f.status] ?? row.Status ?? '';
    const stage = row[f.stage] ?? row.Stage ?? '';

    return res.status(200).json({
      ticket_id: String(row.id),
      description: typeof description === 'object' ? JSON.stringify(description) : String(description),
      status: typeof status === 'object' ? JSON.stringify(status) : String(status),
      stage: typeof stage === 'object' ? JSON.stringify(stage) : String(stage),
      source: 'baserow',
    });
  } catch (e) {
    if (e instanceof BaserowError) {
      emitLogicFailure({
        source: 'api/cmp/router.js:ticket-get',
        severity: e.status === 404 ? 'warning' : 'error',
        error: e,
        cmp: { ticket_id: String(id), action: 'ticket-get' },
      });
      const code = e.status === 404 ? 404 : e.status >= 400 && e.status < 600 ? e.status : 502;
      return res.status(code).json({ error: e.message, detail: e.body });
    }
    emitLogicFailure({
      source: 'api/cmp/router.js:ticket-get',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'ticket-get' },
    });
    console.error('ticket-get', e);
    return res.status(500).json({ error: 'Ticket get failed', detail: String(e?.message || e) });
  }
}

function ticketListLimit(req) {
  let raw =
    req.query?.limit != null
      ? Array.isArray(req.query.limit)
        ? req.query.limit[0]
        : req.query.limit
      : '';
  if (req.method === 'POST' && !raw) {
    let b = req.body;
    if (typeof b === 'string') {
      try {
        b = JSON.parse(b);
      } catch {
        b = {};
      }
    }
    if (b && typeof b === 'object' && b.limit != null) raw = String(b.limit);
  }
  const n = parseInt(String(raw || '30'), 10);
  return Math.min(100, Math.max(1, Number.isFinite(n) ? n : 30));
}

/**
 * List recent CMP tickets (Postgres or Baserow). Admin sees all; tenant sees rows for their tenant_id only.
 *
 * GET or POST `action=ticket-list` — optional `limit` (default 30, max 100).
 */
async function handleTicketList(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'ticket-list');
  if (guard !== true) return guard;

  const limit = ticketListLimit(req);
  const sess = getSessionFromRequest(req);
  const tenantScope =
    sess?.ok && sess.payload?.typ === 'tenant' && sess.payload?.tenant_id
      ? String(sess.payload.tenant_id).trim()
      : null;

  const backend = String(cfg('CORPFLOW_CMP_BACKEND', 'postgres')).trim().toLowerCase();
  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();

  try {
    if (backend === 'postgres' && pgUrl) {
      const where = tenantScope ? { tenantId: tenantScope } : {};
      const rows = await prisma.cmpTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          tenantId: true,
          status: true,
          stage: true,
          description: true,
          updatedAt: true,
          createdAt: true,
        },
      });
      const tickets = rows.map((r) => ({
        ticket_id: r.id,
        tenant_id: r.tenantId,
        status: r.status || '',
        stage: r.stage || '',
        description_preview: (r.description || '').slice(0, 200),
        updated_at: r.updatedAt.toISOString(),
        created_at: r.createdAt.toISOString(),
      }));
      return res.status(200).json({ ok: true, source: 'postgres', tickets, count: tickets.length });
    }

    const tableId = String(cfg('BASEROW_CMP_TABLE_ID', '') || cfg('BASEROW_TABLE_ID', '')).trim();
    if (!tableId) {
      return res.status(503).json({
        error: 'CMP_STORAGE_NOT_CONFIGURED',
        hint: 'Set POSTGRES_URL for Postgres or BASEROW_CMP_TABLE_ID for Baserow.',
      });
    }

    const f = getCmpFieldMap();
    if (tenantScope) {
      const client = createBaserowClient({ tenantId: tenantScope });
      const data = await client.listRows(tableId, { page: 1, size: limit });
      const results = Array.isArray(data?.results) ? data.results : [];
      const tickets = results.map((row) => ({
        ticket_id: String(row.id),
        tenant_id: tenantScope,
        status: String(row[f.status] ?? row.Status ?? ''),
        stage: String(row[f.stage] ?? row.Stage ?? ''),
        description_preview: String(row[f.description] ?? row.Description ?? '').slice(0, 200),
        updated_at: row.updated_at || row.Updated || null,
        created_at: row.created_at || row.Created || null,
      }));
      return res.status(200).json({ ok: true, source: 'baserow', tickets, count: tickets.length });
    }

    const data = await listBaserowTableAllRows(tableId, { page: 1, size: limit });
    const results = Array.isArray(data?.results) ? data.results : [];
    const clientField = (process.env.BASEROW_CMP_CLIENT_ID_FIELD || '').trim();
    const tickets = results.map((row) => ({
      ticket_id: String(row.id),
      tenant_id: clientField && row[clientField] != null ? String(row[clientField]) : '',
      status: String(row[f.status] ?? row.Status ?? ''),
      stage: String(row[f.stage] ?? row.Stage ?? ''),
      description_preview: String(row[f.description] ?? row.Description ?? '').slice(0, 200),
      updated_at: row.updated_at || row.Updated || null,
      created_at: row.created_at || row.Created || null,
    }));
    return res.status(200).json({ ok: true, source: 'baserow', tickets, count: tickets.length });
  } catch (e) {
    if (e instanceof BaserowError) {
      return res.status(e.status >= 400 && e.status < 600 ? e.status : 502).json({
        error: e.message,
        detail: e.body,
      });
    }
    emitLogicFailure({
      source: 'api/cmp/router.js:ticket-list',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'ticket-list' },
    });
    return res.status(500).json({ error: 'ticket-list failed', detail: String(e?.message || e) });
  }
}

async function handleApproveBuild(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'approve-build');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  if (!ticketId) {
    return res.status(400).json({ error: 'ticket_id is required' });
  }

  try {
    const clientId = getClientIdFromBody(body) || 'root';
    // First-run provisioning: auto-create tenants/<tenant_id>/persona.json when missing.
    try {
      ensureTenantProvisionedViaPython(clientId);
    } catch (e) {
      if (isPythonSpawnEnoent(e)) {
        emitLogicFailure({
          source: 'api/cmp/router.js:approve-build:provisioning',
          severity: 'warning',
          error: e instanceof Error ? e : new Error(String(e)),
          cmp: { ticket_id: ticketId, action: 'approve-build' },
          recommended_action:
            'Skipping filesystem tenant provisioning (Python missing — e.g. Vercel). Rely on Postgres tenant rows if used.',
          meta: { client_id: clientId },
        });
      } else {
        throw e;
      }
    }

    // Hard rejection guard before any costly processing.
    const tokenBalanceUsd = Number(getTokenCreditBalance({ tenantId: clientId }));
    if (!Number.isFinite(tokenBalanceUsd) || tokenBalanceUsd <= 0) {
      return deny(
        res,
        402,
        'FACTORY_DORMANT: INSUFFICIENT_CREDITS',
        {
          code: 'FACTORY_DORMANT',
          reason: 'INSUFFICIENT_CREDITS',
          token_credit_balance_usd: Number.isFinite(tokenBalanceUsd) ? tokenBalanceUsd : 0,
        }
      );
    }

    // Reconstruct description to re-run ethical/budget gate (body or stored ticket text).
    const description = await resolveCmpDescriptionFromTicket(ticketId, body?.description);
    if (!description) {
      emitLogicFailure({
        source: 'api/cmp/router.js:approve-build',
        severity: 'fatal',
        error: new Error('Missing description for ethical sentinel re-check'),
        cmp: { ticket_id: ticketId, action: 'approve-build' },
        recommended_action:
          'Add a description in the Change Console, or ensure the ticket row has description stored (Postgres cmp_tickets.description).',
      });
      return deny(res, 400, 'Approve blocked: missing description.', {
        hint: 'Paste or type the change description, or pick the ticket again so text loads from the database.',
        ticket_id: ticketId,
      });
    }

    const tier =
      body?.tier === 'premium' || body?.tier === 'enterprise' || body?.tier === 'internal'
        ? body.tier
        : 'standard';
    const is_demo = Boolean(body?.is_demo);

    let complexity = body?.complexity;
    let risk = body?.risk;
    if (!complexity || !['low', 'medium', 'high'].includes(complexity)) {
      complexity = inferComplexityFromDescription(description);
    }
    if (!risk || !['low', 'medium', 'high'].includes(risk)) {
      risk = inferRiskFromDescription(description);
    }

    const cost = computeMarketValueCost({
      complexity,
      risk,
      tier,
      is_demo,
    });

    const costUsd = Number(cost?.full_market_value_usd);

    const verdict = resolveVerifyRigorVerdict({
      description,
      costUsd,
      clientId,
      action: 'approve-build',
      ticketId,
      authorizedRepWhatsAppNumbers: getAuthorizedRepWhatsAppNumbers(clientId || 'root'),
      clientAcknowledged: false,
    });

    if (!verdict?.ok) {
      emitLogicFailure({
        source: 'vanguard/verify-rigor.py',
        severity: 'fatal',
        error: new Error(verdict?.reject_reason || 'Rejected by ethical sentinel'),
        cmp: { ticket_id: ticketId, action: 'approve-build' },
        recommended_action: 'Build blocked by Vanguard Ethical Sentinel.',
      });
      return deny(
        res,
        403,
        verdict?.reject_reason || 'Build rejected by ethical sentinel',
        {
          ethical_score: verdict?.ethical_score ?? null,
          budget_cap_usd: verdict?.budget_cap_usd ?? null,
          cost_estimate_usd: verdict?.cost_estimate_usd ?? costUsd,
          rejected_by: verdict?.rejected_by || [],
          requires_client_ack: verdict?.requires_client_ack ?? false,
          rigor_report_id: verdict?.rigor_report_id ?? null,
          executive_escalated: verdict?.executive_escalated ?? false,
        }
      );
    }

    // Token Reservoir (Cash-Positive guardrail):
    // Debit the tenant's pre-paid token credits before we allow the build to proceed.
    // This prevents any spending beyond the client's float.
    try {
      const debitUsd = Number(verdict?.cost_estimate_usd ?? costUsd ?? 0);
      debitTokenCreditBalance({
        tenantId: clientId || 'root',
        debitUsd: debitUsd,
        invoiceUsd: costUsd,
        context: { ticket_id: ticketId, action: 'approve-build' },
      });
    } catch (e) {
      emitLogicFailure({
        source: 'api/cmp/router.js:approve-build:cash-positive-debit',
        severity: 'fatal',
        error: e instanceof Error ? e : new Error(String(e)),
        cmp: { ticket_id: ticketId, action: 'approve-build' },
        recommended_action:
          'Token credit balance depleted or insufficient. Client must top up token_credit_balance to proceed.',
        meta: { client_id: clientId, ticket_id: ticketId, cost_estimate_usd: verdict?.cost_estimate_usd ?? costUsd },
      });
      return deny(
        res,
        402,
        'Inflow required: insufficient token_credit_balance to execute this build.',
        { cost_estimate_usd: verdict?.cost_estimate_usd ?? costUsd }
      );
    }

    const cmpBe = String(cfg('CORPFLOW_CMP_BACKEND', 'postgres')).trim().toLowerCase();
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    let baserowRow = null;
    if (cmpBe === 'postgres' && pgUrl) {
      const exists = await prisma.cmpTicket.findUnique({ where: { id: ticketId }, select: { id: true } });
      if (!exists) {
        return res.status(404).json({
          error: 'Ticket not found',
          ticket_id: ticketId,
          hint: 'Check Ticket ID or pick the ticket from Recent tickets.',
        });
      }
      await prisma.cmpTicket.update({
        where: { id: ticketId },
        data: { stage: 'Build', status: 'Approved' },
      });
    } else {
      const client = createBaserowClient({});
      const fields = approveBuildPayload();
      baserowRow = await client.updateRow(undefined, ticketId, fields);
    }

    const sandboxDispatch = await dispatchCmpSandboxStart({
      ticketId,
      baseRef: process.env.CMP_SANDBOX_BASE_REF || 'main',
    });
    await notifyCmpAutomationWebhook({
      ticket_id: ticketId,
      source: 'approve-build',
      dispatch_ok: sandboxDispatch.ok,
      dispatch_error: sandboxDispatch.error || null,
    });

    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      baserow_row: baserowRow,
      source: cmpBe === 'postgres' && pgUrl ? 'postgres' : 'baserow',
      sandbox_branch: {
        dispatch_triggered: sandboxDispatch.ok,
        error: sandboxDispatch.ok ? undefined : sandboxDispatch.error,
      },
    });
  } catch (e) {
    if (e instanceof BaserowError) {
      emitLogicFailure({
        source: 'api/cmp/router.js:approve-build',
        severity: 'error',
        error: e,
        cmp: { ticket_id: ticketId, action: 'approve-build' },
      });
      return res.status(e.status >= 400 && e.status < 600 ? e.status : 502).json({
        error: e.message,
        detail: e.body,
      });
    }
    emitLogicFailure({
      source: 'api/cmp/router.js:approve-build',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: ticketId || 'n/a', action: 'approve-build' },
    });
    console.error('approve-build', e);
    const pCode = e && typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : '';
    const pMsg = e instanceof Error ? e.message : String(e);
    if (pCode === 'P2025') {
      return res.status(404).json({
        error: 'Ticket not found',
        detail: pMsg,
        ticket_id: ticketId,
      });
    }
    return res.status(500).json({
      error: 'Approve build failed',
      detail: pMsg,
      code: pCode || undefined,
      hint:
        pMsg.toLowerCase().includes('python') || pMsg.toLowerCase().includes('verify-rigor')
          ? 'Ethical verifier (Python) may be missing on the server. Check deployment logs.'
          : pMsg.includes('INSUFFICIENT') || pMsg.includes('402')
            ? 'Token/credit balance may be zero — see token_credit_balance_usd in a 402 response.'
            : undefined,
    });
  }
}

async function handleCostingPreview(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'costing-preview');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const ticketRef =
    body.ticket_id != null
      ? String(body.ticket_id).trim()
      : body.ticketId != null
        ? String(body.ticketId).trim()
        : '';

  const description = await resolveCmpDescriptionFromTicket(ticketRef, body?.description);
  if (!description) {
    return res.status(400).json({
      error: 'description is required',
      hint:
        'Type text in "Describe the change", or select a ticket from Recent tickets (full text loads automatically on click).',
      ticket_id: ticketRef || undefined,
    });
  }

  const tier =
    body.tier === 'premium' || body.tier === 'enterprise' || body.tier === 'internal'
      ? body.tier
      : 'standard';

  let complexity = body.complexity;
  let risk = body.risk;
  if (!complexity || !['low', 'medium', 'high'].includes(complexity)) {
    complexity = inferComplexityFromDescription(description);
  }
  if (!risk || !['low', 'medium', 'high'].includes(risk)) {
    risk = inferRiskFromDescription(description);
  }

  const is_demo = Boolean(body.is_demo);

  const impact = buildImpactSummary(description, { complexity, risk });
  const cost = computeMarketValueCost({
    complexity,
    risk,
    tier,
    is_demo,
  });

  const clientId = getClientIdFromBody(body);
  const ticketId = ticketRef || 'n/a';
  const costUsd = Number(cost?.full_market_value_usd);

  try {
    const verdict = resolveVerifyRigorVerdict({
      description,
      costUsd,
      clientId: clientId || 'root',
      action: 'costing-preview',
      ticketId,
      authorizedRepWhatsAppNumbers: getAuthorizedRepWhatsAppNumbers(clientId || 'root'),
      clientAcknowledged: false,
    });

    if (!verdict?.ok) {
      emitLogicFailure({
        source: 'vanguard/verify-rigor.py',
        severity: 'fatal',
        error: new Error(verdict?.reject_reason || 'Rejected by ethical sentinel'),
        cmp: { ticket_id: ticketId, action: 'costing-preview' },
        recommended_action: 'Human review required for this change request.',
      });
      return deny(
        res,
        403,
        verdict?.reject_reason || 'Rejected by ethical sentinel',
        {
          ethical_score: verdict?.ethical_score ?? null,
          budget_cap_usd: verdict?.budget_cap_usd ?? null,
          cost_estimate_usd: verdict?.cost_estimate_usd ?? costUsd,
          rejected_by: verdict?.rejected_by || [],
          requires_client_ack: verdict?.requires_client_ack ?? false,
          rigor_report_id: verdict?.rigor_report_id ?? null,
          executive_escalated: verdict?.executive_escalated ?? false,
        }
      );
    }
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:costing-preview:verify-rigor',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: ticketId, action: 'costing-preview' },
    });
    return deny(res, 500, 'Ethical Sentinel verification failed (build blocked by default).');
  }

  return res.status(200).json({
    ticket_id: ticketRef || null,
    impact: {
      summary: impact.summary,
      risk_level: impact.risk_level,
      technical_risks: impact.technical_risks,
      complexity_inferred: impact.complexity_inferred,
    },
    cost: {
      full_market_value_usd: cost.full_market_value_usd,
      displayed_client_usd: cost.displayed_client_usd,
      is_demo: cost.is_demo,
      demo_discount_rate: cost.demo_discount_rate,
      breakdown: cost.breakdown,
    },
  });
}

async function handleAiInterview(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'ai-interview');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }

  const localeHint =
    typeof body?.locale === 'string'
      ? body.locale
      : typeof body?.lang === 'string'
        ? body.lang
        : '';
  const result = buildClarificationQuestions(description, localeHint);
  return res.status(200).json(result);
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeConsoleJson(v) {
  if (!v) return { messages: [], brief: {}, locale: 'en' };
  if (typeof v === 'string') {
    const parsed = safeJsonParse(v, null);
    if (parsed) return normalizeConsoleJson(parsed);
    return { messages: [], brief: {}, locale: 'en' };
  }
  if (typeof v === 'object') {
    const messages = Array.isArray(v.messages) ? v.messages.slice(0, 200) : [];
    const brief = v.brief && typeof v.brief === 'object' ? v.brief : {};
    const locale = typeof v.locale === 'string' ? v.locale : 'en';
    return { messages, brief, locale };
  }
  return { messages: [], brief: {}, locale: 'en' };
}

async function callGroqChangeRefiner({ messages, locale }) {
  const key = (process.env.GROQ_API_KEY || '').toString().trim();
  if (!key) {
    return {
      ok: false,
      assistant:
        'AI is not configured yet (missing GROQ_API_KEY). Please set it, or proceed with a manual refinement.',
      brief: null,
    };
  }

  const system = [
    'You are CorpFlowAI Change Console.',
    'Goal: refine a client change request into an actionable engineering brief.',
    'You must be concise and ask at most one follow-up question if needed.',
    'Return STRICT JSON only (no markdown):',
    '{"assistant":"...","brief":{"summary":"...","scope_in":"...","scope_out":"...","acceptance_criteria":["..."],"risks":["..."]}}',
    `Locale hint: ${String(locale || 'en')}`,
  ].join('\n');

  // Keep only the last 16 turns to control token/cost.
  const tail = messages.slice(-16).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || ''),
  }));

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile',
        temperature: 0.3,
        messages: [{ role: 'system', content: system }, ...tail],
      }),
    });
    const data = await r.json().catch(() => ({}));
    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!r.ok) {
      const errText =
        data?.error?.message || data?.message || `groq_http_${r.status}`;
      return { ok: false, assistant: `System error: ${errText}`, brief: null };
    }
    const obj = safeJsonParse(String(text).trim(), null);
    if (!obj || typeof obj !== 'object') {
      return {
        ok: false,
        assistant: String(text || '').trim() || 'AI returned an empty response.',
        brief: null,
      };
    }
    const assistant = typeof obj.assistant === 'string' ? obj.assistant : '';
    const brief = obj.brief && typeof obj.brief === 'object' ? obj.brief : null;
    return { ok: true, assistant: assistant || 'OK', brief };
  } catch (e) {
    return {
      ok: false,
      assistant: `System error: ${String(e?.message || e)}`,
      brief: null,
    };
  }
}

/**
 * Change Console chat: append transcript + refine brief; stores a single JSON blob in the CMP ticket row.
 *
 * Body: { ticket_id, message, locale? }
 */
async function handleChangeChat(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'change-chat');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const locale = typeof body?.locale === 'string' ? body.locale.trim() : '';

  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const backend = String(cfg('CORPFLOW_CMP_BACKEND', 'postgres')).trim().toLowerCase();
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    if (backend === 'postgres' && pgUrl) {
      const row = await prisma.cmpTicket.findUnique({ where: { id: ticketId } });
      if (!row) return res.status(404).json({ error: 'Ticket not found' });
      const existing = normalizeConsoleJson(row?.consoleJson);
      const now = new Date().toISOString();
      const next = {
        locale: locale || existing.locale || 'en',
        brief: existing.brief || {},
        messages: [...(existing.messages || []), { role: 'user', content: message, ts: now }].slice(-200),
      };
      const refined = await callGroqChangeRefiner({ messages: next.messages, locale: next.locale });
      const assistantMsg = {
        role: 'assistant',
        content: String(refined.assistant || '').trim() || 'OK',
        ts: new Date().toISOString(),
        ok: Boolean(refined.ok),
      };
      const stored = {
        locale: next.locale,
        brief: refined.brief || next.brief || {},
        messages: [...next.messages, assistantMsg].slice(-200),
      };
      await prisma.cmpTicket.update({
        where: { id: ticketId },
        data: { consoleJson: stored, locale: stored.locale, brief: stored?.brief?.summary ? String(stored.brief.summary) : undefined },
      });
      return res.status(200).json({
        ok: true,
        ticket_id: ticketId,
        assistant: assistantMsg.content,
        brief: stored.brief,
        stored_messages: stored.messages.length,
        source: 'postgres',
      });
    }

    const consoleField =
      (process.env.BASEROW_CMP_CONSOLE_JSON_FIELD || '').toString().trim() ||
      'console_json';

    const client = createBaserowClient({});
    const row = await client.getRow(undefined, ticketId);

    const existing = normalizeConsoleJson(row?.[consoleField]);
    const now = new Date().toISOString();
    const next = {
      locale: locale || existing.locale || 'en',
      brief: existing.brief || {},
      messages: [
        ...(existing.messages || []),
        { role: 'user', content: message, ts: now },
      ].slice(-200),
    };

    const refined = await callGroqChangeRefiner({
      messages: next.messages,
      locale: next.locale,
    });

    const assistantMsg = {
      role: 'assistant',
      content: String(refined.assistant || '').trim() || 'OK',
      ts: new Date().toISOString(),
      ok: Boolean(refined.ok),
    };

    const stored = {
      locale: next.locale,
      brief: refined.brief || next.brief || {},
      messages: [...next.messages, assistantMsg].slice(-200),
    };

    const updated = await client.updateRow(undefined, ticketId, {
      [consoleField]: JSON.stringify(stored),
    });

    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      console_field: consoleField,
      assistant: assistantMsg.content,
      brief: stored.brief,
      stored_messages: stored.messages.length,
      baserow_row: updated,
      source: 'baserow',
    });
  } catch (e) {
    if (e instanceof BaserowError) {
      return res.status(e.status >= 400 && e.status < 600 ? e.status : 502).json({
        error: e.message,
        detail: e.body,
        hint:
          'Ensure the CMP table has a text field named by BASEROW_CMP_CONSOLE_JSON_FIELD (default: console_json).',
      });
    }
    return res.status(500).json({ error: 'change-chat failed', detail: String(e?.message || e) });
  }
}

async function handleSandboxStart(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'sandbox-start');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  if (!ticketId) {
    return res.status(400).json({ error: 'ticket_id is required' });
  }
  const baseRef =
    typeof body?.base_ref === 'string' && body.base_ref.trim()
      ? body.base_ref.trim()
      : 'main';

  const dispatched = await dispatchCmpSandboxStart({ ticketId, baseRef });
  await notifyCmpAutomationWebhook({
    ticket_id: ticketId,
    base_ref: baseRef,
    source: 'sandbox-start',
    dispatch_ok: dispatched.ok,
    dispatch_error: dispatched.error || null,
  });

  if (!dispatched.ok) {
    return res.status(503).json({
      error: 'Sandbox dispatch failed',
      detail: dispatched.error,
      hint: 'Set CMP_GITHUB_TOKEN (repo scope) and GITHUB_REPO=owner/repo on Vercel.',
    });
  }

  return res.status(200).json({
    ok: true,
    ticket_id: ticketId,
    base_ref: baseRef,
    message: 'GitHub Actions repository_dispatch cmp_sandbox_start sent.',
  });
}

async function handleSessionVerify(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!DORMANT_GATE_ENABLED) {
    return res.status(200).json({ ok: true, dormant_gate: false });
  }

  const masterToken = (req.query?.token || req.body?.token || '').toString();
  const master = (process.env.MASTER_ADMIN_KEY || process.env.ADMIN_PIN || '').toString();
  if (masterToken && master && timingSafeEquals(masterToken, master)) {
    return res.status(200).json({ ok: true, dormant_gate: true, lane: 'factory_master' });
  }

  const secret = getSovereignSessionSecret();
  if (secret) {
    const bearer = extractSovereignBearer(req);
    if (bearer) {
      const v = verifySovereignSessionToken(bearer, secret);
      if (v.ok && v.payload?.typ === 'sovereign') {
        return res.status(200).json({ ok: true, dormant_gate: true, lane: 'tenant_sovereign' });
      }
    }
  }

  return deny(res, 401, 'Dormant Gate verification failed.');
}

const SOVEREIGN_SESSION_TTL_SEC = Math.min(
  86400 * 7,
  Math.max(300, parseInt(process.env.SOVEREIGN_SESSION_TTL_SEC || '86400', 10) || 86400),
);

const SOVEREIGN_HANDOVER_OATH =
  (process.env.SOVEREIGN_HANDOVER_OATH || '').toString().trim() ||
  "Even I don't know your PIN. Your data is sovereign to you. If you lose it, I have to physically break the lock and give you a new one.";

/** Hard ceiling for bootstrap verify + Baserow reads (aligns with BASEROW_REQUEST_TIMEOUT_MS). */
const TENANT_LOGIN_BUDGET_MS = Math.min(
  3000,
  Math.max(1000, parseInt(process.env.TENANT_LOGIN_BUDGET_MS || '3000', 10) || 3000),
);

/**
 * One-shot PIN verify against Baserow tenant row; returns signed sovereign session (fail-closed).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<import('http').ServerResponse>}
 */
async function handleTenantSessionBootstrap(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = getSovereignSessionSecret();
  if (!secret) {
    return deny(res, 503, 'SOVEREIGN_SESSION_SECRET is not configured.');
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const tenantIdRaw =
    body?.tenant_id ||
    body?.tenantId ||
    req.corpflowContext?.tenant_id ||
    getClientIdFromBody(body);
  const tenantId = tenantIdRaw != null ? String(tenantIdRaw).trim() : '';
  if (!tenantId) {
    return deny(res, 400, 'tenant_id is required.');
  }

  const pin = body?.pin != null ? String(body.pin) : '';
  if (!pin) {
    return deny(res, 400, 'pin is required.');
  }

  const tableId = (process.env.BASEROW_TENANT_TABLE_ID || '').toString().trim();
  if (!tableId) {
    return deny(res, 503, 'BASEROW_TENANT_TABLE_ID is not configured.');
  }

  const pinField = (process.env.BASEROW_TENANT_PIN_FIELD || 'sovereign_pin').toString();
  const tenantFieldName = (process.env.BASEROW_TENANT_ID_FIELD || 'tenant_id').toString();

  try {
    let rowId = '';
    let row = null;

    await Promise.race([
      (async () => {
        let rid = body?.row_id != null ? String(body.row_id).trim() : '';
        let r = null;

        if (rid) {
          r = await getBaserowRowGeneric({
            tableId,
            rowId: rid,
            tenantId,
            tenantFieldName,
          });
        } else {
          const client = createBaserowClient({
            tenantId,
            defaultTableId: tableId,
            tenantFieldName,
          });
          const listed = await client.listRows(tableId, { page: 1, size: 1 });
          const results = listed?.results || listed?.data || [];
          r = Array.isArray(results) && results[0] ? results[0] : null;
          if (r?.id != null) rid = String(r.id);
        }

        if (!r || !rid) {
          throw Object.assign(new Error('TENANT_ROW_NOT_FOUND'), { code: 404 });
        }

        row = r;
        rowId = rid;

        const storedPin = r[pinField];
        const stored = storedPin != null ? String(storedPin) : '';
        if (!stored || !verifyPinAgainstStored(pin, stored)) {
          throw Object.assign(new Error('PIN_VERIFY_FAILED'), { code: 401 });
        }
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error('LOGIN_TIMEOUT'), { code: 504 })), TENANT_LOGIN_BUDGET_MS),
      ),
    ]);

    if (!row || !rowId) {
      return deny(res, 404, 'Tenant row not found.');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      typ: 'sovereign',
      tenant_id: tenantId,
      row_id: rowId,
      iat: now,
      exp: now + SOVEREIGN_SESSION_TTL_SEC,
    };
    const sovereignSession = signSovereignSession(payload, secret);

    return res.status(200).json({
      ok: true,
      lane: 'tenant_sovereign',
      sovereign_session: sovereignSession,
      expires_in: SOVEREIGN_SESSION_TTL_SEC,
      tenant_id: tenantId,
      row_id: rowId,
    });
  } catch (e) {
    if (e && typeof e === 'object' && e.code === 404) {
      return deny(res, 404, 'Tenant row not found.');
    }
    if (e && typeof e === 'object' && e.code === 401) {
      emitLogicFailure({
        source: 'api/cmp/router.js:tenant-session-bootstrap',
        severity: 'warning',
        error: new Error('PIN verification failed'),
        cmp: { ticket_id: 'n/a', action: 'tenant-session-bootstrap' },
        meta: { tenant_id: tenantId },
      });
      return deny(res, 401, 'Invalid PIN.');
    }
    if (e && typeof e === 'object' && e.code === 504) {
      return deny(res, 504, 'Login timed out; retry.', { budget_ms: TENANT_LOGIN_BUDGET_MS });
    }
    if (e instanceof BaserowError) {
      return res.status(e.status >= 400 && e.status < 600 ? e.status : 502).json({
        error: e.message,
        detail: e.body,
      });
    }
    emitLogicFailure({
      source: 'api/cmp/router.js:tenant-session-bootstrap',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'tenant-session-bootstrap' },
    });
    return res.status(500).json({ error: 'tenant-session-bootstrap failed', detail: String(e?.message || e) });
  }
}

/**
 * Factory-only: generate PIN, store scrypt hash in Baserow, return plaintext PIN once + oath text.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<import('http').ServerResponse>}
 */
async function handleProvisionTenantPin(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireFactoryMasterOnly(req, res, 'provision-tenant-pin');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const tenantId =
    body?.tenant_id || body?.tenantId || req.corpflowContext?.tenant_id || getClientIdFromBody(body);
  const tid = tenantId != null ? String(tenantId).trim() : '';
  if (!tid) {
    return deny(res, 400, 'tenant_id is required.');
  }

  const tableId = (process.env.BASEROW_TENANT_TABLE_ID || '').toString().trim();
  if (!tableId) {
    return deny(res, 503, 'BASEROW_TENANT_TABLE_ID is not configured.');
  }

  const pinField = (process.env.BASEROW_TENANT_PIN_FIELD || 'sovereign_pin').toString();
  const tenantFieldName = (process.env.BASEROW_TENANT_ID_FIELD || 'tenant_id').toString();

  let rowId = body?.row_id != null ? String(body.row_id).trim() : '';

  try {
    if (!rowId) {
      const client = createBaserowClient({
        tenantId: tid,
        defaultTableId: tableId,
        tenantFieldName,
      });
      const listed = await client.listRows(tableId, { page: 1, size: 1 });
      const results = listed?.results || listed?.data || [];
      const row = Array.isArray(results) && results[0] ? results[0] : null;
      if (row?.id != null) rowId = String(row.id);
    }

    if (!rowId) {
      return deny(res, 404, 'Tenant row not found; provide row_id.');
    }

    const plainPin = generateSecureTenantPin();
    const hashed = hashPinForStorage(plainPin);

    await updateBaserowRowGeneric({
      tableId,
      rowId,
      tenantId: tid,
      tenantFieldName,
      fields: { [pinField]: hashed },
    });

    recordSovereignAuditEvent({
      tenant_id: tid,
      action: 'provision-tenant-pin',
      meta: { row_id: rowId, pin_issued: true },
    });

    return res.status(200).json({
      ok: true,
      tenant_id: tid,
      row_id: rowId,
      pin: plainPin,
      oath: SOVEREIGN_HANDOVER_OATH,
    });
  } catch (e) {
    if (e instanceof BaserowError) {
      return res.status(e.status >= 400 && e.status < 600 ? e.status : 502).json({
        error: e.message,
        detail: e.body,
      });
    }
    emitLogicFailure({
      source: 'api/cmp/router.js:provision-tenant-pin',
      severity: 'error',
      error: e,
      cmp: { ticket_id: rowId || 'n/a', action: 'provision-tenant-pin' },
    });
    return res.status(500).json({ error: 'provision-tenant-pin failed', detail: String(e?.message || e) });
  }
}

/**
 * Sovereign-gated telemetry tail for execution-only / ghost clients.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<import('http').ServerResponse>}
 */
async function handleTenantLogStream(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = getSovereignSessionSecret();
  if (!secret) {
    return deny(res, 503, 'SOVEREIGN_SESSION_SECRET is not configured.');
  }

  const token = extractSovereignBearer(req);
  if (!token) {
    return deny(res, 401, 'Sovereign session required (Authorization Bearer or x-sovereign-session).');
  }

  const v = verifySovereignSessionToken(token, secret);
  if (!v.ok || !v.payload || v.payload.typ !== 'sovereign') {
    return deny(res, 401, 'Invalid or expired tenant session.');
  }

  const tenantId = v.payload.tenant_id != null ? String(v.payload.tenant_id).trim() : '';
  if (!tenantId) {
    return deny(res, 401, 'Invalid tenant session payload.');
  }

  const limitRaw = req.query?.limit;
  const limit = Math.min(200, Math.max(1, parseInt(String(Array.isArray(limitRaw) ? limitRaw[0] : limitRaw || '80'), 10) || 80));

  try {
    const logs = readTenantTelemetryTail(tenantId, limit);
    return res.status(200).json({ ok: true, tenant_id: tenantId, logs });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:tenant-log-stream',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'tenant-log-stream' },
      meta: { tenant_id: tenantId },
    });
    return res.status(500).json({ error: 'tenant-log-stream failed', detail: String(e?.message || e) });
  }
}

/**
 * UAT signoff: promote pending_config → live_config in one PATCH; requires valid sovereign JWT.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<import('http').ServerResponse>}
 */
async function handleSignoff(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = getSovereignSessionSecret();
  if (!secret) {
    return deny(res, 503, 'SOVEREIGN_SESSION_SECRET is not configured.');
  }

  const bearer = extractSovereignBearer(req);
  if (!bearer) {
    return deny(res, 401, 'Tenant session required (Authorization: Bearer or x-sovereign-session).');
  }

  const v = verifySovereignSessionToken(bearer, secret);
  if (!v.ok || !v.payload || v.payload.typ !== 'sovereign') {
    return deny(res, 401, 'Invalid or expired tenant session.');
  }

  const tenantId = v.payload.tenant_id != null ? String(v.payload.tenant_id).trim() : '';
  if (!tenantId) {
    return deny(res, 401, 'Invalid tenant session payload.');
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  let rowId =
    body?.row_id != null
      ? String(body.row_id).trim()
      : v.payload.row_id != null
        ? String(v.payload.row_id).trim()
        : '';
  if (!rowId) {
    return deny(res, 400, 'row_id is required (body or session).');
  }

  const tableId = (process.env.BASEROW_TENANT_TABLE_ID || '').toString().trim();
  if (!tableId) {
    return deny(res, 503, 'BASEROW_TENANT_TABLE_ID is not configured.');
  }

  const pendingField = (process.env.BASEROW_PENDING_CONFIG_FIELD || 'pending_config').toString();
  const liveField = (process.env.BASEROW_LIVE_CONFIG_FIELD || 'live_config').toString();
  const tenantFieldName = (process.env.BASEROW_TENANT_ID_FIELD || 'tenant_id').toString();

  try {
    const row = await getBaserowRowGeneric({
      tableId,
      rowId,
      tenantId,
      tenantFieldName,
    });

    if (!row || typeof row !== 'object') {
      return deny(res, 404, 'Row not found.');
    }

    const pendingVal = row[pendingField];
    const pendingStr = pendingVal != null ? String(pendingVal) : '';
    if (pendingStr.trim() === '') {
      return deny(res, 400, 'No pending_config to sign off.');
    }

    const fields = {
      [liveField]: pendingVal,
      [pendingField]: '',
    };

    await updateBaserowRowGeneric({
      tableId,
      rowId,
      tenantId,
      tenantFieldName,
      fields,
    });

    recordSovereignAuditEvent({
      tenant_id: tenantId,
      action: 'signoff',
      meta: { row_id: rowId, live_field: liveField, pending_field: pendingField },
    });

    return res.status(200).json({
      ok: true,
      tenant_id: tenantId,
      row_id: rowId,
      signed_off: true,
    });
  } catch (e) {
    if (e instanceof BaserowError) {
      return res.status(e.status >= 400 && e.status < 600 ? e.status : 502).json({
        error: e.message,
        detail: e.body,
      });
    }
    emitLogicFailure({
      source: 'api/cmp/router.js:signoff',
      severity: 'error',
      error: e,
      cmp: { ticket_id: rowId, action: 'signoff' },
    });
    return res.status(500).json({ error: 'signoff failed', detail: String(e?.message || e) });
  }
}

async function handleEvolutionRequest(req, res) {
  const gate = requireDormantGate(req, res, 'evolution-request');
  if (gate !== true) return gate;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const clientId = getClientIdFromBody(body);
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });

  const tier = getClientTier(clientId);
  if (tier === 'STATIC') {
    emitLogicFailure({
      source: 'api/cmp/router.js:TierGate',
      severity: 'fatal',
      error: new Error('STATIC tier blocked evolution-request'),
      cmp: { ticket_id: 'n/a', action: 'evolution-request' },
      recommended_action: 'Request admin escalation or upgrade client tier.',
      meta: { client_id: clientId, client_tier: tier },
    });
    return deny(res, 403, 'STATIC clients cannot run evolution-request.');
  }

  const subUserId = getSubUserId(req);
  const requiredCluster = requiredClusterForAction('evolution-request');
  if (!subUserId || !requiredCluster || !getClusterEnabled(clientId, subUserId, requiredCluster)) {
    emitLogicFailure({
      source: 'api/cmp/router.js:permission-denied',
      severity: 'warning',
      error: new Error('Permission Denied: insufficient staff cluster access.'),
      cmp: { ticket_id: 'n/a', action: 'evolution-request' },
      recommended_action: 'Request the required cluster access from the Client Authorized Representative.',
      meta: { client_id: clientId, staff_id: subUserId || null, required_cluster: requiredCluster },
    });
    return deny(res, 403, 'Permission Denied', {
      required_cluster: requiredCluster,
      staff_id: subUserId || null,
      action: 'evolution-request',
    });
  }

  return res.status(501).json({ error: 'evolution-request not implemented', tier });
}

async function handleMarketResearch(req, res) {
  const gate = requireDormantGate(req, res, 'market-research');
  if (gate !== true) return gate;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const clientId = getClientIdFromBody(body);
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });

  const tier = getClientTier(clientId);
  if (tier === 'STATIC') {
    emitLogicFailure({
      source: 'api/cmp/router.js:TierGate',
      severity: 'fatal',
      error: new Error('STATIC tier blocked market-research'),
      cmp: { ticket_id: 'n/a', action: 'market-research' },
      recommended_action: 'Request admin escalation or upgrade client tier.',
      meta: { client_id: clientId, client_tier: tier },
    });
    return deny(res, 403, 'STATIC clients cannot run market-research.');
  }

  const subUserId = getSubUserId(req);
  const requiredCluster = requiredClusterForAction('market-research');
  if (!subUserId || !requiredCluster || !getClusterEnabled(clientId, subUserId, requiredCluster)) {
    emitLogicFailure({
      source: 'api/cmp/router.js:permission-denied',
      severity: 'warning',
      error: new Error('Permission Denied: insufficient staff cluster access.'),
      cmp: { ticket_id: 'n/a', action: 'market-research' },
      recommended_action: 'Request the required cluster access from the Client Authorized Representative.',
      meta: { client_id: clientId, staff_id: subUserId || null, required_cluster: requiredCluster },
    });
    return deny(res, 403, 'Permission Denied', {
      required_cluster: requiredCluster,
      staff_id: subUserId || null,
      action: 'market-research',
    });
  }

  return res.status(501).json({ error: 'market-research not implemented', tier });
}

function writeJsonFileSafe(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function handleSupplierOnboard(req, res) {
  const gate = requireDormantGate(req, res, 'supplier-onboard');
  if (gate !== true) return gate;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const clientId = getClientIdFromBody(body);
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });

  const subUserId = getSubUserId(req);
  const requiredCluster = requiredClusterForAction('supplier-onboard');
  if (!subUserId || !requiredCluster || !getClusterEnabled(clientId, subUserId, requiredCluster)) {
    emitLogicFailure({
      source: 'api/cmp/router.js:permission-denied',
      severity: 'warning',
      error: new Error('Permission Denied: insufficient staff cluster access.'),
      cmp: { ticket_id: 'n/a', action: 'supplier-onboard' },
      recommended_action: 'Request the required cluster access from the Client Authorized Representative.',
      meta: { client_id: clientId, staff_id: subUserId || null, required_cluster: requiredCluster },
    });
    return deny(res, 403, 'Permission Denied', {
      required_cluster: requiredCluster,
      staff_id: subUserId || null,
      action: 'supplier-onboard',
    });
  }

  const supplierKey =
    body?.supplier_key || body?.supplierKey || body?.supplier || body?.supplier_type || null;
  if (!supplierKey || String(supplierKey).trim() === '') {
    return res.status(400).json({ error: 'supplier_key is required' });
  }

  const config = body?.supplier_config || body?.config || body?.details || {};
  const redactedConfig = redactPotentialSecrets(config);

  const manifest = readJsonFileSafe(SECRETS_MANIFEST_PATH) || {};
  manifest.tenant_access = manifest.tenant_access || {};
  manifest.tenant_access[clientId] = manifest.tenant_access[clientId] || {};
  manifest.tenant_access[clientId].supplier_access =
    manifest.tenant_access[clientId].supplier_access || {};

  manifest.tenant_access[clientId].supplier_access[supplierKey] = redactedConfig;
  manifest.tenant_access[clientId].supplier_onboarded_at = new Date().toISOString();

  try {
    writeJsonFileSafe(SECRETS_MANIFEST_PATH, manifest);
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:supplier-onboard',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'supplier-onboard' },
      recommended_action: 'Verify filesystem permissions for vanguard/secrets-manifest.json.',
      meta: { client_id: clientId, supplier_key: supplierKey },
    });
    return deny(res, 500, 'Failed to persist supplier access configuration.');
  }

  return res.status(200).json({ ok: true, client_id: clientId, supplier_key: supplierKey });
}

async function handleRigorClientAck(req, res) {
  const gate = requireDormantGate(req, res, 'rigor-client-ack');
  if (gate !== true) return gate;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const clientId = getClientIdFromBody(body);
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });

  const staffId = getSubUserId(req);
  if (!staffId) return deny(res, 403, 'x-subuser-id header is required.', { client_id: clientId });

  if (!isAuthorizedRepresentative(clientId, staffId)) {
    emitLogicFailure({
      source: 'api/cmp/router.js:rigor-client-ack',
      severity: 'warning',
      error: new Error('Permission Denied: not an Authorized Representative'),
      cmp: { ticket_id: 'n/a', action: 'rigor-client-ack' },
      recommended_action: 'Authorized Representative acknowledgement required.',
      meta: { client_id: clientId, staff_id: staffId },
    });
    return deny(res, 403, 'Permission Denied', { client_id: clientId, staff_id: staffId });
  }

  const rigorReportId =
    body?.rigor_report_id ||
    body?.rigorReportId ||
    body?.rigor_report ||
    body?.report_id ||
    null;
  if (!rigorReportId) return res.status(400).json({ error: 'rigor_report_id is required' });

  try {
    let verdict;
    try {
      verdict = verifyRigorViaPython({
        description: '',
        costUsd: 0,
        clientId,
        action: 'rigor-client-ack',
        ticketId: 'n/a',
        authorizedRepWhatsAppNumbers: getAuthorizedRepWhatsAppNumbers(clientId),
        clientAcknowledged: true,
        rigorReportId: String(rigorReportId),
      });
    } catch (e) {
      if (isPythonSpawnEnoent(e)) {
        return res.status(503).json({
          error: 'RIGOR_ACK_REQUIRES_PYTHON_OR_DISK',
          hint:
            'Client acknowledgement uses the Python verifier and pending report files on disk — not available on this serverless host. Run ack from an environment with Python and a writable vanguard/audit-trail, or extend the API with a Postgres-backed rigor store.',
        });
      }
      throw e;
    }

    return res.status(200).json({
      ok: true,
      client_id: clientId,
      rigor_report_id: String(rigorReportId),
      staff_id: staffId,
      verdict,
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:rigor-client-ack',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'rigor-client-ack' },
      recommended_action: 'Check verify-rigor runtime and pending report persistence.',
      meta: { client_id: clientId, rigor_report_id: String(rigorReportId) },
    });
    return deny(res, 500, 'Rigor acknowledgement failed.');
  }
}

async function handleAdminToggleClusters(req, res) {
  const gate = requireDormantGate(req, res, 'admin-toggle-clusters');
  if (gate !== true) return gate;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const clientId = getClientIdFromBody(body);
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });

  const adminSubUserId = getSubUserId(req);
  const targetSubUserId =
    body?.target_sub_user_id || body?.targetSubUserId || body?.sub_user_id || body?.subUserId;
  if (!adminSubUserId) return res.status(400).json({ error: 'x-subuser-id header is required' });
  if (!targetSubUserId) return res.status(400).json({ error: 'target_sub_user_id is required' });

  const clustersEnabled = Array.isArray(body?.clusters_enabled)
    ? body.clusters_enabled
    : Array.isArray(body?.clustersEnabled)
      ? body.clustersEnabled
      : [];

  const manifest = readJsonFileSafe(SECRETS_MANIFEST_PATH) || {};
  const accessClusters = manifest?.tenant_access?.[clientId]?.access_clusters || {};
  const clientAdmins = accessClusters?.client_admins || [];

  if (!clientAdmins.includes(adminSubUserId)) {
    return deny(res, 403, 'Admin is not authorized to toggle access clusters.', {
      client_id: clientId,
      admin_sub_user_id: adminSubUserId,
    });
  }

  manifest.tenant_access = manifest.tenant_access || {};
  manifest.tenant_access[clientId] = manifest.tenant_access[clientId] || {};
  manifest.tenant_access[clientId].access_clusters = manifest.tenant_access[clientId].access_clusters || {};
  manifest.tenant_access[clientId].access_clusters.sub_users =
    manifest.tenant_access[clientId].access_clusters.sub_users || {};

  manifest.tenant_access[clientId].access_clusters.sub_users[targetSubUserId] = {
    clusters_enabled: clustersEnabled,
  };

  try {
    writeJsonFileSafe(SECRETS_MANIFEST_PATH, manifest);
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:admin-toggle-clusters',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'admin-toggle-clusters' },
      recommended_action: 'Verify filesystem permissions for vanguard/secrets-manifest.json.',
      meta: { client_id: clientId, admin_sub_user_id: adminSubUserId, target_sub_user_id: targetSubUserId },
    });
    return deny(res, 500, 'Failed to persist cluster toggles.');
  }

  return res.status(200).json({ ok: true, client_id: clientId, target_sub_user_id: targetSubUserId });
}

export default async function handler(req, res) {
  const action = resolveAction(req);
  if (!action) {
    return res.status(400).json({ error: 'Missing action', usage: 'GET/POST /api/cmp/<action> (see vercel rewrites)' });
  }

  switch (action) {
    case 'ticket-create':
      return handleTicketCreate(req, res);
    case 'ticket-get':
      return handleTicketGet(req, res);
    case 'ticket-list':
      return handleTicketList(req, res);
    case 'session-verify':
      return handleSessionVerify(req, res);
    case 'tenant-session-bootstrap':
      return handleTenantSessionBootstrap(req, res);
    case 'provision-tenant-pin':
      return handleProvisionTenantPin(req, res);
    case 'tenant-log-stream':
      return handleTenantLogStream(req, res);
    case 'signoff':
      return handleSignoff(req, res);
    case 'approve-build':
      return handleApproveBuild(req, res);
    case 'costing-preview':
      return handleCostingPreview(req, res);
    case 'ai-interview':
      return handleAiInterview(req, res);
    case 'change-chat':
      return handleChangeChat(req, res);
    case 'sandbox-start':
      return handleSandboxStart(req, res);
    case 'evolution-request':
      return handleEvolutionRequest(req, res);
    case 'market-research':
      return handleMarketResearch(req, res);
    case 'supplier-onboard':
      return handleSupplierOnboard(req, res);
    case 'rigor-client-ack':
      return handleRigorClientAck(req, res);
    case 'admin-toggle-clusters':
      return handleAdminToggleClusters(req, res);
    default:
      return res.status(404).json({ error: 'Unknown action', action });
  }
}
