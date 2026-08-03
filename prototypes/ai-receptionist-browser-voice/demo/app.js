/**
 * Browser demo client for the synthetic AI receptionist.
 * Imports the same deterministic engine used by Node tests.
 */

import {
  createSession,
  startSession,
  handleUserTurn,
} from '../lib/conversation-engine.mjs';
import { mockStt, mockTts } from '../lib/mocks/stt-tts.mjs';

const logEl = document.getElementById('log');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send');
const pttBtn = document.getElementById('ptt');
const resetBtn = document.getElementById('reset');
const handoffEl = document.getElementById('handoff');
const voiceHint = document.getElementById('voiceHint');

/** @type {ReturnType<typeof createSession> | null} */
let session = null;
let done = false;

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;
const canSpeak = typeof window.speechSynthesis?.speak === 'function';

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

function speak(text) {
  const mocked = mockTts(text);
  if (!canSpeak) return;
  try {
    const u = new SpeechSynthesisUtterance(mocked.text);
    u.rate = 1;
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

function applyAssistantMessages(messages) {
  for (const m of messages) {
    appendMsg('assistant', m);
    speak(m);
  }
}

function reset() {
  logEl.innerHTML = '';
  showHandoff(null);
  done = false;
  sendBtn.disabled = false;
  inputEl.value = '';
  session = createSession();
  const opened = startSession(session);
  applyAssistantMessages(opened.messages);
  appendMsg(
    'system',
    'Session started. No external actions will be executed. Draft handoff only.',
  );
}

function submitText(raw) {
  if (!session || done) return;
  const stt = mockStt(raw);
  if (!stt.ok) return;
  appendMsg('user', stt.text);
  const result = handleUserTurn(session, stt.text);
  applyAssistantMessages(result.messages);
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
    if (transcript) submitText(transcript);
  };
  recog.onerror = () => {
    pttBtn.textContent = 'Hold to talk (optional)';
  };
}

reset();
