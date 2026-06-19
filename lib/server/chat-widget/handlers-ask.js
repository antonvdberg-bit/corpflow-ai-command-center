/**
 * Chat Widget — retrieval AI ask handler.
 *
 * POST /api/chat-widget/ask
 */

import { PrismaClient } from '@prisma/client';

import { loadConfigForRequest, bumpMonthlyMessageCounter, isOriginAllowed } from './config.js';
import { extractClientIp, hashIpForTenant, checkAndConsume } from './rate-limit.js';
import { answerChatWidgetQuestion, sanitiseVisitorQuestion } from './retrieval/answer.js';
import {
  AI_ASK_THINKING_MESSAGE,
  waitForAiResponseDelay,
} from './retrieval/response-delay.js';

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

function pickOrigin(req) {
  const o = req?.headers?.origin;
  if (Array.isArray(o)) return String(o[0] || '');
  if (typeof o === 'string') return o;
  return '';
}

function setCorsForApi(res, origin) {
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

async function handlePreflight(req, res) {
  const cfg = await loadConfigForRequest(req).catch(() => null);
  const origin = pickOrigin(req);
  if (cfg && cfg.enabled && isOriginAllowed(origin, cfg.allowedOrigins)) {
    setCorsForApi(res, origin);
  } else {
    res.setHeader('Vary', 'Origin');
  }
  return res.status(204).end();
}

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
  return { cfg };
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleChatWidgetAsk(req, res) {
  if (req.method === 'OPTIONS') return handlePreflight(req, res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const gate = await gatePublicEndpoint(req, res);
  if (!gate) return;
  const { cfg } = gate;

  const body = await readJsonBody(req);
  const threadId = typeof body.thread_id === 'string' ? body.thread_id.trim() : '';
  const question = sanitiseVisitorQuestion(body.question);
  if (!threadId) return res.status(400).json({ ok: false, error: 'missing_thread_id' });
  if (!question) return res.status(400).json({ ok: false, error: 'missing_question' });

  const prisma = getPrisma();
  const thread = await prisma.chatWidgetThread.findFirst({
    where: { id: threadId, tenantId: cfg.tenantId },
    select: { id: true, status: true },
  });
  if (!thread) return res.status(404).json({ ok: false, error: 'thread_not_found' });
  if (thread.status !== 'active') return res.status(409).json({ ok: false, error: 'thread_not_active' });

  const startedAt = Date.now();

  const result = await answerChatWidgetQuestion(prisma, {
    cfg,
    threadId,
    question,
  });

  await prisma.chatWidgetMessage.create({
    data: {
      threadId,
      tenantId: cfg.tenantId,
      direction: 'user',
      nodeId: 'ai_ask',
      content: question,
    },
  });
  await prisma.chatWidgetMessage.create({
    data: {
      threadId,
      tenantId: cfg.tenantId,
      direction: 'bot',
      nodeId: 'ai_answer',
      content: result.answer.slice(0, 2000),
    },
  });
  await bumpMonthlyMessageCounter(cfg.tenantId, 2).catch(() => {});

  await waitForAiResponseDelay(startedAt);

  return res.status(200).json({
    ok: result.ok,
    answer: result.answer,
    mode: result.mode,
    provider: result.provider,
    model: result.model,
    context_atom_ids: result.contextAtomIds,
    schedule_entry_ids: result.scheduleEntryIds,
    safety_route: result.safetyRoute,
    thinking_message: AI_ASK_THINKING_MESSAGE,
  });
}
