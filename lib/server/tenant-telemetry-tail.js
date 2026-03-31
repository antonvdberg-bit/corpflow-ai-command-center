/**
 * Best-effort tail of local telemetry JSONL for a tenant (sovereign log stream).
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

/** Aligned with lib/cmp/_lib/telemetry.js default sink (relative to cwd). */
const DEFAULT_TELEMETRY_FILE = path.join('vanguard', 'audit-trail', 'telemetry-v1.jsonl');
const prisma = new PrismaClient();

function hasPostgres() {
  const pg = (process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.PRISMA_DATABASE_URL || '').toString().trim();
  return Boolean(pg);
}

/**
 * Read last matching telemetry events for tenant_id (newest last in array).
 *
 * @param {string} tenantId
 * @param {number} [maxEntries]
 * @returns {Array<{ occurred_at?: string, event_type?: string, line: string }>}
 */
export function readTenantTelemetryTail(tenantId, maxEntries = 100) {
  const tid = tenantId != null ? String(tenantId).trim() : '';
  if (!tid) return [];

  // Postgres-first: recent events by tenant_id.
  if (hasPostgres()) {
    try {
      // NOTE: best-effort synchronous API expects an array; Prisma is async.
      // This module is used for UI tails; keep file fallback for sync usage.
    } catch (_) {}
  }

  const relOrAbs = process.env.TELEMETRY_FILE_PATH || DEFAULT_TELEMETRY_FILE;
  const file = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(process.cwd(), relOrAbs);

  let raw = '';
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }

  const lines = raw.split('\n').filter((l) => l.trim() !== '');
  const out = [];
  const want = Math.max(1, Math.min(500, maxEntries));

  for (let i = lines.length - 1; i >= 0 && out.length < want; i--) {
    try {
      const j = JSON.parse(lines[i]);
      const payloadTid = String(j.payload?.tenant_id ?? '').trim();
      const match = payloadTid === tid;
      if (match) {
        out.push({
          occurred_at: j.occurred_at,
          event_type: j.event_type,
          line: lines[i].length > 2000 ? `${lines[i].slice(0, 2000)}…` : lines[i],
        });
      }
    } catch {
      /* skip bad line */
    }
  }

  out.reverse();
  return out;
}

/**
 * Async Postgres tail for tenant telemetry.
 *
 * @param {string} tenantId
 * @param {number} [maxEntries]
 * @returns {Promise<Array<{ occurred_at?: string, event_type?: string, line: string }>>}
 */
export async function readTenantTelemetryTailPg(tenantId, maxEntries = 100) {
  const tid = tenantId != null ? String(tenantId).trim() : '';
  if (!tid) return [];
  if (!hasPostgres()) return readTenantTelemetryTail(tid, maxEntries);

  const want = Math.max(1, Math.min(500, maxEntries));
  try {
    const rows = await prisma.telemetryEvent.findMany({
      where: { tenantId: tid },
      orderBy: { occurredAt: 'desc' },
      take: want,
      select: { occurredAt: true, eventType: true, payload: true, cmpTicketId: true, cmpAction: true, factoryId: true, tenantId: true, id: true },
    });
    return rows
      .reverse()
      .map((r) => ({
        occurred_at: r.occurredAt.toISOString(),
        event_type: r.eventType,
        line: JSON.stringify({
          schema_version: '1',
          occurred_at: r.occurredAt.toISOString(),
          factory_id: r.factoryId || 'corpflow-factory',
          report_target: 'postgres',
          tenant_id: r.tenantId || tid,
          cmp: { ticket_id: r.cmpTicketId || 'n/a', action: r.cmpAction || 'unknown' },
          event_type: r.eventType,
          payload: r.payload || {},
        }),
      }));
  } catch (_) {
    return [];
  }
}
