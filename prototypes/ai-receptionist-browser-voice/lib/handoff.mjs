/**
 * Draft handoff / intake payload builder for the synthetic AI receptionist.
 * Always marks requires_human_review: true and never claims an external action ran.
 *
 * Schema: corpflow.ai_receptionist.draft_handoff.v1
 * Additive field (v1.1 compatible): service_interest
 * Allowed: lead_rescue | website_rescue | workflow_admin_improvement |
 *          ai_receptionist_chatbot | other_unsure | null
 */

/** @typedef {'email' | 'phone' | 'whatsapp' | 'unknown'} ContactMethod */
/** @typedef {'low' | 'normal' | 'high' | 'unknown'} Urgency */
/** @typedef {'lead_rescue' | 'website_rescue' | 'workflow_admin_improvement' | 'ai_receptionist_chatbot' | 'other_unsure'} ServiceInterest */

/**
 * @typedef {object} CapturedEnquiry
 * @property {string | null} lead_name
 * @property {string | null} company
 * @property {ContactMethod | null} contact_method
 * @property {string | null} contact_value
 * @property {ServiceInterest | null} [service_interest]
 * @property {string | null} need
 * @property {Urgency | null} urgency
 * @property {string | null} preferred_follow_up
 * @property {string[]} risk_flags
 * @property {string[]} [notes]
 */

export const NO_EXTERNAL_ACTION_DISCLAIMER =
  'No email, WhatsApp, SMS, phone call, CRM update, database write, or external action has been executed. This is a draft handoff only and requires human review.';

export const SERVICE_INTEREST_LABELS = {
  lead_rescue: 'Lead Rescue',
  website_rescue: 'Website Rescue',
  workflow_admin_improvement: 'Workflow / admin improvement',
  ai_receptionist_chatbot: 'AI receptionist / chatbot interest',
  other_unsure: 'Other / unsure',
};

/**
 * @param {Partial<CapturedEnquiry>} captured
 * @param {{ escalation_reason?: string | null }} [opts]
 */
export function buildDraftHandoff(captured, opts = {}) {
  const risk_flags = Array.isArray(captured.risk_flags) ? [...captured.risk_flags] : [];
  const notes = Array.isArray(captured.notes) ? [...captured.notes] : [];
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
  if (!captured.service_interest) {
    risk_flags.push('missing_service_interest');
  }

  const recommended_next_action = opts.escalation_reason
    ? 'operator_review_escalation'
    : risk_flags.length > 0
      ? 'operator_complete_missing_fields'
      : 'operator_review_and_decide_follow_up';

  return {
    schema: 'corpflow.ai_receptionist.draft_handoff.v1',
    schema_notes:
      'Additive field service_interest (CorpFlowAI enquiry area). Older consumers may ignore unknown keys.',
    lead_name: captured.lead_name ?? null,
    company: captured.company ?? null,
    contact_method: captured.contact_method ?? null,
    contact_value: captured.contact_value ?? null,
    service_interest: captured.service_interest ?? null,
    need: captured.need ?? null,
    urgency: captured.urgency ?? null,
    preferred_follow_up: captured.preferred_follow_up ?? null,
    notes,
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
      profile_id: captured.profile_id ?? 'corpflowai-general',
    },
  };
}

/**
 * @param {ReturnType<typeof buildDraftHandoff>} handoff
 */
export function formatHandoffSummary(handoff) {
  const serviceLabel =
    (handoff.service_interest && SERVICE_INTEREST_LABELS[handoff.service_interest]) ||
    handoff.service_interest ||
    '(missing)';
  const lines = [
    'Here is a draft summary of your enquiry (not yet submitted anywhere):',
    `- Name: ${handoff.lead_name || '(missing)'}`,
    `- Company: ${handoff.company || '(not provided)'}`,
    `- Contact: ${handoff.contact_method || '(unknown)'} — ${handoff.contact_value || '(missing)'}`,
    `- Service interest: ${serviceLabel}`,
    `- Need: ${handoff.need || '(missing)'}`,
    `- Urgency: ${handoff.urgency || '(unknown)'}`,
    `- Preferred follow-up: ${handoff.preferred_follow_up || '(not provided)'}`,
    `- Notes / risk flags: ${(handoff.notes || []).concat(handoff.risk_flags || []).join('; ') || '(none)'}`,
    `- Recommended next action: ${handoff.recommended_next_action}`,
    `- Requires human review: ${handoff.requires_human_review}`,
    `- External actions executed: ${(handoff.external_actions_executed || []).length}`,
    '',
    handoff.disclaimer,
  ];
  return lines.join('\n');
}
