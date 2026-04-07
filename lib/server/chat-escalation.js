import crypto from 'node:crypto';

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Stable-enough idempotency key for “needs brain” escalations without storing raw client text in the key.
 *
 * @param {{ tenant_id?: string | null, message: string }} opts
 * @returns {string}
 */
export function buildNeedsBrainIdempotencyKey(opts) {
  const tenant = str(opts.tenant_id || 'public') || 'public';
  const msg = str(opts.message || '');
  const h = crypto.createHash('sha256').update(msg, 'utf8').digest('hex').slice(0, 16);
  return `needs_brain:${tenant}:${h}`;
}

/**
 * Canonical “we can’t answer safely” response shape.
 *
 * @param {{
 *   tenant_id?: string | null
 *   message: string
 *   mode?: string
 *   surface?: string
 *   allow_contact?: boolean
 * }} opts
 * @returns {{
 *   response: string
 *   client_action?: { kind: 'i_dont_know', label: string, enabled: boolean }
 *   next_actions: Array<{ step: number, title: string, detail: string }>
 *   operator_brief: { title: string, summary: string, tenant_id: string | null, mode?: string | null, surface?: string | null }
 * }}
 */
export function buildNeedsBrainResponse(opts) {
  const tenantId = opts.tenant_id != null ? str(opts.tenant_id) || null : null;
  const mode = opts.mode != null ? str(opts.mode) || null : null;
  const surface = opts.surface != null ? str(opts.surface) || null : null;
  const allowContact = opts.allow_contact !== false;

  const nextActions = [
    {
      step: 1,
      title: 'Clarify the missing detail',
      detail:
        'Ask one tight follow-up question (what exactly must be true when this is done, what system it’s in, and what “success” looks like).',
    },
    {
      step: 2,
      title: 'Add/refresh the playbook entry',
      detail:
        'Create or update an `automation.playbook.upsert` so next time this is answerable from the library (include exact URLs and operational steps).',
    },
    {
      step: 3,
      title: 'Escalate to operator (“needs brain”)',
      detail:
        'Route this as a needs-brain item for a human decision. Once answered, persist the answer back into a playbook.',
    },
  ];

  const summary = allowContact
    ? 'Client asked a question the factory cannot answer safely from the current library. Follow up for missing detail; then persist to playbook.'
    : 'Client requested escalation (“I don’t know”). Follow up for missing detail; then persist to playbook.';

  return {
    ok: false,
    response_kind: 'needs_brain',
    response:
      "I don’t know yet — and I won’t guess. I’ve escalated this so a human can answer safely, and we’ll store the answer so it becomes automatic next time.",
    client_options: [{ kind: 'i_dont_know', label: "I don't know / escalate", enabled: true }],
    next_actions: nextActions,
    operator_brief: {
      title: 'Needs brain: client question unanswered safely',
      summary,
      tenant_id: tenantId,
      mode,
      surface,
    },
  };
}

