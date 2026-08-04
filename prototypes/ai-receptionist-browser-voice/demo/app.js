/**
 * Browser demo client for the synthetic AI receptionist.
 * Imports the same deterministic engine used by Node tests.
 *
 * UX: transcript preview before submit, captured-field edits, browser TTS controls.
 */

import {
  createSession,
  startSession,
  handleUserTurn,
  updateCapturedField,
  getCapturedFields,
} from '../lib/conversation-engine.mjs';
import { mockStt, mockTts } from '../lib/mocks/stt-tts.mjs';
import {
  createTranscriptPreview,
  receiveRecognition,
  editPreviewText,
  confirmPreview,
  retryPreview,
  cancelPreview,
  consumeConfirmed,
} from '../lib/transcript-preview.mjs';
import {
  normalizeVoiceSettings,
  selectVoice,
  voiceOptions,
  voiceAvailabilityMessage,
  buildUtteranceConfig,
} from '../lib/voice-settings.mjs';

const logEl = document.getElementById('log');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send');
const pttBtn = document.getElementById('ptt');
const resetBtn = document.getElementById('reset');
const handoffEl = document.getElementById('handoff');
const voiceHint = document.getElementById('voiceHint');
const capturedEl = document.getElementById('capturedFields');
const previewBox = document.getElementById('transcriptPreview');
const heardText = document.getElementById('heardText');
const confirmHeardBtn = document.getElementById('confirmHeard');
const retryHeardBtn = document.getElementById('retryHeard');
const cancelHeardBtn = document.getElementById('cancelHeard');
const voiceSelect = document.getElementById('voiceSelect');
const voiceRate = document.getElementById('voiceRate');
const voicePitch = document.getElementById('voicePitch');
const voiceRateVal = document.getElementById('voiceRateVal');
const voicePitchVal = document.getElementById('voicePitchVal');
const testVoiceBtn = document.getElementById('testVoice');
const voiceStatus = document.getElementById('voiceStatus');

/** @type {ReturnType<typeof createSession> | null} */
let session = null;
let done = false;
let previewState = createTranscriptPreview();
let voiceSettings = normalizeVoiceSettings({});
/** @type {SpeechSynthesisVoice[]} */
let voices = [];

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;
const canSpeak = typeof window.speechSynthesis?.speak === 'function';

