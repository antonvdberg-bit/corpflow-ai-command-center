/**
 * #716 — persist Website Rescue onboarding/delivery on existing prospect JSON.
 *
 * Stored at qualification_json.website_rescue_delivery. financially_approved is
 * read from #551 / #714 commercial_approval and is never trusted from the client.
 * No schema, no DNS/deploy, no credential storage, no client send.
 */

import { RAPID_DELIVERY_PRODUCT } from '../cmp/_lib/rapid-delivery-operator.js';
import { detectProspectProduct } from '../cmp/_lib/prospect-operations-view-model.js';
import {
  evaluateFinancialApprovalGate,
} from '../revenue/commercial-approval.js';
import { readCommercialApprovalFromQualification } from '../revenue/commercial-approval-record.js';
import {
  canStartBuild,
  createEmptyWebsiteRescueIntake,
  evaluateEvidencePacket,
  evaluateOnboardingCompleteness,
  evaluateSharedOnboardingChecklist,
  isAllowedDeliveryTransition,
  listDeliveryStates,
  listDeliveryTransitions,
  loadWebsiteRescueOnboardingDeliveryConfig,
  transitionDeliveryState,
} from './onboarding-delivery.js';

export const WEBSITE_RESCUE_DELIVERY_NAMESPACE = 'website_rescue_delivery';
export const WEBSITE_RESCUE_DELIVERY_ISSUE = 716;

const FORBIDDEN_KEY =
  /password|secret|token|otp|ssh[_-]?key|private[_-]?key|api[_-]?key|card[_-]?number|cvv|cvc|iban|account[_-]?number|authorization|pin$/i;

const PROTECTED_DELIVERY_FLAGS = Object.freeze([
  'deploy',
  'real_dns_cutover_executed',
  'real_client_production_deploy',
  'dns_cutover_executed',
  'client_production_deploy',
  'send',
  'external_send',
  'email_send',
  'whatsapp_send',
  'sms_send',
  'payment_execute',
  'collect_payment',
]);

const GATE_NEXT = Object.freeze({
  MISSING_FINANCIAL_APPROVAL: 'Record commercial clearance first (quote, acceptance, payment evidence).',
  MISSING_REQUIRED_CLIENT_INPUTS: 'Complete the Website Rescue intake fields.',
  MISSING_CONTENT_OR_ASSETS: 'Confirm brand/content assets are ready (flag only — no file upload here).',
  MISSING_APPROVED_ACCESS: 'Confirm access via an approved secret channel (do not paste credentials).',
  BLOCKED_CLIENT_INPUTS: 'Remove blocked or forbidden fields before build.',
  DEPLOY_APPROVAL_NOT_SIMULATED: 'Record simulated deploy approval. Real deploy stays Anton-protected.',
  DNS_CUTOVER_NOT_AUTHORIZED: 'Record simulated DNS authorization if cutover is in scope. Real DNS stays Anton-protected.',
  ONBOARDING_INCOMPLETE: 'Finish required intake before marking onboarding complete.',
  BUILD_GATE_BLOCKED: 'Build cannot start until financial approval, intake, assets and access are ready.',
  CUTOVER_GATE_BLOCKED: 'Cutover stays simulated until the matching approval flag is recorded.',
  INVALID_TRANSITION: 'Choose the next allowed delivery state.',
});

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
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {unknown} v
 * @returns {string[]}
 */
