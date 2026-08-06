/**
 * Company Master library entry (deterministic validate / resolve / load / security).
 */

export {
  CLIENT_ONBOARDING_SYNTHETIC_REL,
  COMPANY_MASTER_EXAMPLES_DIR,
  COMPANY_MASTER_ROOT,
  COMPANY_MASTER_SCHEMA_PATH,
  COMPANY_MASTER_VOCABULARIES_PATH,
  CORPFLOWAI_SYNTHETIC_REL,
} from './paths.js';

export {
  buildCompanyCatalogue,
  loadClientOnboardingSyntheticRecord,
  loadCompanyMasterSchema,
  loadCorpflowaiSyntheticRecord,
  loadExampleRecord,
  loadVocabularies,
} from './load.js';

export {
  MATERIAL_IDENTITY_FIELD_KEYS,
  createSchemaValidator,
  evaluateActivationReadiness,
  isReceivedNotVerifiedEvidence,
  validateCompanyMasterRecord,
} from './validate.js';

export {
  RESTRICTED_PUBLICATION,
  RESTRICTED_SENSITIVITIES,
  assertSnapshotUnchanged,
  createIssuedDocumentSnapshot,
  getCompanyRecord,
  isAssetCurrentlyResolvable,
  isFieldCurrentlyResolvable,
  resolveAssetByAlias,
  resolveAssetById,
  resolveForFutureRender,
  resolveGovernedField,
  toResolvedAssetContract,
} from './resolve.js';

export {
  auditCompanyMasterFixturesForSecretsAndBinaries,
  listCompanyMasterFiles,
} from './security.js';
