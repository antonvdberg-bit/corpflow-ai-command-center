/**
 * Prisma cmp_tickets repository for /api/app.
 *
 * Reads: existing cmp_tickets columns (id, tenantId, status, stage, title,
 * description, consoleJson, updatedAt).
 *
 * Bounded writes (#883 Slice 3): persist expose/review into the existing
 * `console_json` JSON column only — no schema migration, no new tables/columns.
 * Does not expose connection metadata.
 */

import { PrismaClient } from '@prisma/client';

import { cfg } from '../server/runtime-config.js';
import {
  DATA_SOURCE_CMP_TICKETS_READ,
  filterByWaitingParty,
  normalizeRowsFailClosed,
  tenantOptionsFromRequests,
} from './request-repository.js';
import { normalizeCmpTicketRowDetailed } from './request-normalize.js';

const DEFAULT_TAKE = 100;

/** @type {PrismaClient | null} */
let defaultPrisma = null;

function getDefaultPrisma() {
  if (!defaultPrisma) defaultPrisma = new PrismaClient();
  return defaultPrisma;
}

/**
 * @returns {boolean}
 */
export function isPostgresConfigured() {
  return Boolean(String(cfg('POSTGRES_URL', '') || '').trim());
}

const CMP_TICKET_SELECT = Object.freeze({
  id: true,
  tenantId: true,
  status: true,
  stage: true,
  title: true,
  description: true,
  consoleJson: true,
  updatedAt: true,
  createdAt: true,
});

/**
 * Persist AppRequest mutations into existing console_json (+ description mirror).
 * @param {import('./request-normalize.js').AppRequest} working
 * @returns {Record<string, unknown>}
 */
function consoleJsonForPersist(working) {
  const cj =
    working.console_json && typeof working.console_json === 'object'
      ? structuredClone(working.console_json)
      : { client_view: { components: [] } };
  if (!cj.client_view || typeof cj.client_view !== 'object') {
    cj.client_view = { components: [] };
  }
  const cv = /** @type {Record<string, unknown>} */ (cj.client_view);
  cv.client_safe_blocker = working.client_safe_blocker;
  cv.attention_required = working.attention_required === true;
  if (working.internal_blocker != null) cv.internal_blocker = working.internal_blocker;
  return cj;
}

/**
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @returns {import('./request-repository.js').AppRequestRepository}
 */
