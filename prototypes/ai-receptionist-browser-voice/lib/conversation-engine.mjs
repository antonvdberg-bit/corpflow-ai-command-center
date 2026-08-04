/**
 * Deterministic synthetic AI receptionist conversation engine.
 *
 * Browser-voice shaped: turns are text (STT/TTS mocked separately).
 * Profile-driven prompts (default: CorpFlowAI general enquiry).
 * No network, no DB, no secrets, no external sends.
 */

import { detectEscalation } from './escalation.mjs';
import {
  buildDraftHandoff,
  formatHandoffSummary,
  formatCapturedReview,
  NO_EXTERNAL_ACTION_DISCLAIMER,
} from './handoff.mjs';
import {
  normalizeProfile,
  parseServiceInterest,
  fieldPrompt,
  needPromptForService,
  serviceInterestLabel,
  DEFAULT_PROFILE_ID,
} from './profile.mjs';
import defaultProfileRaw from '../profiles/corpflowai-general.mjs';

/** @typedef {'greeting' | 'collecting' | 'reviewing' | 'complete' | 'escalated'} Phase */
/** @typedef {'lead_name' | 'company' | 'contact_method' | 'contact_value' | 'service_interest' | 'need' | 'urgency' | 'preferred_follow_up'} FieldKey */

const EDITABLE_FIELDS = /** @type {FieldKey[]} */ ([
  'lead_name',
  'company',
  'contact_method',
  'contact_value',
  'service_interest',
  'need',
  'urgency',
  'preferred_follow_up',
]);

const FIELD_ALIASES = {
  name: 'lead_name',
  'lead name': 'lead_name',
  lead_name: 'lead_name',
  company: 'company',
  'contact method': 'contact_method',
  contact_method: 'contact_method',
  contact: 'contact_value',
  'contact value': 'contact_value',
  contact_value: 'contact_value',
  email: 'contact_value',
  phone: 'contact_value',
  service: 'service_interest',
  'service interest': 'service_interest',
  service_interest: 'service_interest',
  interest: 'service_interest',
  need: 'need',
  problem: 'need',
  urgency: 'urgency',
  'follow up': 'preferred_follow_up',
  'follow-up': 'preferred_follow_up',
  followup: 'preferred_follow_up',
  'preferred follow up': 'preferred_follow_up',
  'preferred follow-up': 'preferred_follow_up',
  preferred_follow_up: 'preferred_follow_up',
};

/**
 * @param {{ profile?: object, profileId?: string }} [opts]
 */
