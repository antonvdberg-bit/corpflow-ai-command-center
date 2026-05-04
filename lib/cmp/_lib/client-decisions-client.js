/**
 * Client-facing decision gate helpers (no internal_decisions / no operator diagnostics).
 *
 * These helpers are intentionally narrow: they only touch `console_json.client_decisions`
 * for apply/ensure; umbrella programme tickets also receive server-only internal_decisions
 * via `mergeProgrammeInternalDecisionsForTicket` (called from CMP router, not exposed to clients).
 */

/** Tickets that use CorpFlowAI-internal CRM + first AI channel defaults (not client questions). */
export const UMBRELLA_CLIENT_DECISION_TICKET_IDS = new Set(['cmo8mjijk0000jl04l1jz0v6d']);

/** Luxe Maurice umbrella ticket — Phase 1 presentation review (not IDX / CRM / automation yet). */
export const LUX_PHASE1_REVIEW_TICKET_ID = 'cmo8mjijk0000jl04l1jz0v6d';

/** Internal-only defaults for umbrella programme tickets (Postgres CRM, web chat first). */
export const PROGRAMME_INTERNAL_DECISION_DEFAULTS = {
  crm_destination: 'postgres_internal_crm',
  ai_first_channel: 'web_chat',
  crm_reason: 'single source of truth in Postgres, zero incremental cost, no vendor lock-in',
  ai_channel_reason: 'fastest deployment, no external approvals, lowest cost',
};

export const CLIENT_DECISION_KEYS = [
  'first_slice_outcome',
  'first_market_or_country',
  'listings_feed_or_idx_provider_status',
  'human_handoff_owner_and_hours',
];

/** @type {Record<string, string>} */
export const CLIENT_DECISION_QUESTIONS = {
  first_slice_outcome: 'What is the first live outcome you want (the smallest first slice)?',
  first_market_or_country: 'Which market or country should we optimize for first?',
  listings_feed_or_idx_provider_status: 'What is the status of your listings feed / IDX provider connection?',
  human_handoff_owner_and_hours: 'Who owns human handoffs, and what hours / SLA should we assume?',
};

export const PHASE1_LUX_CLIENT_DECISION_KEYS = [
  'lux_phase1_direction',
  'lux_phase1_notes',
  'lux_phase1_image_hero',
  'lux_phase1_image_property_cards',
  'lux_phase1_image_about',
  'lux_phase1_image_concierge',
  'lux_phase2_permission',
  'lux_phase2_listing_approach',
];

/** @type {Record<string, string>} */
export const PHASE1_LUX_CLIENT_DECISION_QUESTIONS = {
  lux_phase1_direction: 'Do you approve Phase 1 (the LuxeMaurice presentation site and concierge path) as directionally correct?',
  lux_phase1_notes:
    'If you are requesting changes, what should we adjust? (Optional if you fully approve — you can write “none” or leave blank.)',
  lux_phase1_image_hero: 'Which supplied images or assets should we use for the hero section?',
  lux_phase1_image_property_cards: 'Which supplied images or assets should we use for property / listing cards?',
  lux_phase1_image_about: 'Which supplied images or assets should we use for the developer / “Why Mauritius” section?',
  lux_phase1_image_concierge: 'Which supplied images or assets should we use for the concierge / contact section?',
  lux_phase2_permission: 'May we proceed to Phase 2 (IDX / property discovery and related integration work)?',
  lux_phase2_listing_approach:
    'Preferred Phase 2 listing approach (applies once you allow Phase 2 to start): staged curated listings first, a real IDX/feed provider, or hybrid.',
};

export const PHASE1_LUX_HEADING = 'Phase 1 — your review';

export const PHASE1_LUX_EXPLANATION = [
  'Phase 1 delivered the LuxeMaurice presentation layer on lux.corpflowai.com (including the concierge path). It is an acquisition and positioning surface only.',
  'Phase 1 does not include IDX, CRM, automation, or AI follow-up yet. Phase 2 starts only after you approve it below.',
  'Use this form to approve or request changes, note how supplied images should be used, and say whether we may begin Phase 2.',
].join(' ');

export const PHASE1_LUX_THANK_YOU =
  "Thank you — we've received your Phase 1 review. Phase 2 stays blocked until your team confirms we should proceed.";

export const DEFAULT_CLIENT_DECISION_THANK_YOU =
  "Thank you — we've received your answers and will prepare the first-slice plan.";

/**
 * @typedef {{
 *   id: string,
 *   keys: string[],
 *   questions: Record<string, string>,
 *   heading: string,
 *   explanation: string,
 *   thank_you_message: string,
 *   waiveKeys: Set<string>,
 *   optionalGateKeys: Set<string>,
 *   selectOptions?: Record<string, Array<{ value: string, label: string }>>,
 * }} ClientDecisionSpec
 */

