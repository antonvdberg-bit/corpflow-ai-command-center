/**
 * Living Word chatbot lead follow-up — workflow definition seed shape.
 */

import {
  CHAT_WIDGET_LEAD_SUBMITTED_EVENT,
  LWM_CHATBOT_LEAD_STEP_KEY,
  LWM_CHATBOT_LEAD_STEP_TYPE,
  LWM_CHATBOT_LEAD_WORKFLOW_KEY,
  LWM_CHATBOT_LEAD_WORKFLOW_VERSION,
  LWM_TENANT_ID,
  WORKFLOW_DEFINITION_SCHEMA,
} from './constants.js';

export const LWM_CHATBOT_LEAD_DEFINITION_ID = 'lwm-wf-def-chatbot-lead-followup-v1';

/**
 * @returns {Record<string, unknown>}
 */
export function buildLivingWordChatbotLeadDefinitionJson() {
  return {
    schema: WORKFLOW_DEFINITION_SCHEMA,
    workflow_key: LWM_CHATBOT_LEAD_WORKFLOW_KEY,
    version: LWM_CHATBOT_LEAD_WORKFLOW_VERSION,
    initial_step_key: LWM_CHATBOT_LEAD_STEP_KEY,
    steps: [
      {
        step_key: LWM_CHATBOT_LEAD_STEP_KEY,
        step_type: LWM_CHATBOT_LEAD_STEP_TYPE,
        title: 'Follow up Living Word chatbot request',
      },
    ],
  };
}

/**
 * @returns {{
 *   id: string;
 *   tenantId: string;
 *   workflowKey: string;
 *   version: number;
 *   name: string;
 *   triggerEventType: string;
 *   status: string;
 *   definitionJson: Record<string, unknown>;
 * }}
 */
export function buildLivingWordChatbotLeadDefinitionSeedRow() {
  return {
    id: LWM_CHATBOT_LEAD_DEFINITION_ID,
    tenantId: LWM_TENANT_ID,
    workflowKey: LWM_CHATBOT_LEAD_WORKFLOW_KEY,
    version: LWM_CHATBOT_LEAD_WORKFLOW_VERSION,
    name: 'Living Word chatbot lead follow-up',
    triggerEventType: CHAT_WIDGET_LEAD_SUBMITTED_EVENT,
    status: 'active',
    definitionJson: buildLivingWordChatbotLeadDefinitionJson(),
  };
}
