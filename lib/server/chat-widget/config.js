/**
 * Chat Widget v0 — per-tenant config loader.
 *
 * Resolves the tenant id from `req.corpflowContext` (already populated upstream
 * by `applyCorpflowHostTenantResolution` in `api/factory_router.js`), then looks
 * up the single `chat_widget_configs` row keyed by tenant_id.
 *
 * Anonymous-public widget surfaces call this; tenant containment is enforced by
 * (a) host -> tenant_id resolution in tenant_hostnames, and (b) every chat-widget
 * DB query filtering by tenant_id.
 *
 * Behaviour:
 *   - Returns `null` when no tenant context is available (apex / unknown host).
 *   - Returns `null` when no config row exists.
 *   - Returns `{ enabled: false, ... }` when kill switch is OFF (handlers must
 *     short-circuit on `enabled === false`).
 */

import { PrismaClient } from '@prisma/client';

let prismaSingleton = null;

function getPrisma() {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

/**
 * @param {import('http').IncomingMessage & { corpflowContext?: { surface?: string; tenant_id?: string } }} req
 * @returns {string|null}
 */
export function resolveTenantIdFromRequest(req) {
  try {
    const ctx = req?.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return null;
    const tid = ctx.tenant_id != null ? String(ctx.tenant_id).trim() : '';
    return tid || null;
  } catch {
    return null;
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<null | {
 *   tenantId: string;
 *   enabled: boolean;
 *   brandName: string;
 *   brandAccent: string | null;
 *   brandLogoUrl: string | null;
 *   greeting: string;
 *   flowJson: unknown;
 *   flowVersion: number;
 *   notifyVia: string;
 *   notifyEmail: string | null;
 *   allowedOrigins: string[];
 *   rateLimitPerWindow: number;
 *   rateLimitWindowSeconds: number;
 *   aiBudgetMonthlyUsd: number;
 *   aiBudgetSpentUsd: number;
 *   aiBudgetMonthYyyymm: string | null;
 *   messagesThisMonth: number;
 *   messagesMonthYyyymm: string | null;
 * }>}
 */
export async function loadConfigForRequest(req) {
  const tenantId = resolveTenantIdFromRequest(req);
  if (!tenantId) return null;
  const prisma = getPrisma();
  const row = await prisma.chatWidgetConfig.findUnique({ where: { tenantId } });
  if (!row) return null;
  return {
    tenantId: row.tenantId,
    enabled: !!row.enabled,
    brandName: row.brandName,
    brandAccent: row.brandAccent || null,
    brandLogoUrl: row.brandLogoUrl || null,
    greeting: row.greeting || 'Hi! How can we help today?',
    flowJson: row.flowJson,
    flowVersion: row.flowVersion || 1,
    notifyVia: row.notifyVia || 'automation_event',
    notifyEmail: row.notifyEmail || null,
    allowedOrigins: Array.isArray(row.allowedOrigins) ? row.allowedOrigins.map(String) : [],
    rateLimitPerWindow: row.rateLimitPerWindow || 30,
    rateLimitWindowSeconds: row.rateLimitWindowSeconds || 300,
    aiBudgetMonthlyUsd: Number(row.aiBudgetMonthlyUsd || 0),
    aiBudgetSpentUsd: Number(row.aiBudgetSpentUsd || 0),
    aiBudgetMonthYyyymm: row.aiBudgetMonthYyyymm || null,
    messagesThisMonth: Number(row.messagesThisMonth || 0),
    messagesMonthYyyymm: row.messagesMonthYyyymm || null,
  };
}

/**
 * Tenant-scoped origin check. v0 default policy: explicit allow-list per tenant.
 * Empty list -> strict reject (every origin returns false). Operators must seed
 * at least one entry (typically the tenant subdomain itself) before the widget
 * can be exercised. See chatbot-v0-delivery-plan.md §2.4.
 *
 * @param {string|null|undefined} origin
 * @param {string[]} allowedOrigins
 * @returns {boolean}
 */
export function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return false;
  if (!Array.isArray(allowedOrigins)) return false;
  const norm = String(origin).trim().toLowerCase();
  for (const entry of allowedOrigins) {
    if (typeof entry !== 'string') continue;
    if (entry.trim().toLowerCase() === norm) return true;
  }
  return false;
}

/**
 * Reset the message counter atomically when the month rolls over. Used by both
 * `step` and `submit` paths so the counter is correct even if no admin sweep runs.
 *
 * @param {string} tenantId
 * @param {number} delta
 * @returns {Promise<void>}
 */
export async function bumpMonthlyMessageCounter(tenantId, delta) {
  if (!tenantId) return;
  const incr = Number.isFinite(delta) && delta > 0 ? Math.floor(delta) : 0;
  if (incr === 0) return;
  const now = new Date();
  const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const prisma = getPrisma();
  const cur = await prisma.chatWidgetConfig.findUnique({
    where: { tenantId },
    select: { id: true, messagesMonthYyyymm: true, messagesThisMonth: true },
  });
  if (!cur) return;
  if (cur.messagesMonthYyyymm !== yyyymm) {
    await prisma.chatWidgetConfig.update({
      where: { tenantId },
      data: { messagesMonthYyyymm: yyyymm, messagesThisMonth: incr },
    });
  } else {
    await prisma.chatWidgetConfig.update({
      where: { tenantId },
      data: { messagesThisMonth: { increment: incr } },
    });
  }
}
