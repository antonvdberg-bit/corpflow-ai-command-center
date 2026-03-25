import { createBaserowClient, BaserowError } from './_lib/baserow.js';
import { initialTicketPayload, getCmpFieldMap, approveBuildPayload } from './_lib/cmp-fields.js';
import { computeMarketValueCost } from './_lib/costing-engine.js';
import {
  buildImpactSummary,
  inferComplexityFromDescription,
  inferRiskFromDescription,
} from './_lib/preview-heuristics.js';
import { buildClarificationQuestions } from './_lib/ai-interview.js';

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
  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }

  try {
    const client = createBaserowClient({});
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
      return res.status(e.status >= 400 && e.status < 600 ? e.status : 502).json({
        error: e.message,
        detail: e.body,
      });
    }
    console.error('ticket-create', e);
    return res.status(500).json({ error: 'Ticket create failed', detail: String(e?.message || e) });
  }
}

async function handleTicketGet(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = req.query?.id;
  if (!id || String(id).trim() === '') {
    return res.status(400).json({ error: 'id query parameter is required' });
  }

  try {
    const client = createBaserowClient({});
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
      const code = e.status === 404 ? 404 : e.status >= 400 && e.status < 600 ? e.status : 502;
      return res.status(code).json({ error: e.message, detail: e.body });
    }
    console.error('ticket-get', e);
    return res.status(500).json({ error: 'Ticket get failed', detail: String(e?.message || e) });
  }
}

async function handleApproveBuild(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  if (!ticketId) {
    return res.status(400).json({ error: 'ticket_id is required' });
  }

  try {
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
      return res.status(e.status >= 400 && e.status < 600 ? e.status : 502).json({
        error: e.message,
        detail: e.body,
      });
    }
    console.error('approve-build', e);
    return res.status(500).json({ error: 'Approve build failed', detail: String(e?.message || e) });
  }
}

async function handleCostingPreview(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    case 'approve-build':
      return handleApproveBuild(req, res);
    case 'costing-preview':
      return handleCostingPreview(req, res);
    case 'ai-interview':
      return handleAiInterview(req, res);
    case 'sandbox-start':
      return handleSandboxStart(req, res);
    default:
      return res.status(404).json({ error: 'Unknown action', action });
  }
}
