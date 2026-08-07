/**
 * Compatibility shim — request repository lives in request-store.js.
 * Production-shaped cmp_tickets fixtures + same normalize adapter.
 */

export {
  resetRequestStore,
  resetSyntheticStore,
  listAppRequests,
  listSyntheticRequests,
  getAppRequest,
  getSyntheticRequest,
  updateAppRequest,
  updateSyntheticRequest,
  listRequestTenantIds,
} from './request-store.js';
