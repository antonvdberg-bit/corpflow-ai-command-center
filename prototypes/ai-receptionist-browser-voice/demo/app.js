/**
 * Browser demo client for the synthetic AI receptionist (#731 UX).
 * Imports the same deterministic engine used by Node tests.
 */

import {
  createSession,
  startSession,
  handleUserTurn,
  getCapturedFields,
  updateCapturedField,
  confirmHandoff,
  DEFAULT_PROFILE_ID,
} from '../lib/conversation-engine.mjs';
import { formatHandoffSummary } from '../lib/handoff.mjs';
import { mockStt, mockTts } from '../lib/mocks/stt-tts.mjs';
import {
  createTranscriptPreview,
  receiveRecognition,
  editTranscriptDraft,
  confirmTranscript,
  retryTranscript,
  cancelTranscript,
  clearAfterSubmit,
} from '../lib/transcript-preview.mjs';
import {
  shapeVoiceOptions,
  normalizeVoiceSettings,
  resolveSelectedVoice,
  TEST_VOICE_PHRASE,
  clampRate,
  clampPitch,
} from '../lib/voice-controls.mjs';

const logEl = document.getElementById('log');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send');
const pttBtn = document.getElementById('ptt');
const resetBtn = document.getElementById('reset');
const handoffEl = document.getElementById('handoff');
const voiceHint = document.getElementById('voiceHint');
const profileMeta = document.getElementById('profileMeta');
const transcriptPreviewEl = document.getElementById('transcriptPreview');
const heardTextEl = document.getElementById('heardText');
const confirmHeardBtn = document.getElementById('confirmHeard');
const retryHeardBtn = document.getElementById('retryHeard');
const cancelHeardBtn = document.getElementById('cancelHeard');
const capturedFieldsEl = document.getElementById('capturedFields');
const applyFieldEditsBtn = document.getElementById('applyFieldEdits');
const finalReviewEl = document.getElementById('finalReview');
const reviewSummaryEl = document.getElementById('reviewSummary');
const confirmHandoffBtn = document.getElementById('confirmHandoffBtn');
const keepEditingBtn = document.getElementById('keepEditingBtn');
const voiceSelect = document.getElementById('voiceSelect');
const rateRange = document.getElementById('rateRange');
const pitchRange = document.getElementById('pitchRange');
const rateValue = document.getElementById('rateValue');
const pitchValue = document.getElementById('pitchValue');
const testVoiceBtn = document.getElementById('testVoice');