function asStringArray(v) {
  if (Array.isArray(v)) return v.map((item) => asTrimmedString(item)).filter(Boolean);
  if (typeof v === 'string') {
    return v
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
function asBool(v) {
  if (v === true || v === 'true' || v === '1' || v === 1) return true;
  return false;
}

/**
 * @param {unknown} node
 * @param {string[]} [found]
 * @returns {string[]}
 */
function collectForbiddenKeys(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    for (const item of node) collectForbiddenKeys(item, found);
    return found;
  }
  for (const [key, value] of Object.entries(node)) {
    if (FORBIDDEN_KEY.test(key)) found.push(key);
    collectForbiddenKeys(value, found);
  }
  return found;
}

/**
 * @param {unknown} product
 * @returns {boolean}
 */
export function isWebsiteRescueDeliveryProduct(product) {
  const raw = asTrimmedString(product);
  return raw === RAPID_DELIVERY_PRODUCT || raw === 'website-rescue' || raw === 'corpflow-rapid-delivery';
}

/**
 * @param {unknown} patch
 * @returns {{ ok: true } | { ok: false, error: string, http_status: number }}
 */
export function assertWebsiteRescueDeliveryPatchSafe(patch) {
  if (patch == null) return { ok: true };
  if (typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, error: 'invalid_website_rescue_delivery', http_status: 400 };
  }
  const row = /** @type {Record<string, unknown>} */ (patch);
  for (const flag of PROTECTED_DELIVERY_FLAGS) {
    if (row[flag] === true) {
      return { ok: false, error: 'PROTECTED_ACTION_BLOCKED', http_status: 403 };
    }
  }
  const forbidden = collectForbiddenKeys(row);
  if (forbidden.length > 0) {
    return { ok: false, error: 'FORBIDDEN_SENSITIVE_FIELD', http_status: 400 };
  }
  return { ok: true };
}

/**
 * @param {unknown} qualificationJson
 * @returns {Record<string, unknown> | null}
 */
export function readWebsiteRescueDeliveryFromQualification(qualificationJson) {
  const qj = asObj(qualificationJson);
  const row = qj[WEBSITE_RESCUE_DELIVERY_NAMESPACE];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  return /** @type {Record<string, unknown>} */ (row);
}

/**
 * @param {unknown} existing
 * @param {{
 *   organisationName?: string,
 *   personName?: string,
 *   email?: string,
 *   phone?: string,
 *   website?: string,
 * }} [seed]
 */
export function createEmptyWebsiteRescueDeliveryRecord(existing, seed = {}) {
  const config = loadWebsiteRescueOnboardingDeliveryConfig();
  const base = existing && typeof existing === 'object' ? { ...existing } : {};
  const intake = {
    ...createEmptyWebsiteRescueIntake(asTrimmedString(asObj(base.intake).case_type) || 'one_page', config),
    ...asObj(base.intake),
  };
  if (!asTrimmedString(intake.business_display_name) && seed.organisationName) {
    intake.business_display_name = seed.organisationName;
  }
  if (!asTrimmedString(intake.primary_contact_name) && seed.personName) {
    intake.primary_contact_name = seed.personName;
  }
  if (!asTrimmedString(intake.working_email) && seed.email) intake.working_email = seed.email;
  if (!asTrimmedString(intake.working_phone) && seed.phone) intake.working_phone = seed.phone;
  if (!asTrimmedString(intake.current_site_url) && seed.website) intake.current_site_url = seed.website;

  return {
    schema: 'corpflow.website_rescue_delivery.v1',
    issue: WEBSITE_RESCUE_DELIVERY_ISSUE,
    product: 'website-rescue',
    delivery_state: asTrimmedString(base.delivery_state) || 'approved_to_onboard',
    financially_approved: false,
    content_assets_ready: base.content_assets_ready === true,
    approved_access_confirmed: base.approved_access_confirmed === true,
    dns_cutover_in_scope: base.dns_cutover_in_scope === true,
    deploy_approval_simulated: base.deploy_approval_simulated === true,
    dns_cutover_authorized_simulated: base.dns_cutover_authorized_simulated === true,
    real_dns_cutover_executed: false,
    real_client_production_deploy: false,
    blocked_inputs: asStringArray(base.blocked_inputs),
    intake,
    shared_checklist: asObj(base.shared_checklist),
    evidence: asObj(base.evidence),
    updated_at: asTrimmedString(base.updated_at) || '',
    updated_by: asTrimmedString(base.updated_by) || '',
    protected_actions_executed: false,
  };
}

/**
 * @param {unknown} qualificationJson
 * @returns {boolean}
 */
