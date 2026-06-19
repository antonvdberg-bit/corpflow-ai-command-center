/**
 * Tenant workflow foundation v1 — shared constants.
 */

/** @type {readonly string[]} */
export const WORKFLOW_RUN_STATUSES = Object.freeze([
  'open',
  'completed',
  'cancelled',
  'failed',
]);

/** @type {readonly string[]} */
export const WORKFLOW_STEP_STATUSES = Object.freeze([
  'new',
  'open',
  'completed',
  'skipped',
  'failed',
]);

/** @type {readonly string[]} */
export const WORKFLOW_DEFINITION_STATUSES = Object.freeze(['active', 'inactive', 'draft']);

export const CHAT_WIDGET_LEAD_SUBMITTED_EVENT = 'chat_widget.lead.submitted';
export const CHAT_WIDGET_LEAD_PAYLOAD_SCHEMA = 'corpflow.chat_widget.lead.submitted.v1';
export const WORKFLOW_DEFINITION_SCHEMA = 'corpflow.workflow.definition.v1';

export const LWM_TENANT_ID = 'living-word-mauritius';
export const LWM_CHATBOT_LEAD_WORKFLOW_KEY = 'living_word_chatbot_lead_followup';
export const LWM_CHATBOT_LEAD_WORKFLOW_VERSION = 1;
export const LWM_CHATBOT_LEAD_STEP_KEY = 'follow_up_contact_request';
export const LWM_CHATBOT_LEAD_STEP_TYPE = 'operator_follow_up';

/**
 * @param {string} sourceEventId
 * @returns {string}
 */
export function buildChatWidgetLeadFollowupIdempotencyKey(sourceEventId) {
  return `chat-widget-lead-followup:${String(sourceEventId).trim()}`;
}