export function createSession(opts = {}) {
  const profile = opts.profile
    ? normalizeProfile(opts.profile)
    : normalizeProfile(defaultProfileRaw);

  return {
    profile,
    profile_id: profile.id || DEFAULT_PROFILE_ID,
    phase: /** @type {Phase} */ ('greeting'),
    current_field: /** @type {FieldKey | null} */ (null),
    answered: /** @type {Set<string>} */ (new Set()),
    lead_name: null,
    company: null,
    contact_method: null,
    contact_value: null,
    service_interest: null,
    need: null,
    urgency: null,
    preferred_follow_up: null,
    notes: null,
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
  const greeting = session.profile.greeting;
  session.phase = 'collecting';
  const first = /** @type {FieldKey} */ (session.profile.field_order[0] || 'lead_name');
  session.current_field = first;
  const prompt = promptForField(session, first);
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
 * Snapshot of captured draft fields for UI panels.
 * @param {ReturnType<typeof createSession>} session
 */
export function getCapturedFields(session) {
  return {
    lead_name: session.lead_name,
    company: session.company,
    contact_method: session.contact_method,
    contact_value: session.contact_value,
    service_interest: session.service_interest,
    service_interest_label: serviceInterestLabel(session.profile, session.service_interest),
    need: session.need,
    urgency: session.urgency,
    preferred_follow_up: session.preferred_follow_up,
    notes: session.notes,
    risk_flags: [...session.risk_flags],
    phase: session.phase,
    current_field: session.current_field,
  };
}

/**
 * UI / operator correction of a captured field (before final handoff).
 * @param {ReturnType<typeof createSession>} session
 * @param {string} fieldKey
 * @param {string} value
 */
export function updateCapturedField(session, fieldKey, value) {
  if (session.phase === 'complete' || session.phase === 'escalated') {
    return {
      ok: false,
      error: 'Session is closed. Start a new session to change details.',
      messages: [],
      session,
      done: true,
      escalated: session.phase === 'escalated',
      handoff: session.handoff,
    };
  }

  const key = resolveFieldKey(fieldKey);
  if (!key) {
    return {
      ok: false,
      error: `Unknown field "${fieldKey}". Editable: ${EDITABLE_FIELDS.join(', ')}`,
      messages: [],
      session,
      done: false,
      escalated: false,
      handoff: null,
    };
  }

  const applied = applyField(session, key, String(value || ''));
  if (applied.error) {
    return {
      ok: false,
      error: applied.error,
      messages: [applied.error],
      session,
      done: false,
      escalated: false,
      handoff: null,
    };
  }

  session.answered.add(key);
  const msg = `Updated ${key.replace(/_/g, ' ')}.`;
  const messages = [msg];
  if (applied.extraMessages) messages.push(...applied.extraMessages);

  if (session.phase === 'reviewing') {
    const review = reviewMessages(session);
    messages.push(...review);
  }

  for (const m of messages) pushAssistant(session, m);
  return {
    ok: true,
    error: null,
    messages,
    session,
    done: false,
    escalated: false,
    handoff: null,
    captured: getCapturedFields(session),
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
    return escalateSession(session, esc);
  }

  if (session.phase === 'greeting') {
    return startSession(session);
  }

  const edit = parseEditCommand(text);
  if (edit) {
    const updated = updateCapturedField(session, edit.field, edit.value);
    // updateCapturedField already pushed assistant messages when ok / may not on error
    if (!updated.ok) {
      const err = updated.error || 'Could not update that field.';
      if (!session.turns.some((t) => t.role === 'assistant' && t.text === err)) {
        pushAssistant(session, err);
      }
      return reply(session, [err]);
    }
    // Messages already pushed inside updateCapturedField
    return {
      messages: updated.messages,
      session,
      done: false,
      escalated: false,
      handoff: null,
    };
  }

  if (session.phase === 'reviewing') {
    return handleReviewTurn(session, text);
  }

  if (session.phase === 'collecting' && session.current_field) {
    const applyResult = applyField(session, session.current_field, text);
    if (applyResult.error) {
      pushAssistant(session, applyResult.error);
      return reply(session, [applyResult.error]);
    }

    session.answered.add(session.current_field);
    const messages = [];
    if (applyResult.extraMessages) {
      for (const m of applyResult.extraMessages) {
        pushAssistant(session, m);
        messages.push(m);
      }
    }

    const next = nextUnansweredField(session);
    if (next) {
      session.current_field = next;
      const prompt = promptForField(session, next);
      pushAssistant(session, prompt);
      messages.push(prompt);
      return reply(session, messages);
    }

    return enterReview(session, messages);
  }

  const fallback =
    'I am ready to capture your enquiry. Please share the details I ask for, or say if you need a human.';
  pushAssistant(session, fallback);
  return reply(session, [fallback]);
}

/**
 * Run a full scripted dialogue (user utterances after automatic greeting).
 * @param {string[]} userTurns
 * @param {{ profile?: object }} [opts]
 */
export function runScriptedConversation(userTurns, opts = {}) {
  const session = createSession(opts);
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
 * @param {string} text
 * @returns {{ field: FieldKey, value: string } | null}
 */
export function parseEditCommand(text) {
  const t = String(text || '').trim();
  const match = /^(?:edit|change|update)\s+(.+?)\s+to\s+(.+)$/i.exec(t);
  if (!match) return null;
  const fieldRaw = match[1].trim().toLowerCase();
  const value = match[2].trim();
  const field = resolveFieldKey(fieldRaw);
  if (!field || !value) return null;
  return { field, value };
}

/**
 * @param {string} raw
 * @returns {FieldKey | null}
 */
function resolveFieldKey(raw) {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
  const mapped = FIELD_ALIASES[key] || FIELD_ALIASES[key.replace(/\s+/g, '_')];
  if (mapped) return /** @type {FieldKey} */ (mapped);
  const underscored = key.replace(/\s+/g, '_');
  if (EDITABLE_FIELDS.includes(/** @type {FieldKey} */ (underscored))) {
    return /** @type {FieldKey} */ (underscored);
  }
  return null;
}

/**
 * @param {ReturnType<typeof createSession>} session
 * @param {string[]} leadingMessages
 */
function enterReview(session, leadingMessages = []) {
  session.phase = 'reviewing';
  session.current_field = null;
  const messages = [...leadingMessages, ...reviewMessages(session)];
  for (const m of messages.slice(leadingMessages.length)) pushAssistant(session, m);
  return {
    messages,
    session,
    done: false,
    escalated: false,
    handoff: null,
  };
}

/**
 * @param {ReturnType<typeof createSession>} session
 */
function reviewMessages(session) {
  const review = formatCapturedReview(captureSnapshot(session), {
    service_label: serviceInterestLabel(session.profile, session.service_interest),
  });
  return [review, session.profile.final_review_prompt];
}

/**
 * @param {ReturnType<typeof createSession>} session
 * @param {string} text
 */
function handleReviewTurn(session, text) {
  const lower = text.toLowerCase().trim();
  if (
    /^(confirm|confirmed|yes|y|looks good|correct|ok|okay|approve|submit|done)$/i.test(
      lower,
    )
  ) {
    return completeSession(session);
  }
  if (/^(help|edit|what can i (change|edit))$/i.test(lower)) {
    const help =
      session.profile.edit_help ||
      'Tell me what to edit, for example: “edit name to …”.';
    pushAssistant(session, help);
    return reply(session, [help]);
  }

  const hint =
    'Say “confirm” to prepare the draft handoff, or “edit <field> to <value>” to correct a detail.';
  pushAssistant(session, hint);
  return reply(session, [hint]);
}

/**
 * @param {ReturnType<typeof createSession>} session
 */
function completeSession(session) {
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

/**
 * @param {ReturnType<typeof createSession>} session
 * @param {{ reason: string | null, message: string | null }} esc
 */
function escalateSession(session, esc) {
  session.phase = 'escalated';
  session.escalation_reason = esc.reason;
  session.risk_flags.push(`escalation:${esc.reason}`);
  const profileMsg = session.profile.escalation_language?.[esc.reason];
  const msg =
    profileMsg ||
    esc.message ||
    session.profile.escalation_language?.default ||
    'Escalating to a human operator.';
  session.handoff = buildDraftHandoff(captureSnapshot(session), {
    escalation_reason: esc.reason,
  });
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

/**
 * @param {ReturnType<typeof createSession>} session
 */
function nextUnansweredField(session) {
  for (const key of session.profile.field_order) {
    if (!session.answered.has(key)) return /** @type {FieldKey} */ (key);
  }
  return null;
}

/**
 * @param {ReturnType<typeof createSession>} session
 * @param {FieldKey} field
 */
function promptForField(session, field) {
  if (field === 'need') {
    return needPromptForService(session.profile, session.service_interest);
  }
  return fieldPrompt(session.profile, field);
}

/**
 * @param {ReturnType<typeof createSession>} session
 * @param {FieldKey} field
 * @param {string} text
 */
function applyField(session, field, text) {
  const lower = text.toLowerCase().trim();
  /** @type {string[]} */
  const extraMessages = [];

  if (field === 'lead_name') {
    if (lower.length < 2) return { error: 'Please share at least a first name.' };
    session.lead_name = text.trim();
    return { ok: true };
  }

  if (field === 'company') {
    session.company = /^(none|n\/a|na|skip|no|no company)$/i.test(lower)
      ? null
      : text.trim();
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
    // Allow "edit contact to email: x@y.com" style from UI — also plain value.
    let method = session.contact_method;
    let value = text.trim();
    const paired = /^(email|phone|whatsapp)\s*[:\-]\s*(.+)$/i.exec(value);
    if (paired) {
      method = paired[1].toLowerCase();
      value = paired[2].trim();
      session.contact_method = method;
      session.answered.add('contact_method');
    }

    if (method === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { error: 'That does not look like an email address. Please try again.' };
      }
    } else if (method === 'phone' || method === 'whatsapp') {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 7) {
        return { error: 'Please provide a phone number with at least 7 digits.' };
      }
    } else if (!value) {
      return { error: 'A contact detail is required so a human can follow up.' };
    }
    session.contact_value = value;
    return { ok: true };
  }

  if (field === 'service_interest') {
    const parsed = parseServiceInterest(text, session.profile);
    if (!parsed.value) return { error: parsed.error };
    session.service_interest = parsed.value;
    if (parsed.caveat) extraMessages.push(parsed.caveat);
    return { ok: true, extraMessages };
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
      if (!session.risk_flags.includes('urgency_inferred_normal')) {
        session.risk_flags.push('urgency_inferred_normal');
      }
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
    profile_id: session.profile_id,
    lead_name: session.lead_name,
    company: session.company,
    contact_method: session.contact_method,
    contact_value: session.contact_value,
    service_interest: session.service_interest,
    need: session.need,
    urgency: session.urgency,
    preferred_follow_up: session.preferred_follow_up,
    notes: session.notes,
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
  EDITABLE_FIELDS,
  NO_EXTERNAL_ACTION_DISCLAIMER,
  DEFAULT_PROFILE_ID,
};
