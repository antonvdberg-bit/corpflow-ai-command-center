/**
 * Lead Rescue onboarding + delivery readiness (#715 / WS4).
 *
 * Pure process contract: completeness checks, delivery-state transitions,
 * build-start gate, and a separate messaging-runtime gate.
 *
 * No DB writes, no client sends, no schema/env changes.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/lead-rescue-onboarding-delivery.v1.json';

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

/**
 * @returns {Record<string, unknown>}
 */
export function loadLeadRescueOnboardingDeliveryConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const raw = readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8');
  const parsed = JSON.parse(raw);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

/** Reset cache (tests). */
export function resetLeadRescueOnboardingDeliveryConfigCache() {
  cachedConfig = null;
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function asTrimmedString(v) {
  if (v == null) return '';
  return String(v).trim();
}

/**
 * @param {unknown} v
 * @returns {string[]}
 */
function asStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asTrimmedString(x)).filter(Boolean);
}

/**
 * @param {Record<string, unknown>} config
 * @param {Record<string, unknown> | null | undefined} intake
 */
export function evaluateOnboardingCompleteness(intake, config = loadLeadRescueOnboardingDeliveryConfig()) {
  const fields = Array.isArray(config.lead_rescue_intake_fields) ? config.lead_rescue_intake_fields : [];
  const src = intake && typeof intake === 'object' ? intake : {};
  /** @type {string[]} */
  const missing = [];
  /** @type {string[]} */
  const present = [];

  for (const field of fields) {
    if (!field || typeof field !== 'object') continue;
    const id = asTrimmedString(field.id);
    if (!id) continue;
    if (!field.required) continue;

    const type = asTrimmedString(field.type) || 'string';
    const value = src[id];
    let ok = false;

    if (type === 'string_array') {
      const arr = asStringArray(value);
      const min = Number(field.min_items) > 0 ? Number(field.min_items) : 1;
      ok = arr.length >= min;
    } else {
      ok = asTrimmedString(value).length > 0;
    }

    if (ok) present.push(id);
    else missing.push(id);
  }

  const primary = asTrimmedString(src.primary_leaky_source);
  const sources = asStringArray(src.enquiry_sources);
  if (primary && sources.length > 0 && !sources.includes(primary)) {
    missing.push('primary_leaky_source_not_in_enquiry_sources');
  }

  return {
    complete: missing.length === 0,
    missing,
    present,
    required_count: fields.filter((f) => f && f.required).length,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 * @param {Record<string, unknown>} [config]
 */
export function listBlockedClientInputs(record, config = loadLeadRescueOnboardingDeliveryConfig()) {
  const blocked = asStringArray(record?.blocked_inputs);
  const forbidden = asStringArray(config.forbidden_intake_fields);
  const reasons = [];
  for (const item of blocked) {
    reasons.push(item);
  }
  const intake = record?.intake && typeof record.intake === 'object' ? record.intake : {};
  for (const key of forbidden) {
    if (intake[key] != null && asTrimmedString(intake[key]) !== '') {
      reasons.push(`forbidden_field:${key}`);
    }
  }
  return reasons;
}

/**
 * Build cannot start without financial approval and complete required inputs.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {Record<string, unknown>} [config]
 * @returns {{ ok: true } | { ok: false, reason: string, missing?: string[], blocked?: string[] }}
 */
export function canStartBuild(record, config = loadLeadRescueOnboardingDeliveryConfig()) {
  const row = record && typeof record === 'object' ? record : {};
  if (row.financially_approved !== true) {
    return { ok: false, reason: 'MISSING_FINANCIAL_APPROVAL' };
  }

  const blocked = listBlockedClientInputs(row, config);
  if (blocked.length > 0) {
    return { ok: false, reason: 'BLOCKED_CLIENT_INPUTS', blocked };
  }

  const completeness = evaluateOnboardingCompleteness(row.intake, config);
  if (!completeness.complete) {
    return {
      ok: false,
      reason: 'MISSING_REQUIRED_CLIENT_INPUTS',
      missing: completeness.missing,
    };
  }

  return { ok: true };
}

/**
 * Messaging runtime is a separate protected gate from onboarding/delivery readiness.
 *
 * @param {Record<string, unknown> | null | undefined} record
 */
export function canUseMessagingRuntime(record) {
  const row = record && typeof record === 'object' ? record : {};
  if (row.messaging_runtime_authorized !== true) {
    return { ok: false, reason: 'MESSAGING_RUNTIME_NOT_AUTHORIZED' };
  }
  return { ok: true };
}

/**
 * @param {Record<string, unknown>} [config]
 * @returns {string[]}
 */
export function listDeliveryStates(config = loadLeadRescueOnboardingDeliveryConfig()) {
  return asStringArray(config.delivery_states);
}

/**
 * @param {Record<string, unknown>} [config]
 * @returns {Array<{ from: string, to: string }>}
 */
export function listDeliveryTransitions(config = loadLeadRescueOnboardingDeliveryConfig()) {
  const rows = Array.isArray(config.delivery_transitions) ? config.delivery_transitions : [];
  return rows
    .map((t) => ({
      from: asTrimmedString(t?.from),
      to: asTrimmedString(t?.to),
    }))
    .filter((t) => t.from && t.to);
}

/**
 * @param {string} from
 * @param {string} to
 * @param {Record<string, unknown>} [config]
 */
export function isAllowedDeliveryTransition(from, to, config = loadLeadRescueOnboardingDeliveryConfig()) {
  const a = asTrimmedString(from);
  const b = asTrimmedString(to);
  if (!a || !b) return false;
  return listDeliveryTransitions(config).some((t) => t.from === a && t.to === b);
}

/**
 * Apply a delivery-state transition with build-gate enforcement.
 *
 * Moving into `build_started` requires canStartBuild(record).ok.
 * Messaging runtime is never implied by delivery transitions.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {string} nextState
 * @param {Record<string, unknown>} [config]
 */
export function transitionDeliveryState(record, nextState, config = loadLeadRescueOnboardingDeliveryConfig()) {
  const row = record && typeof record === 'object' ? { ...record } : {};
  const current = asTrimmedString(row.delivery_state) || 'approved_to_onboard';
  const next = asTrimmedString(nextState);
  const states = new Set(listDeliveryStates(config));

  if (!states.has(next)) {
    return { ok: false, reason: 'UNKNOWN_DELIVERY_STATE', current, next };
  }
  if (!isAllowedDeliveryTransition(current, next, config)) {
    return { ok: false, reason: 'INVALID_TRANSITION', current, next };
  }

  if (next === 'build_started') {
    const gate = canStartBuild(row, config);
    if (!gate.ok) {
      return {
        ok: false,
        reason: 'BUILD_GATE_BLOCKED',
        current,
        next,
        gate,
      };
    }
  }

  if (next === 'onboarding_complete') {
    const completeness = evaluateOnboardingCompleteness(row.intake, config);
    if (!completeness.complete) {
      return {
        ok: false,
        reason: 'ONBOARDING_INCOMPLETE',
        current,
        next,
        missing: completeness.missing,
      };
    }
    const blocked = listBlockedClientInputs(row, config);
    if (blocked.length > 0) {
      return {
        ok: false,
        reason: 'BLOCKED_CLIENT_INPUTS',
        current,
        next,
        blocked,
      };
    }
  }

  row.delivery_state = next;
  return { ok: true, record: row, previous: current, next };
}

/**
 * Evidence packet presence for a given delivery state.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {string} packetId
 * @param {Record<string, unknown>} [config]
 */
export function evaluateEvidencePacket(record, packetId, config = loadLeadRescueOnboardingDeliveryConfig()) {
  const packets = Array.isArray(config.evidence_packets) ? config.evidence_packets : [];
  const packet = packets.find((p) => asTrimmedString(p?.id) === asTrimmedString(packetId));
  if (!packet) {
    return { ok: false, reason: 'UNKNOWN_EVIDENCE_PACKET', missing: [] };
  }
  const evidenceRoot =
    record?.evidence && typeof record.evidence === 'object' ? record.evidence : {};
  const body = evidenceRoot[packetId] && typeof evidenceRoot[packetId] === 'object'
    ? evidenceRoot[packetId]
    : {};
  const requiredFields = asStringArray(packet.fields);
  /** @type {string[]} */
  const missing = [];
  for (const field of requiredFields) {
    const value = body[field];
    if (Array.isArray(value)) {
      if (asStringArray(value).length === 0) missing.push(field);
    } else if (typeof value === 'boolean') {
      // boolean presence is enough
    } else if (asTrimmedString(value) === '') {
      missing.push(field);
    }
  }
  return {
    ok: missing.length === 0,
    packet_id: packetId,
    missing,
    required_fields: requiredFields,
  };
}

/**
 * Shared checklist tick evaluation (ids → boolean map on record.shared_checklist).
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {Record<string, unknown>} [config]
 */
export function evaluateSharedOnboardingChecklist(record, config = loadLeadRescueOnboardingDeliveryConfig()) {
  const items = Array.isArray(config.shared_onboarding_checklist)
    ? config.shared_onboarding_checklist
    : [];
  const ticks =
    record?.shared_checklist && typeof record.shared_checklist === 'object'
      ? record.shared_checklist
      : {};
  /** @type {string[]} */
  const missing = [];
  /** @type {string[]} */
  const done = [];
  for (const item of items) {
    if (!item?.required) continue;
    const id = asTrimmedString(item.id);
    if (!id) continue;
    if (ticks[id] === true) done.push(id);
    else missing.push(id);
  }
  return {
    complete: missing.length === 0,
    missing,
    done,
    total_required: done.length + missing.length,
  };
}

/**
 * Derive whether a synthetic onboarding record is ready for system-test exit
 * (acceptance_ready) with required evidence packets.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {Record<string, unknown>} [config]
 */
export function evaluateAcceptanceReady(record, config = loadLeadRescueOnboardingDeliveryConfig()) {
  const row = record && typeof record === 'object' ? record : {};
  if (asTrimmedString(row.delivery_state) !== 'acceptance_ready') {
    return { ok: false, reason: 'NOT_ACCEPTANCE_READY_STATE' };
  }
  const packetIds = asStringArray(
    (Array.isArray(config.evidence_packets) ? config.evidence_packets : []).map((p) => p?.id),
  );
  /** @type {Record<string, ReturnType<typeof evaluateEvidencePacket>>} */
  const packets = {};
  /** @type {string[]} */
  const incomplete = [];
  for (const id of packetIds) {
    const result = evaluateEvidencePacket(row, id, config);
    packets[id] = result;
    if (!result.ok) incomplete.push(id);
  }
  if (row.messaging_runtime_authorized === true && row.allow_real_client_sends === true) {
    return {
      ok: false,
      reason: 'REAL_MESSAGING_NOT_ALLOWED_IN_SYNTHETIC_PATH',
      packets,
    };
  }
  return {
    ok: incomplete.length === 0,
    reason: incomplete.length ? 'EVIDENCE_INCOMPLETE' : null,
    incomplete,
    packets,
  };
}

/**
 * Build a blank intake shell with defaults from config (for operators / tests).
 *
 * @param {Record<string, unknown>} [config]
 */
export function createEmptyLeadRescueIntake(config = loadLeadRescueOnboardingDeliveryConfig()) {
  /** @type {Record<string, unknown>} */
  const intake = {};
  for (const field of Array.isArray(config.lead_rescue_intake_fields) ? config.lead_rescue_intake_fields : []) {
    const id = asTrimmedString(field?.id);
    if (!id) continue;
    intake[id] = asTrimmedString(field.type) === 'string_array' ? [] : '';
  }
  if (Array.isArray(config.default_lead_stages)) {
    intake.lead_stages = [...config.default_lead_stages];
  }
  if (Array.isArray(config.default_client_responsibilities)) {
    intake.client_responsibilities = [...config.default_client_responsibilities];
  }
  if (Array.isArray(config.default_exclusions)) {
    intake.exclusions = [...config.default_exclusions];
  }
  if (Array.isArray(config.default_acceptance_measures)) {
    intake.acceptance_measures = [...config.default_acceptance_measures];
  }
  return intake;
}
