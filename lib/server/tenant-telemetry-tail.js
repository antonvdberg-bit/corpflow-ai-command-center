/**
 * Best-effort tail of local telemetry JSONL for a tenant (sovereign log stream).
 */

import fs from 'fs';
import path from 'path';

/** Aligned with lib/cmp/_lib/telemetry.js default sink (relative to cwd). */
const DEFAULT_TELEMETRY_FILE = path.join('vanguard', 'audit-trail', 'telemetry-v1.jsonl');

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
