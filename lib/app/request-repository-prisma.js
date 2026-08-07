/**
 * Read-only Prisma cmp_tickets repository.
 * Reuses existing PrismaClient + cmpTicket naming from lib/cmp and factory handlers.
 * No writes. No new env vars. Does not expose connection metadata.
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
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @returns {import('./request-repository.js').AppRequestRepository}
 */
export function createPrismaRequestRepository(prisma) {
  const client = prisma || getDefaultPrisma();
  let writeAttempts = 0;

  return {
    dataSource: DATA_SOURCE_CMP_TICKETS_READ,
    supportsMutations: false,
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

    async updateRequest() {
      writeAttempts += 1;
      return null;
    },
  };
}
