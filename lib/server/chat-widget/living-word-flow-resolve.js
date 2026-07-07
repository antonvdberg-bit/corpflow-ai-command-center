/**
 * Resolve the chat widget flow JSON for a tenant (runtime overlays for TEST DEMO).
 */

import { validateFlow } from './flow.js';
import { LIVING_WORD_FLOW_ASK_ONLY } from './living-word-flow-ask-only.js';
import { LWM_TENANT_ID } from './retrieval/constants.js';

/**
 * @param {string} tenantId
 * @param {unknown} flowJson
 * @returns {ReturnType<typeof validateFlow>}
 */
export function resolveChatWidgetFlowForTenant(tenantId, flowJson) {
  if (tenantId === LWM_TENANT_ID) {
    return validateFlow(LIVING_WORD_FLOW_ASK_ONLY);
  }
  return validateFlow(flowJson);
}
