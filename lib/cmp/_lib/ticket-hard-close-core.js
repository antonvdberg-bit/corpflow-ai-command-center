/**
 * Merge `cmp_tickets.console_json` for an operator **hard close** (no merge/publish path).
 *
 * @param {unknown} consoleJson
 * @param {{ reason?: string | null, nowIso?: string, contextNote?: string | null }} opts
 * @returns {Record<string, unknown>}
 */
export function buildHardCloseConsoleJsonPatch(consoleJson, opts) {
  const nowIso = opts.nowIso || new Date().toISOString();
  const reason = opts.reason != null ? String(opts.reason).trim().slice(0, 4000) : '';
  const contextNote =
    opts.contextNote != null && String(opts.contextNote).trim()
      ? String(opts.contextNote).trim().slice(0, 4000)
      : 'Process churn: ticket exposed to multiple versions of development and testing; follow-up work will be logged as a separate request.';

  const prev = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? { ...consoleJson } : {};
  const prevCv = prev.client_view && typeof prev.client_view === 'object' ? { ...prev.client_view } : {};

  return {
    ...prev,
    client_view: {
      ...prevCv,
      workflow_state: 'closed',
      workflow_next_action: 'No further action — ticket closed.',
      progress_message: 'Ticket closed (hard close).',
      closure: {
        kind: 'hard_close',
        reason: reason || null,
        context_note: contextNote,
        decided_at: nowIso,
      },
    },
  };
}
