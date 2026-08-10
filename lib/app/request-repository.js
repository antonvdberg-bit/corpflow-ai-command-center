/**
 * Request repository contract helpers for /api/app handlers.
 * Fixture and Prisma implementations share normalizeCmpTicketRow → projectors.
 */

import { normalizeCmpTicketRowDetailed } from './request-normalize.js';

export const DATA_SOURCE_FIXTURE = 'fixture';
export const DATA_SOURCE_CMP_TICKETS_READ = 'cmp_tickets_read';

/**
 * Normalize many rows; fail-closed on missing tenant.
 * @param {unknown[]} rows
 * @param {{ source?: 'fixture'|'cmp_ticket' }} [opts]
 */
export function normalizeRowsFailClosed(rows, opts = {}) {
  /** @type {import('./request-normalize.js').AppRequest[]} */
  const requests = [];
  let excluded_missing_tenant = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const detailed = normalizeCmpTicketRowDetailed(row, opts);
    if (!detailed.ok) {
      if (detailed.error === 'missing_tenant_id') excluded_missing_tenant += 1;
      continue;
    }
    requests.push(detailed.request);
  }
  return { requests, excluded_missing_tenant };
}

/**
 * Apply waiting_party filter after normalization (derived field).
 * @param {import('./request-normalize.js').AppRequest[]} requests
 * @param {string | null | undefined} waitingPartyFilter
 */
export function filterByWaitingParty(requests, waitingPartyFilter) {
  const w = waitingPartyFilter != null ? String(waitingPartyFilter).trim().toLowerCase() : '';
  if (!w) return requests;
  return requests.filter((r) => String(r.waiting_party || '').toLowerCase() === w);
}

/**
 * Distinct tenant ids from normalized requests.
 * @param {import('./request-normalize.js').AppRequest[]} requests
 */
export function tenantOptionsFromRequests(requests) {
  const set = new Set();
  for (const r of requests) {
    if (r.tenant_id) set.add(r.tenant_id);
  }
  return [...set].sort();
}
