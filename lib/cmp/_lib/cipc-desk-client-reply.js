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
 * @returns {Record<string, unknown> | null}
 */
export function getCipcDeskViewFromConsoleJson(consoleJson) {
  const cj = asObj(consoleJson);
  const cv = asObj(cj.client_view);
  const cipc = asObj(cv.cipc_desk);
  return Object.keys(cipc).length ? cipc : null;
}

/**
 * Client-safe status payload for the decisions / progress page.
 * Omits hashes, seed markers, and other operator-internal fields.
 *
 * @param {unknown} consoleJson
 * @returns {null | {
 *   present: true,
 *   client_route: string | null,
 *   service_summary: string | null,
 *   reply_draft_prepared: boolean,
 *   checklist_items: Array<{ label: string, status: string }>,
 * }}
 */
export function getCipcDeskClientStatusFromConsoleJson(consoleJson) {
  const cj = asObj(consoleJson);
  const cipc = getCipcDeskViewFromConsoleJson(consoleJson);
  if (!cipc) return null;

  const brief = asObj(cj.brief);
  const serviceSummary =
    typeof brief.summary === 'string' && brief.summary.trim()
      ? brief.summary.trim()
      : typeof brief.service === 'string' && brief.service.trim()
        ? brief.service.trim()
        : null;

  const clientRoute =
    typeof cipc.client_route === 'string' && cipc.client_route.trim() ? cipc.client_route.trim() : null;

  const draft =
    typeof cipc.client_reply_draft === 'string' && cipc.client_reply_draft.trim()
      ? cipc.client_reply_draft.trim()
      : '';

  const checklist = asObj(cipc.checklist);
  const rawItems = Array.isArray(checklist.items) ? checklist.items : [];
  const checklist_items = rawItems
    .map((it) => {
      const o = asObj(it);
      const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim() : '';
      const status = typeof o.status === 'string' && o.status.trim() ? o.status.trim().toLowerCase() : 'pending';
      if (!label) return null;
      return { label, status };
    })
    .filter(Boolean);

  return {
    present: true,
    client_route: clientRoute,
    service_summary: serviceSummary,
    reply_draft_prepared: Boolean(draft),
    checklist_items,
  };
}

/**
 * @param {unknown} consoleJson
 * @returns {string}
 */
export function getCipcDeskClientReplyDraftFromConsoleJson(consoleJson) {
  const cipc = getCipcDeskViewFromConsoleJson(consoleJson) || {};
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
