/**
 * CIPC campaign MVP — control flow and first 10 verified prospects (#985).
 *
 * Overlay on existing Postgres `leads` + `qualification_json.cipc_campaign`
 * and the Change Console (`/change`). No Prisma schema change. No second CRM.
 * No live email / WhatsApp / SMS. Human approval is required before send;
 * the send step itself stays a protected gate.
 *
 * @see docs/operations/CIPC_CAMPAIGN_MVP_V1.md
 * @see config/cipc-campaign-mvp.v1.json
 */

import fs from 'node:fs';

/**
 * Load campaign config without `import.meta.url`.
 * Vercel wraps `api/factory_router.js` as CJS; `import.meta` in the static
 * import graph crashes the entire `/api/*` function at boot (HTML 500, #1015).
 * Literal path so Vercel file tracing can include the JSON in the bundle.
 *
 * @returns {Record<string, unknown>}
 */
function loadCampaignConfig() {
  return JSON.parse(fs.readFileSync('config/cipc-campaign-mvp.v1.json', 'utf8'));
}

/** @type {Record<string, unknown>} */
const CAMPAIGN_CONFIG = loadCampaignConfig();

export const CIPC_CAMPAIGN_VERSION = 'cipc-campaign-mvp-v1';
export const CIPC_CAMPAIGN_TENANT_ID = 'cipc-desk';
export const CIPC_CAMPAIGN_PRODUCT = 'cipc-campaign';
export { CAMPAIGN_CONFIG };

export const CIPC_CAMPAIGN_STATES = Object.freeze([
  'prospect_verified',
  'segment_assigned',
  'fit_scored',
  'decision_maker_verified',
  'message_drafted',
  'operator_approved',
  'ready_to_send',
  'sent',
  'replied',
  'qualified',
  'nurture',
  'closed',
]);

export const CIPC_CAMPAIGN_REQUIRED_FIELDS = Object.freeze([
  'company',
  'website',
  'segment',
  'source_evidence_url',
  'decision_maker_name',
  'decision_maker_title',
  'email',
  'phone',
  'contact_route',
  'fit_score',
  'service_overlap_signals',
  'positioning_angle',
  'message_version',
  'approval_state',
  'send_state',
  'response_state',
  'next_action',
  'next_action_due',
  'do_not_contact',
]);

const FORBIDDEN_OUTREACH_RE =
  /looking for remote work|cipc clerk|job hunt|guaranteed revenue|we have determined that/i;

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
 * @returns {boolean}
 */
function bool(v) {
  return v === true;
}

/**
 * @returns {Record<string, unknown>}
 */
/**
 * @param {{ kind?: string, tenantId?: string } | null | undefined} listScope
 * @returns {boolean}
 */
export function isCipcCampaignOperatorScope(listScope) {
  const kind = listScope?.kind != null ? String(listScope.kind) : '';
  if (kind === 'factory_master' || kind === 'core') return true;
  if (kind === 'tenant' && String(listScope?.tenantId || '') === CIPC_CAMPAIGN_TENANT_ID) return true;
  return false;
}

/**
 * Preserve other qualification_json namespaces when storing campaign state.
 *
 * @param {unknown} existing
 * @param {Record<string, unknown>} nextJson
 * @returns {Record<string, unknown>}
 */
export function mergeCipcCampaignQualificationJson(existing, nextJson) {
  const cur = asObj(existing);
  const next = asObj(nextJson);
  return {
    ...cur,
    intake_meta: {
      ...asObj(cur.intake_meta),
      ...asObj(next.intake_meta),
    },
    cipc_campaign: {
      ...asObj(cur.cipc_campaign),
      ...asObj(next.cipc_campaign),
    },
  };
}

/**
 * @returns {Record<string, unknown>}
 */
export function getCipcCampaignPurpose() {
  return {
    version: CIPC_CAMPAIGN_VERSION,
    issue: CAMPAIGN_CONFIG.$issue,
    parent: CAMPAIGN_CONFIG.$parent,
    tenant_id: CAMPAIGN_CONFIG.tenant_id,
    environment: CAMPAIGN_CONFIG.environment,
    operator_surface: CAMPAIGN_CONFIG.operator_surface,
    public_launch: CAMPAIGN_CONFIG.$public_launch,
    schema_change: CAMPAIGN_CONFIG.$schema_change,
    send: CAMPAIGN_CONFIG.$send,
    reuse: CAMPAIGN_CONFIG.$reuse,
  };
}

