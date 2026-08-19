/**
 * #778 / #877 / #883 — Core/Tenant app foundation.
 * Slice 2: authenticated live request workspace.
 * Slice 3: governed client review via existing cmp_tickets.console_json (no schema).
 */

export * from './constants.js';
export * from './access.js';
export * from './workspace-context.js';
export {
  DATA_SOURCE_FIXTURE as PROSPECT_OPS_DATA_SOURCE_FIXTURE,
  DATA_SOURCE_LEADS_READ as PROSPECT_OPS_DATA_SOURCE_LEADS_READ,
  assertProspectOperationsAccess,
  buildProspectOperationsPayload,
  buildTodayMyWorkPayload,
  filterProspectsForMyWorkToday,
  fixtureProspectLeadRows,
  projectProspectLeadRows,
  publicProspectListItem,
  resolveProspectOperationsDataSource as resolveProspectOperationsDataSourcePure,
} from './prospect-operations-workspace.js';
export {
  loadProspectOperationsList,
  resolveProspectOperationsDataSource,
} from './prospect-operations-list.js';
export * from './progress-rollup.js';
export {
  normalizeCmpTicketRow,
  normalizeCmpTicketRowDetailed,
  deriveComponentsFromTicket,
  workflowToMilestone,
  waitingPartyForWorkflow,
} from './request-normalize.js';
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
export {
  DATA_SOURCE_FIXTURE,
  DATA_SOURCE_CMP_TICKETS_READ,
  normalizeRowsFailClosed,
  filterByWaitingParty,
} from './request-repository.js';
export {
  getRequestRepository,
  resolveRequestDataSource,
  createFixtureRequestRepository,
  createPrismaRequestRepository,
  isPostgresConfigured,
} from './request-repository-select.js';
export * from './project.js';
export * from './component-review.js';
export { tryHandleAppApi } from './handlers.js';
