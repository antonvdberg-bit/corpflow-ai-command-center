/**
 * Cursor ready-to-pickup SLA guard.
 *
 * Detects eligible dispatch:cursor-ready work that has free verified Cursor WIP
 * but has not been claimed. This is an observer/recovery contract only: it never
 * creates a Cursor agent and may only request the existing canonical Handoff.
 */

export const FACTORY_PICKUP_SLA_SCHEMA = 'corpflow.factory_pickup_sla.v1';
export const FACTORY_PICKUP_SLA_MARKER = 'corpflow.factory_pickup_sla.v1';
export const FACTORY_PICKUP_WARNING_MINUTES = 15;
export const FACTORY_PICKUP_HARD_MINUTES = 30;

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function text(value) {
  const s = value == null ? '' : String(value).trim();
  return s || null;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function positiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Latest dispatch:cursor-ready label event is the executable-generation clock.
 * issue.updated_at is intentionally not used.
 *
 * @param {Array<{ event?: string, label?: { name?: string }, created_at?: string }>} events
 */
export function findLatestReadyLabelAt(events) {
  let latest = null;
  for (const event of Array.isArray(events) ? events : []) {
    if (String(event?.event || '').toLowerCase() !== 'labeled') continue;
    if (String(event?.label?.name || '').toLowerCase() !== 'dispatch:cursor-ready') continue;
    const iso = text(event?.created_at);
    const ms = iso ? Date.parse(iso) : NaN;
    if (!Number.isFinite(ms)) continue;
    if (!latest || ms > Date.parse(latest)) latest = iso;
  }
  return latest;
}

/**
 * @param {string} body
 */
export function parseFactoryPickupSlaFromText(body) {
  const match = String(body || '').match(
    new RegExp(`<!--\\s*${FACTORY_PICKUP_SLA_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed?.schema !== FACTORY_PICKUP_SLA_SCHEMA) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {Array<{ body?: string | null }>} comments
 * @param {number} issueNumber
 * @param {string} readyAt
 */
export function findPickupRecoveryForGeneration(comments, issueNumber, readyAt) {
  const wanted = positiveInt(issueNumber);
  for (const comment of [...(Array.isArray(comments) ? comments : [])].reverse()) {
    const parsed = parseFactoryPickupSlaFromText(comment?.body || '');
    if (!parsed) continue;
    if (positiveInt(parsed.source_issue) !== wanted) continue;
    if (text(parsed.ready_at) !== text(readyAt)) continue;
    if (parsed.recovery_requested_at) return parsed;
  }
  return null;
}

/**
 * @param {{
 *   sourceIssue: number,
 *   readyAt: string,
 *   now?: Date,
 *   eligible?: boolean,
 *   availableSlots?: number | null,
 *   claimed?: boolean,
 *   recoveryAlreadyRequested?: boolean,
 * }} input
 */
export function evaluateFactoryPickupSla(input) {
  const sourceIssue = positiveInt(input.sourceIssue);
  if (!sourceIssue) throw new Error('sourceIssue required');
  const readyAt = text(input.readyAt);
  if (!readyAt || !Number.isFinite(Date.parse(readyAt))) {
    return {
      schema: FACTORY_PICKUP_SLA_SCHEMA,
      source_issue: sourceIssue,
      state: 'UNKNOWN',
      ready_at: readyAt,
      age_minutes: null,
      should_recover: false,
      reason: 'ready_label_timestamp_missing',
    };
  }
  const now = input.now instanceof Date ? input.now : new Date();
  const ageMinutes = Math.max(0, Math.floor((now.getTime() - Date.parse(readyAt)) / 60000));
  const eligible = input.eligible === true;
  const slots = Number(input.availableSlots);
  const freeCapacity = Number.isFinite(slots) ? slots > 0 : false;
  const claimed = input.claimed === true;
  const recovered = input.recoveryAlreadyRequested === true;

  let state = 'HEALTHY';
  let reason = 'within_pickup_sla';
  let shouldRecover = false;

  if (claimed) {
    state = 'PICKED_UP';
    reason = 'claim_present';
  } else if (!eligible) {
    state = 'NOT_ELIGIBLE';
    reason = 'selector_not_eligible';
  } else if (!freeCapacity) {
    state = 'WAITING_CAPACITY';
    reason = 'verified_wip_full';
  } else if (ageMinutes >= FACTORY_PICKUP_HARD_MINUTES) {
    state = 'HARD_EXCEPTION';
    reason = recovered ? 'pickup_sla_exceeded_after_recovery' : 'pickup_sla_exceeded_recovery_required';
    shouldRecover = !recovered;
  } else if (ageMinutes >= FACTORY_PICKUP_WARNING_MINUTES) {
    state = 'WARNING';
    reason = recovered ? 'pickup_warning_after_recovery' : 'pickup_warning_recovery_required';
    shouldRecover = !recovered;
  }

  return {
    schema: FACTORY_PICKUP_SLA_SCHEMA,
    source_issue: sourceIssue,
    state,
    ready_at: readyAt,
    age_minutes: ageMinutes,
    warning_minutes: FACTORY_PICKUP_WARNING_MINUTES,
    hard_minutes: FACTORY_PICKUP_HARD_MINUTES,
    eligible,
    available_slots: Number.isFinite(slots) ? slots : null,
    claimed,
    recovery_already_requested: recovered,
    should_recover: shouldRecover,
    reason,
  };
}

/**
 * @param {ReturnType<typeof evaluateFactoryPickupSla> & {
 *   recovery_requested_at?: string | null,
 *   observed_at?: string | null,
 * }} record
 */
export function formatFactoryPickupSlaComment(record) {
  const r = {
    ...record,
    recovery_requested_at: text(record.recovery_requested_at),
    observed_at: text(record.observed_at) || new Date().toISOString(),
  };
  const heading =
    r.state === 'HARD_EXCEPTION'
      ? 'CURSOR PICKUP SLA — HARD EXCEPTION'
      : 'CURSOR PICKUP SLA — RECOVERY REQUESTED';
  return `${heading}

Source issue: #${r.source_issue}
Ready since: ${r.ready_at || 'unknown'}
Ready age: ${r.age_minutes == null ? 'unknown' : `${r.age_minutes} minutes`}
State: ${r.state}
Recovery already requested: ${r.recovery_already_requested ? 'YES' : 'NO'}
Recovery requested now: ${r.recovery_requested_at ? 'YES' : 'NO'}
Reason: ${r.reason}
Next: ${r.should_recover || r.recovery_requested_at
    ? 'Invoke the existing CorpFlowAI Cursor Factory Handoff once for this same source issue/generation.'
    : 'Do not retry again. Preserve evidence and escalate the factory pickup exception.'}

<!-- ${FACTORY_PICKUP_SLA_MARKER} ${JSON.stringify(r)} -->
`;
}
