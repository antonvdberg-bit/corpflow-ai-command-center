/**
 * AI Lead Rescue assistant — canonical refusal templates.
 *
 * Used by the handler when ANY layer of the six-layer guardrail floor fires:
 *   1. System prompt violation detected post-hoc (output filter)  → revenue / discount / banking / hype / out-of-scope
 *   2. Input filter detected banking-class data
 *   3. Rate limit exceeded
 *   4. Out-of-scope query the model itself recognised
 *   5. Internal error / model refused / vendor outage
 *
 * Every refusal text is doctrine-aligned and offers a concrete next step
 * (either the intake form or support@corpflowai.com), per the
 * BRAND_AND_CONVERSION_DOCTRINE.md *Effectiveness beats decoration* rule.
 *
 * Refusal IDs are stable — they appear as `props.refusal_class` on the
 * `lr_bot_refusal` Plausible event so we can review week-1 distributions.
 */

export const REFUSAL_VERSION = 'v1.0.0-2026-06-05';

/**
 * @typedef {Object} RefusalTemplate
 * @property {string} id              — stable, matches a Plausible `refusal_class` value.
 * @property {string} message         — the exact string sent back to the visitor.
 * @property {boolean} offerIntake    — true if the assistant should propose `scroll_to_intake` in the same turn.
 */

/** @type {Record<string, RefusalTemplate>} */
const REFUSAL_TEMPLATES = Object.freeze({
  banking_data_in_input: {
    id: 'banking_data_in_input',
    message:
      "Please don't share banking, card, or account numbers here. The page does not collect payment details — we email a USD invoice after we review your intake, and the payment route is decided then. Want me to take you to the intake form?",
    offerIntake: true,
  },
  rate_limited: {
    id: 'rate_limited',
    message:
      "We're getting a lot of chat traffic just now. Please try again in a few minutes, or fill in the intake form below — we review every intake within two business hours.",
    offerIntake: true,
  },
  out_of_scope: {
    id: 'out_of_scope',
    message:
      "I can only answer questions about the AI Lead Rescue offer. For anything else, please email support@corpflowai.com — acknowledged within two working days.",
    offerIntake: false,
  },
  support_question: {
    id: 'support_question',
    message:
      "I'm a sales assistant for AI Lead Rescue, not a support agent. For support questions, please email support@corpflowai.com — acknowledged within two working days.",
    offerIntake: false,
  },
  guarantee_attempted: {
    id: 'guarantee_attempted',
    message:
      "I can't promise revenue, lead-volume, or conversion outcomes — that's a fundamental rule of how we work. What I can say is the pilot is built to make sure new enquiries are captured, alerted, logged, and surfaced for follow-up. Want me to take you to the intake form?",
    offerIntake: true,
  },
  discount_attempted: {
    id: 'discount_attempted',
    message:
      "The launch pilot is USD 150 — no discounts, no different scope. If you'd like to start, I can take you to the intake form.",
    offerIntake: true,
  },
  banking_output_attempted: {
    id: 'banking_output_attempted',
    message:
      "I can't share payment links or bank details here. Once we review your intake, we email a USD invoice with the agreed payment route. Want me to take you to the intake form?",
    offerIntake: true,
  },
  hype_vocabulary: {
    id: 'hype_vocabulary',
    message:
      "Let me put that more concretely: AI Lead Rescue captures new enquiries, alerts the owner or operator, logs every lead, and surfaces follow-ups daily. We don't replace your team. Want me to take you to the intake form?",
    offerIntake: true,
  },
  out_of_scope_offer: {
    id: 'out_of_scope_offer',
    message:
      "The pilot is intentionally narrow — one lead source, alerts, log, follow-up board, 7-day monitoring. It does NOT include website rebuild, CRM migration, paid ads, or copywriting. If you'd like to start with the narrow pilot, I can take you to the intake form.",
    offerIntake: true,
  },
  internal_error: {
    id: 'internal_error',
    message:
      "Something went wrong on my side. Please fill in the intake form below — we review every intake within two business hours and will reach out from there.",
    offerIntake: true,
  },
  vendor_unavailable: {
    id: 'vendor_unavailable',
    message:
      "The chat assistant is temporarily unavailable. The intake form below works without it — we review every intake within two business hours.",
    offerIntake: true,
  },
});

/**
 * @param {string} id
 * @returns {RefusalTemplate}
 */
export function getRefusalTemplate(id) {
  const t = REFUSAL_TEMPLATES[id];
  if (t) return t;
  return REFUSAL_TEMPLATES.internal_error;
}

/**
 * Mapping from `output-filter.js` refusal classes to refusal-template IDs.
 * Single source of truth so the handler doesn't need a switch statement.
 */
export const OUTPUT_FILTER_REFUSAL_MAP = Object.freeze({
  guarantee: 'guarantee_attempted',
  discount: 'discount_attempted',
  banking: 'banking_output_attempted',
  hype: 'hype_vocabulary',
  out_of_scope: 'out_of_scope_offer',
});

export { REFUSAL_TEMPLATES };