export function resolveFinanciallyApprovedFromQualification(qualificationJson) {
  const commercial = readCommercialApprovalFromQualification(qualificationJson);
  if (!commercial) return false;
  return evaluateFinancialApprovalGate(commercial).ok === true;
}

/**
 * @param {Record<string, unknown> | null | undefined} existing
 * @param {Record<string, unknown>} patch
 * @param {{
 *   actorLabel?: string,
 *   nowIso?: string,
 *   prospectId?: string,
 *   financiallyApproved?: boolean,
 *   organisationName?: string,
 *   personName?: string,
 *   email?: string,
 *   phone?: string,
 *   website?: string,
 * }} [opts]
 */
export function applyWebsiteRescueDeliveryPatch(existing, patch, opts = {}) {
  const config = loadWebsiteRescueOnboardingDeliveryConfig();
  const nowIso = asTrimmedString(opts.nowIso) || new Date().toISOString();
  const actorLabel = asTrimmedString(opts.actorLabel) || 'operator';
  const incoming = asObj(patch);
  const record = createEmptyWebsiteRescueDeliveryRecord(existing, opts);

  record.financially_approved = opts.financiallyApproved === true;
  record.intake = mergeIntake(record.intake, incoming.intake != null ? incoming.intake : incoming, config);
  record.shared_checklist = mergeChecklist(record.shared_checklist, incoming.shared_checklist);
  record.evidence = mergeEvidence(record.evidence, incoming.evidence);

  if (incoming.content_assets_ready !== undefined) {
    record.content_assets_ready = asBool(incoming.content_assets_ready);
  }
  if (incoming.approved_access_confirmed !== undefined) {
    record.approved_access_confirmed = asBool(incoming.approved_access_confirmed);
  }
  if (incoming.dns_cutover_in_scope !== undefined) {
    record.dns_cutover_in_scope = asBool(incoming.dns_cutover_in_scope);
  }
  if (incoming.deploy_approval_simulated !== undefined) {
    record.deploy_approval_simulated = asBool(incoming.deploy_approval_simulated);
  }
  if (incoming.dns_cutover_authorized_simulated !== undefined) {
    record.dns_cutover_authorized_simulated = asBool(incoming.dns_cutover_authorized_simulated);
  }

  record.real_dns_cutover_executed = false;
  record.real_client_production_deploy = false;
  record.protected_actions_executed = false;
  record.updated_at = nowIso;
  record.updated_by = actorLabel;
  record.issue = WEBSITE_RESCUE_DELIVERY_ISSUE;
  if (opts.prospectId) record.prospect_ref = asTrimmedString(opts.prospectId);

  const requestedState = asTrimmedString(incoming.requested_delivery_state || incoming.delivery_state);
  if (requestedState && requestedState !== asTrimmedString(record.delivery_state)) {
    const moved = transitionDeliveryState(record, requestedState, config);
    if (!moved.ok) {
      return {
        ok: false,
        error: moved.reason || 'INVALID_TRANSITION',
        http_status: 400,
        gate: moved.gate || null,
        missing: moved.missing || null,
        current: moved.current || record.delivery_state,
        next: requestedState,
      };
    }
    return { ok: true, record: moved.record };
  }

  return { ok: true, record };
}

/**
 * @param {Record<string, unknown>} existing
 * @param {unknown} incoming
 * @param {Record<string, unknown>} config
 */
function mergeIntake(existing, incoming, config) {
  const current = asObj(existing);
  const patch = asObj(incoming);
  const fields = Array.isArray(config.website_rescue_intake_fields) ? config.website_rescue_intake_fields : [];
  /** @type {Record<string, unknown>} */
  const out = { ...current };
  for (const field of fields) {
    const id = asTrimmedString(field?.id);
    if (!id || patch[id] === undefined) continue;
    const type = asTrimmedString(field.type) || 'string';
    out[id] = type === 'string_array' ? asStringArray(patch[id]) : asTrimmedString(patch[id]);
  }
  return out;
}

/**
 * @param {Record<string, unknown>} existing
 * @param {unknown} incoming
 */
