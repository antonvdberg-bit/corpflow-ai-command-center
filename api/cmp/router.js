import { createBaserowClient, BaserowError } from './_lib/baserow.js';
import { initialTicketPayload, getCmpFieldMap, approveBuildPayload } from './_lib/cmp-fields.js';
import { computeMarketValueCost } from './_lib/costing-engine.js';
import {
  buildImpactSummary,
  inferComplexityFromDescription,
  inferRiskFromDescription,
} from './_lib/preview-heuristics.js';
import { buildClarificationQuestions } from './_lib/ai-interview.js';
import { emitLogicFailure } from './_lib/telemetry.js';
import { debitTokenCreditBalance, getTokenCreditBalance } from '../factory/costing.js';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
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
  if (verifyDormantGateToken(req)) return true;

  emitLogicFailure({
    source: 'api/cmp/router.js:dormant-gate',
    severity: 'warning',
    error: new Error(`Dormant Gate blocked action=${action}`),
    cmp: { ticket_id: 'n/a', action },
    recommended_action:
      'Provide a valid admin session token (must match MASTER_ADMIN_KEY or ADMIN_PIN in Vercel secrets).',
  });

  return deny(res, 403, 'Dormant Gate: session token required.', { action });
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

function verifyDormantGateToken(req) {
  const token =
    (req.query?.token ||
      req.body?.token ||
      req.headers?.get?.('x-session-token') ||
      req.headers?.['x-session-token'] ||
      '')?.toString();
  const master = (process.env.MASTER_ADMIN_KEY || process.env.ADMIN_PIN || '').toString();
  if (!DORMANT_GATE_ENABLED) return true;
  if (!token || !master) return false;
  return timingSafeEquals(token, master);
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
 * - `vercel.json` rewrite: `/api/cmp/:name` → `/api/cmp/router?action=:name`
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
    const client = createBaserowClient({ tenantId: clientId || null });
    const fields = initialTicketPayload(description);
    const clientField = process.env.BASEROW_CMP_CLIENT_ID_FIELD;
    if (clientField && body.client_id) fields[clientField] = String(body.client_id);
    const siteField = process.env.BASEROW_CMP_SITE_ID_FIELD;
    if (siteField && body.site_id) fields[siteField] = String(body.site_id);

    const row = await client.createRow(undefined, fields);
    const ticketId = row?.id != null ? String(row.id) : null;
    if (!ticketId) {
      return res.status(502).json({ error: 'Baserow did not return a row id' });
    }

    return res.status(200).json({
      ticket_id: ticketId,
      baserow_row: row,
    });
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
    ensureTenantProvisionedViaPython(clientId);

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

    // Reconstruct description to re-run ethical/budget gate.
    let description = typeof body?.description === 'string' ? body.description.trim() : '';
    if (!description) {
      const client = createBaserowClient({});
      const row = await client.getRow(undefined, ticketId);
      const f = getCmpFieldMap();
      description =
        row?.[f.description] ?? row?.Description ?? row?.description ?? '';
      description = typeof description === 'string' ? description.trim() : '';
    }
    if (!description) {
      emitLogicFailure({
        source: 'api/cmp/router.js:approve-build',
        severity: 'fatal',
        error: new Error('Missing description for ethical sentinel re-check'),
        cmp: { ticket_id: ticketId, action: 'approve-build' },
        recommended_action: 'Verify Baserow CMP Description field mapping.',
      });
      return deny(res, 500, 'Approve blocked: missing description context for verifier.');
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

    const verdict = verifyRigorViaPython({
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

    const client = createBaserowClient({});
    const fields = approveBuildPayload();
    const row = await client.updateRow(undefined, ticketId, fields);
    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      baserow_row: row,
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
    return res.status(500).json({ error: 'Approve build failed', detail: String(e?.message || e) });
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

  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
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
  const ticketId = body.ticketId != null ? String(body.ticketId) : 'n/a';
  const costUsd = Number(cost?.full_market_value_usd);

  try {
    const verdict = verifyRigorViaPython({
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
    ticket_id: body.ticketId != null ? String(body.ticketId) : null,
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

  const result = buildClarificationQuestions(description);
  return res.status(200).json(result);
}

async function handleSandboxStart(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(501).json({
    error: 'sandbox-start is not implemented yet',
    hint: 'Use .github/workflows/cmp-branch.yml (workflow_dispatch) until this endpoint is wired.',
  });
}

async function handleSessionVerify(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.query?.token || req.body?.token || '').toString();
  if (!DORMANT_GATE_ENABLED) {
    return res.status(200).json({ ok: true, dormant_gate: false });
  }

  const master = (process.env.MASTER_ADMIN_KEY || process.env.ADMIN_PIN || '').toString();
  const ok = token && master && timingSafeEquals(token, master);

  if (!ok) {
    return deny(res, 401, 'Dormant Gate verification failed.');
  }

  return res.status(200).json({ ok: true, dormant_gate: true });
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
    const verdict = verifyRigorViaPython({
      description: '',
      costUsd: 0,
      clientId,
      action: 'rigor-client-ack',
      ticketId: 'n/a',
      authorizedRepWhatsAppNumbers: getAuthorizedRepWhatsAppNumbers(clientId),
      clientAcknowledged: true,
      rigorReportId: String(rigorReportId),
    });

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
    case 'session-verify':
      return handleSessionVerify(req, res);
    case 'approve-build':
      return handleApproveBuild(req, res);
    case 'costing-preview':
      return handleCostingPreview(req, res);
    case 'ai-interview':
      return handleAiInterview(req, res);
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
