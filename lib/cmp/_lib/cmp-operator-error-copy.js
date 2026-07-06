/**
 * Operator-safe CMP error messages for Change Console actions.
 * Maps API JSON + HTTP status to actionable copy (no secrets).
 */

const GENERIC_APPROVE_ERRORS = new Set([
  'approve build failed',
  'ticket create failed',
  'method not allowed',
]);

/**
 * @param {unknown} body
 * @returns {Record<string, unknown>}
 */
function asObject(body) {
  return body && typeof body === 'object' && !Array.isArray(body) ? /** @type {Record<string, unknown>} */ (body) : {};
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * @param {Record<string, unknown>} j
 * @param {number} status
 * @param {{ action?: string }} [opts]
 * @returns {string}
 */
export function formatCmpRouterOperatorError(j, status, opts = {}) {
  const body = asObject(j);
  const action = str(opts.action) || 'request';

  const operatorMessage = str(body.operator_message);
  if (operatorMessage) return operatorMessage;

  const hint = str(body.hint);
  const detail = str(body.detail);
  const reason = str(body.reason);
  const code = str(body.code);
  const err = str(body.error);

  if (status === 401 || err.toLowerCase().includes('dormant') || code === 'FACTORY_DORMANT') {
    if (reason === 'INSUFFICIENT_CREDITS' || err.includes('INSUFFICIENT_CREDITS')) {
      const bal = body.token_credit_balance_usd;
      const balTxt = typeof bal === 'number' ? ` (balance: $${bal})` : '';
      return `Insufficient token credits${balTxt}. Top up the tenant wallet or set billing_exempt before approval.`;
    }
    if (status === 401 || err.toLowerCase().includes('session')) {
      return 'Login required before approval.';
    }
  }

  if (status === 402 || err.toLowerCase().includes('insufficient') || err.toLowerCase().includes('inflow required')) {
    return 'Insufficient token credits to approve this build. Top up the tenant wallet or use a billing-exempt tenant.';
  }

  if (status === 403) {
    if (err.toLowerCase().includes('ethical') || err.toLowerCase().includes('sentinel')) {
      return `Approval blocked by ethical verification: ${err || detail || 'see rigor report'}.`;
    }
    if (err.toLowerCase().includes('tenant') || err.toLowerCase().includes('host')) {
      return 'Approval blocked by tenant boundary validation.';
    }
    return err || detail || hint || 'Approval forbidden for this session.';
  }

  if (status === 404) {
    if (hint.toLowerCase().includes('organization') || hint.toLowerCase().includes('workspace')) {
      return 'Approval blocked by tenant boundary validation.';
    }
    return hint || err || detail || 'Ticket not found for this workspace.';
  }

  if (status === 409 || err.toLowerCase().includes('ticket_closed') || code === 'TICKET_CLOSED') {
    return 'This ticket is closed — approval is not available.';
  }

  if (status === 400) {
    if (err.toLowerCase().includes('missing description') || hint.toLowerCase().includes('description')) {
      return 'Add a change description before approval.';
    }
    if (err.toLowerCase().includes('ticket_id')) {
      return 'Select a ticket before approval.';
    }
    return hint || err || detail || 'Approval request was invalid.';
  }

  if (status === 409 && action === 'approve-build') {
    return err || 'This ticket cannot be approved until an estimate exists.';
  }

  if (hint) return hint;
  if (detail && !GENERIC_APPROVE_ERRORS.has(detail.toLowerCase())) return detail;
  if (err && !GENERIC_APPROVE_ERRORS.has(err.toLowerCase())) return err;
  if (reason) return reason;

  if (status >= 500 && action === 'approve-build') {
    if (detail) return `Approval failed: ${detail}`;
    return 'Approval failed on the server. Retry or check factory health logs.';
  }

  return err || detail || `Request failed (HTTP ${status}).`;
}

/**
 * @param {string} message
 * @param {number} status
 * @param {string} [detail]
 * @returns {string}
 */
export function mapApproveBuildServerException(message, status = 500, detail = '') {
  const m = String(message || '').trim();
  const d = String(detail || '').trim();
  const lower = m.toLowerCase();

  if (lower.includes('insufficient') || lower.includes('402')) {
    return 'Insufficient token credits to approve this build.';
  }
  if (lower.includes('verify-rigor') || lower.includes('ethical')) {
    return `Approval blocked by ethical verification runtime: ${m.slice(0, 240)}`;
  }
  if (lower.includes('provisioning failed') || (lower.includes('python') && lower.includes('spawn'))) {
    return 'Approval blocked: tenant filesystem provisioning is unavailable on this host (Postgres path continues). Retry approval.';
  }
  if (lower.includes('p2025') || lower.includes('record to update not found')) {
    return 'Ticket not found — refresh the queue and try again.';
  }
  if (d) return `Approval failed: ${d.slice(0, 320)}`;
  if (m) return `Approval failed: ${m.slice(0, 320)}`;
  return 'Approval failed on the server. Check deployment logs for approve-build.';
}
