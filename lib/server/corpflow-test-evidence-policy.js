/**
 * CorpFlowAI test-surface evidence policy (#973).
 *
 * Vercel Preview (`*.vercel.app`) is optional internal sandboxing only.
 * It is never a required gate for `corpflow_test` work.
 *
 * Runtime CorpFlowAI-hosted changes still require live verification on the
 * actual test host after test-runtime publish. Docs/config-only packets do
 * not invent a runtime URL requirement. `client_production` stays fail-closed.
 *
 * Isolation: this module owns environment-stage / evidence semantics only.
 * It does not parse protected-gate language (#962).
 *
 * @see docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md
 * @see docs/execution/TEST_SUBDOMAIN_RELEASE_POLICY.md
 */

export const CORPFLOW_TEST_EVIDENCE_POLICY_VERSION = 'v1';

/** Dispatcher enum keys (compat) plus business labels. */
export const DELIVERY_ENVIRONMENT_KEYS = Object.freeze([
  'local',
  'test',
  'preview',
  'production',
]);

export const DELIVERY_WORK_KINDS = Object.freeze(['docs', 'runtime', 'client_production_release']);

export const CORPFLOW_TEST_EVIDENCE_SEQUENCE =
  'build -> test-runtime publish where required -> verify on corpflow_test -> operator review -> next action';

const ENV_ALIASES = Object.freeze({
  local: 'local',
  docs: 'local',
  n_a: 'local',
  'n/a': 'local',
  test: 'test',
  corpflow_test: 'test',
  corpflowai_test: 'test',
  preview: 'preview',
  vercel_preview: 'preview',
  production: 'production',
  client_production: 'production',
});

/**
 * @param {unknown} value
 * @returns {'local' | 'test' | 'preview' | 'production'}
 */
export function normalizeDeliveryEnvironment(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return ENV_ALIASES[raw] || 'test';
}

/**
 * @param {unknown} value
 * @returns {'docs' | 'runtime' | 'client_production_release'}
 */
export function normalizeDeliveryWorkKind(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');
  if (raw === 'docs' || raw === 'documentation' || raw === 'config' || raw === 'docs_only') {
    return 'docs';
  }
  if (
    raw === 'client_production_release' ||
    raw === 'client_production' ||
    raw === 'public_launch'
  ) {
    return 'client_production_release';
  }
  return 'runtime';
}

/**
 * Preview URL / Vercel preview stage is required only when the packet is
 * actually targeting the ephemeral preview sandbox as its verification surface.
 * CorpFlowAI test hosts never inherit that requirement.
 *
 * @param {unknown} environment
 * @param {unknown} [workKind]
 * @returns {boolean}
 */
export function isVercelPreviewRequired(environment, workKind) {
  const env = normalizeDeliveryEnvironment(environment);
  const kind = normalizeDeliveryWorkKind(workKind || 'runtime');
  return env === 'preview' && kind === 'runtime';
}

/**
 * Technical Lead `vercel_preview_missing` is a gap only for preview-sandbox work.
 * Missing preview on corpflow_test / local / client_production is not a defect.
 *
 * @param {unknown} environment
 * @returns {boolean}
 */
export function shouldFlagMissingVercelPreview(environment) {
  return isVercelPreviewRequired(environment, 'runtime');
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function trimUrl(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Evaluate whether a delivery evidence packet is complete.
 *
 * @param {{
 *   environment?: unknown,
 *   workKind?: unknown,
 *   previewUrl?: unknown,
 *   liveTestUrl?: unknown,
 *   liveClientProductionUrl?: unknown,
 *   clientProductionAuthorized?: unknown,
 *   deterministicTestsPassed?: unknown,
 * }} [input]
 * @returns {{
 *   policy_version: string,
 *   environment: 'local' | 'test' | 'preview' | 'production',
 *   work_kind: 'docs' | 'runtime' | 'client_production_release',
 *   preview_required: boolean,
 *   live_test_url_required: boolean,
 *   client_production_fail_closed: boolean,
 *   complete: boolean,
 *   verdict: 'COMPLETE' | 'INCOMPLETE' | 'FAIL_CLOSED',
 *   reason: string,
 *   evidence_sequence: string,
 * }}
 */
export function evaluateDeliveryEvidencePacket(input = {}) {
  const environment = normalizeDeliveryEnvironment(input.environment);
  let workKind = normalizeDeliveryWorkKind(input.workKind);
  if (environment === 'local' && workKind !== 'client_production_release') {
    workKind = 'docs';
  }
  if (environment === 'production') {
    workKind = 'client_production_release';
  }

  const previewUrl = trimUrl(input.previewUrl);
  const liveTestUrl = trimUrl(input.liveTestUrl);
  const liveClientProductionUrl = trimUrl(input.liveClientProductionUrl);
  const clientProductionAuthorized = input.clientProductionAuthorized === true;
  const deterministicTestsPassed = input.deterministicTestsPassed !== false;

  const previewRequired = isVercelPreviewRequired(environment, workKind);
  const liveTestUrlRequired = environment === 'test' && workKind === 'runtime';
  const clientProductionFailClosed = workKind === 'client_production_release';

  /** @type {'COMPLETE' | 'INCOMPLETE' | 'FAIL_CLOSED'} */
  let verdict = 'COMPLETE';
  let reason = 'docs_or_config_deterministic_evidence';

  if (clientProductionFailClosed) {
    if (!clientProductionAuthorized) {
      verdict = 'FAIL_CLOSED';
      reason = 'client_production_authorization_required';
    } else if (!liveClientProductionUrl) {
      verdict = 'FAIL_CLOSED';
      reason = previewUrl
        ? 'preview_does_not_satisfy_client_production'
        : 'client_production_live_url_required';
    } else {
      verdict = 'COMPLETE';
      reason = 'client_production_authorized_and_live_verified';
    }
  } else if (workKind === 'docs' || environment === 'local') {
    if (!deterministicTestsPassed) {
      verdict = 'INCOMPLETE';
      reason = 'deterministic_tests_required';
    } else {
      verdict = 'COMPLETE';
      reason = 'docs_or_config_deterministic_evidence';
    }
  } else if (environment === 'preview') {
    if (previewRequired && !previewUrl && !liveTestUrl) {
      verdict = 'INCOMPLETE';
      reason = 'preview_sandbox_surface_unverified';
    } else {
      verdict = 'COMPLETE';
      reason = previewUrl ? 'optional_preview_sandbox_verified' : 'preview_optional_live_evidence_accepted';
    }
  } else if (liveTestUrlRequired) {
    if (!liveTestUrl) {
      verdict = 'INCOMPLETE';
      reason = 'corpflow_test_live_url_required';
    } else {
      verdict = 'COMPLETE';
      reason = previewUrl
        ? 'corpflow_test_live_verified_preview_optional'
        : 'corpflow_test_live_verified_without_preview';
    }
  }

  return {
    policy_version: CORPFLOW_TEST_EVIDENCE_POLICY_VERSION,
    environment,
    work_kind: workKind,
    preview_required: previewRequired,
    live_test_url_required: liveTestUrlRequired,
    client_production_fail_closed: clientProductionFailClosed,
    complete: verdict === 'COMPLETE',
    verdict,
    reason,
    evidence_sequence:
      environment === 'test' ? CORPFLOW_TEST_EVIDENCE_SEQUENCE : 'environment-specific',
  };
}
