import { isCmpTicketOperatorOpen } from './ticket-operator-withdraw.js';

/**
 * @param {{ status?: string | null, stage?: string | null, consoleJson?: unknown }} row
 * @returns {boolean}
 */
export function isCmpTicketMutable(row) {
  return isCmpTicketOperatorOpen(row);
}

/**
 * @param {import('http').ServerResponse} res
 * @param {{ status?: string | null, stage?: string | null, consoleJson?: unknown }} row
 * @param {(res: import('http').ServerResponse, status: number, error: string, extra?: Record<string, unknown>) => import('http').ServerResponse} deny
 * @returns {import('http').ServerResponse | null}
 */
export function denyIfTicketClosed(res, row, deny) {
  if (isCmpTicketMutable(row)) return null;
  return deny(res, 409, 'TICKET_CLOSED', {
    operator_message: 'This ticket is closed — approval is not available.',
    hint: 'This ticket was withdrawn or closed and cannot proceed to estimate, build, or approval.',
  });
}
