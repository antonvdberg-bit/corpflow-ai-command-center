/**
 * Prospect Maturation and Nurture — #713 WS2.
 *
 * Pure functions over existing prospect view-model fields.
 * No Prisma schema changes. No external send. No new CRM store.
 * No imports of any messaging sender (email, WhatsApp, SMS).
 *
 * Reads config from config/prospect-maturation.v1.json and
 * config/prospect-draft-assets.v1.json at runtime (static JSON imports).
 *
 * @see docs/operations/PROSPECT_MATURATION_AND_NURTURE_V1.md
 * @see lib/cmp/_lib/prospect-operations-view-model.js
 */

import { createRequire } from 'node:module';

import {
  PROSPECT_CANONICAL_STAGES,
  PROSPECT_CLOSURE_OUTCOMES,
  computeProspectExceptionSignals,
  isCanonicalStageTransitionAllowed,
  isStaleActivity,
  resolveNextActionDue,
  PROSPECT_STALE_DAYS_DEFAULT,
} from '../cmp/_lib/prospect-operations-view-model.js';

const _require = createRequire(import.meta.url);

/** @type {import('../../config/prospect-maturation.v1.json')} */
const MATURATION_CONFIG = _require('../../config/prospect-maturation.v1.json');

/** @type {import('../../config/prospect-draft-assets.v1.json')} */
const DRAFT_ASSETS_CONFIG = _require('../../config/prospect-draft-assets.v1.json');

export { MATURATION_CONFIG, DRAFT_ASSETS_CONFIG };

/**
 * Active stage keys — stages where operator attention and SLA apply.
 * @type {readonly string[]}
 */
export const ACTIVE_STAGES = Object.freeze(MATURATION_CONFIG.active_stage_keys);

/**
 * Terminal stage keys — no further maturation expected.
 * @type {readonly string[]}
 */
export const TERMINAL_STAGES = Object.freeze(MATURATION_CONFIG.terminal_stage_keys);

/**
 * Closure stage keys — prospect is no longer actively pursued in standard flow.
 * @type {readonly string[]}
 */
export const CLOSURE_STAGES = Object.freeze(MATURATION_CONFIG.closure_stage_keys);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate that an active prospect has the required fields:
 * owner, next_action, and next_action_due.
 *
 * Returns { valid: true } or { valid: false, missing: string[] }.
 *
 * @param {{
 *   canonical_stage?: string | null,
 *   owner?: string | null,
 *   next_action?: string | null,
 *   next_action_due?: string | null,
 *   activity?: Array<{ next_action_date?: string | null }>,
 * }} prospect
 * @returns {{ valid: true } | { valid: false, missing: string[] }}
 */
export function validateActiveProspectRequiredFields(prospect) {
  const stage = String(prospect?.canonical_stage || '');
  if (!ACTIVE_STAGES.includes(stage)) {
    return { valid: true };
  }
  const missing = [];
  if (!prospect?.owner || !String(prospect.owner).trim()) missing.push('owner');
  if (!prospect?.next_action || !String(prospect.next_action).trim()) missing.push('next_action');
  const due = resolveNextActionDue(prospect);
  if (!due) missing.push('next_action_due');
  if (missing.length > 0) return { valid: false, missing };
  return { valid: true };
}

/**
 * Validate that a closure stage has a reason recorded.
 *
 * @param {{
 *   canonical_stage?: string | null,
 *   closure_reason?: string | null,
 * }} prospect
 * @returns {{ valid: true } | { valid: false, missing: string[] }}
 */
export function validateClosureReason(prospect) {
  const stage = String(prospect?.canonical_stage || '');
  const requiresReason = PROSPECT_CLOSURE_OUTCOMES.includes(stage) || TERMINAL_STAGES.includes(stage);
  if (!requiresReason) return { valid: true };
  const reason = prospect?.closure_reason != null ? String(prospect.closure_reason).trim() : '';
  if (!reason) return { valid: false, missing: ['closure_reason'] };
  return { valid: true };
}

/**
 * Run all maturation validations on a prospect and return a combined result.
 *
 * @param {Record<string, unknown>} prospect
 * @returns {{ valid: boolean, errors: Array<{ check: string, missing: string[] }> }}
 */