/**
 * @returns {{ schema_change: false, send: false, protected: true, public_launch: false }}
 */
export function assertCipcCampaignSafetyFlags() {
  if (CAMPAIGN_CONFIG.$schema_change !== false) {
    throw new Error('CIPC campaign MVP must set $schema_change=false');
  }
  if (CAMPAIGN_CONFIG.$send !== false) {
    throw new Error('CIPC campaign MVP must set $send=false');
  }
  if (CAMPAIGN_CONFIG.$protected !== true) {
    throw new Error('CIPC campaign MVP must set $protected=true');
  }
  if (CAMPAIGN_CONFIG.$public_launch !== false) {
    throw new Error('CIPC campaign MVP must set $public_launch=false');
  }
  return { schema_change: false, send: false, protected: true, public_launch: false };
}

/**
 * @param {unknown} website
 * @returns {string}
 */
export function normalizeCampaignWebsiteHost(website) {
  const raw = str(website).toLowerCase();
  if (!raw) return '';
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

/**
 * @param {unknown} email
 * @returns {string}
 */
export function normalizeCampaignEmail(email) {
  return str(email).toLowerCase();
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {number}
 */
export function scoreCipcCampaignSignals(signals) {
  const scoring = asObj(CAMPAIGN_CONFIG.scoring);
  const src = asObj(signals);
  let total = 0;
  for (const [key, weight] of Object.entries(scoring)) {
    if (key === 'max') continue;
    if (bool(src[key])) total += Number(weight) || 0;
  }
  const max = Number(scoring.max) || 100;
  return Math.max(0, Math.min(max, total));
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {string[]}
 */
export function listServiceOverlapSignals(signals) {
  const src = asObj(signals);
  return Object.keys(src).filter((key) => bool(src[key]));
}

/**
 * @param {string} segment
 * @returns {Record<string, unknown> | null}
 */
export function getCampaignSegment(segment) {
  const segments = asObj(CAMPAIGN_CONFIG.segments);
  const row = asObj(segments[str(segment)]);
  return row.label ? row : null;
}

/**
 * @param {string} segment
 * @returns {Record<string, unknown> | null}
 */
export function getCampaignMessageFramework(segment) {
  const frameworks = asObj(CAMPAIGN_CONFIG.message_frameworks);
  const row = asObj(frameworks[str(segment)]);
  return row.version ? row : null;
}

/**
 * @param {Record<string, unknown>} prospect
 * @returns {{ greeting: string, subject: string, body: string, follow_up: string[], message_version: string, send: false }}
 */
export function draftCipcCampaignOutreach(prospect) {
  const segment = str(prospect.segment || 'A') || 'A';
  const framework = getCampaignMessageFramework(segment) || getCampaignMessageFramework('A') || {};
  const company = str(prospect.company) || 'your firm';
  const dm = str(prospect.decision_maker_name);
  const greeting = dm ? `Hi ${dm.split(/\s+/)[0]},` : 'Hello,';
  const subject = str(framework.subject).replace('{company}', company);
  const angle = str(prospect.positioning_angle);
  const body = [
    greeting,
    '',
    str(framework.hook),
    angle ? `Angle for ${company}: ${angle}.` : '',
    '',
    str(framework.problem),
    '',
    str(framework.mechanism),
    '',
    str(framework.proof),
    '',
    str(framework.cta),
    str(framework.validation_asset) ? `More detail: ${str(framework.validation_asset)}` : '',
    '',
    'This is a draft only. It has not been sent.',
  ]
    .filter((line) => line !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (FORBIDDEN_OUTREACH_RE.test(`${subject}\n${body}`)) {
    throw new Error('Campaign draft used forbidden job-hunt or commodity language');
  }

  return {
    greeting,
    subject,
    body,
    follow_up: Array.isArray(framework.follow_up) ? framework.follow_up.map((row) => str(row)).filter(Boolean) : [],
    message_version: str(framework.version) || `segment-${segment.toLowerCase()}-v1`,
    send: false,
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {string}
 */
export function deriveCipcCampaignState(record) {
  const row = asObj(record);
  const response = str(row.response_state);
  if (response === 'qualified' || response === 'nurture' || response === 'closed') return response;
  if (row.do_not_contact === true) return 'closed';
  if (str(row.send_state) === 'sent' && response === 'replied') return 'replied';
  if (str(row.send_state) === 'sent') return 'sent';
  if (str(row.approval_state) === 'operator_approved' && str(row.send_state) === 'ready_to_send') {
    return 'ready_to_send';
  }
  if (str(row.approval_state) === 'operator_approved') return 'operator_approved';
  if (str(row.message_version) || str(row.message_draft)) return 'message_drafted';
  if (str(row.decision_maker_name)) return 'decision_maker_verified';
  if (row.fit_score != null && row.fit_score !== '') return 'fit_scored';
  if (str(row.segment)) return 'segment_assigned';
  return 'prospect_verified';
}

/**
 * @param {Record<string, unknown>} seed
 * @param {Record<string, unknown>} [stored]
 * @returns {Record<string, unknown>}
 */
export function hydrateCipcCampaignRecord(seed, stored) {
  const src = asObj(seed);
  const extra = asObj(stored);
  const campaignStored = asObj(extra.cipc_campaign);
  const signals = asObj(src.signals);
  const fitScore =
    campaignStored.fit_score != null && campaignStored.fit_score !== ''
      ? Number(campaignStored.fit_score)
      : scoreCipcCampaignSignals(signals);
  const overlap = listServiceOverlapSignals(signals);
  const draft = draftCipcCampaignOutreach(src);
  const doNotContact = campaignStored.do_not_contact === true || extra.do_not_contact === true;
  const approvalState = str(campaignStored.approval_state) || 'pending';
  const sendState = str(campaignStored.send_state) || 'not_sent';
  const responseState = str(campaignStored.response_state) || 'none';
  const record = {
    prospect_id: str(src.id),
    company: str(src.company),
    website: str(src.website),
    segment: str(src.segment) || 'A',
    source_evidence_url: str(src.source_evidence_url) || str(src.website),
    decision_maker_name: str(src.decision_maker_name),
    decision_maker_title: str(src.decision_maker_title),
    email: str(src.email),
    phone: str(src.phone),
    contact_route: str(src.contact_route) || (str(src.email) ? 'email' : str(src.phone) ? 'phone' : 'pending'),
    fit_score: fitScore,
    service_overlap_signals: overlap,
    positioning_angle: str(src.positioning_angle),
    message_version: draft.message_version,
    message_draft: {
      subject: draft.subject,
      body: draft.body,
      follow_up: draft.follow_up,
      send: false,
    },
    approval_state: approvalState,
    send_state: sendState === 'sent' ? 'not_sent' : sendState,
    response_state: responseState,
    next_action: str(campaignStored.next_action) || 'Operator review draft; approve or reject. Do not send.',
    next_action_due: campaignStored.next_action_due != null ? str(campaignStored.next_action_due) : '',
    do_not_contact: doNotContact,
    owner: str(campaignStored.owner) || str(CAMPAIGN_CONFIG.owner_default) || 'Anton',
    lead_id: str(extra.lead_id || campaignStored.lead_id),
    duplicate_of: str(extra.duplicate_of),
    persisted: Boolean(str(extra.lead_id || campaignStored.lead_id)),
  };
  if (doNotContact) {
    record.approval_state = approvalState === 'operator_approved' ? 'pending' : approvalState;
    record.send_state = 'blocked';
    record.next_action = str(campaignStored.next_action) || 'Do not contact. No send.';
  }
  record.control_flow_state = deriveCipcCampaignState(record);
  record.decision_maker_verified = Boolean(str(record.decision_maker_name));
  return record;
}

/**
 * @param {Record<string, unknown>[]} records
 * @returns {Map<string, string>}
 */
export function detectCipcCampaignDuplicates(records) {
  /** @type {Map<string, string>} */
  const firstByKey = new Map();
  /** @type {Map<string, string>} */
  const duplicateOf = new Map();
  for (const row of records) {
    const id = str(row.prospect_id || row.id);
    if (!id) continue;
    const keys = [];
    const host = normalizeCampaignWebsiteHost(row.website);
    const email = normalizeCampaignEmail(row.email);
    if (host) keys.push(`host:${host}`);
    if (email) keys.push(`email:${email}`);
    for (const key of keys) {
      const existing = firstByKey.get(key);
      if (existing && existing !== id) {
        duplicateOf.set(id, existing);
      } else if (!existing) {
        firstByKey.set(key, id);
      }
    }
  }
  return duplicateOf;
}

/**
 * @returns {Record<string, unknown>[]}
 */
export function listCipcCampaignSeedProspects() {
  const rows = Array.isArray(CAMPAIGN_CONFIG.prospects) ? CAMPAIGN_CONFIG.prospects : [];
  return rows.map((row) => asObj(row));
}

/**
 * @param {{ leadRows?: Array<Record<string, unknown>> }} [opts]
 * @returns {Record<string, unknown>[]}
 */
export function listCipcCampaignBoard(opts = {}) {
  const seeds = listCipcCampaignSeedProspects();
  const leadRows = Array.isArray(opts.leadRows) ? opts.leadRows : [];
  /** @type {Map<string, Record<string, unknown>>} */
  const storedByProspectId = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const storedByEmail = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const storedByHost = new Map();
  for (const lead of leadRows) {
    const qj = asObj(lead.qualificationJson || lead.qualification_json);
    const campaign = asObj(qj.cipc_campaign);
    const packed = {
      ...campaign,
      lead_id: str(lead.id),
      cipc_campaign: campaign,
    };
    const prospectId = str(campaign.prospect_id);
    if (prospectId) storedByProspectId.set(prospectId, packed);
    const email = normalizeCampaignEmail(lead.email || campaign.email);
    if (email) storedByEmail.set(email, packed);
    const host = normalizeCampaignWebsiteHost(campaign.website || lead.listing);
    if (host) storedByHost.set(host, packed);
  }

  const hydrated = seeds.map((seed) => {
    const stored =
      storedByProspectId.get(str(seed.id)) ||
      storedByEmail.get(normalizeCampaignEmail(seed.email)) ||
      storedByHost.get(normalizeCampaignWebsiteHost(seed.website)) ||
      {};
    return hydrateCipcCampaignRecord(seed, stored);
  });
  const duplicates = detectCipcCampaignDuplicates(hydrated);
  for (const row of hydrated) {
    const dup = duplicates.get(str(row.prospect_id));
    if (dup) {
      row.duplicate_of = dup;
      row.next_action = 'Duplicate suppressed. Keep the first record; do not send this copy.';
      row.send_state = 'blocked';
    }
  }
  return hydrated;
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} intent
 * @param {Record<string, unknown>} [patch]
 * @returns {{
 *   applied: boolean,
 *   record: Record<string, unknown>,
 *   protected_gate_encountered: boolean,
 *   exact_protected_action: string | null,
 *   reason?: string,
 * }}
 */
export function applyCipcCampaignIntent(record, intent, patch) {
  const current = { ...asObj(record) };
  const action = str(intent);
  const extra = asObj(patch);

  if (action === 'send' || action === 'live_send' || action === 'mark_sent') {
    return {
      applied: false,
      record: current,
      protected_gate_encountered: true,
      exact_protected_action: 'live email/WhatsApp/SMS send of the first outbound campaign batch',
      reason: 'Anton must approve the first outbound batch. This packet stops before any external send.',
    };
  }

  if (action === 'approve') {
    if (current.do_not_contact === true) {
      return {
        applied: false,
        record: current,
        protected_gate_encountered: false,
        exact_protected_action: null,
        reason: 'do_not_contact_blocks_approval',
      };
    }
    if (str(current.duplicate_of)) {
      return {
        applied: false,
        record: current,
        protected_gate_encountered: false,
        exact_protected_action: null,
        reason: 'duplicate_suppressed',
      };
    }
    current.approval_state = 'operator_approved';
    current.send_state =
      str(current.email) || str(current.phone) || str(current.contact_route) ? 'ready_to_send' : 'not_sent';
    current.next_action = 'Ready for Anton first-batch send approval. Do not send from the system.';
    current.control_flow_state = deriveCipcCampaignState(current);
    return {
      applied: true,
      record: current,
      protected_gate_encountered: false,
      exact_protected_action: null,
    };
  }

  if (action === 'reject') {
    current.approval_state = 'rejected';
    current.send_state = 'not_sent';
    current.next_action = str(extra.next_action) || 'Draft rejected. Revise or close. Do not send.';
    current.control_flow_state = deriveCipcCampaignState(current);
    return {
      applied: true,
      record: current,
      protected_gate_encountered: false,
      exact_protected_action: null,
    };
  }

  if (action === 'do_not_contact') {
    current.do_not_contact = true;
    current.approval_state = 'pending';
    current.send_state = 'blocked';
    current.response_state = 'closed';
    current.next_action = 'Do not contact.';
    current.control_flow_state = 'closed';
    return {
      applied: true,
      record: current,
      protected_gate_encountered: false,
      exact_protected_action: null,
    };
  }

  if (action === 'set_next_action') {
    current.next_action = str(extra.next_action) || current.next_action;
    current.next_action_due = extra.next_action_due != null ? str(extra.next_action_due) : current.next_action_due;
    return {
      applied: true,
      record: current,
      protected_gate_encountered: false,
      exact_protected_action: null,
    };
  }

  return {
    applied: false,
    record: current,
    protected_gate_encountered: false,
    exact_protected_action: null,
    reason: 'unknown_intent',
  };
}

/**
 * Map a campaign record onto the existing Lead + qualification_json shape.
 * Email may be empty when unverified; this does not invent a contact.
 *
 * @param {Record<string, unknown>} record
 * @returns {Record<string, unknown>}
 */
export function buildCipcCampaignLeadUpsert(record) {
  const row = asObj(record);
  const campaign = {
    campaign_id: str(CAMPAIGN_CONFIG.campaign_id),
    prospect_id: str(row.prospect_id),
    company: str(row.company),
    website: str(row.website),
    segment: str(row.segment),
    source_evidence_url: str(row.source_evidence_url),
    decision_maker_name: str(row.decision_maker_name),
    decision_maker_title: str(row.decision_maker_title),
    email: str(row.email),
    phone: str(row.phone),
    contact_route: str(row.contact_route),
    fit_score: row.fit_score,
    service_overlap_signals: Array.isArray(row.service_overlap_signals) ? row.service_overlap_signals : [],
    positioning_angle: str(row.positioning_angle),
    message_version: str(row.message_version),
    message_draft: asObj(row.message_draft),
    approval_state: str(row.approval_state) || 'pending',
    send_state: str(row.send_state) || 'not_sent',
    response_state: str(row.response_state) || 'none',
    next_action: str(row.next_action),
    next_action_due: str(row.next_action_due),
    do_not_contact: row.do_not_contact === true,
    control_flow_state: str(row.control_flow_state),
    owner: str(row.owner) || 'Anton',
  };
  return {
    tenantId: CIPC_CAMPAIGN_TENANT_ID,
    name: str(row.decision_maker_name) || str(row.company) || 'CIPC campaign prospect',
    email: str(row.email),
    contact: str(row.email) || str(row.phone) || str(row.contact_route) || str(row.website),
    phone: str(row.phone) || null,
    message: str(row.positioning_angle),
    intent: str(CAMPAIGN_CONFIG.intent) || CIPC_CAMPAIGN_PRODUCT,
    listing: str(row.website),
    status: 'NEW',
    score: String(row.fit_score ?? ''),
    qualificationJson: {
      intake_meta: {
        product: CIPC_CAMPAIGN_PRODUCT,
        source: 'cipc-campaign-mvp-#985',
        page: '/change',
        host: 'cipc.corpflowai.com',
        business_name: str(row.company),
        consent_contact: false,
      },
      cipc_campaign: campaign,
    },
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {string[]}
 */
export function missingCipcCampaignFields(record) {
  const row = asObj(record);
  return CIPC_CAMPAIGN_REQUIRED_FIELDS.filter((field) => !(field in row));
}

/**
 * True when a field is present on the record even if blank (unverified).
 *
 * @param {Record<string, unknown>[]} board
 * @returns {{ ok: true, count: number } | { ok: false, missing: Record<string, string[]> }}
 */
export function validateCipcCampaignBoard(board) {
  /** @type {Record<string, string[]>} */
  const missing = {};
  for (const row of board) {
    const gaps = missingCipcCampaignFields(row);
    if (gaps.length) missing[str(row.prospect_id) || 'unknown'] = gaps;
  }
  if (Object.keys(missing).length) return { ok: false, missing };
  return { ok: true, count: board.length };
}
