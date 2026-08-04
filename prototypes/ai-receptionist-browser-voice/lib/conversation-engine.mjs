/**
 * Deterministic synthetic AI receptionist conversation engine.
 *
 * Browser-voice shaped: turns are text (STT/TTS mocked separately).
 * Profile-driven CorpFlowAI general enquiry by default.
 * No network, no DB, no secrets, no external sends.
 */

import { detectEscalation } from './escalation.mjs';
import {
  buildDraftHandoff,
  formatHandoffSummary,
  NO_EXTERNAL_ACTION_DISCLAIMER,
  SERVICE_INTEREST_LABELS,
} from './handoff.mjs';
import { loadProfile, getFieldPrompt, getServiceCaveat, DEFAULT_PROFILE_ID } from './profile.mjs';

/** @typedef {'greeting' | 'collecting' | 'review' | 'complete' | 'escalated'} Phase */
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
  company: 'company',
  'contact method': 'contact_method',
  contact: 'contact_value',
  'contact value': 'contact_value',
  'contact detail': 'contact_value',
  service: 'service_interest',
  'service interest': 'service_interest',
  interest: 'service_interest',
  need: 'need',
  problem: 'need',
  urgency: 'urgency',
  'follow up': 'preferred_follow_up',
  'follow-up': 'preferred_follow_up',
  'preferred follow up': 'preferred_follow_up',
  'preferred follow-up': 'preferred_follow_up',
};

/**
 * @param {object} [opts]
 * @param {object} [opts.profile] preloaded profile object
 * @param {string} [opts.profileId]
 */
export function createSession(opts = {}) {
  const profile = opts.profile || loadProfile(opts.profileId || DEFAULT_PROFILE_ID);
  return {
    phase: /** @type {Phase} */ ('greeting'),
    current_field: /** @type {FieldKey | null} */ (null),
    answered: /** @type {Set<FieldKey>} */ (new Set()),
    profile,
    profile_id: profile.id || DEFAULT_PROFILE_ID,
    lead_name: null,
    company: null,
    contact_method: null,
    contact_value: null,
    service_interest: null,
    need: null,
    urgency: null,
    preferred_follow_up: null,
    notes: /** @type {string[]} */ ([]),
    risk_flags: /** @type {string[]} */ ([]),
    turns: /** @type {Array<{role:string,text:string}>} */ ([]),
    handoff: null,
    pending_handoff: null,
    escalation_reason: null,
  };
}

/**
 * @param {ReturnType<typeof createSession>} session
 */
export function startSession(session) {
  const greeting = session.profile.greeting;
  const firstField = fieldOrder(session)[0];
  session.phase = 'collecting';
  session.current_field = firstField;
  const prompt = getFieldPrompt(session.profile, firstField);
  pushAssistant(session, greeting);
  pushAssistant(session, prompt);
  return {
    messages: [greeting, prompt],
    session,
    done: false,
    escalated: false,
    awaiting_review: false,
    handoff: null,
  };
}

/**
 * Visible captured-details snapshot for UI / tests.
 * @param {ReturnType<typeof createSession>} session
 */
export function getCapturedFields(session) {
  return {
    lead_name: session.lead_name,
    company: session.company,
    contact_method: session.contact_method,
    contact_value: session.contact_value,
    service_interest: session.service_interest,
    need: session.need,
    urgency: session.urgency,
    preferred_follow_up: session.preferred_follow_up,
    notes: [...session.notes],
    risk_flags: [...session.risk_flags],
  };
}

/**
 * Update a captured field before final handoff (UI or command).
 * @param {ReturnType<typeof createSession>} session
 * @param {string} fieldKey
 * @param {string} rawValue
 */
export function updateCapturedField(session, fieldKey, rawValue) {
  const key = normalizeFieldKey(fieldKey);
  if (!key) {
    return { ok: false, error: `Unknown field "${fieldKey}". Editable: ${EDITABLE_FIELDS.join(', ')}.` };
  }
  if (session.phase === 'complete' || session.phase === 'escalated') {
    return { ok: false, error: 'Session is closed; start a new session to edit fields.' };
  }

  const applyResult = applyField(session, key, String(rawValue || ''));
  if (applyResult.error) {
    return { ok: false, error: applyResult.error };
  }

  session.answered.add(key);
  const messages = [];
  if (applyResult.note) {
    session.notes.push(applyResult.note);
    messages.push(applyResult.note);
  }
  messages.push(`Updated ${key.replace(/_/g, ' ')} to: ${formatFieldValue(session, key)}`);

  if (session.phase === 'review') {
    session.pending_handoff = buildDraftHandoff(captureSnapshot(session));
    const summary = formatHandoffSummary(session.pending_handoff);
    const reviewPrompt = session.profile.final_review_prompt;
    pushAssistant(session, messages[messages.length - 1]);
    pushAssistant(session, summary);
    pushAssistant(session, reviewPrompt);
    return {
      ok: true,
      messages: [...messages, summary, reviewPrompt],
      session,
      fields: getCapturedFields(session),
    };
  }

  pushAssistant(session, messages[messages.length - 1]);
  return {
    ok: true,
    messages,
    session,
    fields: getCapturedFields(session),
  };
}

