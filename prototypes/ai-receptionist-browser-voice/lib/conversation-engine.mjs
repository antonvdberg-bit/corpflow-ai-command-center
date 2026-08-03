/**
 * Deterministic synthetic AI receptionist conversation engine.
 *
 * Browser-voice shaped: turns are text (STT/TTS mocked separately).
 * No network, no DB, no secrets, no external sends.
 */

import { detectEscalation } from './escalation.mjs';
import { buildDraftHandoff, formatHandoffSummary, NO_EXTERNAL_ACTION_DISCLAIMER } from './handoff.mjs';

/** @typedef {'greeting' | 'collecting' | 'complete' | 'escalated'} Phase */
/** @typedef {'lead_name' | 'company' | 'contact_method' | 'contact_value' | 'need' | 'urgency' | 'preferred_follow_up'} FieldKey */

const FIELD_ORDER = /** @type {FieldKey[]} */ ([
  'lead_name',
  'company',
  'contact_method',
  'contact_value',
  'need',
  'urgency',
  'preferred_follow_up',
]);

const CRITICAL_FIELDS = /** @type {FieldKey[]} */ ([
  'lead_name',
  'contact_method',
  'contact_value',
  'need',
]);

const FIELD_PROMPTS = {
  lead_name: 'May I have your name?',
  company: 'What company are you with, if any? You can say “none” or “skip”.',
  contact_method: 'How should we reach you — email, phone, or WhatsApp?',
  contact_value: 'Please share that contact detail (email address or phone number).',
  need: 'What is the reason for your enquiry?',
  urgency: 'How urgent is this — low, normal, or high?',
  preferred_follow_up: 'When is a good time for a human to follow up?',
};

/**
 * @returns {object}
 */
export function createSession() {
  return {
    phase: /** @type {Phase} */ ('greeting'),
    current_field: /** @type {FieldKey | null} */ (null),
    answered: /** @type {Set<FieldKey>} */ (new Set()),
    lead_name: null,
    company: null,
    contact_method: null,
    contact_value: null,
    need: null,
    urgency: null,
    preferred_follow_up: null,
    risk_flags: /** @type {string[]} */ ([]),
    turns: /** @type {Array<{role:string,text:string}>} */ ([]),
    handoff: null,
    escalation_reason: null,
  };
}

/**
 * @param {ReturnType<typeof createSession>} session
 */
export function startSession(session) {
  const greeting =
    'Hello — I am CorpFlowAI’s synthetic receptionist prototype. I can capture your enquiry and prepare a draft handoff for a human operator. I will not send email, WhatsApp, SMS, place phone calls, update a CRM, or write to a database.';
  session.phase = 'collecting';
  session.current_field = 'lead_name';
  const prompt = FIELD_PROMPTS.lead_name;
  pushAssistant(session, greeting);
  pushAssistant(session, prompt);
  return {
    messages: [greeting, prompt],
    session,
    done: false,
    escalated: false,
    handoff: null,
  };
}

/**
 * @param {ReturnType<typeof createSession>} session
 * @param {string} userText
 */
export function handleUserTurn(session, userText) {
  const text = String(userText || '').trim();
  if (!text) {
    return reply(session, ['I did not catch that. Could you please repeat?']);
  }

  pushUser(session, text);

  if (session.phase === 'complete' || session.phase === 'escalated') {
    return {
      messages: [
        'This session is already closed. Start a new session to capture another enquiry.',
        NO_EXTERNAL_ACTION_DISCLAIMER,
      ],
      session,
      done: true,
      escalated: session.phase === 'escalated',
      handoff: session.handoff,
    };
  }

  const esc = detectEscalation(text);
  if (esc.escalate) {
    session.phase = 'escalated';
    session.escalation_reason = esc.reason;
    session.risk_flags.push(`escalation:${esc.reason}`);
    session.handoff = buildDraftHandoff(captureSnapshot(session), {
      escalation_reason: esc.reason,
    });
    const msg = esc.message || 'Escalating to a human operator.';
    const summary = formatHandoffSummary(session.handoff);
    pushAssistant(session, msg);
    pushAssistant(session, summary);
    return {
      messages: [msg, summary],
      session,
      done: true,
      escalated: true,
      handoff: session.handoff,
    };
  }

  if (session.phase === 'greeting') {
    return startSession(session);
  }

  if (session.phase === 'collecting' && session.current_field) {
    const applyResult = applyField(session, session.current_field, text);
    if (applyResult.error) {
      pushAssistant(session, applyResult.error);
      return reply(session, [applyResult.error]);
    }

    session.answered.add(session.current_field);
    const next = nextUnansweredField(session);
    if (next) {
      session.current_field = next;
      const prompt = FIELD_PROMPTS[next];
      pushAssistant(session, prompt);
      return reply(session, [prompt]);
    }

    session.phase = 'complete';
    session.current_field = null;
    session.handoff = buildDraftHandoff(captureSnapshot(session));
    const summary = formatHandoffSummary(session.handoff);
    pushAssistant(session, summary);
    return {
      messages: [summary],
      session,
      done: true,
      escalated: false,
      handoff: session.handoff,
    };
  }

  const fallback =
    'I am ready to capture your enquiry. Please share the details I ask for, or say if you need a human.';
  pushAssistant(session, fallback);
  return reply(session, [fallback]);
}

