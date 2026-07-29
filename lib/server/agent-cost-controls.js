/**
 * Agent cost controls — concurrency, dedupe, daily ceiling, urgent bypass.
 *
 * File-backed usage metadata (no second DB). Complements dispatcher dedupe
 * state without editing Track A activator files.
 *
 * @see docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md
 */

export const AGENT_COST_CONTROLS_SCHEMA = 'corpflow.agent_cost_controls.v1';

export const AGENT_COST_CONTROLS_VERSION = 1;

export const AGENT_COST_STATE_FILENAME = 'cost-usage.json';

/**
 * @typedef {{
 *   maxConcurrentCursor: number,
 *   maxConcurrentCodex: number,
 *   maxCursorActivationsPerDay: number,
 *   maxCodexTriggersPerDay: number,
 *   duplicateWindowHours: number,
 * }} CostLimits
 */

export const DEFAULT_COST_LIMITS = Object.freeze({
  maxConcurrentCursor: 2,
  maxConcurrentCodex: 1,
  maxCursorActivationsPerDay: 12,
  maxCodexTriggersPerDay: 6,
  duplicateWindowHours: 24,
});

/** Categories that bypass daily ceiling when at threshold (urgent revenue/client). */
export const URGENT_BYPASS_CATEGORIES = Object.freeze([
  'revenue',
  'client-delivery',
  'paid-pilot',
  'production-verification',
  'lead-rescue',
]);

/**
 * @typedef {{
 *   provider: 'cursor' | 'codex',
 *   dedupeKey: string,
 *   objectRef: string,
 *   category: string | null,
 *   activatedAt: string,
 *   issueNumber: number | null,
 * }} UsageEntry
 */

/**
 * @typedef {{
 *   schema: string,
 *   version: number,
 *   date: string,
 *   cursorActivations: number,
 *   codexTriggers: number,
 *   entries: UsageEntry[],
 *   haltedLowValue: boolean,
 * }} CostUsageState
 */

/**
 * @param {string | Date} [now]
 */
export function usageDateKey(now = new Date()) {
  return new Date(now).toISOString().slice(0, 10);
}

/**
 * @param {unknown} raw
 * @param {string | Date} [now]
 */
export function normalizeCostUsageState(raw, now = new Date()) {
  const today = usageDateKey(now);
  const base = {
    schema: AGENT_COST_CONTROLS_SCHEMA,
    version: AGENT_COST_CONTROLS_VERSION,
    date: today,
    cursorActivations: 0,
    codexTriggers: 0,
    entries: [],
    haltedLowValue: false,
  };
  if (!raw || typeof raw !== 'object') return base;
  const obj = /** @type {Record<string, unknown>} */ (raw);
  const date = String(obj.date || today);
  const entries = Array.isArray(obj.entries)
    ? obj.entries
        .filter((e) => e && typeof e === 'object')
        .map((e) => {
          const x = /** @type {Record<string, unknown>} */ (e);
          return {
            provider: x.provider === 'codex' ? 'codex' : 'cursor',
            dedupeKey: String(x.dedupeKey || ''),
            objectRef: String(x.objectRef || ''),
            category: x.category != null ? String(x.category) : null,
            activatedAt: String(x.activatedAt || ''),
            issueNumber:
              x.issueNumber != null && Number.isFinite(Number(x.issueNumber))
                ? Number(x.issueNumber)
                : null,
          };
        })
    : [];
  if (date !== today) {
    return { ...base, entries: [] };
  }
  return {
    ...base,
    date,
    cursorActivations: Number(obj.cursorActivations) || entries.filter((e) => e.provider === 'cursor').length,
    codexTriggers: Number(obj.codexTriggers) || entries.filter((e) => e.provider === 'codex').length,
    entries,
    haltedLowValue: Boolean(obj.haltedLowValue),
  };
}

/**
 * @param {{ allowed_category?: string, category?: string, throughput_packet?: { allowed_category?: string } }} candidate
 */
export function extractCandidateCategory(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  const tp = candidate.throughput_packet;
  if (tp && typeof tp === 'object' && tp.allowed_category) {
    return String(tp.allowed_category).trim();
  }
  if (candidate.allowed_category) return String(candidate.allowed_category).trim();
  if (candidate.category) return String(candidate.category).trim();
  return null;
}

/**
 * @param {{ allowed_category?: string, category?: string, throughput_packet?: { allowed_category?: string } }} candidate
 */
export function isUrgentBypass(candidate) {
  const cat = extractCandidateCategory(candidate);
  return cat != null && URGENT_BYPASS_CATEGORIES.includes(cat);
}

/**
 * @param {string} dedupeKey
 * @param {CostUsageState} state
 * @param {CostLimits} limits
 * @param {string | Date} [now]
 */