function mergeChecklist(existing, incoming) {
  const current = asObj(existing);
  const patch = asObj(incoming);
  /** @type {Record<string, unknown>} */
  const out = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (FORBIDDEN_KEY.test(key)) continue;
    out[key] = asBool(value);
  }
  return out;
}

/**
 * @param {Record<string, unknown>} existing
 * @param {unknown} incoming
 */
function mergeEvidence(existing, incoming) {
  const current = asObj(existing);
  const patch = asObj(incoming);
  /** @type {Record<string, unknown>} */
  const out = { ...current };
  for (const [packetId, body] of Object.entries(patch)) {
    if (FORBIDDEN_KEY.test(packetId)) continue;
    const prev = asObj(out[packetId]);
    const next = asObj(body);
    /** @type {Record<string, unknown>} */
    const merged = { ...prev };
    for (const [field, value] of Object.entries(next)) {
      if (FORBIDDEN_KEY.test(field)) continue;
      if (typeof value === 'boolean') merged[field] = value;
      else if (Array.isArray(value)) merged[field] = asStringArray(value);
      else merged[field] = asTrimmedString(value);
    }
    out[packetId] = merged;
  }
  return out;
}

/**
 * @param {unknown} qualificationJson
 * @param {unknown} patch
 * @param {{
 *   actorLabel?: string,
 *   nowIso?: string,
 *   prospectId?: string,
 *   organisationName?: string,
 *   personName?: string,
 *   email?: string,
 *   phone?: string,
 *   website?: string,
 * }} [opts]
 */
export function mergeWebsiteRescueDeliveryIntoQualification(qualificationJson, patch, opts = {}) {
  const safety = assertWebsiteRescueDeliveryPatchSafe(patch);
  if (!safety.ok) return safety;
  const qj = asObj(qualificationJson);
  const existing = readWebsiteRescueDeliveryFromQualification(qj);
  const applied = applyWebsiteRescueDeliveryPatch(existing, asObj(patch), {
    ...opts,
    financiallyApproved: resolveFinanciallyApprovedFromQualification(qj),
  });
  if (!applied.ok) return applied;
  return {
    ok: true,
    qualificationJson: {
      ...qj,
      [WEBSITE_RESCUE_DELIVERY_NAMESPACE]: applied.record,
    },
    record: applied.record,
  };
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} [config]
 */
function allowedNextStates(record, config = loadWebsiteRescueOnboardingDeliveryConfig()) {
  const current = asTrimmedString(record.delivery_state) || 'approved_to_onboard';
  return listDeliveryTransitions(config)
    .filter((row) => row.from === current)
    .map((row) => {
      const probe = transitionDeliveryState(record, row.to, config);
      return {
        state: row.to,
        allowed: probe.ok === true,
        block_reason: probe.ok ? null : probe.reason || 'INVALID_TRANSITION',
      };
    });
}

/**
 * Operator-facing delivery projection. Never includes credentials or raw JSON.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {{
 *   financiallyApproved?: boolean,
 *   commerciallyCleared?: boolean,
 * }} [opts]
 */
