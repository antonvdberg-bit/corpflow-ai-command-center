/**
 * Chat Widget v0 — HTTP handlers.
 *
 * Five public surfaces, all dispatched from `api/factory_router.js`:
 *
 *   GET  /api/chat-widget/loader.js           -> handleChatWidgetLoader
 *   POST /api/chat-widget/start               -> handleChatWidgetStart
 *   POST /api/chat-widget/step                -> handleChatWidgetStep
 *   POST /api/chat-widget/submit              -> handleChatWidgetSubmit (terminal handshake)
 *   POST /api/chat-widget/admin/kill-switch   -> handleChatWidgetKillSwitch (factory-only)
 *
 * Tenant resolution: the upstream router populates `req.corpflowContext` from
 * `tenant_hostnames`. We pull `tenant_id` from there. No fallback default.
 *
 * Tenant isolation invariants:
 *   - Every Prisma query in this file filters by `tenantId` (no exceptions).
 *   - The widget bundle text is generic; only `/start` returns tenant-scoped
 *     `config` (brand name, accent, greeting). `flow_json` itself is never
 *     served raw to the client; only the `publicNodeView` for the current node.
 */

import { PrismaClient } from '@prisma/client';

import { getSessionFromRequest } from '../session.js';
import { loadConfigForRequest, isOriginAllowed, bumpMonthlyMessageCounter } from './config.js';
import { validateFlow, getNode, sanitiseFieldInput, publicNodeView } from './flow.js';
import { extractClientIp, hashIpForTenant, checkAndConsume } from './rate-limit.js';
import { emitChatWidgetSubmitted } from './notify.js';

