/**
 * Deterministic progress roll-up from component milestones (not free text).
 *
 * Rule (tested):
 *   percent = round(100 * sum(weight(milestone)) / (n * MAX_WEIGHT))
 *   where MAX_WEIGHT = 6 (live_verified)
 *   complete_count = count of terminal milestones (approved | live_verified)
 */

import { MILESTONE_ALIASES, MILESTONE_META } from './constants.js';

export const PROGRESS_MAX_WEIGHT = 6;

/**
 * @param {unknown} milestone
 * @returns {keyof typeof MILESTONE_META | null}
 */
export function normalizeMilestone(milestone) {
  const v = String(milestone || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (Object.prototype.hasOwnProperty.call(MILESTONE_ALIASES, v)) {
    return /** @type {keyof typeof MILESTONE_META} */ (MILESTONE_ALIASES[v]);
  }
  if (Object.prototype.hasOwnProperty.call(MILESTONE_META, v)) {
    const meta = MILESTONE_META[/** @type {keyof typeof MILESTONE_META} */ (v)];
    if (meta && meta.alias_of) {
      return /** @type {keyof typeof MILESTONE_META} */ (meta.alias_of);
    }
    return /** @type {keyof typeof MILESTONE_META} */ (v);
  }
  return null;
}

/**
 * Map component milestone/exposure → operator-facing review state (#883).
 * @param {{ milestone?: unknown, exposed_for_client_review?: unknown }} component
 * @returns {'internal'|'review_ready'|'awaiting_client'|'approved'|'changes_requested'}
 */
export function componentReviewState(component) {
  const ms = normalizeMilestone(component?.milestone) || 'not_started';
  const exposed = component?.exposed_for_client_review === true;
  if (ms === 'approved') return 'approved';
  if (ms === 'changes_requested') return 'changes_requested';
  if (exposed && ms === 'client_review') return 'awaiting_client';
  if (exposed) return 'review_ready';
  return 'internal';
}

/**
 * @param {Array<{ key?: unknown, milestone?: unknown }>} components
 * @returns {{
 *   percent: number,
 *   complete_count: number,
 *   remaining_count: number,
 *   total_count: number,
 *   next_component_key: string | null,
 *   weight_sum: number,
 *   max_weight_sum: number,
 * }}
 */
export function rollupComponentProgress(components) {
  const list = Array.isArray(components) ? components : [];
  const total = list.length;
  if (total === 0) {
    return {
      percent: 0,
      complete_count: 0,
      remaining_count: 0,
      total_count: 0,
      next_component_key: null,
      weight_sum: 0,
      max_weight_sum: 0,
    };
  }

  let complete = 0;
  let weightSum = 0;
  /** @type {string | null} */
  let nextKey = null;

  for (const c of list) {
    const ms = normalizeMilestone(c?.milestone) || 'not_started';
    const meta = MILESTONE_META[ms] || MILESTONE_META.not_started;
    weightSum += Number(meta.weight) || 0;
    if (meta.terminal) {
      complete += 1;
      continue;
    }
    if (!nextKey) {
      const key = c && typeof c.key === 'string' ? c.key.trim() : '';
      if (key) nextKey = key;
    }
  }

  const maxWeightSum = total * PROGRESS_MAX_WEIGHT;
  const percent = Math.round((100 * weightSum) / maxWeightSum);
  return {
    percent,
    complete_count: complete,
    remaining_count: total - complete,
    total_count: total,
    next_component_key: nextKey,
    weight_sum: weightSum,
    max_weight_sum: maxWeightSum,
  };
}