export function validateProspect(prospect) {
  const errors = [];
  const fields = validateActiveProspectRequiredFields(prospect);
  if (!fields.valid) errors.push({ check: 'active_fields', missing: fields.missing });
  const closure = validateClosureReason(prospect);
  if (!closure.valid) errors.push({ check: 'closure_reason', missing: closure.missing });
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Lifecycle stage config helpers
// ---------------------------------------------------------------------------

/**
 * Get the stage config object for a given canonical stage key.
 *
 * @param {string} stage
 * @returns {Record<string, unknown> | null}
 */
export function getStageConfig(stage) {
  const s = String(stage || '');
  return /** @type {any} */ (MATURATION_CONFIG.lifecycle_stages)[s] || null;
}

/**
 * Get entry criteria for a stage.
 *
 * @param {string} stage
 * @returns {string[]}
 */
export function getStageEntryCriteria(stage) {
  const cfg = getStageConfig(stage);
  return Array.isArray(cfg?.entry_criteria) ? cfg.entry_criteria : [];
}

/**
 * Get exit criteria for a stage.
 *
 * @param {string} stage
 * @returns {string[]}
 */
export function getStageExitCriteria(stage) {
  const cfg = getStageConfig(stage);
  return Array.isArray(cfg?.exit_criteria) ? cfg.exit_criteria : [];
}

/**
 * Get the SLA hours for a stage (null if no SLA defined).
 *
 * @param {string} stage
 * @returns {number | null}
 */
export function getStageSlaHours(stage) {
  const cfg = getStageConfig(stage);
  return typeof cfg?.operator_sla_hours === 'number' ? cfg.operator_sla_hours : null;
}

/**
 * Returns true if a stage is considered "active" (operator attention and SLA apply).
 *
 * @param {string} stage
 * @returns {boolean}
 */
export function isActiveStage(stage) {
  return ACTIVE_STAGES.includes(String(stage || ''));
}

/**
 * Returns true if a stage is terminal (lost, not_fit).
 *
 * @param {string} stage
 * @returns {boolean}
 */
export function isTerminalStage(stage) {
  return TERMINAL_STAGES.includes(String(stage || ''));
}

// ---------------------------------------------------------------------------
// Overdue and stale detection (wraps existing helpers with maturation context)
// ---------------------------------------------------------------------------

/**
 * Returns true if a prospect is overdue: active stage and next action is past due.
 *
 * @param {Record<string, unknown>} prospect
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isProspectOverdue(prospect, now = new Date()) {
  const stage = String(prospect?.canonical_stage || '');
  if (!isActiveStage(stage)) return false;
  const signals = computeProspectExceptionSignals(prospect, now);
  return signals.includes('overdue_action');
}

/**
 * Returns true if a prospect is stale: no meaningful activity within stale threshold.
 *
 * @param {Record<string, unknown>} prospect
 * @param {Date} [now]
 * @param {number} [staleDays]
 * @returns {boolean}
 */
export function isProspectStale(prospect, now = new Date(), staleDays = PROSPECT_STALE_DAYS_DEFAULT) {
  const lastActivity = /** @type {string | null | undefined} */ (
    prospect?.last_meaningful_activity_at || prospect?.created_at
  );
  return isStaleActivity(lastActivity, now, staleDays);
}

/**
 * Returns true if a prospect has reached the reactivation window:
 * stalled stage and last activity is within reactivation_window_days.
 *
 * @param {Record<string, unknown>} prospect
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isReactivationDue(prospect, now = new Date()) {
  const stage = String(prospect?.canonical_stage || '');
  if (stage !== 'stalled') return false;
  const windowDays = MATURATION_CONFIG.nurture_config.reactivation_window_days;
  const lastActivity = /** @type {string | null | undefined} */ (
    prospect?.last_meaningful_activity_at || prospect?.created_at
  );
  if (!lastActivity) return false;
  const last = new Date(String(lastActivity));
  if (Number.isNaN(last.getTime())) return false;
  const diffDays = (now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000);
  return diffDays >= windowDays;
}

// ---------------------------------------------------------------------------
// Qualification guidance
// ---------------------------------------------------------------------------

/**
 * Get the qualification gate config for a product.
 *
 * @param {'ai_lead_rescue' | 'website_rescue' | string} product
 * @returns {Record<string, unknown> | null}
 */
export function getQualificationGate(product) {
  const key = String(product || '');
  return /** @type {any} */ (MATURATION_CONFIG.qualification_gates)[key] || null;
}

