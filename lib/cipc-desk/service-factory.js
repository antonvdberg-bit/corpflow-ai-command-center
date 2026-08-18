/**
 * CIPC Desk service-factory readiness overlay — #988.
 *
 * Pure mapping over existing cmp_tickets / console_json / email-intake /
 * optional leads rows. No Prisma schema changes. No CIPC submit. No payment.
 * No live email / WhatsApp / SMS. No second production data model.
 *
 * @see docs/operations/CIPC_SERVICE_FACTORY_READINESS_V1.md
 * @see config/cipc-service-factory.v1.json
 */

import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);

/** @type {Record<string, unknown>} */
const FACTORY_CONFIG = _require('../../config/cipc-service-factory.v1.json');

export const CIPC_SERVICE_FACTORY_VERSION = 'cipc-service-factory-v1';
export { FACTORY_CONFIG };

export const CIPC_SERVICE_FACTORY_STATES = Object.freeze([
  'qualified_lead',
  'scoped_service',
  'mandate',
  'structured_intake',
  'document_completeness',
  'prerequisite_checks',
  'information_incomplete',
  'exception_classified',
  'specialist_gate',
  'ready_to_file',
  'submitted_externally',
  'awaiting_cipc',
  'proof_capture',
  'client_status_update',
  'completed',
  'renewal_reminder',
  'further_action_required',
]);

export const CIPC_LAYER5_STATUSES = Object.freeze([
  'received',
  'information_incomplete',
  'specialist_review',
  'ready_for_submission',
  'awaiting_otp',
  'submitted_externally',
  'awaiting_cipc',
  'completed',
  'further_action_required',
]);

export const CIPC_FIRST_SERVICE_IDS = Object.freeze([
  'annual_returns',
  'director_changes',
  'beneficial_ownership',
]);

const SENSITIVE_EVIDENCE_RE =
  /(identity_document_image|passport_image|certified_id_bytes|live_customer_code_secret|real_client_personal_data|id[-_ ]?(book|card|scan)|passport[-_ ]?(scan|image))/i;

const SENSITIVE_PAYLOAD_RE =
  /(-----BEGIN|data:image\/|passport number|id number\s*\d{6,}|rsa id\s*\d{13})/i;

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v) {
  return v == null ? '' : String(v).trim();
}

/**
 * @param {unknown} v
 * @returns {unknown[]}
 */
