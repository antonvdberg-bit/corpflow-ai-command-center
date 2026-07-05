import { LUX_PARENT_PROGRAMME_TICKET_ID } from './lux-client-requests.js';
import { buildHardCloseConsoleJsonPatch } from './ticket-hard-close-core.js';

/** Operator-facing audit note stamped on withdraw (issue #523). */
export const OPERATOR_WITHDRAWAL_REASON = 'Withdrawn by operator request';

export const OPERATOR_WITHDRAWAL_CONTEXT_NOTE =
  'Withdrawn by operator request — do not continue delivery unless reopened by Anton.';

export const OPERATOR_WITHDRAWAL_MESSAGE_CONTENT = OPERATOR_WITHDRAWAL_CONTEXT_NOTE;

export const OPERATOR_WITHDRAWAL_MESSAGE_SOURCE = 'ticket-operator-withdraw';

/** Programme master must not be withdrawn from tenant /change. */
export const OPERATOR_WITHDRAWAL_PROTECTED_TICKET_IDS = Object.freeze([LUX_PARENT_PROGRAMME_TICKET_ID]);

/**
 * @param {{ status?: string | null, stage?: string | null, consoleJson?: unknown }} row
 * @returns {boolean}
 */
export function isCmpTicketOperatorOpen(row) {
  if (!row || typeof row !== 'object') return false;
  const st = String(row.status || '').trim().toLowerCase();
  const sg = String(row.stage || '').trim().toLowerCase();
  if (st === 'closed' || sg === 'closed') return false;
  const cj = row.consoleJson && typeof row.consoleJson === 'object' && !Array.isArray(row.consoleJson) ? row.consoleJson : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const wf = String(cv.workflow_state || '').trim().toLowerCase();
  if (wf === 'closed' || wf === 'published' || wf === 'discarded') return false;
  return true;
}

/**
 * @param {string} ticketId
 * @returns {{ ok: true } | { ok: false, error: string, hint?: string }}
 */
export function validateOperatorWithdrawalTarget(ticketId) {
  const id = String(ticketId || '').trim();
  if (!id) return { ok: false, error: 'ticket_id is required' };
  if (OPERATOR_WITHDRAWAL_PROTECTED_TICKET_IDS.includes(id)) {
    return {
      ok: false,
      error: 'WITHDRAWAL_PROTECTED_TICKET',
      hint: 'This programme ticket cannot be withdrawn from the tenant console. Contact CorpFlow support.',
    };
  }
  return { ok: true };
}

/**
 * Non-destructive hard-close patch for operator withdrawal (preserves messages + audit trail).
 *
 * @param {unknown} consoleJson
 * @param {string} nowIso
 * @returns {Record<string, unknown>}
 */
export function buildOperatorWithdrawalConsoleJson(consoleJson, nowIso) {
  const merged = buildHardCloseConsoleJsonPatch(consoleJson, {
    reason: OPERATOR_WITHDRAWAL_REASON,
    contextNote: OPERATOR_WITHDRAWAL_CONTEXT_NOTE,
    nowIso,
  });
  const prev = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? consoleJson : {};
  const prevMessages = Array.isArray(prev.messages) ? prev.messages : [];
  const closureMessage = {
    ts: nowIso,
    role: 'assistant',
    content: OPERATOR_WITHDRAWAL_MESSAGE_CONTENT,
    source: OPERATOR_WITHDRAWAL_MESSAGE_SOURCE,
  };
  return {
    ...merged,
    messages: [...prevMessages, closureMessage],
  };
}
