/**
 * Fixture-backed AppRequest repository (proof / unit tests / no POSTGRES_URL).
 * Mutations allowed only on this path.
 */

import {
  DATA_SOURCE_FIXTURE,
  filterByWaitingParty,
  normalizeRowsFailClosed,
  tenantOptionsFromRequests,
} from './request-repository.js';
import {
  getAppRequest,
  listAppRequests,
  listRequestTenantIds,
  updateAppRequest,
} from './request-store.js';

/**
 * @returns {import('./request-repository.js').AppRequestRepository}
 */
export function createFixtureRequestRepository() {
  let writeAttempts = 0;

  return {
    dataSource: DATA_SOURCE_FIXTURE,
    supportsMutations: true,
    getWriteAttemptCount() {
      return writeAttempts;
    },

    async listForCore(filters = {}) {
      const all = listAppRequests();
      const tenantFilter =
        filters.tenantFilter != null ? String(filters.tenantFilter).trim() : '';
      const statusFilter =
        filters.statusFilter != null ? String(filters.statusFilter).trim().toLowerCase() : '';
      let requests = all.filter((r) => (!tenantFilter ? true : r.tenant_id === tenantFilter));
      if (statusFilter) {
        requests = requests.filter(
          (r) => String(r.status || '').trim().toLowerCase() === statusFilter,
        );
      }
      requests = filterByWaitingParty(requests, filters.waitingPartyFilter);
      return {
        requests,
        tenant_options: listRequestTenantIds(),
        excluded_missing_tenant: 0,
        data_source: DATA_SOURCE_FIXTURE,
      };
    },

    async listForTenant(tenantId) {
      const tid = String(tenantId || '').trim();
      const all = listAppRequests().filter((r) => r.tenant_id === tid);
      return {
        requests: all,
        excluded_missing_tenant: 0,
        data_source: DATA_SOURCE_FIXTURE,
      };
    },

    async getForCore(requestId) {
      const request = getAppRequest(requestId);
      return {
        request,
        data_quality: request ? null : 'request_not_found',
        data_source: DATA_SOURCE_FIXTURE,
      };
    },

    async getForTenant(requestId, tenantId) {
      const tid = String(tenantId || '').trim();
      const request = getAppRequest(requestId);
      if (!request || request.tenant_id !== tid) {
        return { request: null, data_source: DATA_SOURCE_FIXTURE };
      }
      return { request, data_source: DATA_SOURCE_FIXTURE };
    },

    async updateRequest(requestId, mutator) {
      writeAttempts += 1;
      return updateAppRequest(requestId, mutator);
    },
  };
}

/**
 * Re-export for tests that seed via store then read via repo.
 */
export { normalizeRowsFailClosed, tenantOptionsFromRequests };