const CAPTURED_FIELD_META = [
  { key: 'lead_name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'contact_method', label: 'Contact method' },
  { key: 'contact_value', label: 'Contact value' },
  { key: 'service_interest', label: 'Service interest' },
  { key: 'need', label: 'Need / problem' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'preferred_follow_up', label: 'Preferred follow-up' },
  { key: 'risk_flags', label: 'Notes / risk flags', readOnly: true },
];

if (!SpeechRecognition) {
  pttBtn.disabled = true;
  voiceHint.textContent +=
    ' This browser has no SpeechRecognition — use text input (recommended for demos).';
}

function appendMsg(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function refreshVoiceStatus() {
  voiceStatus.textContent = voiceAvailabilityMessage({
    speechSynthesisAvailable: canSpeak,
    voiceCount: voices.length,
  });
}

function populateVoices() {
  if (!canSpeak) {
    voices = [];
    voiceSelect.innerHTML = '<option value="">No voices available</option>';
    voiceSelect.disabled = true;
    testVoiceBtn.disabled = true;
    refreshVoiceStatus();
    return;
  }
  voices = window.speechSynthesis.getVoices() || [];
  const opts = voiceOptions(voices);
  voiceSelect.innerHTML = '';
  if (!opts.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No voices loaded yet';
    voiceSelect.appendChild(opt);
  } else {
    for (const o of opts) {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      voiceSelect.appendChild(opt);
    }
    const selected = selectVoice(voices, voiceSettings);
    if (selected) {
      voiceSelect.value = selected.voiceURI || selected.name || '';
      voiceSettings = normalizeVoiceSettings({
        ...voiceSettings,
        voiceURI: selected.voiceURI || '',
        voiceName: selected.name || '',
      });
    }
  }
  refreshVoiceStatus();
}

function speak(text) {
  const mocked = mockTts(text);
  if (!canSpeak) return;
  try {
    const voice = selectVoice(voices, voiceSettings);
    const cfg = buildUtteranceConfig(mocked.text, voiceSettings, voice);
    const u = new SpeechSynthesisUtterance(cfg.text);
    u.rate = cfg.rate;
    u.pitch = cfg.pitch;
    if (voice) u.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    voiceStatus.textContent =
      'Browser blocked or failed speech synthesis. Continue with text — no paid TTS is used.';
  }
}

function showHandoff(handoff) {
  if (!handoff) {
    handoffEl.hidden = true;
    handoffEl.textContent = '';
    return;
  }
  handoffEl.hidden = false;
  handoffEl.textContent = JSON.stringify(handoff, null, 2);
}

function applyAssistantMessages(messages) {
  for (const m of messages) {
    appendMsg('assistant', m);
    speak(m);
  }
}

function renderCaptured() {
  if (!session) {
    capturedEl.innerHTML = '<p class="hint">No active session.</p>';
    return;
  }
  const fields = getCapturedFields(session);
  capturedEl.innerHTML = '';
  for (const meta of CAPTURED_FIELD_META) {
    const row = document.createElement('div');
    row.className = 'field-row';
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = meta.label;
    row.appendChild(label);

    let display = fields[meta.key];
    if (meta.key === 'service_interest') {
      display = fields.service_interest_label || fields.service_interest || '';
    }
    if (meta.key === 'risk_flags') {
      display = Array.isArray(fields.risk_flags) ? fields.risk_flags.join(', ') : '';
    }
    if (display == null || display === '') display = '—';

    if (meta.readOnly || done) {
      const value = document.createElement('div');
      value.textContent = String(display);
      row.appendChild(value);
    } else {
      const valueRow = document.createElement('div');
      valueRow.className = 'value-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = display === '—' ? '' : String(
        meta.key === 'service_interest' ? fields.service_interest || '' : display,
      );
      input.dataset.field = meta.key;
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'secondary';
      save.textContent = 'Save';
      save.addEventListener('click', () => {
        const result = updateCapturedField(session, meta.key, input.value);
        if (!result.ok) {
          appendMsg('system', result.error || 'Could not update field.');
          return;
        }
        applyAssistantMessages(result.messages.filter((m) => !m.startsWith('Updated ')));
        if (result.messages.some((m) => m.startsWith('Updated '))) {
          appendMsg('system', result.messages.find((m) => m.startsWith('Updated ')));
        }
        renderCaptured();
      });
      valueRow.appendChild(input);
      valueRow.appendChild(save);
      row.appendChild(valueRow);
    }
    capturedEl.appendChild(row);
  }
}

function setPreviewVisible(visible) {
  previewBox.hidden = !visible;
}

function showPreview(text) {
  previewState = receiveRecognition(previewState, text);
  heardText.value = previewState.text;
  setPreviewVisible(true);
}

function reset() {
  logEl.innerHTML = '';
  showHandoff(null);
  done = false;
  sendBtn.disabled = false;
  inputEl.value = '';
  previewState = createTranscriptPreview();
  setPreviewVisible(false);
  heardText.value = '';
  session = createSession();
  const opened = startSession(session);
  applyAssistantMessages(opened.messages);
  appendMsg(
    'system',
    `Profile: ${session.profile.name} (${session.profile_id}). No external actions will be executed. Draft handoff only.`,
  );
  renderCaptured();
}

function submitText(raw) {
  if (!session || done) return;
  const stt = mockStt(raw);
  if (!stt.ok) return;
  appendMsg('user', stt.text);
  const result = handleUserTurn(session, stt.text);
  applyAssistantMessages(result.messages);
  renderCaptured();
  if (result.done) {
    done = true;
    sendBtn.disabled = true;
    showHandoff(result.handoff);
    appendMsg(
      'system',
      result.escalated
        ? 'Session escalated to human review. Still no external send/write.'
        : 'Session complete. Draft handoff ready for human review only.',
    );
    renderCaptured();
  }
}

sendBtn.addEventListener('click', () => {
  const value = inputEl.value;
  inputEl.value = '';
  submitText(value);
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

resetBtn.addEventListener('click', reset);

heardText.addEventListener('input', () => {
  previewState = editPreviewText(previewState, heardText.value);
});

confirmHeardBtn.addEventListener('click', () => {
  previewState = editPreviewText(previewState, heardText.value);
  const confirmed = confirmPreview(previewState);
  if (confirmed.error) {
    appendMsg('system', confirmed.error);
    previewState = { ...confirmed, status: 'preview', submitText: null };
    return;
  }
  previewState = confirmed;
  const text = confirmed.submitText;
  previewState = consumeConfirmed(previewState);
  setPreviewVisible(false);
  heardText.value = '';
  submitText(text);
});

retryHeardBtn.addEventListener('click', () => {
  previewState = retryPreview(previewState);
  heardText.value = '';
  setPreviewVisible(false);
  if (SpeechRecognition) {
    appendMsg('system', 'Preview cleared. Hold to talk again, or type instead.');
  }
});

cancelHeardBtn.addEventListener('click', () => {
  previewState = cancelPreview(previewState);
  heardText.value = '';
  setPreviewVisible(false);
  appendMsg('system', 'Recognized speech cancelled — nothing was submitted.');
});

voiceSelect.addEventListener('change', () => {
  const voice = voices.find(
    (v) => v.voiceURI === voiceSelect.value || v.name === voiceSelect.value,
  );
  voiceSettings = normalizeVoiceSettings({
    ...voiceSettings,
    voiceURI: voice?.voiceURI || voiceSelect.value || '',
    voiceName: voice?.name || '',
  });
});

voiceRate.addEventListener('input', () => {
  voiceSettings = normalizeVoiceSettings({
    ...voiceSettings,
    rate: voiceRate.value,
  });
  voiceRateVal.textContent = Number(voiceSettings.rate).toFixed(1);
});

voicePitch.addEventListener('input', () => {
  voiceSettings = normalizeVoiceSettings({
    ...voiceSettings,
    pitch: voicePitch.value,
  });
  voicePitchVal.textContent = Number(voiceSettings.pitch).toFixed(1);
});

testVoiceBtn.addEventListener('click', () => {
  speak(
    'This is a CorpFlowAI browser voice test. Quality depends on your operating system. No paid text-to-speech provider is used.',
  );
});

if (canSpeak) {
  populateVoices();
  window.speechSynthesis.onvoiceschanged = populateVoices;
} else {
  populateVoices();
}

if (SpeechRecognition) {
  const recog = new SpeechRecognition();
  recog.continuous = false;
  recog.interimResults = false;
  recog.lang = 'en-US';

  pttBtn.addEventListener('mousedown', () => {
    try {
      recog.start();
      pttBtn.textContent = 'Listening…';
    } catch {
      /* already started */
    }
  });
  const stop = () => {
    try {
      recog.stop();
    } catch {
      /* ignore */
    }
    pttBtn.textContent = 'Hold to talk (optional)';
  };
  pttBtn.addEventListener('mouseup', stop);
  pttBtn.addEventListener('mouseleave', stop);
  recog.onresult = (ev) => {
    const transcript = ev.results?.[0]?.[0]?.transcript || '';
    // Critical: do NOT auto-submit — park in preview for confirm/edit/retry/cancel.
    if (transcript) showPreview(transcript);
  };
  recog.onerror = () => {
    pttBtn.textContent = 'Hold to talk (optional)';
    appendMsg(
      'system',
      'Speech recognition error or blocked. Use text input — it is the reliable demo path.',
    );
  };
}

reset();
