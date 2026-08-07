/**
 * #778 Slice 1 — CorpFlowAI central app (Core / Tenant Requests & Progress).
 */

export {
  APP_COMPONENT_MILESTONES,
  TERMINAL_MILESTONES,
  normalizeComponentMilestone,
  milestoneWeight,
  maxMilestoneWeight,
  rollupComponentProgress,
} from './milestones.js';

export {
  REFERENCE_TENANT_ID,
  REFERENCE_TENANT_NAME,
  SYNTHETIC_REQUEST_ID,
  REVIEW_DECISIONS,
  createInitialSyntheticRequest,
  cloneJson,
  ensureSyntheticRequest,
  resetSyntheticStore,
  listSyntheticRequests,
  getSyntheticRequest,
  setComponentExposure,
  applyComponentReview,
} from './synthetic-store.js';

export {
  stripInternalFields,
  projectTenantRequest,
  projectCoreRequest,
  findTenantLeakPaths,
} from './projection.js';

export {
  readSessionPayload,
  sessionRoleLabel,
  canAccessCoreScope,
  canAccessTenantScope,
  buildAppChrome,
} from './access.js';

export {
  handleAppApi,
  handleAppContext,
  handleAppRequestsList,
  handleAppRequestGet,
  handleAppExpose,
  handleAppReview,
} from './handlers.js';