/**
 * Check whether a prospect meets the minimum qualification criteria for a
 * given product gate. Returns { qualified: true } or { qualified: false, missing: string[] }.
 *
 * This is a structural check (field presence), not a business judgement.
 *
 * @param {{
 *   business_name?: string | null,
 *   email?: string | null,
 *   product_service_path?: string | null,
 *   qualification_complete?: boolean | null,
 * }} prospect
 * @param {'ai_lead_rescue' | 'website_rescue' | string} productGateKey
 * @returns {{ qualified: true } | { qualified: false, missing: string[] }}
 */
export function checkQualificationGate(prospect, productGateKey) {
  const gate = getQualificationGate(productGateKey);
  if (!gate) {
    return { qualified: false, missing: [`unknown_gate:${productGateKey}`] };
  }
  const missing = [];
  if (!prospect?.business_name || !String(prospect.business_name).trim()) {
    missing.push('business_name');
  }
  if (!prospect?.email || !String(prospect.email).trim()) {
    missing.push('email');
  }
  if (!prospect?.product_service_path || !String(prospect.product_service_path).trim()) {
    missing.push('service_path_or_product');
  }
  if (prospect?.qualification_complete === false) {
    missing.push('qualification_complete_flag');
  }
  if (missing.length > 0) return { qualified: false, missing };
  return { qualified: true };
}

// ---------------------------------------------------------------------------
// Draft asset helpers (send=false enforced)
// ---------------------------------------------------------------------------

/**
 * Retrieve a draft asset template by id.
 * Always returns the asset with send=false enforced regardless of config value.
 *
 * @param {string} assetId
 * @returns {Record<string, unknown> | null}
 */
export function getDraftAsset(assetId) {
  const assets = /** @type {any} */ (DRAFT_ASSETS_CONFIG.draft_assets);
  const asset = assets?.[String(assetId)] || null;
  if (!asset) return null;
  return { ...asset, send: false, protected: true };
}

/**
 * Get all draft asset ids.
 *
 * @returns {string[]}
 */
export function getDraftAssetIds() {
  const assets = /** @type {any} */ (DRAFT_ASSETS_CONFIG.draft_assets);
  return Object.keys(assets || {});
}

/**
 * Get draft assets applicable to a given stage trigger.
 *
 * @param {string} stage
 * @returns {Array<Record<string, unknown>>}
 */
export function getDraftAssetsForStage(stage) {
  const ids = getDraftAssetIds();
  return ids
    .map((id) => getDraftAsset(id))
    .filter((a) => a !== null && a.stage_trigger === stage);
}

/**
 * Assert that the draft asset config global send flag is false.
 * Used as a safety assertion in tests.
 *
 * @returns {{ safe: true } | { safe: false, reason: string }}
 */
export function assertDraftAssetConfigNoSend() {
  if (DRAFT_ASSETS_CONFIG.$send !== false) {
    return { safe: false, reason: '$send must be false on draft assets config' };
  }
  if (DRAFT_ASSETS_CONFIG.$protected !== true) {
    return { safe: false, reason: '$protected must be true on draft assets config' };
  }
  const assets = /** @type {any} */ (DRAFT_ASSETS_CONFIG.draft_assets);
  const violators = Object.entries(assets || {})
    .filter(([, a]) => /** @type {any} */ (a).send !== false)
    .map(([id]) => id);
  if (violators.length > 0) {
    return { safe: false, reason: `send=true found on assets: ${violators.join(', ')}` };
  }
  return { safe: true };
}

// ---------------------------------------------------------------------------
// Daily operator summary (read-only; returns data only — no dispatch)
// ---------------------------------------------------------------------------

/**
 * Compute a daily operator prospect summary for the current date.
 * Returns categorised counts and action-required lists.
 * Pure function — no external calls, no send.
 *
 * @param {Array<Record<string, unknown>>} prospects
 * @param {Date} [now]
 * @returns {{
 *   total: number,
 *   active: number,
 *   overdue: number,
 *   due_today: number,
 *   stalled: number,
 *   missing_owner: number,
 *   missing_next_action: number,
 *   new_unreviewed: number,
 *   action_required_ids: string[],
 *   generated_at: string,
 * }}
 */
