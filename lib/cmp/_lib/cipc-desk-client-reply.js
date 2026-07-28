/**
 * CIPC Desk client reply draft helpers (thank-you after client decisions).
 * Pure reads from `console_json.client_view.cipc_desk.client_reply_draft`.
 */

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return /** @type {Record<string, unknown>} */ (v);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return /** @type {Record<string, unknown>} */ (parsed);
      }
    } catch {
      /* ignore */
    }
  }
  return {};
}

/**
 * @param {unknown} consoleJson
 * @returns {string}
 */
export function getCipcDeskClientReplyDraftFromConsoleJson(consoleJson) {
  const cj = asObj(consoleJson);
  const cv = asObj(cj.client_view);
  const cipc = asObj(cv.cipc_desk);
  const draft = cipc.client_reply_draft;
  return typeof draft === 'string' && draft.trim() ? draft.trim() : '';
}

/**
 * Prefer the operator-authored CIPC Desk reply draft; else the ticket-specific default thank-you.
 *
 * @param {unknown} consoleJson
 * @param {string} ticketId
 * @param {(ticketId: string) => string} getDefaultThankYou
 * @returns {string}
 */
export function resolveClientDecisionsThankYouMessage(consoleJson, ticketId, getDefaultThankYou) {
  const draft = getCipcDeskClientReplyDraftFromConsoleJson(consoleJson);
  if (draft) return draft;
  const tid = ticketId != null ? String(ticketId).trim() : '';
  if (typeof getDefaultThankYou === 'function') {
    const fallback = getDefaultThankYou(tid);
    return typeof fallback === 'string' && fallback.trim() ? fallback.trim() : '';
  }
  return '';
}