/** @returns {ClientDecisionSpec} */
export function getClientDecisionSpecForTicket(ticketId) {
  const id = String(ticketId || '').trim();
  if (UMBRELLA_CLIENT_DECISION_TICKET_IDS.has(id)) {
    return {
      id: 'lux_phase1_review',
      keys: [...PHASE1_LUX_CLIENT_DECISION_KEYS],
      questions: { ...PHASE1_LUX_CLIENT_DECISION_QUESTIONS },
      heading: PHASE1_LUX_HEADING,
      explanation: PHASE1_LUX_EXPLANATION,
      thank_you_message: PHASE1_LUX_THANK_YOU,
      waiveKeys: new Set([
        'lux_phase1_image_hero',
        'lux_phase1_image_property_cards',
        'lux_phase1_image_about',
        'lux_phase1_image_concierge',
      ]),
      optionalGateKeys: new Set(['lux_phase1_notes']),
      selectOptions: {
        lux_phase1_direction: [
          { value: '', label: 'Choose one…' },
          { value: 'approve', label: 'Approve Phase 1 as directionally correct' },
          { value: 'request_changes', label: 'Request changes before Phase 2' },
        ],
        lux_phase2_permission: [
          { value: '', label: 'Choose one…' },
          { value: 'yes', label: 'Yes — you may plan and start Phase 2 when ready' },
          { value: 'no', label: 'No — hold Phase 2 for now' },
          { value: 'after_changes', label: 'Only after Phase 1 changes are done' },
        ],
        lux_phase2_listing_approach: [
          { value: '', label: 'Choose one…' },
          { value: 'staged_curated', label: 'Staged curated listings first' },
          { value: 'real_idx_feed', label: 'Real IDX / feed provider' },
          { value: 'hybrid', label: 'Hybrid (we will follow up on details)' },
        ],
      },
    };
  }
  return {
    id: 'default_first_slice',
    keys: [...CLIENT_DECISION_KEYS],
    questions: { ...CLIENT_DECISION_QUESTIONS },
    heading: 'A few decisions first',
    explanation: 'We need your input on four topics before the first live slice.',
    thank_you_message: DEFAULT_CLIENT_DECISION_THANK_YOU,
    waiveKeys: new Set(['listings_feed_or_idx_provider_status']),
    optionalGateKeys: new Set(),
    selectOptions: {},
  };
}

/**
 * @param {string} ticketId
 * @returns {string}
 */
export function getClientDecisionThankYouMessage(ticketId) {
  return getClientDecisionSpecForTicket(ticketId).thank_you_message;
}

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * Default programme decisions (no ticket id). Prefer `ensureClientDecisionsForTicket` when id is known.
 *
 * @param {unknown} consoleJson
 * @returns {Record<string, unknown>}
 */
export function ensureClientDecisionsOnConsoleJson(consoleJson) {
  return ensureClientDecisionsForTicket('', consoleJson);
}

/**
 * @param {string} ticketId
 * @param {unknown} consoleJson
 * @returns {Record<string, unknown>}
 */
export function ensureClientDecisionsForTicket(ticketId, consoleJson) {
  const spec = getClientDecisionSpecForTicket(ticketId);
  const root = asObj(consoleJson);
  const prev = asObj(root.client_decisions);
  const prevItems = Array.isArray(prev.items) ? prev.items : [];

  /** @type {Map<string, Record<string, unknown>>} */
  const byKey = new Map();
  for (const it of prevItems) {
    const o = asObj(it);
    const k = typeof o.key === 'string' ? o.key.trim() : '';
    if (!k) continue;
    byKey.set(k, o);
  }

  const items = spec.keys.map((key) => {
    const existing = byKey.get(key) || {};
    const q =
      typeof existing.question === 'string' && existing.question.trim()
        ? String(existing.question).trim()
        : spec.questions[key] || key;
    const status = typeof existing.status === 'string' && existing.status.trim() ? String(existing.status).trim() : 'pending';
    const answer = typeof existing.answer === 'string' ? existing.answer : '';
    const source_message_id =
      existing.source_message_id != null && String(existing.source_message_id).trim()
        ? String(existing.source_message_id).trim()
        : null;
    const answered_at =
      existing.answered_at != null && String(existing.answered_at).trim() ? String(existing.answered_at).trim() : null;
    /** @type {Record<string, unknown>} */
    const row = { key, question: q, status, answer, source_message_id, answered_at };
    const opts = spec.selectOptions && spec.selectOptions[key];
    if (opts && opts.length) {
      row.select_options = opts;
    }
    return row;
  });

  return { ...root, client_decisions: { ...prev, items } };
}

/**
 * @param {string} ticketId
 * @param {Array<Record<string, unknown>>} items
 * @returns {{ sufficient_to_proceed: boolean, missing_keys: string[] }}
 */
export function evaluateClientDecisionsGateForTicket(ticketId, items) {
  const spec = getClientDecisionSpecForTicket(ticketId);
  /** @type {string[]} */
  const missing = [];
  for (const key of spec.keys) {
    if (spec.optionalGateKeys.has(key)) continue;
    const it = items.find((x) => asObj(x).key === key) || {};
    const o = asObj(it);
    const status = typeof o.status === 'string' ? o.status.trim().toLowerCase() : '';
    const answer = typeof o.answer === 'string' ? o.answer.trim() : '';

    if (spec.waiveKeys.has(key)) {
      if (status === 'waived') continue;
      if (status === 'answered' && answer) continue;
      missing.push(key);
      continue;
    }

    if (status === 'answered' && answer) continue;
    missing.push(key);
  }
  return { sufficient_to_proceed: missing.length === 0, missing_keys: missing };
}