export function computeDailyOperatorSummary(prospects, now = new Date()) {
  const list = Array.isArray(prospects) ? prospects : [];
  let overdue = 0;
  let dueToday = 0;
  let stalled = 0;
  let missingOwner = 0;
  let missingNextAction = 0;
  let newUnreviewed = 0;
  const actionRequiredIds = [];

  for (const p of list) {
    const stage = String(p?.canonical_stage || '');
    const active = isActiveStage(stage);
    const signals = computeProspectExceptionSignals(p, now);

    if (signals.includes('overdue_action')) overdue += 1;
    if (signals.includes('due_today')) dueToday += 1;
    if (stage === 'stalled') stalled += 1;
    if (active && (!p?.owner || !String(p.owner).trim())) missingOwner += 1;
    if (active && (!p?.next_action || !String(p.next_action).trim())) missingNextAction += 1;
    if (signals.includes('new_unreviewed')) newUnreviewed += 1;

    // Only flag action_required for active stages — terminal/closure stages need no further operator drive.
    const needsAction =
      isActiveStage(stage) &&
      (signals.includes('overdue_action') ||
        signals.includes('due_today') ||
        signals.includes('no_next_action') ||
        signals.includes('new_unreviewed'));
    if (needsAction && p?.id) actionRequiredIds.push(String(p.id));
  }

  const activeCount = list.filter((p) => isActiveStage(String(p?.canonical_stage || ''))).length;

  return {
    total: list.length,
    active: activeCount,
    overdue,
    due_today: dueToday,
    stalled,
    missing_owner: missingOwner,
    missing_next_action: missingNextAction,
    new_unreviewed: newUnreviewed,
    action_required_ids: actionRequiredIds,
    generated_at: now.toISOString(),
  };
}

/**
 * Compute a weekly pipeline summary.
 * Returns stage distribution and velocity/health indicators.
 *
 * @param {Array<Record<string, unknown>>} prospects
 * @param {Date} [now]
 * @returns {{
 *   by_stage: Record<string, number>,
 *   total: number,
 *   terminal: number,
 *   stale_active: number,
 *   health: 'healthy' | 'attention' | 'critical',
 *   generated_at: string,
 * }}
 */
export function computeWeeklyPipelineSummary(prospects, now = new Date()) {
  const list = Array.isArray(prospects) ? prospects : [];
  /** @type {Record<string, number>} */
  const byStage = {};
  for (const stage of PROSPECT_CANONICAL_STAGES) byStage[stage] = 0;
  let terminal = 0;
  let staleActive = 0;

  for (const p of list) {
    const stage = String(p?.canonical_stage || 'qualifying');
    byStage[stage] = (byStage[stage] || 0) + 1;
    if (isTerminalStage(stage)) terminal += 1;
    if (isActiveStage(stage) && isProspectStale(p, now)) staleActive += 1;
  }

  const activeCount = list.filter((p) => isActiveStage(String(p?.canonical_stage || ''))).length;
  let health = /** @type {'healthy' | 'attention' | 'critical'} */ ('healthy');
  if (staleActive > activeCount * 0.5) health = 'critical';
  else if (staleActive > activeCount * 0.25) health = 'attention';

  return {
    by_stage: byStage,
    total: list.length,
    terminal,
    stale_active: staleActive,
    health,
    generated_at: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Transition guard (maturation layer over canonical transitions)
// ---------------------------------------------------------------------------

/**
 * Validate a proposed stage transition, including maturation entry criteria checks.
 *
 * @param {Record<string, unknown>} prospect
 * @param {string} toStage
 * @returns {{ allowed: true } | { allowed: false, reason: string }}
 */
export function validateStageTransition(prospect, toStage) {
  const fromStage = String(prospect?.canonical_stage || '');
  const to = String(toStage || '');

  if (!PROSPECT_CANONICAL_STAGES.includes(to)) {
    return { allowed: false, reason: `Unknown target stage: ${to}` };
  }
  if (!isCanonicalStageTransitionAllowed(fromStage, to)) {
    return { allowed: false, reason: `Transition ${fromStage} → ${to} not allowed` };
  }

  if (to === 'qualifying' && fromStage === 'new') {
    if (!prospect?.owner || !String(prospect.owner).trim()) {
      return { allowed: false, reason: 'Owner must be assigned before moving to qualifying' };
    }
  }

  if (to === 'discovery_booked') {
    if (!prospect?.owner || !String(prospect.owner).trim()) {
      return { allowed: false, reason: 'Owner must be assigned before booking discovery' };
    }
  }

  if ((to === 'lost' || to === 'not_fit' || to === 'stalled') &&
      (!prospect?.closure_reason || !String(prospect.closure_reason).trim())) {
    return { allowed: false, reason: `closure_reason required to move to ${to}` };
  }

  return { allowed: true };
}
