/**
 * Draft handoff / intake payload builder for the synthetic AI receptionist.
 * Always marks requires_human_review: true and never claims an external action ran.
 */

/** @typedef {'email' | 'phone' | 'whatsapp' | 'unknown'} ContactMethod */
/** @typedef {'low' | 'normal' | 'high' | 'unknown'} Urgency */

/**
 * @typedef {object} CapturedEnquiry
 * @property {string | null} lead_name
 * @property {string | null} company
 * @property {ContactMethod | null} contact_method
 * @property {string | null} contact_value
 * @property {string | null} need
 * @property {Urgency | null} urgency
 * @property {string | null} preferred_follow_up
 * @property {string[]} risk_flags
 */

export const NO_EXTERNAL_ACTION_DISCLAIMER =
  'No email, WhatsApp, SMS, phone call, CRM update, database write, or external action has been executed. This is a draft handoff only and requires human review.';

/**
 * @param {Partial<CapturedEnquiry>} captured
 * @param {{ escalation_reason?: string | null }} [opts]
 */
export function buildDraftHandoff(captured, opts = {}) {
  const risk_flags = Array.isArray(captured.risk_flags) ? [...captured.risk_flags] : [];
  if (opts.escalation_reason) {
    risk_flags.push(`escalation:${opts.escalation_reason}`);
  }
  if (!captured.contact_value) {
    risk_flags.push('missing_contact_value');
  }
  if (!captured.lead_name) {
    risk_flags.push('missing_lead_name');
  }
  if (!captured.need) {
    risk_flags.push('missing_need');
  }

  const recommended_next_action = opts.escalation_reason
    ? 'operator_review_escalation'
    : risk_flags.length > 0
      ? 'operator_complete_missing_fields'
      : 'operator_review_and_decide_follow_up';

  return {
    schema: 'corpflow.ai_receptionist.draft_handoff.v1',
    lead_name: captured.lead_name ?? null,
    company: captured.company ?? null,
    contact_method: captured.contact_method ?? null,
    contact_value: captured.contact_value ?? null,
    need: captured.need ?? null,
    urgency: captured.urgency ?? null,
    preferred_follow_up: captured.preferred_follow_up ?? null,
    risk_flags,
    recommended_next_action,
    requires_human_review: true,
    external_actions_executed: [],
    disclaimer: NO_EXTERNAL_ACTION_DISCLAIMER,
    prototype: {
      mode: 'synthetic_browser_voice',
      pipecat: 'deferred',
      telephony: false,
      production: false,
    },
  };
}

/**
 * @param {ReturnType<typeof buildDraftHandoff>} handoff
 */
export function formatHandoffSummary(handoff) {
  const lines = [
    'Here is a draft summary of your enquiry (not yet submitted anywhere):',
    `- Name: ${handoff.lead_name || '(missing)'}`,
    `- Company: ${handoff.company || '(not provided)'}`,
    `- Contact: ${handoff.contact_method || '(unknown)'} — ${handoff.contact_value || '(missing)'}`,
    `- Need: ${handoff.need || '(missing)'}`,
    `- Urgency: ${handoff.urgency || '(unknown)'}`,
    `- Preferred follow-up: ${handoff.preferred_follow_up || '(not provided)'}`,
    `- Recommended next action: ${handoff.recommended_next_action}`,
    `- Requires human review: ${handoff.requires_human_review}`,
    '',
    handoff.disclaimer,
  ];
  return lines.join('\n');
}
