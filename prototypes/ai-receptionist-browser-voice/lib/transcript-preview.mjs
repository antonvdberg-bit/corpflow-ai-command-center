/**
 * Transcript preview state machine.
 * Recognized speech must be confirmed (or edited) before submit — never auto-submit.
 */

/** @typedef {'idle' | 'preview' | 'confirmed'} PreviewStatus */

/**
 * @returns {{ status: PreviewStatus, text: string, submitText: string | null }}
 */
export function createTranscriptPreview() {
  return {
    status: /** @type {PreviewStatus} */ ('idle'),
    text: '',
    submitText: null,
  };
}

/**
 * Browser speech recognition produced text — park it for review.
 * Does NOT mark submitText; caller must not send to the engine yet.
 * @param {ReturnType<typeof createTranscriptPreview>} state
 * @param {string} recognizedText
 */
export function receiveRecognition(state, recognizedText) {
  const text = String(recognizedText || '').trim();
  return {
    status: /** @type {PreviewStatus} */ ('preview'),
    text,
    submitText: null,
  };
}

/**
 * Operator edits the preview text before confirm.
 * @param {ReturnType<typeof createTranscriptPreview>} state
 * @param {string} editedText
 */
export function editPreviewText(state, editedText) {
  return {
    status: /** @type {PreviewStatus} */ ('preview'),
    text: String(editedText || ''),
    submitText: null,
  };
}

/**
 * Confirm current preview text for submission to the conversation engine.
 * @param {ReturnType<typeof createTranscriptPreview>} state
 */
export function confirmPreview(state) {
  const text = String(state?.text || '').trim();
  if (!text) {
    return {
      status: /** @type {PreviewStatus} */ ('preview'),
      text: state?.text || '',
      submitText: null,
      error: 'Nothing to confirm. Edit the transcript or retry listening.',
    };
  }
  return {
    status: /** @type {PreviewStatus} */ ('confirmed'),
    text,
    submitText: text,
  };
}

/**
 * Discard preview and return to idle (retry listening).
 * @param {ReturnType<typeof createTranscriptPreview>} [_state]
 */
export function retryPreview(_state) {
  return createTranscriptPreview();
}

/**
 * Cancel preview without submitting.
 * @param {ReturnType<typeof createTranscriptPreview>} [_state]
 */
export function cancelPreview(_state) {
  return createTranscriptPreview();
}

/**
 * Clear confirmed submit token after the engine has consumed it.
 * @param {ReturnType<typeof createTranscriptPreview>} [_state]
 */
export function consumeConfirmed(_state) {
  return createTranscriptPreview();
}

/**
 * True when recognition should not yet hit the conversation engine.
 * @param {ReturnType<typeof createTranscriptPreview>} state
 */
export function isAwaitingConfirmation(state) {
  return state?.status === 'preview';
}
