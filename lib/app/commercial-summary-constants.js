/**
 * Browser-safe Commercial summary constants (#1004).
 * No Node fs. No Prisma. No secrets.
 */

export const COMMERCIAL_STATES = Object.freeze([
  'quote_not_prepared',
  'awaiting_acceptance',
  'payment_evidence_pending',
  'awaiting_approval',
  'financial_gate_blocking',
  'financially_approved',
]);

export const COMMERCIAL_STATE_LABELS = Object.freeze({
  quote_not_prepared: 'Quote not prepared',
  awaiting_acceptance: 'Awaiting acceptance',
  payment_evidence_pending: 'Payment evidence pending',
  awaiting_approval: 'Awaiting financial approval',
  financial_gate_blocking: 'Financial gate blocking delivery',
  financially_approved: 'Financially approved',
});

export const COMMERCIAL_FILTERS = Object.freeze(['needs_attention', 'all', ...COMMERCIAL_STATES]);

/**
 * @param {string} [filter]
 * @returns {string}
 */
export function normalizeCommercialFilter(filter) {
  const raw = String(filter || '').trim().toLowerCase();
  if (COMMERCIAL_FILTERS.includes(raw)) return raw;
  return 'needs_attention';
}