/**
 * Confirm pending review handoff (final step).
 * @param {ReturnType<typeof createSession>} session
 */
export function confirmHandoff(session) {
  if (session.phase !== 'review') {
    return {
      ok: false,
      error: 'Nothing to confirm yet — finish collecting details first.',
      messages: [],
      session,
      done: false,
      escalated: false,
      handoff: null,
    };
  }
  session.phase = 'complete';
  session.current_field = null;
  session.handoff = session.pending_handoff || buildDraftHandoff(captureSnapshot(session));
  session.pending_handoff = null;
  const summary = formatHandoffSummary(session.handoff);
  const closed =
    'Draft handoff finalised for human review. No email, WhatsApp, SMS, phone call, CRM update, DB write, or external action occurred.';
  pushAssistant(session, closed);
  pushAssistant(session, summary);
  return {
    ok: true,
    messages: [closed, summary],
    session,
    done: true,
    escalated: false,
    awaiting_review: false,
    handoff: session.handoff,
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
      awaiting_review: false,
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
    const msg =
      session.profile.escalation_language?.[esc.reason] ||
      esc.message ||
      session.profile.escalation_language?.default ||
      'Escalating to a human operator.';
    const summary = formatHandoffSummary(session.handoff);
    pushAssistant(session, msg);
    pushAssistant(session, summary);
    return {
      messages: [msg, summary],
      session,
      done: true,
      escalated: true,
      awaiting_review: false,
      handoff: session.handoff,
    };
  }

  if (session.phase === 'greeting') {
    return startSession(session);
  }

  if (session.phase === 'review') {
    return handleReviewTurn(session, text);
  }

  const editIntent = parseEditCommand(text);
  if (editIntent && session.answered.has(editIntent.field)) {
    const updated = updateCapturedField(session, editIntent.field, editIntent.value);
    if (!updated.ok) {
      pushAssistant(session, updated.error);
      return reply(session, [updated.error]);
    }
    return reply(session, updated.messages);
  }

  if (session.phase === 'collecting' && session.current_field) {
    const applyResult = applyField(session, session.current_field, text);
    if (applyResult.error) {
      pushAssistant(session, applyResult.error);
      return reply(session, [applyResult.error]);
    }

    session.answered.add(session.current_field);
    const messages = [];
    if (applyResult.note) {
      session.notes.push(applyResult.note);
      messages.push(applyResult.note);
      pushAssistant(session, applyResult.note);
    }

    const next = nextUnansweredField(session);
    if (next) {
      session.current_field = next;
      const prompt = getFieldPrompt(session.profile, next);
      messages.push(prompt);
      pushAssistant(session, prompt);
      return reply(session, messages);
    }

    return enterReview(session, messages);
  }

  const fallback =
    'I am ready to capture your enquiry. Please share the details I ask for, edit a captured field, or say if you need a human.';
  pushAssistant(session, fallback);
  return reply(session, [fallback]);
}

/**
 * Run a full scripted dialogue (user utterances after automatic greeting).
 * @param {string[]} userTurns
 * @param {{ profile?: object, profileId?: string }} [opts]
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
    awaiting_review: Boolean(last.awaiting_review),
    handoff: last.handoff,
  };
}

/**
 * @param {ReturnType<typeof createSession>} session
 * @param {string[]} priorMessages
 */
function enterReview(session, priorMessages = []) {
  session.phase = 'review';
  session.current_field = null;
  session.pending_handoff = buildDraftHandoff(captureSnapshot(session));
  const summary = formatHandoffSummary(session.pending_handoff);
  const reviewPrompt = session.profile.final_review_prompt;
  const messages = [...priorMessages, summary, reviewPrompt];
  for (const m of [summary, reviewPrompt]) pushAssistant(session, m);
  return {
    messages,
    session,
    done: false,
    escalated: false,
    awaiting_review: true,
    handoff: null,
    pending_handoff: session.pending_handoff,
  };
}

/**
 * @param {ReturnType<typeof createSession>} session
 * @param {string} text
 */
function handleReviewTurn(session, text) {
  if (isConfirmText(text)) {
    return confirmHandoff(session);
  }

  const editIntent = parseEditCommand(text);
  if (editIntent) {
    const updated = updateCapturedField(session, editIntent.field, editIntent.value);
    if (!updated.ok) {
      pushAssistant(session, updated.error);
      return {
        messages: [updated.error],
        session,
        done: false,
        escalated: false,
        awaiting_review: true,
        handoff: null,
      };
    }
    return {
      messages: updated.messages,
      session,
      done: false,
      escalated: false,
      awaiting_review: true,
      handoff: null,
      pending_handoff: session.pending_handoff,
    };
  }

  const hint =
    'Still in final review. Say “confirm” to finalise the draft handoff, or edit a field (example: “edit company to Acme”). No external action will run.';
  pushAssistant(session, hint);
  return {
    messages: [hint],
    session,
    done: false,
    escalated: false,
    awaiting_review: true,
    handoff: null,
  };
}

