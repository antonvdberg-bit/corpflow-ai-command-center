/**
 * #1219 — Operating Workspace load vs empty vs ready panels.
 * Browser-safe. No Prisma, fs, or secrets.
 *
 * A failed staff list/overview load must not collapse into empty or
 * “nothing needs attention”.
 */

/** @typedef {'loading'|'error'|'empty'|'ready'} StaffWorkspaceListPanelKind */

export const OVERVIEW_LIST_ERROR_TITLE = 'Operating Workspace overview unavailable';
export const OVERVIEW_LIST_ERROR_BODY =
  'We could not load exceptions from existing Prospect, Client, Commercial and Delivery records. This does not mean nothing needs attention. Retry, or open a canonical list.';

export const STAFF_LIST_ERROR_BODIES = Object.freeze({
  queue:
    'We could not load the Action Queue. This does not mean there is no work. Retry, or open Overview.',
  clients:
    'We could not load Clients. This does not mean there are no client records. Retry, or open Overview.',
  commercial:
    'We could not load Commercial. This does not mean there are no commercial records. Retry, or open Overview.',
  delivery:
    'We could not load Delivery. This does not mean delivery is complete or empty. Retry, or open Overview.',
});

/**
 * @param {{
 *   busy?: boolean,
 *   error?: unknown,
 *   count?: number,
 *   overviewOk?: boolean,
 * }} [args]
 * @returns {StaffWorkspaceListPanelKind}
 */
export function staffWorkspaceListPanelKind(args = {}) {
  if (args.busy === true) return 'loading';
  const hasError = Boolean(String(args.error || '').trim()) || args.overviewOk === false;
  if (hasError) return 'error';
  if (!Number(args.count || 0)) return 'empty';
  return 'ready';
}

/**
 * @param {{
 *   busy?: boolean,
 *   error?: unknown,
 *   exceptionCount?: number,
 *   overviewOk?: boolean,
 * }} [args]
 * @returns {StaffWorkspaceListPanelKind}
 */
export function operatingOverviewPanelKind(args = {}) {
  return staffWorkspaceListPanelKind({
    busy: args.busy,
    error: args.error,
    count: args.exceptionCount,
    overviewOk: args.overviewOk,
  });
}

/**
 * Error-panel copy must not look like an all-clear / completed workspace.
 * @param {unknown} text
 * @returns {boolean}
 */
export function overviewErrorCopyImpliesFalseClear(text) {
  const s = String(text || '').toLowerCase();
  if (!s.trim()) return false;
  if (
    s.includes('does not mean nothing needs attention') ||
    s.includes('does not mean there is no work') ||
    s.includes('does not mean there are no') ||
    s.includes('does not mean delivery is complete')
  ) {
    return false;
  }
  return (
    s.includes('nothing needs attention right now') ||
    s.includes('no overdue, stalled, blocked') ||
    s.includes('work is complete') ||
    s.includes('delivery is complete')
  );
}
