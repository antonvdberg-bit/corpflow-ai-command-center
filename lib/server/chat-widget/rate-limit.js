/**
 * Chat Widget v0 — sliding-window rate limiter.
 *
 * Per-tenant + per-IP token bucket stored in `chat_widget_rate_limits`.
 * One row per (tenant_id, ip_hash, window_start_minute). On each request we
 * coarse-bucket the window to the start of the minute, increment the count,
 * and reject when the cumulative count across the configured window seconds
 * exceeds the per-tenant cap.
 *
 * IP is hashed with `CORPFLOW_CHAT_WIDGET_IP_SALT` (env-only, not in repo)
 * so we never store the raw IP. Hash = sha256(ip + tenant_id + salt).
 */

import crypto from 'node:crypto';

import { PrismaClient } from '@prisma/client';

import { cfg } from '../runtime-config.js';

let prismaSingleton = null;

function getPrisma() {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

/**
 * @param {import('http').IncomingMessage & { headers: Record<string, unknown> }} req
 * @returns {string}
 */
export function extractClientIp(req) {
  try {
    const fwd = req?.headers?.['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
    if (Array.isArray(fwd) && fwd.length > 0) return String(fwd[0]).split(',')[0].trim();
    const real = req?.headers?.['x-real-ip'];
    if (typeof real === 'string' && real.trim()) return real.trim();
    return '0.0.0.0';
  } catch {
    return '0.0.0.0';
  }
}

/**
 * @param {string} ip
 * @param {string} tenantId
 * @returns {string}
 */
export function hashIpForTenant(ip, tenantId) {
  const salt = String(cfg('CORPFLOW_CHAT_WIDGET_IP_SALT', '')).trim();
  const h = crypto.createHash('sha256');
  h.update(String(ip || ''));
  h.update('|');
  h.update(String(tenantId || ''));
  h.update('|');
  h.update(salt);
  return h.digest('hex').slice(0, 32);
}

/**
 * Truncate `now` to the start of its UTC minute. The rate-limit row for that
 * minute then accumulates the count for that bucket.
 *
 * @param {Date} now
 * @returns {Date}
 */
function bucketStart(now) {
  const d = new Date(now);
  d.setUTCSeconds(0, 0);
  return d;
}

/**
 * @param {{
 *   tenantId: string;
 *   ipHash: string;
 *   limitPerWindow: number;
 *   windowSeconds: number;
 *   now?: Date;
 * }} opts
 * @returns {Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }>}
 */
export async function checkAndConsume(opts) {
  const tenantId = String(opts.tenantId || '').trim();
  const ipHash = String(opts.ipHash || '').trim();
  if (!tenantId || !ipHash) return { allowed: true, remaining: 0, retryAfterSeconds: 0 };
  const limit = Number.isFinite(opts.limitPerWindow) && opts.limitPerWindow > 0 ? Math.floor(opts.limitPerWindow) : 30;
  const windowSeconds = Number.isFinite(opts.windowSeconds) && opts.windowSeconds > 0 ? Math.floor(opts.windowSeconds) : 300;
  const now = opts.now || new Date();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(now.getTime() - windowMs);
  const prisma = getPrisma();

  // Sum the count across all buckets within the live window for this (tenant, ip).
  const rows = await prisma.chatWidgetRateLimit.findMany({
    where: {
      tenantId,
      ipHash,
      windowStart: { gte: windowStart },
    },
    select: { count: true, windowStart: true },
  });
  const used = rows.reduce((acc, r) => acc + (Number(r.count) || 0), 0);

  if (used >= limit) {
    // Compute approximate retry-after: seconds until the oldest live bucket falls out.
    const oldest = rows.reduce((min, r) => {
      const t = r.windowStart instanceof Date ? r.windowStart.getTime() : Number(new Date(r.windowStart));
      return min == null || t < min ? t : min;
    }, /** @type {number|null} */ (null));
    const retryAfterSeconds = oldest != null
      ? Math.max(1, Math.ceil((oldest + windowMs - now.getTime()) / 1000))
      : windowSeconds;
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  // Increment the current minute's bucket. Upsert keyed by the unique index.
  const bs = bucketStart(now);
  await prisma.chatWidgetRateLimit.upsert({
    where: {
      chat_widget_rate_limits_t_ip_w: {
        tenantId,
        ipHash,
        windowStart: bs,
      },
    },
    create: { tenantId, ipHash, windowStart: bs, count: 1 },
    update: { count: { increment: 1 } },
  });

  // Opportunistic prune: occasionally delete rows older than 24h.
  if (Math.random() < 0.02) {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    try {
      await prisma.chatWidgetRateLimit.deleteMany({ where: { windowStart: { lt: cutoff } } });
    } catch {
      // best-effort; ignore
    }
  }

  return { allowed: true, remaining: Math.max(0, limit - used - 1), retryAfterSeconds: 0 };
}
