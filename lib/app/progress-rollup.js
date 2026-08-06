/**
 * Deterministic progress roll-up from component milestones (not free text).
 */

import { MILESTONE_META } from './constants.js';

/**
 * @param {unknown} milestone
 * @returns {keyof typeof MILESTONE_META | null}
 */
export function normalizeMilestone(milestone) {
  const v = String(milestone || '')
    .trim()
    .toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MILESTONE_META, v)) {
    return /** @type {keyof typeof MILESTONE_META} */ (v);
  }
  return null;
}

/**
 * @param {Array<{ milestone?: unknown }>} components
 * @returns {{
 *   percent: number,
 *   complete_count: number,
 *   remaining_count: number,
 *   total_count: number,
 *   next_component_key: string | null,
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
    };
  }

  let complete = 0;
  /** @type {string | null} */
  let nextKey = null;

  for (const c of list) {
    const ms = normalizeMilestone(c?.milestone) || 'planned';
    const meta = MILESTONE_META[ms];
    if (meta.terminal) {
      complete += 1;
      continue;
    }
    if (!nextKey) {
      const key = c && typeof c.key === 'string' ? c.key.trim() : '';
      if (key) nextKey = key;
    }
  }

  const percent = Math.round((100 * complete) / total);
  return {
    percent,
    complete_count: complete,
    remaining_count: total - complete,
    total_count: total,
    next_component_key: nextKey,
  };
}