let prismaSingleton = null;
function getPrisma() {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let buf = '';
    try {
      req.setEncoding && req.setEncoding('utf8');
    } catch {
      /* ignore */
    }
    req.on('data', (c) => {
      buf += c;
      if (buf.length > 64 * 1024) {
        try { req.destroy(); } catch { /* ignore */ }
        resolve({});
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(buf || '{}')); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function setCorsForApi(res, origin) {
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

function pickOrigin(req) {
  const o = req?.headers?.origin;
  if (Array.isArray(o)) return String(o[0] || '');
  if (typeof o === 'string') return o;
  return '';
}

/**
 * Allow-list-aware preflight. Only emits CORS headers when the request `Origin`
 * is in the per-tenant allow-list — so the browser's preflight cleanly fails
 * for rogue origins instead of misleadingly succeeding then failing the POST.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function handlePreflight(req, res) {
  const cfg = await loadConfigForRequest(req).catch(() => null);
  const origin = pickOrigin(req);
  if (cfg && cfg.enabled && isOriginAllowed(origin, cfg.allowedOrigins)) {
    setCorsForApi(res, origin);
  } else {
    // No CORS headers -> browser preflight fails -> POST is never sent.
    res.setHeader('Vary', 'Origin');
  }
  return res.status(204).end();
}

/**
 * Common public-endpoint gate: tenant context, kill switch, origin allow-list,
 * rate limit. Returns the loaded `cfg` on success, or `null` if a response was
 * already sent (caller must early-return).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<{ cfg: Awaited<ReturnType<typeof loadConfigForRequest>>; ipHash: string } | null>}
 */
async function gatePublicEndpoint(req, res) {
  const cfg = await loadConfigForRequest(req).catch(() => null);
  if (!cfg) {
    res.status(404).json({ ok: false, error: 'tenant_or_config_not_found' });
    return null;
  }
  if (!cfg.enabled) {
    res.status(403).json({ ok: false, error: 'WIDGET_DISABLED' });
    return null;
  }
  const origin = pickOrigin(req);
  if (!isOriginAllowed(origin, cfg.allowedOrigins)) {
    res.status(403).json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' });
    return null;
  }
  setCorsForApi(res, origin);

  const ip = extractClientIp(req);
  const ipHash = hashIpForTenant(ip, cfg.tenantId);
  const rl = await checkAndConsume({
    tenantId: cfg.tenantId,
    ipHash,
    limitPerWindow: cfg.rateLimitPerWindow,
    windowSeconds: cfg.rateLimitWindowSeconds,
  });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSeconds));
    res.status(429).json({ ok: false, error: 'RATE_LIMITED' });
    return null;
  }
  return { cfg, ipHash };
}

/* ----------------------------- loader.js ----------------------------- */

export async function handleChatWidgetLoader(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  const cfg = await loadConfigForRequest(req).catch(() => null);
  // Loader.js is public + cacheable for a short window. Tenant-aware via host.
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-CorpFlow-Chat-Widget', cfg ? (cfg.enabled ? 'enabled' : 'disabled') : 'unconfigured');
  if (req.method === 'HEAD') return res.status(200).end();

  // Lazy import to keep the route module load light.
  const mod = await import('./widget-bundle.js');
  const body = mod.getWidgetBundle({ enabled: !!(cfg && cfg.enabled) });
  return res.status(200).send(body);
}

/* ----------------------------- start ----------------------------- */

export async function handleChatWidgetStart(req, res) {
  if (req.method === 'OPTIONS') return handlePreflight(req, res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const gate = await gatePublicEndpoint(req, res);
  if (!gate) return;
  const { cfg, ipHash } = gate;

  let flow;
  try { flow = validateFlow(cfg.flowJson); } catch (e) {
    return res.status(500).json({ ok: false, error: 'flow_invalid', detail: String(e.message || e) });
  }
  const rootNode = getNode(flow, flow.root);
  if (!rootNode) return res.status(500).json({ ok: false, error: 'flow_root_missing' });

  const body = await readJsonBody(req);
  const sourceHost = typeof body.source_host === 'string' ? body.source_host.slice(0, 255) : null;
  const sourcePath = typeof body.source_path === 'string' ? body.source_path.slice(0, 500) : null;
  const userAgent = typeof req.headers['user-agent'] === 'string' ? String(req.headers['user-agent']).slice(0, 500) : null;

  const prisma = getPrisma();
  const thread = await prisma.chatWidgetThread.create({
    data: {
      tenantId: cfg.tenantId,
      sourceHost,
      sourcePath,
      ipHash,
      userAgent,
      status: 'active',
      flowVersion: cfg.flowVersion,
      currentNode: flow.root,
    },
    select: { id: true },
  });

  await prisma.chatWidgetMessage.create({
    data: {
      threadId: thread.id,
      tenantId: cfg.tenantId,
      direction: 'bot',
      nodeId: flow.root,
      content: String(rootNode.prompt || ''),
    },
  });
  await bumpMonthlyMessageCounter(cfg.tenantId, 1).catch(() => {});

  return res.status(200).json({
    ok: true,
    thread_id: thread.id,
    config: {
      brandName: cfg.brandName,
      brandAccent: cfg.brandAccent,
      brandLogoUrl: cfg.brandLogoUrl,
      greeting: cfg.greeting,
    },
    node: publicNodeView(flow.root, rootNode),
  });
}

/* ----------------------------- step ----------------------------- */

export async function handleChatWidgetStep(req, res) {
  if (req.method === 'OPTIONS') return handlePreflight(req, res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const gate = await gatePublicEndpoint(req, res);
  if (!gate) return;
  const { cfg } = gate;

  let flow;
  try { flow = validateFlow(cfg.flowJson); } catch (e) {
    return res.status(500).json({ ok: false, error: 'flow_invalid', detail: String(e.message || e) });
  }

  const body = await readJsonBody(req);
  const threadId = typeof body.thread_id === 'string' ? body.thread_id.trim() : '';
  if (!threadId) return res.status(400).json({ ok: false, error: 'missing_thread_id' });

  const prisma = getPrisma();
  const thread = await prisma.chatWidgetThread.findFirst({
    where: { id: threadId, tenantId: cfg.tenantId },
    select: {
      id: true, tenantId: true, status: true, currentNode: true,
      leadName: true, leadEmail: true, leadPhone: true, requestType: true, leadMessage: true,
      sourceHost: true, sourcePath: true,
    },
  });
  if (!thread) return res.status(404).json({ ok: false, error: 'thread_not_found' });
  if (thread.status !== 'active') return res.status(409).json({ ok: false, error: 'thread_not_active' });

  const currentNode = getNode(flow, thread.currentNode || flow.root);
  if (!currentNode) return res.status(500).json({ ok: false, error: 'current_node_missing' });

  // Determine the next node id based on the input shape.
  let nextNodeId = null;
  let userText = null;
  let userNodeIdForLog = thread.currentNode || flow.root;
  let updateLeadFields = /** @type {Record<string, string>} */ ({});

  if (currentNode.type === 'menu' || (currentNode.type === 'info' && Array.isArray(currentNode.options))) {
    const choice = typeof body.choice === 'string' ? body.choice.trim() : '';
    if (!choice) return res.status(400).json({ ok: false, error: 'missing_choice' });
    const valid = (Array.isArray(currentNode.options) ? currentNode.options : []).find((o) => o && o.next === choice);
    if (!valid) return res.status(400).json({ ok: false, error: 'invalid_choice' });
    nextNodeId = valid.next;
    userText = String(valid.label || choice);
  } else if (currentNode.type === 'info') {
    const next = typeof body.next === 'string' ? body.next.trim() : '';
    if (!next || next !== currentNode.next) return res.status(400).json({ ok: false, error: 'invalid_next' });
    nextNodeId = next;
    userText = '(continue)';
  } else if (currentNode.type === 'collect_field') {
    const raw = typeof body.input === 'string' ? body.input : '';
    let cleaned;
    try { cleaned = sanitiseFieldInput(currentNode.field, raw); } catch (e) {
      return res.status(400).json({ ok: false, error: String(e.message || 'field_invalid') });
    }
    nextNodeId = currentNode.next;
    userText = cleaned;
    if (currentNode.field === 'name') updateLeadFields.leadName = cleaned;
    else if (currentNode.field === 'email') updateLeadFields.leadEmail = cleaned;
    else if (currentNode.field === 'phone') updateLeadFields.leadPhone = cleaned;
    else if (currentNode.field === 'message') updateLeadFields.leadMessage = cleaned;
    else if (currentNode.field === 'request_type') updateLeadFields.requestType = cleaned;
  } else if (currentNode.type === 'submit') {
    return res.status(409).json({ ok: false, error: 'thread_already_submitted' });
  } else {
    return res.status(500).json({ ok: false, error: 'unsupported_node_type' });
  }

  const nextNode = getNode(flow, nextNodeId);
  if (!nextNode) return res.status(500).json({ ok: false, error: 'next_node_missing' });

  // Record the user message and advance.
  await prisma.chatWidgetMessage.create({
    data: {
      threadId: thread.id,
      tenantId: cfg.tenantId,
      direction: 'user',
      nodeId: userNodeIdForLog,
      content: String(userText || '').slice(0, 2000),
    },
  });
  await prisma.chatWidgetMessage.create({
    data: {
      threadId: thread.id,
      tenantId: cfg.tenantId,
      direction: 'bot',
      nodeId: nextNodeId,
      content: String(nextNode.prompt || ''),
    },
  });
  await bumpMonthlyMessageCounter(cfg.tenantId, 2).catch(() => {});

  let leadUpdate = { ...updateLeadFields };
  if (nextNode.type === 'submit') {
    leadUpdate.status = 'completed';
    leadUpdate.completedAt = new Date();
    if (typeof nextNode.request_type === 'string' && !leadUpdate.requestType) {
      leadUpdate.requestType = nextNode.request_type;
    }
    leadUpdate.currentNode = nextNodeId;
  } else {
    leadUpdate.currentNode = nextNodeId;
  }

  if (Object.keys(leadUpdate).length) {
    // Tenant-scoped write (defence-in-depth): even though the prior `findFirst`
    // already verified `tenantId`, we re-assert it here so every chat_widget_*
    // mutation in this file is covered by an explicit tenant filter.
    await prisma.chatWidgetThread.updateMany({
      where: { id: thread.id, tenantId: cfg.tenantId },
      data: leadUpdate,
    });
  }

  let completed = false;
  if (nextNode.type === 'submit') {
    completed = true;
    const fresh = await prisma.chatWidgetThread.findFirst({
      where: { id: thread.id, tenantId: cfg.tenantId },
      select: {
        leadName: true, leadEmail: true, leadPhone: true, requestType: true, leadMessage: true,
        sourceHost: true, sourcePath: true,
      },
    });
    const notify = await emitChatWidgetSubmitted(prisma, {
      tenantId: cfg.tenantId,
      threadId: thread.id,
      leadName: fresh && fresh.leadName,
      leadEmail: fresh && fresh.leadEmail,
      leadPhone: fresh && fresh.leadPhone,
      requestType: (fresh && fresh.requestType) || (typeof nextNode.request_type === 'string' ? nextNode.request_type : null),
      leadMessage: fresh && fresh.leadMessage,
      sourceHost: fresh && fresh.sourceHost,
      sourcePath: fresh && fresh.sourcePath,
    });
    await prisma.chatWidgetThread.updateMany({
      where: { id: thread.id, tenantId: cfg.tenantId },
      data: notify.ok
        ? { notifiedAt: new Date(), notifyError: null }
        : { notifyError: String(notify.error || 'unknown_notify_error').slice(0, 500) },
    });
  }

  return res.status(200).json({
    ok: true,
    next: publicNodeView(nextNodeId, nextNode),
    completed,
  });
}

/* ----------------------------- submit (terminal handshake) ----------------------------- */

export async function handleChatWidgetSubmit(req, res) {
  // /step finalises on `submit` nodes already. /submit is a separate handshake the
  // widget can call to confirm completion (e.g. analytics ping). v0 widget bundle
  // does NOT call this endpoint, but it is locked down with the same gates as
  // /start and /step so a future widget version can be added without re-wiring
  // the security perimeter.
  if (req.method === 'OPTIONS') return handlePreflight(req, res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const gate = await gatePublicEndpoint(req, res);
  if (!gate) return;
  return res.status(200).json({ ok: true, ack: true });
}

/* ----------------------------- admin/kill-switch ----------------------------- */

export async function handleChatWidgetKillSwitch(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const sess = getSessionFromRequest(req);
  const isAdmin = !!(sess && sess.ok === true && sess.payload && sess.payload.typ === 'admin');
  if (!isAdmin) {
    return res.status(403).json({ ok: false, error: 'forbidden_factory_master_only' });
  }
  const body = await readJsonBody(req);
  const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id.trim() : '';
  const enabled = body.enabled === true || body.enabled === 'true';
  if (!tenantId) return res.status(400).json({ ok: false, error: 'missing_tenant_id' });
  const prisma = getPrisma();
  const existing = await prisma.chatWidgetConfig.findUnique({ where: { tenantId } });
  if (!existing) return res.status(404).json({ ok: false, error: 'config_not_found' });
  const updated = await prisma.chatWidgetConfig.update({
    where: { tenantId },
    data: { enabled },
    select: { tenantId: true, enabled: true, updatedAt: true },
  });
  return res.status(200).json({ ok: true, tenant_id: updated.tenantId, enabled: updated.enabled, updated_at: updated.updatedAt });
}