export function isDuplicateActivation(dedupeKey, state, limits, now = new Date()) {
  const key = String(dedupeKey || '').trim();
  if (!key) return false;
  const windowMs = limits.duplicateWindowHours * 3600 * 1000;
  const nowMs = new Date(now).getTime();
  return state.entries.some((e) => {
    if (e.dedupeKey !== key) return false;
    const at = Date.parse(e.activatedAt);
    return Number.isFinite(at) && nowMs - at < windowMs;
  });
}

/**
 * @param {Array<{ provider?: string, phase?: string }>} activeRuns
 * @param {'cursor' | 'codex'} provider
 * @param {CostLimits} limits
 */
export function countActiveByProvider(activeRuns, provider, limits) {
  const active = (activeRuns || []).filter(
    (r) =>
      r.provider === provider &&
      r.phase !== 'complete' &&
      r.phase !== 'blocked' &&
      r.phase !== 'pending',
  );
  const max =
    provider === 'codex' ? limits.maxConcurrentCodex : limits.maxConcurrentCursor;
  return { active: active.length, max, atLimit: active.length >= max };
}

/**
 * @param {{
 *   provider: 'cursor' | 'codex',
 *   dedupeKey: string,
 *   objectRef?: string,
 *   category?: string | null,
 *   issueNumber?: number | null,
 * }} candidate
 * @param {CostUsageState} usageState
 * @param {Array<{ provider?: string, phase?: string }>} activeRuns
 * @param {CostLimits} [limits]
 * @param {string | Date} [now]
 */
export function evaluateActivationCostGate(candidate, usageState, activeRuns, limits = DEFAULT_COST_LIMITS, now = new Date()) {
  const state = normalizeCostUsageState(usageState, now);
  const urgent = isUrgentBypass(candidate);
  const provider = candidate.provider === 'codex' ? 'codex' : 'cursor';
  const errors = [];
  const warnings = [];

  const concurrency = countActiveByProvider(
    activeRuns.map((r) => ({ provider: r.provider, phase: r.phase })),
    provider,
    limits,
  );
  if (concurrency.atLimit) {
    errors.push(
      `${provider} concurrent limit reached (${concurrency.active}/${concurrency.max})`,
    );
  }

  if (isDuplicateActivation(candidate.dedupeKey, state, limits, now)) {
    errors.push(`duplicate activation within ${limits.duplicateWindowHours}h for key ${candidate.dedupeKey}`);
  }

  const dailyCount =
    provider === 'codex' ? state.codexTriggers : state.cursorActivations;
  const dailyMax =
    provider === 'codex'
      ? limits.maxCodexTriggersPerDay
      : limits.maxCursorActivationsPerDay;

  if (dailyCount >= dailyMax && !urgent) {
    if (state.haltedLowValue) {
      errors.push(`daily ${provider} ceiling reached (${dailyCount}/${dailyMax}); low-value halted`);
    } else {
      warnings.push(`daily ${provider} ceiling reached (${dailyCount}/${dailyMax}); only urgent categories allowed`);
      if (!urgent) {
        errors.push('activation blocked — exceed daily ceiling (non-urgent)');
      }
    }
  }

  return {
    schema: AGENT_COST_CONTROLS_SCHEMA,
    allowed: errors.length === 0,
    urgentBypass: urgent,
    errors,
    warnings,
    concurrency,
    daily: { count: dailyCount, max: dailyMax },
  };
}

/**
 * @param {CostUsageState} state
 * @param {UsageEntry} entry
 * @param {string | Date} [now]
 */
export function recordActivationUsage(state, entry, now = new Date()) {
  const normalized = normalizeCostUsageState(state, now);
  const entries = [...normalized.entries, entry];
  return {
    ...normalized,
    cursorActivations:
      entry.provider === 'cursor'
        ? normalized.cursorActivations + 1
        : normalized.cursorActivations,
    codexTriggers:
      entry.provider === 'codex' ? normalized.codexTriggers + 1 : normalized.codexTriggers,
    entries,
    updatedAt: new Date(now).toISOString(),
  };
}

/**
 * Halt low-value activations when soft threshold hit (preserve urgent).
 *
 * @param {CostUsageState} state
 * @param {CostLimits} [limits]
 */
export function shouldHaltLowValue(state, limits = DEFAULT_COST_LIMITS) {
  const s = normalizeCostUsageState(state);
  const softThreshold = Math.max(1, Math.floor(limits.maxCursorActivationsPerDay * 0.8));
  return s.cursorActivations >= softThreshold && s.codexTriggers >= Math.floor(limits.maxCodexTriggersPerDay * 0.8);
}

/**
 * @param {CostUsageState} state
 */
export function markLowValueHalted(state) {
  return { ...normalizeCostUsageState(state), haltedLowValue: true };
}