/**
 * @param {string} text
 */
function isConfirmText(text) {
  return /^(confirm|yes|looks good|approve|finali[sz]e|submit|ok|okay|that'?s correct|correct)$/i.test(
    text.trim(),
  );
}

/**
 * Parse "edit name to Pat" / "change company: Acme" style commands.
 * @param {string} text
 * @returns {{ field: FieldKey, value: string } | null}
 */
export function parseEditCommand(text) {
  const t = String(text || '').trim();
  const m =
    /^(?:edit|change|update|set)\s+([a-z0-9 _-]+?)\s*(?:to|:|=)\s+(.+)$/i.exec(t) ||
    /^(?:edit|change|update|set)\s+([a-z0-9 _-]+)$/i.exec(t);
  if (!m) return null;
  const field = normalizeFieldKey(m[1]);
  if (!field) return null;
  const value = (m[2] || '').trim();
  if (!value) return null;
  return { field, value };
}

/**
 * @param {string} raw
 * @returns {FieldKey | null}
 */
export function normalizeFieldKey(raw) {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (EDITABLE_FIELDS.includes(/** @type {FieldKey} */ (key.replace(/ /g, '_')))) {
    return /** @type {FieldKey} */ (key.replace(/ /g, '_'));
  }
  return FIELD_ALIASES[key] || null;
}

/**
 * @param {ReturnType<typeof createSession>} session
 */
function fieldOrder(session) {
  return /** @type {FieldKey[]} */ (session.profile.field_order || []);
}

/**
 * @param {ReturnType<typeof createSession>} session
 */
function nextUnansweredField(session) {
  for (const key of fieldOrder(session)) {
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

  if (field === 'service_interest') {
    const mapped = mapServiceInterest(lower, session.profile);
    if (!mapped) {
      return {
        error:
          'Please choose Lead Rescue, Website Rescue, workflow or admin improvement, AI receptionist or chatbot, or other/unsure.',
      };
    }
    session.service_interest = mapped;
    const caveat = getServiceCaveat(session.profile, mapped);
    return caveat ? { ok: true, note: caveat } : { ok: true };
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

/**
 * @param {string} lower
 * @param {object} profile
 * @returns {import('./handoff.mjs').ServiceInterest | null}
 */
export function mapServiceInterest(lower, profile) {
  const allowed = new Set(profile?.service_interest_values || Object.keys(SERVICE_INTEREST_LABELS));
  const direct = lower.replace(/\s+/g, '_').replace(/-/g, '_');
  if (allowed.has(direct)) return /** @type {any} */ (direct);

  if (/\blead\s*rescue\b/.test(lower) || /\binbound\s*leads?\b/.test(lower)) {
    return allowed.has('lead_rescue') ? 'lead_rescue' : null;
  }
  if (/\bwebsite\s*rescue\b/.test(lower) || /\b(site|website)\s*(migration|redesign|rebuild)\b/.test(lower)) {
    return allowed.has('website_rescue') ? 'website_rescue' : null;
  }
  if (
    /\bworkflow\b/.test(lower) ||
    /\badmin\b/.test(lower) ||
    /\bprocess\b/.test(lower) ||
    /\bfollow[- ]?ups?\b/.test(lower)
  ) {
    return allowed.has('workflow_admin_improvement') ? 'workflow_admin_improvement' : null;
  }
  if (
    /\b(ai\s*)?receptionist\b/.test(lower) ||
    /\bchat\s*bot\b/.test(lower) ||
    /\bchatbot\b/.test(lower) ||
    /\bvoice\s*assistant\b/.test(lower)
  ) {
    return allowed.has('ai_receptionist_chatbot') ? 'ai_receptionist_chatbot' : null;
  }
  if (/\b(other|unsure|not sure|don'?t know|general)\b/.test(lower)) {
    return allowed.has('other_unsure') ? 'other_unsure' : null;
  }
  return null;
}

function captureSnapshot(session) {
  return {
    lead_name: session.lead_name,
    company: session.company,
    contact_method: session.contact_method,
    contact_value: session.contact_value,
    service_interest: session.service_interest,
    need: session.need,
    urgency: session.urgency,
    preferred_follow_up: session.preferred_follow_up,
    notes: [...session.notes],
    risk_flags: [...session.risk_flags],
    profile_id: session.profile_id,
  };
}

/**
 * @param {ReturnType<typeof createSession>} session
 * @param {FieldKey} key
 */
function formatFieldValue(session, key) {
  const v = session[key];
  if (key === 'service_interest' && v) {
    return SERVICE_INTEREST_LABELS[v] || v;
  }
  if (v == null || v === '') return '(empty)';
  return String(v);
}

function reply(session, messages) {
  return {
    messages,
    session,
    done: false,
    escalated: false,
    awaiting_review: session.phase === 'review',
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
  DEFAULT_PROFILE_ID,
  NO_EXTERNAL_ACTION_DISCLAIMER,
  SERVICE_INTEREST_LABELS,
};