/**
 * Run a full scripted dialogue (user utterances after automatic greeting).
 * @param {string[]} userTurns
 */
export function runScriptedConversation(userTurns) {
  const session = createSession();
  const transcript = [];
  const opened = startSession(session);
  for (const m of opened.messages) transcript.push({ role: 'assistant', text: m });

  let last = opened;
  for (const turn of userTurns) {
    last = handleUserTurn(session, turn);
    transcript.push({ role: 'user', text: turn });
    for (const m of last.messages) transcript.push({ role: 'assistant', text: m });
    if (last.done) break;
  }

  return {
    session,
    transcript,
    done: Boolean(last.done),
    escalated: Boolean(last.escalated),
    handoff: last.handoff,
  };
}

/**
 * @param {ReturnType<typeof createSession>} session
 */
function nextUnansweredField(session) {
  for (const key of FIELD_ORDER) {
    if (!session.answered.has(key)) return key;
  }
  return null;
}

/**
 * @param {ReturnType<typeof createSession>} session
 * @param {FieldKey} field
 * @param {string} text
 */
function applyField(session, field, text) {
  const lower = text.toLowerCase().trim();

  if (field === 'lead_name') {
    if (lower.length < 2) return { error: 'Please share at least a first name.' };
    session.lead_name = text.trim();
    return { ok: true };
  }

  if (field === 'company') {
    session.company = /^(none|n\/a|na|skip|no|no company)$/i.test(lower) ? null : text.trim();
    return { ok: true };
  }

  if (field === 'contact_method') {
    if (/\b(e-?mail|mail)\b/.test(lower)) {
      session.contact_method = 'email';
      return { ok: true };
    }
    if (/\b(whats?\s*app|wa)\b/.test(lower)) {
      session.contact_method = 'whatsapp';
      return { ok: true };
    }
    if (/\b(phone|mobile|cell|call|telephone|sms)\b/.test(lower)) {
      session.contact_method = 'phone';
      return { ok: true };
    }
    return { error: 'Please choose email, phone, or WhatsApp as the contact method.' };
  }

  if (field === 'contact_value') {
    const method = session.contact_method;
    if (method === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())) {
        return { error: 'That does not look like an email address. Please try again.' };
      }
    } else if (method === 'phone' || method === 'whatsapp') {
      const digits = text.replace(/\D/g, '');
      if (digits.length < 7) {
        return { error: 'Please provide a phone number with at least 7 digits.' };
      }
    } else if (!text.trim()) {
      return { error: 'A contact detail is required so a human can follow up.' };
    }
    session.contact_value = text.trim();
    return { ok: true };
  }

  if (field === 'need') {
    if (lower.length < 3) return { error: 'Please briefly describe the reason for your enquiry.' };
    session.need = text.trim();
    return { ok: true };
  }

  if (field === 'urgency') {
    if (/\b(high|urgent|asap|immediately)\b/.test(lower)) {
      session.urgency = 'high';
    } else if (/\b(low|whenever|not urgent)\b/.test(lower)) {
      session.urgency = 'low';
    } else if (/\b(normal|medium|standard|moderate)\b/.test(lower)) {
      session.urgency = 'normal';
    } else {
      session.urgency = 'normal';
      session.risk_flags.push('urgency_inferred_normal');
    }
    return { ok: true };
  }

  if (field === 'preferred_follow_up') {
    session.preferred_follow_up = /^(none|n\/a|na|skip|anytime|any time)$/i.test(lower)
      ? null
      : text.trim();
    return { ok: true };
  }

  return { error: 'Unexpected field state. Please restart the session.' };
}

function captureSnapshot(session) {
  return {
    lead_name: session.lead_name,
    company: session.company,
    contact_method: session.contact_method,
    contact_value: session.contact_value,
    need: session.need,
    urgency: session.urgency,
    preferred_follow_up: session.preferred_follow_up,
    risk_flags: [...session.risk_flags],
  };
}

function reply(session, messages) {
  return {
    messages,
    session,
    done: false,
    escalated: false,
    handoff: null,
  };
}

function pushAssistant(session, text) {
  session.turns.push({ role: 'assistant', text });
}

function pushUser(session, text) {
  session.turns.push({ role: 'user', text });
}

export {
  FIELD_ORDER,
  FIELD_PROMPTS,
  CRITICAL_FIELDS,
  NO_EXTERNAL_ACTION_DISCLAIMER,
};
