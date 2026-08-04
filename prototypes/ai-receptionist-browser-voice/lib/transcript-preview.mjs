/**
 * Transcript preview state machine.
 * Recognised speech must never auto-submit — confirm/edit/retry/cancel only.
 */

/** @typedef {'idle' | 'preview' | 'confirmed'} TranscriptPreviewStatus */

/**
 * @typedef {object} TranscriptPreviewState
 * @property {TranscriptPreviewStatus} status
 * @property {string} draft
 * @property {string | null} confirmed_text
 * @property {boolean} auto_submitted
 */

/**
 * @returns {TranscriptPreviewState}
 */
export function createTranscriptPreview() {
  return {
    status: 'idle',
    draft: '',
    confirmed_text: null,
    auto_submitted: false,
  };
}

/**
 * Browser speech recognition produced text — hold for preview only.
 * @param {TranscriptPreviewState} state
 * @param {string} text
 */
export function receiveRecognition(state, text) {
  const draft = String(text || '').trim();
  return {
    status: draft ? 'preview' : 'idle',
    draft,
    confirmed_text: null,
    auto_submitted: false,
  };
}

/**
 * @param {TranscriptPreviewState} state
 * @param {string} text
 */
export function editTranscriptDraft(state, text) {
  return {
    status: 'preview',
    draft: String(text ?? state.draft ?? ''),
    confirmed_text: null,
    auto_submitted: false,
  };
}

/**
 * Confirm current draft for submission to the conversation engine.
 * @param {TranscriptPreviewState} state
 * @returns {{ state: TranscriptPreviewState, submit_text: string | null }}
 */
export function confirmTranscript(state) {
  const text = String(state?.draft || '').trim();
  if (!text) {
    return {
      state: {
        status: 'idle',
        draft: '',
        confirmed_text: null,
        auto_submitted: false,
      },
      submit_text: null,
    };
  }
  return {
    state: {
      status: 'confirmed',
      draft: text,
      confirmed_text: text,
      auto_submitted: false,
    },
    submit_text: text,
  };
}

/**
 * Discard preview and listen again.
 * @param {TranscriptPreviewState} [_state]
 */
export function retryTranscript(_state) {
  return createTranscriptPreview();
}

/**
 * Cancel preview without submitting.
 * @param {TranscriptPreviewState} [_state]
 */
export function cancelTranscript(_state) {
  return createTranscriptPreview();
}

/**
 * Reset after a successful engine submit.
 * @param {TranscriptPreviewState} [_state]
 */
export function clearAfterSubmit(_state) {
  return createTranscriptPreview();
}

/**
 * Guard used by UI/tests: recognition alone must not mark auto_submitted.
 * @param {TranscriptPreviewState} state
 */
export function didAutoSubmit(state) {
  return Boolean(state?.auto_submitted);
}
