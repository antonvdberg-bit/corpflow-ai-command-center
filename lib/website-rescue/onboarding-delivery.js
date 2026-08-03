/**
 * Website Rescue onboarding + delivery readiness (#716 / WS5).
 *
 * Pure process contract: completeness checks, delivery-state transitions,
 * build-start gate (financial approval + content/assets + approved access),
 * and simulated deploy / DNS cutover gates.
 *
 * No DB writes, no DNS action, no credential storage, no schema/env changes.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/website-rescue-onboarding-delivery.v1.json';

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

/**
 * @returns {Record<string, unknown>}
 */
export function loadWebsiteRescueOnboardingDeliveryConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const raw = readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8');
  const parsed = JSON.parse(raw);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

/** Reset cache (tests). */
export function resetWebsiteRescueOnboardingDeliveryConfigCache() {
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
export function evaluateOnboardingCompleteness(intake, config = loadWebsiteRescueOnboardingDeliveryConfig()) {
  const fields = Array.isArray(config.website_rescue_intake_fields)
    ? config.website_rescue_intake_fields
    : [];
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
    } else if (type === 'enum') {
      const allowed = asStringArray(field.enum_values);
      const v = asTrimmedString(value);
      ok = v.length > 0 && allowed.includes(v);
    } else {
      ok = asTrimmedString(value).length > 0;
    }

    if (ok) present.push(id);
    else missing.push(id);
  }

  const caseType = asTrimmedString(src.case_type);
  const brandStatus = asTrimmedString(src.brand_assets_status).toLowerCase();
  if (caseType && brandStatus === 'pending') {
    missing.push('brand_assets_status_pending');
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
export function listBlockedClientInputs(record, config = loadWebsiteRescueOnboardingDeliveryConfig()) {
  const blocked = asStringArray(record?.blocked_inputs);
  const forbidden = asStringArray(config.forbidden_intake_fields);
  /** @type {string[]} */
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
 * Build cannot start without financial approval, complete intake,
 * content/assets ready, and approved-access confirmation.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {Record<string, unknown>} [config]
 * @returns {{ ok: true } | { ok: false, reason: string, missing?: string[], blocked?: string[] }}
 */
export function canStartBuild(record, config = loadWebsiteRescueOnboardingDeliveryConfig()) {
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

  if (row.content_assets_ready !== true) {
    return { ok: false, reason: 'MISSING_CONTENT_OR_ASSETS' };
  }

  if (row.approved_access_confirmed !== true) {
    return { ok: false, reason: 'MISSING_APPROVED_ACCESS' };
  }

  return { ok: true };
}

/**
 * Deploy approval is a separate simulated gate (real deploy remains Anton-protected).
 *
 * @param {Record<string, unknown> | null | undefined} record
 */
export function canSimulateDeployApproval(record) {
  const row = record && typeof record === 'object' ? record : {};
  if (row.deploy_approval_simulated !== true) {
    return { ok: false, reason: 'DEPLOY_APPROVAL_NOT_SIMULATED' };
  }
  return { ok: true };
}

/**
 * DNS/cutover progression: if cutover is in scope, requires simulated authorization.
 * If not in scope, progression is allowed with simulation_only evidence.
 *
 * @param {Record<string, unknown> | null | undefined} record
 */
export function canSimulateDnsCutover(record) {
  const row = record && typeof record === 'object' ? record : {};
  if (row.dns_cutover_in_scope === true) {
    if (row.dns_cutover_authorized_simulated !== true) {
      return { ok: false, reason: 'DNS_CUTOVER_NOT_AUTHORIZED' };
    }
  }
  return { ok: true };
}

/**
 * @param {Record<string, unknown>} [config]
 * @returns {string[]}
 */
export function listDeliveryStates(config = loadWebsiteRescueOnboardingDeliveryConfig()) {
  return asStringArray(config.delivery_states);
}

/**
 * @param {Record<string, unknown>} [config]
 * @returns {Array<{ from: string, to: string }>}
 */
export function listDeliveryTransitions(config = loadWebsiteRescueOnboardingDeliveryConfig()) {
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
export function isAllowedDeliveryTransition(from, to, config = loadWebsiteRescueOnboardingDeliveryConfig()) {
  const a = asTrimmedString(from);
  const b = asTrimmedString(to);
  if (!a || !b) return false;
  return listDeliveryTransitions(config).some((t) => t.from === a && t.to === b);
}

/**
 * Apply a delivery-state transition with build and cutover gate enforcement.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {string} nextState
 * @param {Record<string, unknown>} [config]
 */
export function transitionDeliveryState(record, nextState, config = loadWebsiteRescueOnboardingDeliveryConfig()) {
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

  if (next === 'deploy_approved_simulated') {
    const gate = canSimulateDeployApproval(row);
    if (!gate.ok) {
      return {
        ok: false,
        reason: 'CUTOVER_GATE_BLOCKED',
        current,
        next,
        gate,
      };
    }
  }

  if (next === 'live_validation_simulated') {
    const gate = canSimulateDnsCutover(row);
    if (!gate.ok) {
      return {
        ok: false,
        reason: 'CUTOVER_GATE_BLOCKED',
        current,
        next,
        gate,
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
export function evaluateEvidencePacket(record, packetId, config = loadWebsiteRescueOnboardingDeliveryConfig()) {
  const packets = Array.isArray(config.evidence_packets) ? config.evidence_packets : [];
  const packet = packets.find((p) => asTrimmedString(p?.id) === asTrimmedString(packetId));
  if (!packet) {
    return { ok: false, reason: 'UNKNOWN_EVIDENCE_PACKET', missing: [] };
  }
  const evidenceRoot =
    record?.evidence && typeof record.evidence === 'object' ? record.evidence : {};
  const body =
    evidenceRoot[packetId] && typeof evidenceRoot[packetId] === 'object'
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
export function evaluateSharedOnboardingChecklist(record, config = loadWebsiteRescueOnboardingDeliveryConfig()) {
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
export function evaluateAcceptanceReady(record, config = loadWebsiteRescueOnboardingDeliveryConfig()) {
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

  // Real cutover must never be claimed by the synthetic path.
  if (row.real_dns_cutover_executed === true || row.real_client_production_deploy === true) {
    return {
      ok: false,
      reason: 'REAL_CUTOVER_NOT_ALLOWED_IN_SYNTHETIC_PATH',
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
 * @param {string} [caseType]
 * @param {Record<string, unknown>} [config]
 */
export function createEmptyWebsiteRescueIntake(caseType = 'one_page', config = loadWebsiteRescueOnboardingDeliveryConfig()) {
  /** @type {Record<string, unknown>} */
  const intake = {};
  for (const field of Array.isArray(config.website_rescue_intake_fields)
    ? config.website_rescue_intake_fields
    : []) {
    const id = asTrimmedString(field?.id);
    if (!id) continue;
    const type = asTrimmedString(field.type);
    if (type === 'string_array') intake[id] = [];
    else if (type === 'enum') intake[id] = '';
    else intake[id] = '';
  }

  const ct = asTrimmedString(caseType);
  const pagesByType =
    config.default_pages_by_case_type && typeof config.default_pages_by_case_type === 'object'
      ? config.default_pages_by_case_type
      : {};
  if (ct && Array.isArray(pagesByType[ct])) {
    intake.case_type = ct;
    intake.pages_in_scope = [...pagesByType[ct]];
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
  if (asTrimmedString(config.default_maintenance_boundary)) {
    intake.maintenance_boundary = asTrimmedString(config.default_maintenance_boundary);
  }
  return intake;
}

/**
 * @param {Record<string, unknown>} [config]
 * @returns {string[]}
 */
export function listCaseTypes(config = loadWebsiteRescueOnboardingDeliveryConfig()) {
  return asStringArray(config.case_types);
}