export function createPrismaRequestRepository(prisma) {
  const client = prisma || getDefaultPrisma();
  let writeAttempts = 0;

  return {
    dataSource: DATA_SOURCE_CMP_TICKETS_READ,
    /** Slice 3: bounded console_json mutations enabled (existing column). */
    supportsMutations: true,
    persistencePath: 'cmp_tickets.console_json',
    getWriteAttemptCount() {
      return writeAttempts;
    },

    async listForCore(filters = {}) {
      /** @type {Record<string, unknown>} */
      const where = {};
      const tenantFilter =
        filters.tenantFilter != null ? String(filters.tenantFilter).trim() : '';
      const statusFilter =
        filters.statusFilter != null ? String(filters.statusFilter).trim() : '';

      // Core global: require non-null tenant_id (fail-closed; never load orphan rows for Tenant projection).
      if (tenantFilter) {
        where.tenantId = tenantFilter;
      } else {
        where.tenantId = { not: null };
      }
      if (statusFilter) {
        where.status = { equals: statusFilter, mode: 'insensitive' };
      }

      const take = Math.min(
        Math.max(1, Number(filters.take) || DEFAULT_TAKE),
        200,
      );

      const rows = await client.cmpTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take,
        select: CMP_TICKET_SELECT,
      });

      const { requests, excluded_missing_tenant } = normalizeRowsFailClosed(rows, {
        source: 'cmp_ticket',
      });
      const filtered = filterByWaitingParty(requests, filters.waitingPartyFilter);
      return {
        requests: filtered,
        tenant_options: tenantOptionsFromRequests(filtered),
        excluded_missing_tenant,
        data_source: DATA_SOURCE_CMP_TICKETS_READ,
      };
    },

    async listForTenant(tenantId) {
      const tid = String(tenantId || '').trim();
      if (!tid) {
        return {
          requests: [],
          excluded_missing_tenant: 0,
          data_source: DATA_SOURCE_CMP_TICKETS_READ,
        };
      }
      // Tenant constraint at DATA ACCESS boundary.
      const rows = await client.cmpTicket.findMany({
        where: { tenantId: tid },
        orderBy: { updatedAt: 'desc' },
        take: DEFAULT_TAKE,
        select: CMP_TICKET_SELECT,
      });
      const { requests, excluded_missing_tenant } = normalizeRowsFailClosed(rows, {
        source: 'cmp_ticket',
      });
      // Extra fail-closed: drop any row that somehow normalized to another tenant.
      const scoped = requests.filter((r) => r.tenant_id === tid);
      return {
        requests: scoped,
        excluded_missing_tenant,
        data_source: DATA_SOURCE_CMP_TICKETS_READ,
      };
    },

    async getForCore(requestId) {
      const id = String(requestId || '').trim();
      if (!id) {
        return {
          request: null,
          data_quality: 'id_required',
          data_source: DATA_SOURCE_CMP_TICKETS_READ,
        };
      }
      const row = await client.cmpTicket.findUnique({
        where: { id },
        select: CMP_TICKET_SELECT,
      });
      if (!row) {
        return {
          request: null,
          data_quality: 'request_not_found',
          data_source: DATA_SOURCE_CMP_TICKETS_READ,
        };
      }
      const detailed = normalizeCmpTicketRowDetailed(row, { source: 'cmp_ticket' });
      if (!detailed.ok) {
        return {
          request: null,
          data_quality: detailed.error,
          data_source: DATA_SOURCE_CMP_TICKETS_READ,
        };
      }
      return {
        request: detailed.request,
        data_quality: null,
        data_source: DATA_SOURCE_CMP_TICKETS_READ,
      };
    },

    async getForTenant(requestId, tenantId) {
      const id = String(requestId || '').trim();
      const tid = String(tenantId || '').trim();
      if (!id || !tid) {
        return { request: null, data_source: DATA_SOURCE_CMP_TICKETS_READ };
      }
      // Tenant ID in lookup condition — never load cross-tenant then hide.
      const row = await client.cmpTicket.findFirst({
        where: { id, tenantId: tid },
        select: CMP_TICKET_SELECT,
      });
      if (!row) {
        return { request: null, data_source: DATA_SOURCE_CMP_TICKETS_READ };
      }
      const detailed = normalizeCmpTicketRowDetailed(row, { source: 'cmp_ticket' });
      if (!detailed.ok || detailed.request.tenant_id !== tid) {
        return { request: null, data_source: DATA_SOURCE_CMP_TICKETS_READ };
      }
      return { request: detailed.request, data_source: DATA_SOURCE_CMP_TICKETS_READ };
    },

    /**
     * Bounded write: update console_json only (existing column).
     * When opts.tenantId is set, load is tenant-scoped (fail-closed).
     *
     * @param {string} requestId
     * @param {(req: import('./request-normalize.js').AppRequest) => void} mutator
     * @param {{ tenantId?: string }} [opts]
     */
    async updateRequest(requestId, mutator, opts = {}) {
      writeAttempts += 1;
      const id = String(requestId || '').trim();
      if (!id || typeof mutator !== 'function') return null;

      const tenantConstraint =
        opts.tenantId != null ? String(opts.tenantId).trim() : '';

      const row = tenantConstraint
        ? await client.cmpTicket.findFirst({
            where: { id, tenantId: tenantConstraint },
            select: CMP_TICKET_SELECT,
          })
        : await client.cmpTicket.findUnique({
            where: { id },
            select: CMP_TICKET_SELECT,
          });
      if (!row) return null;

      const detailed = normalizeCmpTicketRowDetailed(row, { source: 'cmp_ticket' });
      if (!detailed.ok) return null;
      if (tenantConstraint && detailed.request.tenant_id !== tenantConstraint) {
        return null;
      }

      const working = structuredClone(detailed.request);
      mutator(working);
      if (tenantConstraint && working.tenant_id !== tenantConstraint) {
        // Fail closed — never allow mutator to retarget tenant.
        return null;
      }

      const consoleJson = consoleJsonForPersist(working);
      await client.cmpTicket.update({
        where: { id },
        data: {
          consoleJson,
          // Keep human title in sync when AppRequest title changed (description column exists).
          description: working.title != null ? String(working.title) : undefined,
        },
        select: { id: true },
      });

      // Re-read so projectors see the same shape as subsequent GETs.
      const reread = tenantConstraint
        ? await client.cmpTicket.findFirst({
            where: { id, tenantId: tenantConstraint },
            select: CMP_TICKET_SELECT,
          })
        : await client.cmpTicket.findUnique({
            where: { id },
            select: CMP_TICKET_SELECT,
          });
      if (!reread) return null;
      const again = normalizeCmpTicketRowDetailed(reread, { source: 'cmp_ticket' });
      return again.ok ? structuredClone(again.request) : null;
    },
  };
}
