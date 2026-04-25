/**
 * Client-facing decision gate helpers (no internal_decisions / no operator diagnostics).
 *
 * These helpers are intentionally narrow: they only touch `console_json.client_decisions`.
 */

export const CLIENT_DECISION_KEYS = [
  'first_slice_outcome',
  'first_market_or_country',
  'listings_feed_or_idx_provider_status',
  'crm_destination_or_tooling_preference',
  'first_ai_communication_channel',
  'human_handoff_owner_and_hours',
];

/** @type {Record<string, string>} */
export const CLIENT_DECISION_QUESTIONS = {
  first_slice_outcome: 'What is the first live outcome you want (the smallest first slice)?',
  first_market_or_country: 'Which market or country should we optimize for first?',
  listings_feed_or_idx_provider_status: 'What is the status of your listings feed / IDX provider connection?',
  crm_destination_or_tooling_preference: 'Where should leads and client records live (CRM destination / tooling preference)?',
  first_ai_communication_channel: 'What is the first AI communication channel you want enabled (and constraints)?',
  human_handoff_owner_and_hours: 'Who owns human handoffs, and what hours / SLA should we assume?',
};

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {unknown} consoleJson
 * @returns {Record<string, unknown>}
 */
export function ensureClientDecisionsOnConsoleJson(consoleJson) {
  const root = asObj(consoleJson);
  const prev = asObj(root.client_decisions);
  const prevItems = Array.isArray(prev.items) ? prev.items : [];

  /** @type {Array<Record<string, unknown>>} */
  const byKey = new Map();
  for (const it of prevItems) {
    const o = asObj(it);
    const k = typeof o.key === 'string' ? o.key.trim() : '';
    if (!k) continue;
    byKey.set(k, o);
  }

  const items = CLIENT_DECISION_KEYS.map((key) => {
    const existing = byKey.get(key) || {};
    const q =
      typeof existing.question === 'string' && existing.question.trim()
        ? String(existing.question).trim()
        : CLIENT_DECISION_QUESTIONS[key] || key;
    const status = typeof existing.status === 'string' && existing.status.trim() ? String(existing.status).trim() : 'pending';
    const answer = typeof existing.answer === 'string' ? existing.answer : '';
    const source_message_id =
      existing.source_message_id != null && String(existing.source_message_id).trim()
        ? String(existing.source_message_id).trim()
        : null;
    const answered_at =
      existing.answered_at != null && String(existing.answered_at).trim() ? String(existing.answered_at).trim() : null;
    return { key, question: q, status, answer, source_message_id, answered_at };
  });

  return { ...root, client_decisions: { ...prev, items } };
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {{ sufficient_to_proceed: boolean, missing_keys: string[] }}
 */
export function evaluateClientDecisionsGate(items) {
  /** @type {string[]} */
  const missing = [];
  for (const it of items) {
    const key = typeof it.key === 'string' ? it.key.trim() : '';
    const status = typeof it.status === 'string' ? it.status.trim().toLowerCase() : '';
    const answer = typeof it.answer === 'string' ? it.answer.trim() : '';

    const waivedOk = key === 'listings_feed_or_idx_provider_status' && status === 'waived';

    if (waivedOk) continue;
    if (status === 'answered' && answer) continue;
    if (key) missing.push(key);
  }
  return { sufficient_to_proceed: missing.length === 0, missing_keys: missing };
}

/**
 * @param {Record<string, unknown>} stored
 * @param {Record<string, { answer?: unknown, waive?: unknown }>} answersByKey
 * @param {{ nowIso: string, messageId: string }} meta
 * @returns {{ next: Record<string, unknown>, sufficient_to_proceed: boolean, missing_keys: string[] }}
 */
export function applyClientDecisionAnswers({ stored, answersByKey, meta }) {
  const base = ensureClientDecisionsOnConsoleJson(stored);
  const cd0 = asObj(base.client_decisions);
  const items0 = Array.isArray(cd0.items) ? cd0.items.map((x) => asObj(x)) : [];

  /** @type {Record<string, Record<string, unknown>>} */
  const map = new Map();
  for (const it of items0) {
    const k = typeof it.key === 'string' ? it.key.trim() : '';
    if (k) map.set(k, { ...it });
  }

  for (const key of CLIENT_DECISION_KEYS) {
    const incoming = answersByKey[key] || {};
    const cur = map.get(key) || {
      key,
      question: CLIENT_DECISION_QUESTIONS[key] || key,
      status: 'pending',
      answer: '',
      source_message_id: null,
      answered_at: null,
    };

    const waive =
      incoming.waive === true ||
      incoming.waive === 'true' ||
      incoming.waive === 1 ||
      String(incoming.waive || '').toLowerCase() === 'true';

    if (key === 'listings_feed_or_idx_provider_status' && waive) {
      map.set(key, {
        ...cur,
        key,
        status: 'waived',
        answer: typeof incoming.answer === 'string' ? incoming.answer : '',
        source_message_id: meta.messageId,
        answered_at: meta.nowIso,
      });
      continue;
    }

    const answer = typeof incoming.answer === 'string' ? incoming.answer.trim() : '';
    map.set(key, {
      ...cur,
      key,
      status: answer ? 'answered' : 'pending',
      answer,
      source_message_id: answer ? meta.messageId : null,
      answered_at: answer ? meta.nowIso : null,
    });
  }

  const items = CLIENT_DECISION_KEYS.map((k) => map.get(k) || { key: k });
  const gate = evaluateClientDecisionsGate(items);
  const next = { ...base, client_decisions: { ...cd0, items, sufficient_to_proceed: gate.sufficient_to_proceed } };
  return { next, sufficient_to_proceed: gate.sufficient_to_proceed, missing_keys: gate.missing_keys };
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {boolean}
 */
export function payloadLeaksInternals(payload) {
  const s = JSON.stringify(payload || {});
  return (
    s.includes('internal_decisions') ||
    s.includes('change_stage_debug') ||
    s.includes('reality_panel') ||
    s.includes('console_json')
  );
}
