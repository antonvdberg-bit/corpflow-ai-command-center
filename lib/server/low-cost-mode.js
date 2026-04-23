/**
 * Global operational throttle: fewer cron scans/writes and smaller batches.
 * Set CORPFLOW_LOW_COST_MODE=true (or LOW_COST_MODE=true) on Vercel / runtime.
 */

import { cfg } from './runtime-config.js';

/**
 * @returns {boolean}
 */
export function isLowCostMode() {
  const a = String(cfg('CORPFLOW_LOW_COST_MODE', '')).trim().toLowerCase();
  const b = String(cfg('LOW_COST_MODE', '')).trim().toLowerCase();
  return a === 'true' || a === '1' || a === 'yes' || b === 'true' || b === '1' || b === 'yes';
}

/**
 * @param {number} limit
 * @param {number} capWhenLowCost
 * @returns {number}
 */
export function lowCostCap(limit, capWhenLowCost) {
  if (!isLowCostMode()) return limit;
  const c = Math.max(1, Math.floor(capWhenLowCost));
  return Math.min(limit, c);
}