function asArr(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * @returns {Record<string, unknown>}
 */
export function getCipcServiceFactoryPurpose() {
  return {
    version: CIPC_SERVICE_FACTORY_VERSION,
    issue: FACTORY_CONFIG.$issue,
    tenant_id: FACTORY_CONFIG.tenant_id,
    environment: FACTORY_CONFIG.environment,
    public_launch: FACTORY_CONFIG.public_launch,
    schema_change: FACTORY_CONFIG.$schema_change,
    send: FACTORY_CONFIG.$send,
    reuse: FACTORY_CONFIG.$reuse,
  };
}

/**
 * @returns {string[]}
 */
export function listCipcServiceIds() {
  return [...CIPC_FIRST_SERVICE_IDS];
}

/**
 * @param {string} serviceId
 * @returns {Record<string, unknown> | null}
 */
export function getCipcServiceTemplate(serviceId) {
  const services = asObj(FACTORY_CONFIG.services);
  const row = asObj(services[serviceId]);
  if (!row.service_id) return null;
  return {
    ...row,
    human_gates: asArr(FACTORY_CONFIG.human_gates),
    deterministic_moves: asArr(FACTORY_CONFIG.deterministic_moves),
    protected_transitions: asArr(FACTORY_CONFIG.protected_transitions),
    evidence_kinds_allowed: asArr(FACTORY_CONFIG.evidence_kinds_allowed),
    evidence_forbidden_in_repo: asArr(FACTORY_CONFIG.evidence_forbidden_in_repo),
  };
}

/**
 * @returns {Record<string, unknown>[]}
 */
export function listCipcServiceTemplates() {
  return CIPC_FIRST_SERVICE_IDS.map((id) => getCipcServiceTemplate(id)).filter(Boolean);
}

/**
 * Normalize email-intake slugs and prose cues onto the three first services.
 *
 * @param {unknown} slugOrCue
 * @returns {string | null}
 */
export function resolveCipcServiceId(slugOrCue) {
  const raw = str(slugOrCue).toLowerCase();
  if (!raw) return null;
  if (raw === 'annual_returns' || raw === 'annual-returns' || /annual\s*returns?/.test(raw)) {
    return 'annual_returns';
  }
  if (
    raw === 'director_changes' ||
    raw === 'director-changes' ||
    raw === 'director-appointments-resignations' ||
    /director/.test(raw)
  ) {
    return 'director_changes';
  }
  if (
    raw === 'beneficial_ownership' ||
    raw === 'beneficial-ownership' ||
    raw === 'beneficial-ownership-submissions' ||
    /beneficial\s*owner|ubo\b/.test(raw)
  ) {
    return 'beneficial_ownership';
  }
  return null;
}

/**
 * Map a factory state onto the existing Layer 5 operator status language.
 *
 * @param {string} factoryState
 * @returns {string}
 */
export function mapFactoryStateToLayer5(factoryState) {
  switch (factoryState) {
    case 'qualified_lead':
    case 'scoped_service':
    case 'structured_intake':
      return 'received';
    case 'mandate':
    case 'document_completeness':
    case 'prerequisite_checks':
    case 'information_incomplete':
      return 'information_incomplete';
    case 'exception_classified':
    case 'specialist_gate':
      return 'specialist_review';
    case 'ready_to_file':
      return 'ready_for_submission';
    case 'submitted_externally':
      return 'submitted_externally';
    case 'awaiting_cipc':
    case 'proof_capture':
      return 'awaiting_cipc';
    case 'client_status_update':
      return 'submitted_externally';
    case 'completed':
    case 'renewal_reminder':
      return 'completed';
    case 'further_action_required':
      return 'further_action_required';
    default:
      return 'received';
  }
}

/**
 * @param {unknown} matter
 * @returns {Record<string, unknown>}
 */
export function readCipcDeskOverlay(matter) {
  const row = asObj(matter);
  const consoleJson = asObj(row.console_json || row.consoleJson);
  const brief = asObj(row.brief && typeof row.brief === 'object' ? row.brief : consoleJson.brief);
  const clientView = asObj(row.client_view || consoleJson.client_view);
  const cipc = asObj(row.cipc_desk || clientView.cipc_desk);
  return { row, consoleJson, brief, clientView, cipc };
}

/**
 * @param {unknown} matter
 * @returns {string | null}
 */
export function resolveMatterServiceId(matter) {
  const { row, brief, cipc } = readCipcDeskOverlay(matter);
  return (
    resolveCipcServiceId(cipc.service_id) ||
    resolveCipcServiceId(brief.service) ||
    resolveCipcServiceId(row.service) ||
    resolveCipcServiceId(row.service_id) ||
    null
  );
}

/**
 * @param {unknown} matter
 * @returns {string[]}
 */
export function classifyCipcExceptions(matter) {
  const { row, cipc } = readCipcDeskOverlay(matter);
  const serviceId = resolveMatterServiceId(matter);
  /** @type {string[]} */
  const flags = [];
  const declared = asArr(cipc.exceptions || row.exceptions).map((x) => str(x)).filter(Boolean);
  for (const flag of declared) flags.push(flag);

  const entityType = str(cipc.entity_type || row.entity_type).toLowerCase();
  if (entityType && entityType !== 'pty_ltd' && entityType !== 'cc') {
    flags.push('entity_outside_v1_scope');
  }

  const scenario = str(cipc.scenario || row.scenario).toLowerCase();
  if (serviceId === 'director_changes') {
    if (scenario === 'death' || scenario === 'removal' || scenario === 'contested') {
      flags.push('director_death_or_removal');
    }
    if (cipc.would_leave_zero_directors === true) flags.push('zero_directors_after_change');
  }

  const ownership = asObj(cipc.ownership_flags || row.ownership_flags);
  if (serviceId === 'beneficial_ownership') {
    if (
      ownership.trust === true ||
      ownership.juristic === true ||
      ownership.layered === true ||
      ownership.foreign === true ||
      ownership.unclear_control === true ||
      ownership.affected === true
    ) {
      flags.push('complex_beneficial_ownership');
    }
  }

  if (cipc.historic_discrepancy === true || row.historic_discrepancy === true) {
    flags.push('historic_registry_discrepancy');
  }
  if (cipc.restoration_or_deregistration === true) flags.push('restoration_deregistration_moi_share_restructure');
  if (cipc.statutory_interpretation === true) flags.push('statutory_legal_interpretation');
  if (cipc.accounting_judgment === true) flags.push('financial_accounting_judgment');
  if (cipc.false_or_unverifiable === true) flags.push('suspected_false_information');
  if (cipc.mandate_ambiguous === true) flags.push('ambiguous_mandate_acceptance');

  return [...new Set(flags)];
}

/**
 * @param {unknown} matter
 * @returns {string[]}
 */
export function listMissingIntakeItems(matter) {
  const { brief, cipc } = readCipcDeskOverlay(matter);
  const serviceId = resolveMatterServiceId(matter);
  /** @type {string[]} */
  const missing = [];
  if (!serviceId) missing.push('scoped_service');
  if (!str(cipc.entity_key || cipc.enterprise_number)) missing.push('enterprise_number');
  if (!str(cipc.entity_type)) missing.push('entity_type');
  if (cipc.mandate_signed !== true) missing.push('signed_mandate');

  const checklist = asObj(cipc.checklist);
  const items = asArr(checklist.items);
  for (const item of items) {
    const row = asObj(item);
    const status = str(row.status).toLowerCase();
    if (status && status !== 'done' && status !== 'complete' && status !== 'na' && status !== 'n/a') {
      missing.push(`checklist:${str(row.key || row.label) || 'item'}`);
    }
  }

  const declaredMissing = asArr(brief.missing_information || cipc.missing_information);
  for (const item of declaredMissing) {
    const text = str(item);
    if (text) missing.push(`intake:${text}`);
  }

  if (serviceId === 'annual_returns') {
    const prereq = asObj(cipc.prerequisites);
    if (!str(cipc.turnover) && prereq.turnover_captured !== true) missing.push('turnover');
    if (prereq.bo !== 'satisfied' && prereq.bo !== 'referred_or_separately_engaged') {
      missing.push('bo_prerequisite');
    }
    if (prereq.afs_fas !== 'satisfied' && prereq.afs_fas !== 'referred_or_separately_engaged') {
      missing.push('afs_fas_prerequisite');
    }
  }

  if (serviceId === 'director_changes') {
    if (!str(cipc.scenario)) missing.push('director_scenario');
  }

  if (serviceId === 'beneficial_ownership') {
    if (cipc.ownership_declared !== true) missing.push('client_declared_ownership_picture');
  }

  return [...new Set(missing)];
}

/**
 * @param {unknown} record
 * @returns {{ ok: boolean, reason: string | null }}
 */
export function assertSafeEvidenceRecord(record) {
  const row = asObj(record);
  const kind = str(row.kind);
  const blob = JSON.stringify(row);
  const allowed = asArr(FACTORY_CONFIG.evidence_kinds_allowed).map((x) => String(x));
  if (kind && !allowed.includes(kind)) {
    return { ok: false, reason: 'evidence_kind_not_allowlisted' };
  }
  if (SENSITIVE_EVIDENCE_RE.test(kind) || SENSITIVE_EVIDENCE_RE.test(blob)) {
    return { ok: false, reason: 'sensitive_document_not_allowed_in_repo_overlay' };
  }
  if (SENSITIVE_PAYLOAD_RE.test(blob)) {
    return { ok: false, reason: 'sensitive_payload_not_allowed' };
  }
  if (row.bytes || row.data || row.image_base64 || row.content_base64) {
    return { ok: false, reason: 'raw_bytes_not_allowed_in_overlay' };
  }
  return { ok: true, reason: null };
}

/**
 * @param {unknown} matter
 * @returns {Record<string, unknown>[]}
 */
export function buildEvidenceChecklist(matter) {
  const { cipc } = readCipcDeskOverlay(matter);
  const serviceId = resolveMatterServiceId(matter);
  const template = serviceId ? getCipcServiceTemplate(serviceId) : null;
  /** @type {Record<string, unknown>[]} */
  const items = [
    { kind: 'engagement_mandate_on_file', present: cipc.mandate_signed === true },
    { kind: 'intake_checklist_complete', present: listMissingIntakeItems(matter).length === 0 },
  ];
  const proof = asObj(cipc.proof);
  items.push({
    kind: 'filing_confirmation_reference',
    present: Boolean(str(proof.filing_confirmation_ref || proof.confirmation_ref)),
  });
  if (serviceId === 'annual_returns') {
    items.push({
      kind: 'filing_certificate_reference',
      present: Boolean(str(proof.certificate_ref)),
    });
  }
  if (serviceId === 'director_changes') {
    items.push({
      kind: 'cor39_confirmation_reference',
      present: Boolean(str(proof.cor39_ref || proof.certificate_ref)),
    });
    if (template?.otp_step === true) {
      items.push({ kind: 'otp_finalised_note', present: cipc.otp_finalised === true });
    }
  }
  items.push({ kind: 'client_informed_note', present: cipc.client_informed === true });

  for (const stored of asArr(asObj(cipc.evidence).items)) {
    const safety = assertSafeEvidenceRecord(stored);
    items.push({ ...asObj(stored), overlay_safe: safety.ok, overlay_block: safety.reason });
  }
  return items;
}

/**
 * @param {string} fromState
 * @param {string} toState
 * @param {string} [intent]
 * @returns {{ protected: boolean, exact_action: string | null }}
 */
export function isProtectedFactoryTransition(fromState, toState, intent) {
  const wantedIntent = str(intent);
  if (wantedIntent === 'live_client_send' || wantedIntent === 'payment') {
    return {
      protected: true,
      exact_action:
        wantedIntent === 'payment'
          ? 'payment activation or live payment'
          : 'live email / WhatsApp / SMS send',
    };
  }
  if (toState === 'submitted_externally' && fromState !== 'submitted_externally') {
    return { protected: true, exact_action: 'controlled external CIPC submission' };
  }
  return { protected: false, exact_action: null };
}

/**
 * Derive the factory overlay state from existing ticket-shaped data.
 *
 * @param {unknown} matter
 * @returns {string}
 */
export function deriveCipcFactoryState(matter) {
  const { row, cipc, clientView } = readCipcDeskOverlay(matter);
  const explicit = str(cipc.factory_state || row.factory_state);
  if (explicit && CIPC_SERVICE_FACTORY_STATES.includes(explicit)) return explicit;

  const layer5 = str(cipc.layer5_status || row.layer5_status).replace(/\s+/g, '_');
  if (layer5 === 'specialist_review') return 'specialist_gate';
  if (layer5 === 'further_action_required') return 'further_action_required';
  if (layer5 === 'ready_for_submission') return 'ready_to_file';
  if (layer5 === 'submitted_externally') return 'submitted_externally';
  if (layer5 === 'awaiting_cipc' || layer5 === 'awaiting_otp') return 'awaiting_cipc';
  if (layer5 === 'completed') return 'completed';
  if (layer5 === 'information_incomplete') return 'information_incomplete';

  const exceptions = classifyCipcExceptions(matter);
  if (exceptions.length) return 'specialist_gate';

  const proof = asObj(cipc.proof);
  const hasProof = Boolean(
    str(proof.filing_confirmation_ref || proof.confirmation_ref || proof.certificate_ref || proof.cor39_ref),
  );
  if (cipc.submitted_externally === true || row.submitted_externally === true) {
    if (hasProof && cipc.client_informed === true) return 'completed';
    if (hasProof && cipc.client_informed !== true) return 'client_status_update';
    if (hasProof) return 'proof_capture';
    return 'submitted_externally';
  }

  const missing = listMissingIntakeItems(matter);
  if (!resolveMatterServiceId(matter)) return 'qualified_lead';
  if (missing.includes('signed_mandate') && missing.length === 1 && cipc.mandate_ambiguous === true) {
    return 'specialist_gate';
  }
  if (missing.length) {
    if (missing.includes('signed_mandate')) return 'mandate';
    if (missing.some((m) => m.startsWith('bo_') || m.startsWith('afs_'))) return 'prerequisite_checks';
    if (missing.includes('enterprise_number') || missing.includes('entity_type')) return 'structured_intake';
    return 'information_incomplete';
  }

  if (cipc.renewal_due === true) return 'renewal_reminder';

  const cmpStatus = str(row.status || row.cmp_status).toLowerCase();
  const workflow = str(clientView.workflow_state).toLowerCase();
  if (cmpStatus === 'closed' || workflow === 'closed' || workflow === 'published') {
    return hasProof && cipc.client_informed === true ? 'completed' : 'proof_capture';
  }

  return 'ready_to_file';
}

/**
 * @param {unknown} createdAt
 * @param {number} staleHours
 * @param {string} nowIso
 * @returns {boolean}
 */
function isStale(createdAt, staleHours, nowIso) {
  const start = Date.parse(str(createdAt));
  const now = Date.parse(str(nowIso) || '') || Date.now();
  if (!Number.isFinite(start)) return false;
  return now - start >= staleHours * 60 * 60 * 1000;
}

/**
 * Evaluate one matter against the common factory template.
 *
 * @param {unknown} matter
 * @param {{ now?: string }} [opts]
 * @returns {Record<string, unknown>}
 */
export function evaluateCipcFactoryMatter(matter, opts = {}) {
  const { row, brief, cipc } = readCipcDeskOverlay(matter);
  const serviceId = resolveMatterServiceId(matter);
  const template = serviceId ? getCipcServiceTemplate(serviceId) : null;
  const exceptions = classifyCipcExceptions(matter);
  const missing = listMissingIntakeItems(matter);
  const factoryState = deriveCipcFactoryState(matter);
  const layer5 = mapFactoryStateToLayer5(factoryState);
  const evidence = buildEvidenceChecklist(matter);
  const workbenchStates = asArr(asObj(FACTORY_CONFIG.workbench).visible_states).map((x) => String(x));
  const workbenchVisible = workbenchStates.includes(factoryState) || exceptions.length > 0;
  const protectedSubmit = isProtectedFactoryTransition(factoryState, 'submitted_externally');
  const sla = asObj(FACTORY_CONFIG.sla);
  const stale =
    factoryState === 'information_incomplete' ||
    factoryState === 'structured_intake' ||
    factoryState === 'mandate'
      ? isStale(row.created_at || row.createdAt || cipc.received_at, Number(sla.information_incomplete_stale_hours || 48), opts.now || '')
      : false;

  let transitionKind = 'deterministic';
  if (workbenchVisible) transitionKind = 'human_gate';
  if (factoryState === 'ready_to_file') transitionKind = 'deterministic';

  return {
    version: CIPC_SERVICE_FACTORY_VERSION,
    tenant_id: str(row.tenant_id || row.tenantId) || 'cipc-desk',
    ticket_id: str(row.ticket_id || row.id) || null,
    service_id: serviceId,
    service_title: template ? template.title : null,
    factory_state: factoryState,
    layer5_status: layer5,
    cmp_status: str(row.status || row.cmp_status) || null,
    cmp_stage: str(row.stage || row.cmp_stage) || null,
    client_route: str(cipc.client_route) || 'direct_sme',
    partner_key: str(cipc.partner_key) || null,
    entity_key: str(cipc.entity_key || cipc.enterprise_number) || null,
    exceptions,
    missing_items: missing,
    evidence,
    workbench_visible: workbenchVisible,
    clerical_stale: stale,
    transition_kind: transitionKind,
    blocked_protected_action: factoryState === 'ready_to_file' ? protectedSubmit.exact_action : null,
    may_auto_submit: false,
    may_live_send: false,
    may_take_payment: false,
    brief_service: str(brief.service) || null,
    environment: 'corpflow_test',
    public_launch: false,
  };
}

/**
 * Attempt a named move. Protected moves are reported, not performed.
 *
 * @param {unknown} matter
 * @param {string} intent
 * @returns {Record<string, unknown>}
 */
export function applyCipcFactoryIntent(matter, intent) {
  const current = evaluateCipcFactoryMatter(matter);
  const wanted = str(intent);
  if (wanted === 'submit' || wanted === 'file' || wanted === 'external_cipc_submission') {
    const gate = isProtectedFactoryTransition(String(current.factory_state), 'submitted_externally', wanted);
    return {
      ...current,
      intent: wanted,
      applied: false,
      protected_gate_encountered: true,
      exact_protected_action: gate.exact_action,
    };
  }
  if (wanted === 'pay' || wanted === 'payment') {
    return {
      ...current,
      intent: wanted,
      applied: false,
      protected_gate_encountered: true,
      exact_protected_action: 'payment activation or live payment',
    };
  }
  if (wanted === 'live_client_send' || wanted === 'send') {
    return {
      ...current,
      intent: wanted,
      applied: false,
      protected_gate_encountered: true,
      exact_protected_action: 'live email / WhatsApp / SMS send',
    };
  }
  if (wanted === 'mark_information_incomplete') {
    return {
      ...current,
      intent: wanted,
      applied: true,
      protected_gate_encountered: false,
      exact_protected_action: null,
      factory_state: 'information_incomplete',
      layer5_status: 'information_incomplete',
      transition_kind: 'deterministic',
    };
  }
  return {
    ...current,
    intent: wanted,
    applied: false,
    protected_gate_encountered: false,
    exact_protected_action: null,
    reason: 'unknown_or_non_deterministic_intent',
  };
}

/**
 * @param {unknown} matter
 * @returns {string}
 */
export function draftCipcMissingInformationRequest(matter) {
  const ev = evaluateCipcFactoryMatter(matter);
  const service = ev.service_title || 'this CIPC matter';
  const missing = asArr(ev.missing_items);
  const lines = missing.length
    ? missing.map((item) => `- ${item}`).join('\n')
    : '- No missing clerical items on the overlay. If you expected a gap, a specialist flag may already be set.';
  return [
    `Draft only — not sent. ${service}: we still need the following before the matter can be marked ready for submission.`,
    lines,
    'CIPC Desk cannot guarantee CIPC timing or acceptance. No identity documents should be pasted into GitHub.',
  ].join('\n');
}

/**
 * @param {unknown} matter
 * @returns {string}
 */
export function draftCipcClientStatusUpdate(matter) {
  const ev = evaluateCipcFactoryMatter(matter);
  const service = ev.service_title || 'your CIPC matter';
  return [
    `Draft only — not sent. Update on ${service}.`,
    `Current operator status: ${ev.layer5_status}.`,
    ev.factory_state === 'completed'
      ? 'Proof of filing is on the matter record. CIPC remains responsible for registry processing.'
      : 'This is a status draft only. No filing or payment has been performed by the factory overlay.',
    'CIPC Desk is not CIPC and does not guarantee outcomes.',
  ].join(' ');
}

/**
 * @param {unknown[]} matters
 * @returns {Record<string, unknown>[]}
 */
export function filterCipcExceptionWorkbench(matters) {
  return asArr(matters)
    .map((m) => evaluateCipcFactoryMatter(m))
    .filter((ev) => ev.workbench_visible === true);
}

/**
 * One accounting firm may refer many client entities. Group existing tickets.
 *
 * @param {unknown[]} matters
 * @returns {Record<string, unknown>[]}
 */
export function buildCipcPartnerPortfolio(matters) {
  /** @type {Map<string, Record<string, unknown>>} */
  const groups = new Map();
  for (const matter of asArr(matters)) {
    const ev = evaluateCipcFactoryMatter(matter);
    if (ev.client_route !== 'professional_partner' || !ev.partner_key) continue;
    const key = String(ev.partner_key);
    const existing = groups.get(key) || {
      partner_key: key,
      client_route: 'professional_partner',
      entity_count: 0,
      entities: [],
      workbench_count: 0,
      ready_to_file_count: 0,
      completed_count: 0,
    };
    existing.entity_count = Number(existing.entity_count) + 1;
    asArr(existing.entities).push({
      ticket_id: ev.ticket_id,
      entity_key: ev.entity_key,
      service_id: ev.service_id,
      factory_state: ev.factory_state,
      workbench_visible: ev.workbench_visible,
    });
    if (ev.workbench_visible) existing.workbench_count = Number(existing.workbench_count) + 1;
    if (ev.factory_state === 'ready_to_file') existing.ready_to_file_count = Number(existing.ready_to_file_count) + 1;
    if (ev.factory_state === 'completed') existing.completed_count = Number(existing.completed_count) + 1;
    groups.set(key, existing);
  }
  return [...groups.values()];
}

/**
 * Fictional end-to-end fixtures for the three first services. No real client data.
 *
 * @param {string} scenarioId
 * @returns {Record<string, unknown>}
 */
export function getCipcFictionalScenario(scenarioId) {
  const id = str(scenarioId);
  if (id === 'annual_returns_clean_pty_ltd') {
    return {
      scenario_id: id,
      ticket_id: 'cf988-ar-clean',
      tenant_id: 'cipc-desk',
      status: 'Approved',
      stage: 'Build',
      brief: { service: 'annual-returns', missing_information: [] },
      client_view: {
        cipc_desk: {
          client_route: 'direct_sme',
          entity_key: 'K2026/000001/07',
          entity_type: 'pty_ltd',
          mandate_signed: true,
          turnover: 'fictional-band',
          prerequisites: { bo: 'referred_or_separately_engaged', afs_fas: 'referred_or_separately_engaged' },
          checklist: { items: [{ key: 'scope_confirmed', status: 'done' }] },
        },
      },
    };
  }
  if (id === 'director_changes_death') {
    return {
      scenario_id: id,
      ticket_id: 'cf988-dc-death',
      tenant_id: 'cipc-desk',
      status: 'Approved',
      stage: 'Build',
      brief: { service: 'director-appointments-resignations' },
      client_view: {
        cipc_desk: {
          client_route: 'direct_sme',
          entity_key: 'K2026/000002/07',
          entity_type: 'pty_ltd',
          mandate_signed: true,
          scenario: 'death',
          checklist: { items: [{ key: 'scope_confirmed', status: 'done' }] },
        },
      },
    };
  }
  if (id === 'beneficial_ownership_trust') {
    return {
      scenario_id: id,
      ticket_id: 'cf988-bo-trust',
      tenant_id: 'cipc-desk',
      status: 'Approved',
      stage: 'Build',
      brief: { service: 'beneficial-ownership-submissions' },
      client_view: {
        cipc_desk: {
          client_route: 'direct_sme',
          entity_key: 'K2026/000003/07',
          entity_type: 'pty_ltd',
          mandate_signed: true,
          ownership_declared: true,
          ownership_flags: { trust: true },
          checklist: { items: [{ key: 'scope_confirmed', status: 'done' }] },
        },
      },
    };
  }
  if (id === 'partner_portfolio_three_entities') {
    return {
      scenario_id: id,
      partner_key: 'cf988-fictional-accounting-firm',
      matters: [
        fictionalPartnerMatter('cf988-p-ar', 'annual-returns', 'K2026/100001/07', { ready: true }),
        fictionalPartnerMatter('cf988-p-dc', 'director-appointments-resignations', 'K2026/100002/07', {
          scenario: 'resignation',
          ready: true,
        }),
        fictionalPartnerMatter('cf988-p-bo', 'beneficial-ownership-submissions', 'K2026/100003/07', {
          ownership_flags: { layered: true },
        }),
      ],
    };
  }
  if (id === 'annual_returns_completed_with_proof') {
    const base = getCipcFictionalScenario('annual_returns_clean_pty_ltd');
    const cipc = asObj(asObj(asObj(base).client_view).cipc_desk);
    cipc.submitted_externally = true;
    cipc.proof = {
      filing_confirmation_ref: 'CF988-AR-CONF-FICTIONAL',
      certificate_ref: 'CF988-AR-CERT-FICTIONAL',
    };
    cipc.client_informed = true;
    cipc.evidence = {
      items: [
        {
          kind: 'filing_confirmation_reference',
          file_name: 'ar-confirmation-fictional.pdf',
          pointer: 'cmp_ticket_attachments:fictional',
        },
      ],
    };
    return base;
  }
  throw new Error(`unknown_fictional_scenario:${id}`);
}

/**
 * @param {string} ticketId
 * @param {string} service
 * @param {string} entityKey
 * @param {Record<string, unknown>} extra
 * @returns {Record<string, unknown>}
 */
function fictionalPartnerMatter(ticketId, service, entityKey, extra) {
  const extras = asObj(extra);
  const ready = extras.ready === true;
  return {
    ticket_id: ticketId,
    tenant_id: 'cipc-desk',
    status: 'Approved',
    stage: 'Build',
    brief: { service },
    client_view: {
      cipc_desk: {
        client_route: 'professional_partner',
        partner_key: 'cf988-fictional-accounting-firm',
        entity_key: entityKey,
        entity_type: 'pty_ltd',
        mandate_signed: true,
        turnover: ready ? 'fictional-band' : undefined,
        prerequisites: ready
          ? { bo: 'referred_or_separately_engaged', afs_fas: 'referred_or_separately_engaged' }
          : undefined,
        scenario: extras.scenario || undefined,
        ownership_declared: service.includes('beneficial') ? true : undefined,
        ownership_flags: asObj(extras.ownership_flags),
        checklist: { items: [{ key: 'scope_confirmed', status: 'done' }] },
      },
    },
  };
}

/**
 * @param {string} scenarioId
 * @returns {Record<string, unknown>}
 */
export function runCipcFictionalScenario(scenarioId) {
  const fixture = getCipcFictionalScenario(scenarioId);
  if (scenarioId === 'partner_portfolio_three_entities') {
    const matters = asArr(fixture.matters);
    return {
      scenario_id: scenarioId,
      fictional: true,
      portfolio: buildCipcPartnerPortfolio(matters),
      workbench: filterCipcExceptionWorkbench(matters),
      evaluations: matters.map((m) => evaluateCipcFactoryMatter(m)),
    };
  }
  const ev = evaluateCipcFactoryMatter(fixture);
  const submit = applyCipcFactoryIntent(fixture, 'submit');
  return {
    scenario_id: scenarioId,
    fictional: true,
    evaluation: ev,
    submit_attempt: submit,
    missing_info_draft: draftCipcMissingInformationRequest(fixture),
    client_update_draft: draftCipcClientStatusUpdate(fixture),
  };
}
