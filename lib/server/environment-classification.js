/**
 * CorpFlowAI business environment classification helpers.
 *
 * Distinguishes CorpFlowAI-hosted tenant **test** surfaces (`corpflow_test`)
 * from separately governed **client production** (`client_production`).
 * A public URL is not automatically client production.
 *
 * @see docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md
 * @see docs/decisions/20260729-corpflow-test-vs-client-production.md
 */

/** Preferred business environment ids. */
export const BUSINESS_ENVIRONMENTS = Object.freeze({
  LOCAL: 'local',
  PREVIEW: 'preview',
  /** CorpFlowAI-hosted tenant/test surface (agreed live test runtime). */
  CORPFLOW_TEST: 'corpflow_test',
  /** Legacy alias accepted in comments/classifiers — treat as corpflow_test. */
  TEST: 'test',
  /**
   * Legacy classifier / WIP wording — treat as client_production for gates.
   * Do not use for CorpFlowAI-hosted test publish.
   */
  PRODUCTION: 'production',
  /** Separately governed client-owned or client-approved live production. */
  CLIENT_PRODUCTION: 'client_production',
});

/**
 * Dispatch / comment environment enum (compat + new semantics).
 * @type {readonly string[]}
 */
export const ENVIRONMENT_IDS = Object.freeze([
  BUSINESS_ENVIRONMENTS.LOCAL,
  BUSINESS_ENVIRONMENTS.TEST,
  BUSINESS_ENVIRONMENTS.PREVIEW,
  BUSINESS_ENVIRONMENTS.CORPFLOW_TEST,
  BUSINESS_ENVIRONMENTS.PRODUCTION,
  BUSINESS_ENVIRONMENTS.CLIENT_PRODUCTION,
]);

/** Example CorpFlowAI-hosted hosts that are corpflow_test (non-exhaustive). */
export const CORPFLOW_TEST_HOST_HINTS = Object.freeze([
  'core.corpflowai.com',
  'lux.corpflowai.com',
  'luxe.corpflowai.com',
  'cipc.corpflowai.com',
  'cipc-desk.corpflowai.com',
  'living-word-mauritius.corpflowai.com',
  'aileadrescue.corpflowai.com',
]);

/**
 * @param {string | null | undefined} environment
 * @returns {boolean}
 */
export function isClientProductionEnvironment(environment) {
  const env = String(environment || '').trim().toLowerCase();
  return (
    env === BUSINESS_ENVIRONMENTS.CLIENT_PRODUCTION ||
    env === BUSINESS_ENVIRONMENTS.PRODUCTION
  );
}

/**
 * @param {string | null | undefined} environment
 * @returns {boolean}
 */
export function isCorpflowTestEnvironment(environment) {
  const env = String(environment || '').trim().toLowerCase();
  return (
    env === BUSINESS_ENVIRONMENTS.CORPFLOW_TEST || env === BUSINESS_ENVIRONMENTS.TEST
  );
}

/**
 * Normalize aliases for display / WIP comparison.
 * @param {string | null | undefined} environment
 * @returns {string}
 */
export function normalizeBusinessEnvironment(environment) {
  const env = String(environment || '').trim().toLowerCase();
  if (env === BUSINESS_ENVIRONMENTS.TEST) return BUSINESS_ENVIRONMENTS.CORPFLOW_TEST;
  if (env === BUSINESS_ENVIRONMENTS.PRODUCTION) {
    return BUSINESS_ENVIRONMENTS.CLIENT_PRODUCTION;
  }
  if (ENVIRONMENT_IDS.includes(env)) return env;
  return BUSINESS_ENVIRONMENTS.PREVIEW;
}

/**
 * True when text forbids client-production / treats CorpFlowAI hosts as test only.
 * @param {string} blob lowercased title+body+labels text
 */
export function textForbidsClientProduction(blob) {
  const text = String(blob || '').toLowerCase();
  return (
    /no production deploy|without.*production|not.*production deploy/.test(text) ||
    /no (?:deployment|deploy) into (?:any )?client/.test(text) ||
    /not (?:a |an )?client production/.test(text) ||
    /client production (?:is |are )?(?:not |never )?authori[sz]ed/.test(text) ||
    /no (?:current )?test deployment approval may be interpreted as approval for/.test(text) ||
    /corpflowai-hosted[^\n.]{0,80}(?:are|is)[^\n.]{0,40}test/.test(text) ||
    /treat(?:ed)? as test environments?/.test(text) ||
    /business environment remains corpflow_test/.test(text) ||
    /publish(?:ing)? to (?:the )?(?:relevant )?corpflow(?:ai)?(?:-hosted)? test/.test(text) ||
    /approval:production/.test(text) && /(?:false|not trigger|do not|without)/.test(text)
  );
}

/**
 * True when text explicitly requests client production / production protected gate.
 * @param {string} blob lowercased title+body+labels text
 */
export function textRequestsClientProduction(blob) {
  const text = String(blob || '').toLowerCase();
  if (textForbidsClientProduction(text)) return false;
  return (
    /\bclient_production\b/.test(text) ||
    /approval:production/.test(text) ||
    /deploy(?:ment)? into (?:the )?client(?:-owned|-approved)? production/.test(text) ||
    /client-owned (?:or approved )?production/.test(text) ||
    /client production (?:environment|deploy|cutover|approval)/.test(text) ||
    /requires? (?:explicit )?(?:anton(?:\/client)? )?(?:production|client_production) approval/.test(
      text,
    ) ||
    /protected gate[:\s]+production\b/.test(text) ||
    (/production only|live production cutover/.test(text) &&
      !/test environment|corpflow_test/.test(text))
  );
}

/**
 * Infer preferred business environment from issue text + tenant boundary.
 *
 * @param {{
 *   blob: string,
 *   systemBoundary?: string,
 *   protectedGate?: string,
 *   workTypes?: string[],
 * }} input
 * @returns {'local' | 'test' | 'preview' | 'corpflow_test' | 'production' | 'client_production'}
 */
export function inferBusinessEnvironment(input) {
  const blob = String(input?.blob || '').toLowerCase();
  const workTypes = Array.isArray(input?.workTypes) ? input.workTypes : [];
  const systemBoundary = String(input?.systemBoundary || '');
  const protectedGate = String(input?.protectedGate || 'none');

  if (textRequestsClientProduction(blob) || protectedGate === 'production') {
    return BUSINESS_ENVIRONMENTS.CLIENT_PRODUCTION;
  }

  if (/local only|docs-only/.test(blob) && !workTypes.includes('ui') && !workTypes.includes('api')) {
    return BUSINESS_ENVIRONMENTS.LOCAL;
  }

  if (
    systemBoundary === 'tenant' ||
    /corpflow_test|corpflowai-hosted|corpflowai test|test environment/.test(blob) ||
    CORPFLOW_TEST_HOST_HINTS.some((host) => blob.includes(host)) ||
    /\b[\w-]+\.corpflowai\.com\b/.test(blob)
  ) {
    return BUSINESS_ENVIRONMENTS.CORPFLOW_TEST;
  }

  if (/preview only|\*\.vercel\.app|vercel preview/.test(blob)) {
    return BUSINESS_ENVIRONMENTS.PREVIEW;
  }

  return BUSINESS_ENVIRONMENTS.PREVIEW;
}