export function projectWebsiteRescueDelivery(record, opts = {}) {
  const config = loadWebsiteRescueOnboardingDeliveryConfig();
  const financiallyApproved = opts.financiallyApproved === true;
  const row = createEmptyWebsiteRescueDeliveryRecord(record);
  row.financially_approved = financiallyApproved;
  const completeness = evaluateOnboardingCompleteness(row.intake, config);
  const checklist = evaluateSharedOnboardingChecklist(row, config);
  const buildGate = canStartBuild(row, config);
  const nextStates = allowedNextStates(row, config);
  const packets = Array.isArray(config.evidence_packets) ? config.evidence_packets : [];
  /** @type {Record<string, { ok: boolean, missing: string[] }>} */
  const evidence = {};
  for (const packet of packets) {
    const id = asTrimmedString(packet?.id);
    if (!id) continue;
    const evaluated = evaluateEvidencePacket(row, id, config);
    evidence[id] = { ok: evaluated.ok === true, missing: evaluated.missing || [] };
  }

  /** @type {string[]} */
  const blockers = [];
  if (!financiallyApproved) blockers.push('MISSING_FINANCIAL_APPROVAL');
  if (!completeness.complete) blockers.push('MISSING_REQUIRED_CLIENT_INPUTS');
  if (row.content_assets_ready !== true) blockers.push('MISSING_CONTENT_OR_ASSETS');
  if (row.approved_access_confirmed !== true) blockers.push('MISSING_APPROVED_ACCESS');
  if (!buildGate.ok && buildGate.reason && !blockers.includes(buildGate.reason)) {
    blockers.push(buildGate.reason);
  }

  const nextRequired = blockers.map((code) => GATE_NEXT[code] || code).filter(Boolean);

  return {
    schema: 'corpflow.website_rescue_delivery.v1',
    issue: WEBSITE_RESCUE_DELIVERY_ISSUE,
    applicable: true,
    product: 'website-rescue',
    recorded: Boolean(record && typeof record === 'object'),
    commercially_cleared: opts.commerciallyCleared === true || financiallyApproved,
    financially_approved: financiallyApproved,
    delivery_state: asTrimmedString(row.delivery_state) || 'approved_to_onboard',
    can_start_build: buildGate.ok === true,
    build_gate_reason: buildGate.ok ? null : buildGate.reason || null,
    intake_complete: completeness.complete,
    intake_missing: completeness.missing,
    checklist_complete: checklist.complete,
    checklist_missing: checklist.missing,
    content_assets_ready: row.content_assets_ready === true,
    approved_access_confirmed: row.approved_access_confirmed === true,
    dns_cutover_in_scope: row.dns_cutover_in_scope === true,
    deploy_approval_simulated: row.deploy_approval_simulated === true,
    dns_cutover_authorized_simulated: row.dns_cutover_authorized_simulated === true,
    real_dns_cutover_executed: false,
    real_client_production_deploy: false,
    blockers,
    next_required: nextRequired[0] || (buildGate.ok ? 'Advance the next delivery state and record evidence.' : 'Complete onboarding gates.'),
    allowed_next_states: nextStates,
    intake: row.intake,
    shared_checklist: row.shared_checklist,
    evidence_packets: evidence,
    evidence: row.evidence,
    vocab: {
      case_types: Array.isArray(config.case_types) ? config.case_types : [],
      tiers: Array.isArray(config.tiers) ? config.tiers : [],
      delivery_states: listDeliveryStates(config),
      brand_assets_statuses: ['provided', 'wordmark_ok', 'stock_direction', 'pending'],
      shared_checklist: Array.isArray(config.shared_onboarding_checklist)
        ? config.shared_onboarding_checklist
        : [],
    },
    protected_actions_executed: false,
  };
}

/**
 * @param {unknown} qualificationJson
 * @param {{ product?: string }} [opts]
 */
export function projectWebsiteRescueDeliveryFromQualification(qualificationJson, opts = {}) {
  const product = opts.product || detectProspectProduct(qualificationJson);
  if (!isWebsiteRescueDeliveryProduct(product)) return null;
  const qj = asObj(qualificationJson);
  const intakeMeta = asObj(qj.intake_meta);
  const financiallyApproved = resolveFinanciallyApprovedFromQualification(qj);
  const existing = readWebsiteRescueDeliveryFromQualification(qj);
  const seeded = createEmptyWebsiteRescueDeliveryRecord(existing, {
    organisationName: asTrimmedString(intakeMeta.business_name),
    personName: asTrimmedString(intakeMeta.contact_name),
    email: asTrimmedString(intakeMeta.email),
    phone: asTrimmedString(intakeMeta.phone),
    website: asTrimmedString(intakeMeta.website),
  });
  const projected = projectWebsiteRescueDelivery(seeded, {
    financiallyApproved,
    commerciallyCleared: financiallyApproved,
  });
  projected.recorded = Boolean(existing);
  return projected;
}
