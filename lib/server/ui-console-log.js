import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { emitTelemetry } from '../cmp/_lib/telemetry.js';
import { cfg } from './runtime-config.js';
import { getSessionFromRequest } from './session.js';

const prisma = new PrismaClient();

function str(v) {
  return v != null ? String(v).trim() : '';
}

function clamp(s, max) {
  const x = str(s);
  if (!x) return '';
  return x.length > max ? x.slice(0, max) : x;
}

function sha1(s) {
  return crypto.createHash('sha1').update(String(s || ''), 'utf8').digest('hex').slice(0, 12);
}

function looksSensitiveKey(k) {
  return /(pass|password|token|auth|authorization|secret|api[_-]?key|private[_-]?key|cookie|session)/i.test(String(k || ''));
}

function sanitizeObject(v, depth = 0) {
  if (!v || typeof v !== 'object') return null;
  if (Array.isArray(v)) return null;
  if (depth > 3) return null;
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    if (!k) continue;
    if (looksSensitiveKey(k)) continue;
    if (val == null) continue;
    if (typeof val === 'string') {
      const s = val.length > 400 ? val.slice(0, 400) : val;
      out[k] = s;
      continue;
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
      out[k] = val;
      continue;
    }
    if (typeof val === 'object') {
      const child = sanitizeObject(val, depth + 1);
      if (child && Object.keys(child).length) out[k] = child;
      continue;
    }
  }
  return out;
}

/**
 * Server-side sanitization for UI console log payloads.
 *
 * @param {unknown} raw
 * @returns {{ ok: true, payload: { level: 'warn'|'error', message: string, page?: string|null, url?: string|null, ticket_id?: string|null, stack?: string, meta?: Record<string, unknown>|null } } | { ok: false, error: string }}
 */
export function normalizeUiConsoleLogPayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'bad_payload' };
  const o = /** @type {Record<string, unknown>} */ (raw);
  const level = str(o.level || '').toLowerCase() === 'error' ? 'error' : 'warn';
  const message = clamp(o.message, 1200);
  if (!message) return { ok: false, error: 'message_required' };
  const page = clamp(o.page, 120) || null;
  const url = clamp(o.url, 300) || null;
  const ticket_id = clamp(o.ticket_id || o.ticketId, 140) || null;
  const stack = clamp(o.stack, 1800) || '';
  const metaRaw = o.meta && typeof o.meta === 'object' && !Array.isArray(o.meta) ? o.meta : null;
  const meta = metaRaw ? sanitizeObject(metaRaw) : null;
  return { ok: true, payload: { level, message, page, url, ticket_id, stack, meta } };
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {{ ok: true, typ: 'admin'|'tenant', tenantId: string|null } | { ok: false, status: number, error: string }}
 */
function requireUserSession(req) {
  const sess = getSessionFromRequest(req);
  if (!(sess?.ok === true && sess.payload?.typ)) {
    return { ok: false, status: 401, error: 'LOGIN_REQUIRED' };
  }
  const typ = String(sess.payload.typ || '').toLowerCase();
  if (typ === 'admin') return { ok: true, typ: 'admin', tenantId: null };
  if (typ === 'tenant' && sess.payload.tenant_id) {
    return { ok: true, typ: 'tenant', tenantId: String(sess.payload.tenant_id).trim() || null };
  }
  return { ok: false, status: 403, error: 'UNAUTHORIZED' };
}

function parseBody(req) {
  const b = req.body && typeof req.body === 'object' ? req.body : null;
  if (!b) return { ok: false, status: 400, error: 'Missing JSON body' };
  return { ok: true, body: b };
}

/**
 * POST /api/ui/console-log
 * Auth: tenant or admin session cookie
 *
 * Body:
 * {
 *   level: "warn"|"error",
 *   message: string,
 *   page?: string,
 *   url?: string,
 *   ticket_id?: string,
 *   detail?: object
 * }
 */
export async function handleUiConsoleLog(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireUserSession(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const pgUrl = str(cfg('POSTGRES_URL', ''));
  if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

  const parsed = parseBody(req);
  if (!parsed.ok) return res.status(parsed.status).json({ error: parsed.error });

  const norm = normalizeUiConsoleLogPayload(parsed.body || {});
  if (!norm.ok) return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  const { level, message, page, url, ticket_id: ticketId, stack, meta } = norm.payload;
  const detail = meta && typeof meta === 'object' ? meta : null;

  // Best-effort dedupe: same level+message+page per tenant per day.
  const day = new Date().toISOString().slice(0, 10);
  const idem = `ui:console:${day}:${level}:${sha1(`${page || ''}|${message}`)}`;

  try {
    await recordTrustedAutomationEvent(prisma, {
      tenantId: auth.tenantId,
      eventType: 'ui.console.log',
      payload: {
        level,
        message,
        ticket_id: ticketId,
        page,
        url,
        surface: auth.typ === 'admin' ? 'core' : 'tenant',
        detail: detail ? { ...(detail || {}), ...(stack ? { stack } : {}) } : (stack ? { stack } : null),
      },
      idempotencyKey: idem,
      source: 'ui_console_log',
    });

    emitTelemetry({
      event_type: 'ui.console.log',
      payload: { level, ticket_id: ticketId, page, url: url || null },
      cmp: { ticket_id: ticketId || 'n/a', action: 'ui-console-log' },
    });

    return res.status(200).json({ ok: true, deduped_key: idem });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'UI_CONSOLE_LOG_FAILED', detail: String(e?.message || e).slice(0, 300) });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

export default handleUiConsoleLog;