/** @deprecated use evaluateClientDecisionsGateForTicket */
export function evaluateClientDecisionsGate(items) {
  return evaluateClientDecisionsGateForTicket('', items);
}

/**
 * @param {string} ticketId
 * @param {Record<string, unknown>} stored
 * @param {Record<string, { answer?: unknown, waive?: unknown }>} answersByKey
 * @param {{ nowIso: string, messageId: string }} meta
 * @returns {{ next: Record<string, unknown>, sufficient_to_proceed: boolean, missing_keys: string[] }}
 */
export function applyClientDecisionAnswersForTicket(ticketId, { stored, answersByKey, meta }) {
  const spec = getClientDecisionSpecForTicket(ticketId);
  const base = ensureClientDecisionsForTicket(ticketId, stored);
  const cd0 = asObj(base.client_decisions);
  const items0 = Array.isArray(cd0.items) ? cd0.items.map((x) => asObj(x)) : [];

  /** @type {Map<string, Record<string, unknown>>} */
  const map = new Map();
  for (const it of items0) {
    const k = typeof it.key === 'string' ? it.key.trim() : '';
    if (k) map.set(k, { ...it });
  }

  for (const key of spec.keys) {
    const incoming = answersByKey[key] || {};
    const cur = map.get(key) || {
      key,
      question: spec.questions[key] || key,
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

    if (spec.waiveKeys.has(key) && waive) {
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

    if (spec.optionalGateKeys.has(key)) {
      map.set(key, {
        ...cur,
        key,
        status: 'answered',
        answer,
        source_message_id: meta.messageId,
        answered_at: meta.nowIso,
      });
      continue;
    }

    map.set(key, {
      ...cur,
      key,
      status: answer ? 'answered' : 'pending',
      answer,
      source_message_id: answer ? meta.messageId : null,
      answered_at: answer ? meta.nowIso : null,
    });
  }

  const items = spec.keys.map((k) => map.get(k) || { key: k });
  const gate = evaluateClientDecisionsGateForTicket(ticketId, items);
  const next = { ...base, client_decisions: { ...cd0, items, sufficient_to_proceed: gate.sufficient_to_proceed } };
  return { next, sufficient_to_proceed: gate.sufficient_to_proceed, missing_keys: gate.missing_keys };
}

/**
 * @param {Record<string, unknown>} stored
 * @param {Record<string, { answer?: unknown, waive?: unknown }>} answersByKey
 * @param {{ nowIso: string, messageId: string }} meta
 */
export function applyClientDecisionAnswers({ stored, answersByKey, meta }) {
  return applyClientDecisionAnswersForTicket('', { stored, answersByKey, meta });
}

/**
 * @param {string} ticketId
 * @param {unknown} answers
 * @returns {Record<string, { answer?: unknown, waive?: unknown }>}
 */
export function pickClientDecisionAnswersOnlyForTicket(ticketId, answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return {};
  const spec = getClientDecisionSpecForTicket(ticketId);
  const allow = new Set(spec.keys);
  /** @type {Record<string, { answer?: unknown, waive?: unknown }>} */
  const out = {};
  for (const [k, v] of Object.entries(answers)) {
    if (!allow.has(k)) continue;
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? /** @type {{ answer?: unknown, waive?: unknown }} */ (v) : {};
  }
  return out;
}

/**
 * @param {unknown} answers
 * @returns {Record<string, { answer?: unknown, waive?: unknown }>}
 */
export function pickClientDecisionAnswersOnly(answers) {
  return pickClientDecisionAnswersOnlyForTicket('', answers);
}

/**
 * Merge approved internal CRM / first-channel defaults for umbrella programme tickets.
 * Does not remove other `internal_decisions` keys.
 *
 * @param {string} ticketId
 * @param {Record<string, unknown>} stored
 * @returns {Record<string, unknown>}
 */
export function mergeProgrammeInternalDecisionsForTicket(ticketId, stored) {
  const id = String(ticketId || '').trim();
  if (!UMBRELLA_CLIENT_DECISION_TICKET_IDS.has(id)) return stored;
  const root = asObj(stored);
  const prev = asObj(root.internal_decisions);
  return {
    ...root,
    internal_decisions: { ...prev, ...PROGRAMME_INTERNAL_DECISION_DEFAULTS },
  };
}

/**
 * @param {string} ticketId
 * @param {Record<string, unknown>} stored normalized console json
 * @returns {boolean}
 */
export function umbrellaInternalDecisionsNeedPersist(ticketId, stored) {
  const id = String(ticketId || '').trim();
  if (!UMBRELLA_CLIENT_DECISION_TICKET_IDS.has(id)) return false;
  const prev = asObj(stored.internal_decisions);
  for (const [k, v] of Object.entries(PROGRAMME_INTERNAL_DECISION_DEFAULTS)) {
    if (prev[k] !== v) return true;
  }
  return false;
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