const FIELD_DEFS = [
  { key: 'lead_name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'contact_method', label: 'Contact method' },
  { key: 'contact_value', label: 'Contact value' },
  { key: 'service_interest', label: 'Service interest' },
  { key: 'need', label: 'Need / problem' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'preferred_follow_up', label: 'Preferred follow-up' },
  { key: 'notes', label: 'Notes / caveats', readonly: true },
  { key: 'risk_flags', label: 'Risk flags', readonly: true },
];

/** @type {ReturnType<typeof createSession> | null} */
let session = null;
let done = false;
/** @type {object | null} */
let profile = null;
let previewState = createTranscriptPreview();
let voiceSettings = normalizeVoiceSettings();
/** @type {SpeechSynthesisVoice[]} */
let browserVoices = [];

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;
const canSpeak = typeof window.speechSynthesis?.speak === 'function';

if (!SpeechRecognition) {
  pttBtn.disabled = true;
  voiceHint.textContent +=
    ' This browser has no SpeechRecognition — use text input (recommended).';
}

async function loadProfile() {
  const res = await fetch(`../profiles/${DEFAULT_PROFILE_ID}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load profile ${DEFAULT_PROFILE_ID}`);
  profile = await res.json();
  profileMeta.textContent = `Profile: ${profile.name} (${profile.id}) — script/prompts are configurable via profiles/${profile.id}.json`;
}

function appendMsg(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function speak(text) {
  const mocked = mockTts(text);
  if (!canSpeak) return;
  try {
    const u = new SpeechSynthesisUtterance(mocked.text);
    u.rate = voiceSettings.rate;
    u.pitch = voiceSettings.pitch;
    const shaped = shapeVoiceOptions(browserVoices);
    const selected = resolveSelectedVoice(shaped.options, voiceSettings.voiceURI);
    if (selected) {
      const match = browserVoices.find((v) => v.voiceURI === selected.voiceURI);
      if (match) u.voice = match;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* optional */
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

function renderCapturedFields() {
  if (!session) {
    capturedFieldsEl.innerHTML = '';
    return;
  }
  const fields = getCapturedFields(session);
  capturedFieldsEl.innerHTML = '';
  for (const def of FIELD_DEFS) {
    const row = document.createElement('div');
    row.className = 'field-row';
    const label = document.createElement('label');
    label.textContent = def.label;
    label.setAttribute('for', `field-${def.key}`);
    row.appendChild(label);
    const value = fields[def.key];
    const display = Array.isArray(value) ? value.join('; ') : value ?? '';
    if (def.readonly) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.id = `field-${def.key}`;
      p.textContent = display || '(none)';
      row.appendChild(p);
    } else if (def.key === 'service_interest') {
      const select = document.createElement('select');
      select.id = `field-${def.key}`;
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '(not set)';
      select.appendChild(empty);
      for (const v of profile?.service_interest_values || []) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        if (value === v) opt.selected = true;
        select.appendChild(opt);
      }
      row.appendChild(select);
    } else if (def.key === 'contact_method') {
      const select = document.createElement('select');
      select.id = `field-${def.key}`;
      for (const v of ['', 'email', 'phone', 'whatsapp']) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v || '(not set)';
        if ((value || '') === v) opt.selected = true;
        select.appendChild(opt);
      }
      row.appendChild(select);
    } else if (def.key === 'urgency') {
      const select = document.createElement('select');
      select.id = `field-${def.key}`;
      for (const v of ['', 'low', 'normal', 'high']) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v || '(not set)';
        if ((value || '') === v) opt.selected = true;
        select.appendChild(opt);
      }
      row.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `field-${def.key}`;
      input.value = display;
      row.appendChild(input);
    }
    capturedFieldsEl.appendChild(row);
  }
}

function showPreviewUI() {
  if (previewState.status === 'preview') {
    transcriptPreviewEl.hidden = false;
    heardTextEl.value = previewState.draft;
  } else {
    transcriptPreviewEl.hidden = true;
    heardTextEl.value = '';
  }
}

function showReviewUI(result) {
  const awaiting = Boolean(result?.awaiting_review) || session?.phase === 'review';
  if (awaiting && session?.pending_handoff) {
    finalReviewEl.hidden = false;
    reviewSummaryEl.textContent = formatHandoffSummary(session.pending_handoff);
  } else {
    finalReviewEl.hidden = true;
    reviewSummaryEl.textContent = '';
  }
}

function applyAssistantMessages(messages) {
  for (const m of messages) {
    appendMsg('assistant', m);
    speak(m);
  }
}

function processEngineResult(result) {
  applyAssistantMessages(result.messages);
  renderCapturedFields();
  showReviewUI(result);
  if (result.done) {
    done = true;
    sendBtn.disabled = true;
    showHandoff(result.handoff);
    finalReviewEl.hidden = true;
    appendMsg(
      'system',
      result.escalated
        ? 'Session escalated to human review. Still no external send/write.'
        : 'Session complete. Draft handoff ready for human review only.',
    );
  }
}

function submitText(raw) {
  if (!session || done) return;
  const stt = mockStt(raw);
  if (!stt.ok) return;
  appendMsg('user', stt.text);
  const result = handleUserTurn(session, stt.text);
  processEngineResult(result);
}

function reset() {
  logEl.innerHTML = '';
  showHandoff(null);
  done = false;
  sendBtn.disabled = false;
  inputEl.value = '';
  previewState = createTranscriptPreview();
  showPreviewUI();
  finalReviewEl.hidden = true;
  session = createSession({ profile });
  const opened = startSession(session);
  applyAssistantMessages(opened.messages);
  renderCapturedFields();
  appendMsg(
    'system',
    'Session started. Speech recognition opens an editable preview — it does not auto-submit. No external actions will be executed.',
  );
}

function populateVoices() {
  if (!canSpeak) {
    voiceSelect.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Speech synthesis unavailable in this browser';
    voiceSelect.appendChild(opt);
    voiceHint.textContent +=
      ' Browser blocked or lacks speechSynthesis — replies stay on-screen; use text.';
    testVoiceBtn.disabled = true;
    return;
  }
  browserVoices = window.speechSynthesis.getVoices() || [];
  const shaped = shapeVoiceOptions(browserVoices);
  voiceSelect.innerHTML = '';
  if (!shaped.available) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No voices available';
    voiceSelect.appendChild(opt);
    voiceHint.textContent = shaped.fallback_message;
    return;
  }
  for (const o of shaped.options) {
    const opt = document.createElement('option');
    opt.value = o.voiceURI;
    opt.textContent = `${o.name}${o.lang ? ` (${o.lang})` : ''}`;
    voiceSelect.appendChild(opt);
  }
  const selected = resolveSelectedVoice(shaped.options, voiceSettings.voiceURI);
  if (selected) {
    voiceSelect.value = selected.voiceURI;
    voiceSettings = normalizeVoiceSettings({ ...voiceSettings, voiceURI: selected.voiceURI });
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

heardTextEl.addEventListener('input', () => {
  previewState = editTranscriptDraft(previewState, heardTextEl.value);
});

confirmHeardBtn.addEventListener('click', () => {
  previewState = editTranscriptDraft(previewState, heardTextEl.value);
  const { state, submit_text } = confirmTranscript(previewState);
  previewState = state;
  showPreviewUI();
  if (submit_text) {
    submitText(submit_text);
    previewState = clearAfterSubmit(previewState);
    showPreviewUI();
  }
});

retryHeardBtn.addEventListener('click', () => {
  previewState = retryTranscript(previewState);
  showPreviewUI();
  if (SpeechRecognition) {
    try {
      // User can hold-to-talk again.
      appendMsg('system', 'Preview cleared — hold to talk again, or type text.');
    } catch {
      /* ignore */
    }
  }
});

cancelHeardBtn.addEventListener('click', () => {
  previewState = cancelTranscript(previewState);
  showPreviewUI();
  appendMsg('system', 'Heard text cancelled — nothing was submitted.');
});

applyFieldEditsBtn.addEventListener('click', () => {
  if (!session || done) return;
  const messages = [];
  for (const def of FIELD_DEFS) {
    if (def.readonly) continue;
    const el = document.getElementById(`field-${def.key}`);
    if (!el) continue;
    const next = el.value;
    const current = getCapturedFields(session)[def.key];
    const curStr = current == null ? '' : String(current);
    if (next === curStr) continue;
    if (!next && !curStr) continue;
    if (!next) continue;
    const result = updateCapturedField(session, def.key, next);
    if (!result.ok) {
      appendMsg('system', result.error);
      return;
    }
    messages.push(...result.messages);
  }
  if (messages.length === 0) {
    appendMsg('system', 'No field changes to apply.');
    return;
  }
  processEngineResult({
    messages,
    awaiting_review: session.phase === 'review',
    done: false,
    escalated: false,
    handoff: null,
  });
});

confirmHandoffBtn.addEventListener('click', () => {
  if (!session || done) return;
  const result = confirmHandoff(session);
  processEngineResult(result);
});

keepEditingBtn.addEventListener('click', () => {
  appendMsg(
    'system',
    'Edit fields in the Captured details panel, then Apply field edits — or type “edit name to …”. Confirm when ready.',
  );
  renderCapturedFields();
});

rateRange.addEventListener('input', () => {
  voiceSettings = normalizeVoiceSettings({
    ...voiceSettings,
    rate: clampRate(rateRange.value),
  });
  rateValue.textContent = String(voiceSettings.rate);
});

pitchRange.addEventListener('input', () => {
  voiceSettings = normalizeVoiceSettings({
    ...voiceSettings,
    pitch: clampPitch(pitchRange.value),
  });
  pitchValue.textContent = String(voiceSettings.pitch);
});

voiceSelect.addEventListener('change', () => {
  voiceSettings = normalizeVoiceSettings({
    ...voiceSettings,
    voiceURI: voiceSelect.value || null,
  });
});

testVoiceBtn.addEventListener('click', () => {
  speak(TEST_VOICE_PHRASE);
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

  // Critical: recognition populates preview only — never auto-submit.
  recog.onresult = (ev) => {
    const transcript = ev.results?.[0]?.[0]?.transcript || '';
    if (!transcript) return;
    previewState = receiveRecognition(previewState, transcript);
    showPreviewUI();
    appendMsg(
      'system',
      'Speech captured into preview. Edit if needed, then Confirm — nothing was submitted yet.',
    );
  };
  recog.onerror = () => {
    pttBtn.textContent = 'Hold to talk (optional)';
  };
}

try {
  await loadProfile();
  reset();
} catch (err) {
  profileMeta.textContent = `Failed to load profile: ${err?.message || err}`;
  appendMsg('system', 'Could not load CorpFlowAI profile JSON. Check the local demo server.');
}
