/**
 * #778 Slice 1 — deterministic component milestone model.
 * Numeric progress is derived only from these ordered states (never free text).
 */

/** @typedef {'not_started'|'defined'|'in_progress'|'preview_ready'|'client_review'|'approved'|'live_verified'} AppComponentMilestone */

/** @type {readonly AppComponentMilestone[]} */
export const APP_COMPONENT_MILESTONES = Object.freeze([
  'not_started',
  'defined',
  'in_progress',
  'preview_ready',
  'client_review',
  'approved',
  'live_verified',
]);

/** @type {ReadonlySet<string>} */
export const TERMINAL_MILESTONES = new Set(['approved', 'live_verified']);

/**
 * @param {unknown} raw
 * @returns {AppComponentMilestone | null}
 */
export function normalizeComponentMilestone(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase();
  if (APP_COMPONENT_MILESTONES.includes(/** @type {AppComponentMilestone} */ (v))) {
    return /** @type {AppComponentMilestone} */ (v);
  }
  return null;
}

/**
 * Ordinal weight 0..max for explainable roll-up.
 * @param {unknown} milestone
 * @returns {number}
 */
export function milestoneWeight(milestone) {
  const m = normalizeComponentMilestone(milestone);
  if (!m) return 0;
  return APP_COMPONENT_MILESTONES.indexOf(m);
}

/**
 * @returns {number}
 */
export function maxMilestoneWeight() {
  return APP_COMPONENT_MILESTONES.length - 1;
}

/**
 * Deterministic overall progress from component milestones.
 * Formula: round(100 * mean(weight / maxWeight)).
 *
 * @param {Array<{ milestone?: unknown } | null | undefined>} components
 * @returns {{ percent: number, complete_count: number, remaining_count: number, total_count: number }}
 */
export function rollupComponentProgress(components) {
  const list = Array.isArray(components) ? components.filter(Boolean) : [];
  const total = list.length;
  if (total === 0) {
    return { percent: 0, complete_count: 0, remaining_count: 0, total_count: 0 };
  }
  const maxW = maxMilestoneWeight();
  let sum = 0;
  let complete = 0;
  for (const c of list) {
    const m = normalizeComponentMilestone(c?.milestone) || 'not_started';
    sum += milestoneWeight(m);
    if (TERMINAL_MILESTONES.has(m)) complete += 1;
  }
  const percent = maxW <= 0 ? 0 : Math.round((100 * sum) / (total * maxW));
  return {
    percent,
    complete_count: complete,
    remaining_count: total - complete,
    total_count: total,
  };
}
