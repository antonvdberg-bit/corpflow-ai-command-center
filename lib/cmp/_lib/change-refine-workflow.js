/**
 * Workflow + progress copy after GROQ/deterministic change refinement.
 *
 * This is used by CMP ticket-create and change-chat to stamp deterministic
 * workflow state + next action from the structured brief.
 */

import { nextActionForWorkflowState } from './change-workflow-state.js';

/**
 * @param {Record<string, unknown>} brief
 * @returns {{ workflow_state: string, workflow_next_action: string, progress_message: string }}
 */
export function computeRefinementWorkflowPatch(brief) {
  const b = brief && typeof brief === 'object' ? brief : {};
  const summary = typeof b.summary === 'string' ? b.summary.trim() : '';
  const requestedChange = typeof b.requested_change === 'string' ? b.requested_change.trim() : '';
  const ac = Array.isArray(b.acceptance_criteria) ? b.acceptance_criteria : [];
  const hasAc = ac.some((x) => (typeof x === 'string' ? x.trim() : String(x || '').trim()));
  const miss = Array.isArray(b.missing_information)
    ? b.missing_information.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 2)
    : [];
  const conf = String(b.confidence || '')
    .trim()
    .toLowerCase();
  const needsClarification = miss.length > 0 || conf === 'low';

  let nextState = 'refining';
  if (!needsClarification && (summary || hasAc || requestedChange)) {
    nextState = 'ready_for_estimate';
  }

  let progress_message = '';
  if (miss.length) {
    progress_message =
      'Two quick questions so we can estimate safely: ' +
      miss.map((q, i) => `(${i + 1}) ${q}`).join(' ');
  } else if (nextState === 'ready_for_estimate') {
    progress_message =
      'Specification looks clear enough to proceed. Run Estimate when you are ready for effort and indicative cost.';
  } else {
    progress_message = 'Refining your request — add detail or answer follow-ups in the chat below.';
  }

  return {
    workflow_state: nextState,
    workflow_next_action: nextActionForWorkflowState(nextState),
    progress_message,
  };
}
