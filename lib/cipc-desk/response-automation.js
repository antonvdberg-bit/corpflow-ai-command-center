/**
 * CIPC response automation overlay — #987.
 *
 * Market-ready lead/client response loop on existing cmpTicket.consoleJson
 * and leads.qualification_json.cipc_response. No Prisma schema change.
 * No second CRM. No live email / WhatsApp / SMS. No quotation, payment,
 * or CIPC submission. Human approval is required before any send; the
 * send step itself stays a protected gate.
 *
 * @see docs/operations/CIPC_RESPONSE_AUTOMATION_V1.md
 */

import crypto from 'crypto';

export const CIPC_RESPONSE_VERSION = 'cipc-response-automation-v1';
export const CIPC_RESPONSE_TENANT_ID = 'cipc-desk';
export const CIPC_RESPONSE_NAMESPACE = 'cipc_response';

export const CIPC_RESPONSE_SOURCES = Object.freeze([
  'partner_web',
  'direct_sme_web',
  'campaign',
  'existing_client',
  'unknown',
]);

export const CIPC_RESPONSE_CLASSIFICATIONS = Object.freeze([
  'professional_partner',
  'direct_sme',
  'existing_client',
  'spam_unusable',
  'unclear_manual_review',
]);

export const CIPC_RESPONSE_FOLLOW_UP_DAYS = Object.freeze([3, 7, 14]);

const FORBIDDEN_DRAFT_RE =
  /guaranteed revenue|we have filed|payment received|official CIPC partner|choose payment path|fictional test|corpflow_test|looking for remote work|CIPC clerk/i;

const SPAM_RE =
  /\b(viagra|crypto airdrop|congratulations you won|cheap seo backlinks|binary options)\b/i;

const PARTNER_RE =
  /(accountant|tax practitioner|tax\s+practitioner|auditor|firm|professional\s+partner|company\s+secretary|white-label|overflow)/i;

const EXISTING_CLIENT_RE = /\b(existing client|current matter|our (open|existing) (ticket|matter)|already a client)\b/i;

const UNSUBSCRIBE_RE =
  /\b(unsubscribe|do not contact|stop (emailing|contacting)|remove me|opt[ -]?out)\b/i;

const LEGAL_COMPLEX_RE =
  /\b(legal opinion|statutory interpretation|court order|attorney|advocate|section\s*\d+|memorandum of incorporation|\bMOI\b|share (restructure|issue|transfer)|deregistration|restoration|liquidation|business rescue|contested)\b/i;

const DIRECTOR_EXCEPTION_RE = /\b(death of (a )?director|director removal|would leave zero directors|zero directors)\b/i;

const COMPLEX_OWNERSHIP_RE =
  /\b(trust|juristic (person|owner)|layered ownership|foreign (ubo|owner)|unclear control|affected company)\b/i;

const SERVICE_CUES = Object.freeze([
  { id: 'annual_returns', re: /annual\s*returns?/i },
  { id: 'director_changes', re: /director/i },
  { id: 'beneficial_ownership', re: /beneficial\s+owner|ubo\b/i },
  { id: 'registered_address', re: /registered\s+address|change of address/i },
  { id: 'company_registration', re: /private[- ]company registration|register a (pty|company)/i },
  { id: 'secretarial_support', re: /secretarial|white-label|overflow|cipc administration|statutory records/i },
]);

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
 * @param {unknown} email
 * @returns {string}
 */
export function normalizeResponseEmail(email) {
  return str(email).toLowerCase();
}

/**
 * @param {unknown} company
 * @returns {string}
 */
export function normalizeResponseCompany(company) {
  return str(company)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b(pty|ltd|inc|llc|cc)\b\.?/g, '')
    .trim();
}

/**
 * @param {unknown} website
 * @returns {string}
 */
export function normalizeResponseWebsiteHost(website) {
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
 * Preserve unrelated consoleJson / qualification_json namespaces.
 *
 * @param {unknown} existing
 * @param {Record<string, unknown>} nextOverlay
 * @returns {Record<string, unknown>}
 */
export function mergeCipcResponseJson(existing, nextOverlay) {
  const cur = asObj(existing);
  const next = asObj(nextOverlay);
  const clientView = asObj(cur.client_view);
  const cipcDesk = asObj(clientView.cipc_desk);
  return {
    ...cur,
    [CIPC_RESPONSE_NAMESPACE]: {
      ...asObj(cur[CIPC_RESPONSE_NAMESPACE]),
      ...next,
    },
    client_view: {
      ...clientView,
      cipc_desk: {
        ...cipcDesk,
        response_overlay_version: CIPC_RESPONSE_VERSION,
      },
    },
  };
}

/**
 * Preserve unrelated qualification_json namespaces when storing on leads.
 *
 * @param {unknown} existing
 * @param {Record<string, unknown>} nextJson
 * @returns {Record<string, unknown>}
 */
export function mergeCipcResponseQualificationJson(existing, nextJson) {
  const cur = asObj(existing);
  const next = asObj(nextJson);
  return {
    ...cur,
    intake_meta: {
      ...asObj(cur.intake_meta),
      ...asObj(next.intake_meta),
    },
    [CIPC_RESPONSE_NAMESPACE]: {
      ...asObj(cur[CIPC_RESPONSE_NAMESPACE]),
      ...asObj(next[CIPC_RESPONSE_NAMESPACE]),
    },
  };
}

/**
 * @param {unknown} ticketId
 * @param {Record<string, unknown>} [enquiry]
 * @returns {string}
 */
export function buildCipcResponsePublicReference(ticketId, enquiry) {
  const id = str(ticketId).replace(/[^a-zA-Z0-9]/g, '');
  if (id.length >= 8) return `CD-${id.slice(-8).toUpperCase()}`;
  const src = [str(enquiry?.email), str(enquiry?.company), str(enquiry?.thread_id)].join('|');
  const hash = crypto.createHash('sha256').update(src || 'cipc-response', 'utf8').digest('hex');
  return `CD-${hash.slice(0, 8).toUpperCase()}`;
}

/**
 * @param {string} emailText
 * @param {Record<string, unknown>} [body]
 * @returns {Record<string, unknown>}
 */
export function parseCipcEnquiryFromIntake(emailText, body) {
  const extra = asObj(body);
  const text = str(emailText);
  const line = (label) => {
    const re = new RegExp(`^${label}:\\s*(.+)$`, 'im');
    const m = text.match(re);
    return m ? str(m[1]) : '';
  };
  const servicesLine = line('Services of interest');
  const email = normalizeResponseEmail(
    extra.sender_email || extra.email || extra.from_email || line('Email'),
  );
  const company = str(
    extra.company || extra.firm || extra.business_name || line('Company') || line('Firm'),
  );
  const contactName = str(extra.contact_name || extra.name || extra.decision_maker_name || line('Contact'));
  const phone = str(extra.phone || extra.sender_phone || line('Phone')).replace(/^Not provided$/i, '');
  const website = str(extra.website || extra.company_website || line('Website'));
  const threadId = str(extra.thread_id || extra.threadId || extra.in_reply_to || extra.inReplyTo);
  const messageId = str(extra.message_id || extra.messageId);
  const campaignProspectId = str(extra.campaign_prospect_id || extra.prospect_id);
  const existingTicketId = str(extra.existing_ticket_id || extra.existing_matter_id);
  const existingLeadId = str(extra.existing_lead_id || extra.lead_id);
  const asked =
    str(
      extra.need ||
        extra.asked ||
        extra.message ||
        line('What you need') ||
        line('Approximate client portfolio or immediate need'),
    ) || text;
  const sourceHint = str(extra.source || extra.enquiry_source);
  let source = CIPC_RESPONSE_SOURCES.includes(sourceHint) ? sourceHint : '';
  if (!source) {
    if (campaignProspectId || /^campaign:/i.test(text)) source = 'campaign';
    else if (existingTicketId || existingLeadId || EXISTING_CLIENT_RE.test(text)) source = 'existing_client';
    else if (/partner overflow\s*\/\s*white-label enquiry/i.test(text) || sourceHint === 'partner_web') {
      source = 'partner_web';
    } else if (
      /direct sme company-secretarial enquiry/i.test(text) ||
      /annual returns review|director changes review|beneficial ownership review/i.test(text)
    ) {
      source = 'direct_sme_web';
    } else if (/https?:\/\/|form|website/i.test(str(extra.page || extra.client_path))) {
      source = extra.client_path === '/partners' ? 'partner_web' : 'direct_sme_web';
    } else {
      source = 'unknown';
    }
  }
  if (str(extra.client_path) === '/partners') source = 'partner_web';
  if (str(extra.client_path) === '/company') source = 'direct_sme_web';

  return {
    email_text: text,
    email,
    company,
    contact_name: contactName,
    phone,
    website,
    thread_id: threadId,
    message_id: messageId,
    campaign_prospect_id: campaignProspectId,
    existing_ticket_id: existingTicketId,
    existing_lead_id: existingLeadId,
    asked,
    services_of_interest: servicesLine,
    preferred_channel: str(extra.preferred_channel || line('Preferred response channel')),
    source,
    page: str(extra.client_path || extra.page),
  };
}

/**
 * @param {unknown} enquiry
 * @returns {string | null}
 */
export function resolveCipcResponseServiceId(enquiry) {
  const row = asObj(enquiry);
  const blob = `${str(row.asked)} ${str(row.email_text)} ${str(row.services_of_interest)} ${str(row.service)}`;
  for (const cue of SERVICE_CUES) {
    if (cue.re.test(blob)) return cue.id;
  }
  return null;
}

/**
 * @param {unknown} enquiry
 * @param {Record<string, unknown>} [interpreted]
 * @returns {{
 *   classification: string,
 *   source: string,
 *   service_id: string | null,
 *   specialist_escalation: boolean,
 *   escalation_flags: string[],
 *   do_not_contact: boolean,
 *   incomplete: boolean,
 *   review_reason: string | null,
 * }}
 */
export function classifyCipcResponseLead(enquiry, interpreted) {
  const row = asObj(enquiry);
  const inferred = asObj(interpreted);
  const text = `${str(row.email_text)} ${str(row.asked)}`;
  const email = normalizeResponseEmail(row.email);
  const company = str(row.company);
  const source = CIPC_RESPONSE_SOURCES.includes(str(row.source)) ? str(row.source) : 'unknown';
  const inferredSlug = str(asObj(inferred.service).serviceSlug);
  const defaultRegistration =
    inferredSlug === 'private-company-registration' && !/register|pty|new company/i.test(text);
  const serviceId =
    resolveCipcResponseServiceId(row) || (defaultRegistration ? '' : inferredSlug) || null;
  const flags = [];
  const unsub = UNSUBSCRIBE_RE.test(text);
  if (unsub) flags.push('unsubscribe');
  if (LEGAL_COMPLEX_RE.test(text)) flags.push('statutory_legal_interpretation');
  if (DIRECTOR_EXCEPTION_RE.test(text)) flags.push('director_death_or_removal');
  if (COMPLEX_OWNERSHIP_RE.test(text) && /beneficial|ubo|ownership/i.test(text)) {
    flags.push('complex_beneficial_ownership');
  }

  const usableIdentity = Boolean(email || company || str(row.phone));
  const tooShort = str(row.asked).length < 12 && str(row.email_text).length < 40;
  const spam = SPAM_RE.test(text) || (!usableIdentity && tooShort);

  let classification = 'direct_sme';
  let reviewReason = null;
  if (spam) {
    classification = 'spam_unusable';
    reviewReason = 'unusable_or_spam';
  } else if (str(row.existing_ticket_id) || str(row.existing_lead_id) || source === 'existing_client') {
    classification = 'existing_client';
  } else if (source === 'partner_web' || inferred.clientRoute === 'professional_partner' || PARTNER_RE.test(text)) {
    classification = 'professional_partner';
  } else if (!serviceId && !PARTNER_RE.test(text) && (!email || tooShort)) {
    classification = 'unclear_manual_review';
    reviewReason = 'incomplete_or_unscoped';
  } else if (!serviceId && source === 'unknown' && str(row.asked).length < 40) {
    classification = 'unclear_manual_review';
    reviewReason = 'no_service_cue';
  } else {
    classification = 'direct_sme';
  }

  const incomplete = !email || (!company && classification === 'professional_partner') || (!serviceId && classification === 'direct_sme');
  if (incomplete && classification === 'direct_sme' && !serviceId) {
    classification = 'unclear_manual_review';
    reviewReason = reviewReason || 'incomplete_or_unscoped';
  }

  return {
    classification,
    source,
    service_id: serviceId && serviceId !== 'null' ? serviceId : resolveCipcResponseServiceId(row),
    specialist_escalation: flags.some((f) => f !== 'unsubscribe'),
    escalation_flags: [...new Set(flags)],
    do_not_contact: unsub,
    incomplete,
    review_reason: reviewReason,
  };
}

/**
 * @param {string} body
 * @returns {boolean}
 */
export function replyLooksLikeQuestionOrCondition(body) {
  const text = str(body);
  if (!text) return false;
  if (/\?/.test(text)) return true;
  return /\b(if|provided that|unless|on condition|only if|subject to|depending on)\b/i.test(text);
}

/**
 * @param {Record<string, unknown>} args
 * @returns {{ kind: string, subject: string, body: string, send: false }}
 */
function finalizeDraft(kind, subject, body) {
  const text = str(body).trim();
  if (FORBIDDEN_DRAFT_RE.test(`${subject}\n${text}`)) {
    throw new Error(`CIPC response draft used forbidden language: ${kind}`);
  }
  return {
    kind,
    subject,
    body: `${text}\n\nThis is a draft only. It has not been sent.`,
    send: false,
  };
}

/**
 * Deterministic drafts. No AI. Never claims a send, filing, or payment.
 *
 * @param {{
 *   enquiry?: Record<string, unknown>,
 *   classification?: Record<string, unknown>,
 * }} [args]
 * @returns {Record<string, { kind: string, subject: string, body: string, send: false }>}
 */
export function draftCipcResponseMessages(args = {}) {
  const enquiry = asObj(args.enquiry);
  const classification = asObj(args.classification);
  const company = str(enquiry.company) || 'your firm';
  const contact = str(enquiry.contact_name);
  const greeting = contact ? `Hello ${contact.split(/\s+/)[0]},` : 'Hello,';
  const asked = str(enquiry.asked) || 'your enquiry';
  const askedClip = asked.length > 280 ? `${asked.slice(0, 277)}…` : asked;
  const serviceLabel = str(classification.service_id || enquiry.services_of_interest) || 'company-secretarial support';

  const ack = finalizeDraft(
    'acknowledgement',
    `We received your ${company} enquiry`,
    [
      greeting,
      '',
      `Thank you. We have recorded your enquiry about ${serviceLabel}.`,
      `What you asked: ${askedClip}`,
      '',
      'Next step: an operator will review the request and come back with a scoped next action. This does not start filing work and is not a CIPC submission.',
      'We do not guarantee CIPC processing times or filing outcomes.',
    ].join('\n'),
  );

  const partner = finalizeDraft(
    'partner_discovery',
    `Overflow / white-label scoping for ${company}`,
    [
      greeting,
      '',
      `Thank you for asking about overflow / white-label company-secretarial capacity for ${company}.`,
      `What you asked: ${askedClip}`,
      '',
      'Next step is a short discovery conversation so we can confirm fit, the work sitting behind your practice, and whether delivery should stay white-label.',
      'Useful to have ready: approximate client volume, the services you want covered first, and whether clients should see your firm only.',
      '',
      'This is not a quotation, not a filing instruction, and not a commitment. Partner commercial terms are discussed after scoping.',
    ].join('\n'),
  );

  const sme = finalizeDraft(
    'direct_sme_next_step',
    `Next step for your ${serviceLabel} request`,
    [
      greeting,
      '',
      `We received your request relating to ${serviceLabel}.`,
      `What you asked: ${askedClip}`,
      '',
      'Next step: we confirm the entity identifiers and the exact change required before any filing is prepared. Please send the enterprise number and the outcome you need, if you have not already.',
      'No filing, payment, or CIPC submission has been made.',
    ].join('\n'),
  );

  const incomplete = finalizeDraft(
    'incomplete_information',
    `Information still needed for ${company}`,
    [
      greeting,
      '',
      'We have your enquiry, but we still need a usable contact and a clearer description of the work before an operator can scope the next step.',
      'Please reply with: the firm or company name, a work email, and the CIPC matter you want help with.',
      'This request has not been filed and no send has occurred.',
    ].join('\n'),
  );

  const specialist = finalizeDraft(
    'specialist_holding',
    `Specialist review for ${company}`,
    [
      greeting,
      '',
      'Thank you. This question needs specialist review rather than a routine clerical reply. We have flagged it for a human specialist.',
      'We will not give a legal, tax, or statutory conclusion from this acknowledgement, and we have not filed anything with CIPC.',
      'Next step: a specialist reviews the question and tells you what information is required, or whether the matter sits outside the current service path.',
    ].join('\n'),
  );

  const follow1 = finalizeDraft(
    'follow_up_1',
    `Following up on your ${company} enquiry`,
    [
      greeting,
      '',
      'Checking whether you still want us to continue with the next scoping step for the enquiry we already hold.',
      'If you would like us to stop, reply and we will mark the record do-not-contact. Nothing further will be sent until an operator approves the next draft.',
    ].join('\n'),
  );
  const follow2 = finalizeDraft(
    'follow_up_2',
    `Second follow-up — ${company}`,
    [
      greeting,
      '',
      'A second reminder on the same enquiry. We still have not sent a commercial quotation and have not filed anything.',
      'Reply with the next fact we should use, or ask us to close the record.',
    ].join('\n'),
  );
  const follow3 = finalizeDraft(
    'follow_up_3',
    `Final follow-up — ${company}`,
    [
      greeting,
      '',
      'This is the last scheduled follow-up on the current enquiry. If we do not hear back, the operator will close or hold the record. No further campaign follow-up will be drafted once the record is closed or marked do-not-contact.',
    ].join('\n'),
  );

  return {
    acknowledgement: ack,
    partner_discovery: partner,
    direct_sme_next_step: sme,
    incomplete_information: incomplete,
    specialist_holding: specialist,
    follow_up_1: follow1,
    follow_up_2: follow2,
    follow_up_3: follow3,
  };
}

/**
 * @param {Record<string, unknown>} classification
 * @param {Record<string, { kind: string, subject: string, body: string, send: false }>} drafts
 * @returns {{ kind: string, subject: string, body: string, send: false }}
 */
export function selectPrimaryCipcResponseDraft(classification, drafts) {
  const row = asObj(classification);
  const pack = asObj(drafts);
  if (row.do_not_contact === true) return asObj(pack.acknowledgement);
  if (row.specialist_escalation === true && str(row.classification) !== 'unclear_manual_review') {
    return asObj(pack.specialist_holding);
  }
  if (str(row.classification) === 'unclear_manual_review' || row.incomplete === true) {
    return asObj(pack.incomplete_information);
  }
  if (str(row.classification) === 'professional_partner') return asObj(pack.partner_discovery);
  if (str(row.classification) === 'direct_sme') return asObj(pack.direct_sme_next_step);
  return asObj(pack.acknowledgement);
}

/**
 * @param {unknown} enquiry
 * @returns {string[]}
 */
export function buildCipcResponseDedupeKeys(enquiry) {
  const row = asObj(enquiry);
  /** @type {string[]} */
  const keys = [];
  const email = normalizeResponseEmail(row.email || row.sender_email);
  const company = normalizeResponseCompany(row.company);
  const host = normalizeResponseWebsiteHost(row.website);
  const thread = str(row.thread_id);
  const message = str(row.message_id);
  if (email) keys.push(`email:${email}`);
  if (company) keys.push(`company:${company}`);
  if (host) keys.push(`host:${host}`);
  if (thread) keys.push(`thread:${thread}`);
  if (message) keys.push(`message:${message}`);
  if (email && company) keys.push(`email+company:${email}|${company}`);
  return keys;
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {unknown} enquiry
 * @returns {Record<string, unknown> | null}
 */
export function findCipcResponseDuplicate(records, enquiry) {
  const wanted = new Set(buildCipcResponseDedupeKeys(enquiry));
  if (!wanted.size) return null;
  const list = Array.isArray(records) ? records : [];
  for (const row of list) {
    const keys = asArr(row.dedupe_keys).map((x) => str(x));
    const fallback = buildCipcResponseDedupeKeys(row);
    const have = keys.length ? keys : fallback;
    if (have.some((key) => wanted.has(key))) return asObj(row);
  }
  return null;
}

/**
 * @param {string} iso
 * @param {number} days
 * @returns {string}
 */
function addDaysIso(iso, days) {
  const start = Date.parse(str(iso)) || Date.now();
  return new Date(start + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Follow-up calendar for n8n. Does not create a second CRM record.
 *
 * @param {Record<string, unknown>} record
 * @param {{ now?: string, simulate_sent?: boolean }} [opts]
 * @returns {Record<string, unknown>}
 */
export function calculateCipcResponseFollowUp(record, opts = {}) {
  const row = { ...asObj(record) };
  const now = str(opts.now) || new Date().toISOString();
  if (row.do_not_contact === true || str(row.approval_state) === 'rejected') {
    return {
      ...row,
      follow_up_step: Number(row.follow_up_step || 0),
      next_action: row.do_not_contact === true ? 'Do not contact. No follow-up. No send.' : str(row.next_action),
      next_action_due: '',
      created_new_record: false,
    };
  }
  const currentStep = Number(row.follow_up_step || 0);
  const nextStep = Math.min(3, currentStep + (opts.simulate_sent || str(row.send_state) === 'ready_to_send' ? 1 : 0));
  const dueDays = CIPC_RESPONSE_FOLLOW_UP_DAYS[Math.max(0, nextStep - 1)] || CIPC_RESPONSE_FOLLOW_UP_DAYS[0];
  const drafts = asObj(row.drafts);
  const followKey = nextStep >= 1 ? `follow_up_${nextStep}` : '';
  return {
    ...row,
    follow_up_step: nextStep,
    next_action:
      nextStep >= 3
        ? 'Final follow-up due. Operator close or hold. Do not send without approval.'
        : `Follow-up #${nextStep || 1} due. Draft only — do not send.`,
    next_action_due: addDaysIso(now, dueDays),
    follow_up_draft: followKey ? asObj(drafts[followKey]) : asObj(row.draft),
    created_new_record: false,
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {string}
 */
export function deriveCipcResponseState(record) {
  const row = asObj(record);
  if (row.do_not_contact === true) return 'do_not_contact';
  if (str(row.approval_state) === 'rejected') return 'rejected';
  if (str(row.response_state) === 'question_or_condition') return 'awaiting_operator_on_reply';
  if (str(row.response_state) === 'replied') return 'replied';
  if (str(row.send_state) === 'ready_to_send') return 'ready_to_send';
  if (str(row.approval_state) === 'operator_approved') return 'operator_approved';
  if (str(row.classification) === 'unclear_manual_review') return 'manual_review';
  if (row.specialist_escalation === true) return 'specialist_review';
  if (str(row.classification) === 'spam_unusable') return 'spam_unusable';
  return 'drafted';
}

/**
 * @param {{
 *   enquiry: Record<string, unknown>,
 *   interpreted?: Record<string, unknown>,
 *   ticket_id?: string,
 *   lead_id?: string,
 *   stored?: Record<string, unknown>,
 *   duplicate_of?: string,
 *   now?: string,
 * }} args
 * @returns {Record<string, unknown>}
 */
export function buildCipcResponseOverlay(args) {
  const enquiry = asObj(args.enquiry);
  const stored = asObj(args.stored);
  const classification = classifyCipcResponseLead(enquiry, args.interpreted);
  const drafts = draftCipcResponseMessages({ enquiry, classification });
  const primary = selectPrimaryCipcResponseDraft(classification, drafts);
  const doNotContact = stored.do_not_contact === true || classification.do_not_contact;
  const ticketId = str(args.ticket_id || stored.ticket_id || enquiry.existing_ticket_id);
  const leadId = str(args.lead_id || stored.lead_id || enquiry.existing_lead_id);
  const overlay = {
    version: CIPC_RESPONSE_VERSION,
    tenant_id: CIPC_RESPONSE_TENANT_ID,
    source: classification.source,
    classification: classification.classification,
    service_id: classification.service_id,
    sender_email: normalizeResponseEmail(enquiry.email),
    company: str(enquiry.company),
    contact_name: str(enquiry.contact_name),
    phone: str(enquiry.phone),
    website: str(enquiry.website),
    asked_summary: str(enquiry.asked).slice(0, 500),
    thread_id: str(enquiry.thread_id || stored.thread_id),
    message_id: str(enquiry.message_id || stored.message_id),
    campaign_prospect_id: str(enquiry.campaign_prospect_id || stored.campaign_prospect_id),
    ticket_id: ticketId,
    lead_id: leadId,
    public_reference: str(stored.public_reference) || buildCipcResponsePublicReference(ticketId, enquiry),
    dedupe_keys: buildCipcResponseDedupeKeys(enquiry),
    acknowledgement_draft: drafts.acknowledgement,
    discovery_draft: classification.classification === 'professional_partner' ? drafts.partner_discovery : null,
    draft: primary,
    drafts,
    approval_state: str(stored.approval_state) || 'pending',
    send_state: doNotContact ? 'blocked' : str(stored.send_state) || 'not_sent',
    response_state: str(stored.response_state) || 'none',
    follow_up_step: Number(stored.follow_up_step || 0),
    next_action: str(stored.next_action) || 'Operator review draft; approve or reject. Do not send.',
    next_action_due: str(stored.next_action_due),
    do_not_contact: doNotContact,
    specialist_escalation: classification.specialist_escalation,
    escalation_flags: classification.escalation_flags,
    incomplete: classification.incomplete,
    review_reason: classification.review_reason,
    duplicate_of: str(args.duplicate_of || stored.duplicate_of),
    replies: asArr(stored.replies),
    send: false,
    may_live_send: false,
    environment: 'corpflow_test',
    updated_at: str(args.now) || new Date().toISOString(),
  };
  if (overlay.duplicate_of) {
    overlay.send_state = 'blocked';
    overlay.next_action = 'Duplicate suppressed. Keep the first record; do not send this copy.';
  }
  overlay.control_flow_state = deriveCipcResponseState(overlay);
  return overlay;
}

/**
 * @param {unknown} ticket
 * @returns {Record<string, unknown>}
 */
export function readCipcResponseOverlay(ticket) {
  const row = asObj(ticket);
  const consoleJson = asObj(row.consoleJson || row.console_json);
  const qualification = asObj(row.qualificationJson || row.qualification_json);
  const fromTicket = asObj(consoleJson[CIPC_RESPONSE_NAMESPACE]);
  const fromLead = asObj(qualification[CIPC_RESPONSE_NAMESPACE]);
  const overlay = Object.keys(fromTicket).length ? fromTicket : fromLead;
  return overlay;
}

/**
 * @param {unknown} ticket
 * @returns {Record<string, unknown>}
 */
export function hydrateCipcResponseFromTicket(ticket) {
  const row = asObj(ticket);
  const existing = readCipcResponseOverlay(row);
  if (str(existing.version)) {
    return {
      ...existing,
      ticket_id: str(existing.ticket_id) || str(row.id || row.ticket_id),
      control_flow_state: deriveCipcResponseState(existing),
    };
  }
  const consoleJson = asObj(row.consoleJson || row.console_json);
  const clientView = asObj(consoleJson.client_view);
  const cipc = asObj(clientView.cipc_desk);
  const brief = asObj(consoleJson.brief);
  const enquiry = {
    email_text: str(row.description || brief.summary),
    email: str(cipc.sender_email || row.email),
    company: str(cipc.company || cipc.business_name),
    asked: str(brief.requested_change || brief.summary),
    source: str(cipc.preview_source) === 'email-intake' ? 'unknown' : 'unknown',
    service: str(brief.service),
  };
  return buildCipcResponseOverlay({
    enquiry,
    interpreted: { clientRoute: str(cipc.client_route), service: { serviceSlug: str(brief.service) } },
    ticket_id: str(row.id || row.ticket_id),
    stored: existing,
  });
}

/**
 * Map an existing campaign board row onto the response overlay without a second CRM.
 *
 * @param {Record<string, unknown>} campaignRow
 * @returns {Record<string, unknown>}
 */
export function mapCampaignRecordToResponse(campaignRow) {
  const row = asObj(campaignRow);
  const enquiry = {
    email: str(row.email),
    company: str(row.company),
    contact_name: str(row.decision_maker_name),
    phone: str(row.phone),
    website: str(row.website),
    asked: str(row.positioning_angle) || 'Campaign partner outreach',
    source: 'campaign',
    campaign_prospect_id: str(row.prospect_id),
  };
  const overlay = buildCipcResponseOverlay({
    enquiry,
    interpreted: { clientRoute: 'professional_partner' },
    lead_id: str(row.lead_id),
    stored: {
      approval_state: str(row.approval_state),
      send_state: str(row.send_state),
      response_state: str(row.response_state),
      next_action: str(row.next_action),
      next_action_due: str(row.next_action_due),
      do_not_contact: row.do_not_contact === true,
      campaign_prospect_id: str(row.prospect_id),
    },
  });
  overlay.source = 'campaign';
  overlay.classification = 'professional_partner';
  overlay.campaign_prospect_id = str(row.prospect_id);
  overlay.duplicate_of = str(row.duplicate_of);
  if (overlay.duplicate_of) overlay.send_state = 'blocked';
  overlay.control_flow_state = deriveCipcResponseState(overlay);
  return overlay;
}

/**
 * @param {{
 *   ticketRows?: Array<Record<string, unknown>>,
 *   campaignRecords?: Array<Record<string, unknown>>,
 * }} [opts]
 * @returns {Record<string, unknown>[]}
 */
export function listCipcResponseBoard(opts = {}) {
  const tickets = Array.isArray(opts.ticketRows) ? opts.ticketRows : [];
  const campaigns = Array.isArray(opts.campaignRecords) ? opts.campaignRecords : [];
  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (const ticket of tickets) {
    const overlay = hydrateCipcResponseFromTicket(ticket);
    if (!str(overlay.version)) continue;
    rows.push(overlay);
  }
  for (const campaign of campaigns) {
    rows.push(mapCampaignRecordToResponse(campaign));
  }
  const firstByKey = new Map();
  for (const row of rows) {
    const id = str(row.ticket_id || row.campaign_prospect_id || row.public_reference);
    for (const key of asArr(row.dedupe_keys).map((x) => str(x))) {
      const existing = firstByKey.get(key);
      if (existing && existing !== id) {
        row.duplicate_of = row.duplicate_of || existing;
        row.send_state = 'blocked';
        row.next_action = 'Duplicate suppressed. Keep the first record; do not send this copy.';
      } else if (!existing && id) {
        firstByKey.set(key, id);
      }
    }
    row.control_flow_state = deriveCipcResponseState(row);
  }
  return rows;
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
export function applyCipcResponseIntent(record, intent, patch) {
  const current = { ...asObj(record) };
  const action = str(intent).toLowerCase();
  const extra = asObj(patch);

  if (
    action === 'send' ||
    action === 'live_send' ||
    action === 'mark_sent' ||
    action === 'quote' ||
    action === 'quotation' ||
    action === 'commit' ||
    action === 'payment' ||
    action === 'pay' ||
    action === 'submit' ||
    action === 'file'
  ) {
    const protectedAction =
      action === 'pay' || action === 'payment'
        ? 'payment activation or live payment'
        : action === 'submit' || action === 'file'
          ? 'controlled external CIPC submission'
          : action === 'quote' || action === 'quotation' || action === 'commit'
            ? 'commercial quotation or commitment'
            : 'live email/WhatsApp/SMS send';
    return {
      applied: false,
      record: current,
      protected_gate_encountered: true,
      exact_protected_action: protectedAction,
      reason: 'protected_action_blocked',
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
    if (str(current.classification) === 'spam_unusable') {
      return {
        applied: false,
        record: current,
        protected_gate_encountered: false,
        exact_protected_action: null,
        reason: 'spam_unusable',
      };
    }
    current.approval_state = 'operator_approved';
    current.send_state = 'ready_to_send';
    current.next_action = 'Ready to send after Anton send-policy approval. Do not send from the system.';
    const scheduled = calculateCipcResponseFollowUp(
      { ...current, follow_up_step: 0, send_state: 'ready_to_send' },
      { now: str(extra.now), simulate_sent: false },
    );
    current.follow_up_step = scheduled.follow_up_step;
    current.next_action_due = scheduled.next_action_due;
    current.control_flow_state = deriveCipcResponseState(current);
    current.send = false;
    current.may_live_send = false;
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
    current.next_action_due = '';
    current.control_flow_state = deriveCipcResponseState(current);
    return {
      applied: true,
      record: current,
      protected_gate_encountered: false,
      exact_protected_action: null,
    };
  }

  if (action === 'do_not_contact' || action === 'unsubscribe') {
    current.do_not_contact = true;
    current.approval_state = str(current.approval_state) === 'operator_approved' ? 'pending' : current.approval_state;
    current.send_state = 'blocked';
    current.response_state = 'closed';
    current.next_action = 'Do not contact. Campaign follow-up and send are permanently blocked.';
    current.next_action_due = '';
    current.control_flow_state = 'do_not_contact';
    return {
      applied: true,
      record: current,
      protected_gate_encountered: false,
      exact_protected_action: null,
    };
  }

  if (action === 'simulate_sent' || action === 'schedule_follow_up') {
    if (current.do_not_contact === true) {
      return {
        applied: false,
        record: current,
        protected_gate_encountered: false,
        exact_protected_action: null,
        reason: 'do_not_contact_blocks_follow_up',
      };
    }
    const scheduled = calculateCipcResponseFollowUp(current, {
      now: str(extra.now),
      simulate_sent: action === 'simulate_sent',
    });
    if (action === 'simulate_sent') scheduled.send_state = 'send_simulated';
    scheduled.control_flow_state = deriveCipcResponseState(scheduled);
    scheduled.created_new_record = false;
    return {
      applied: true,
      record: scheduled,
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
 * Idempotent reply linker. Never creates a second lead/ticket.
 *
 * @param {Array<Record<string, unknown>>} records
 * @param {Record<string, unknown>} replyMeta
 * @returns {{
 *   linked: boolean,
 *   created: false,
 *   idempotent: boolean,
 *   record: Record<string, unknown> | null,
 *   reason: string,
 * }}
 */
export function linkCipcResponseReply(records, replyMeta) {
  const reply = asObj(replyMeta);
  const replyId = str(reply.reply_id || reply.message_id);
  const enquiry = {
    email: str(reply.sender_email || reply.email || reply.from_email),
    company: str(reply.company),
    website: str(reply.website),
    thread_id: str(reply.thread_id || reply.in_reply_to),
    message_id: str(reply.in_reply_to || reply.message_id),
  };
  const match =
    findCipcResponseDuplicate(records, {
      ...enquiry,
      thread_id: str(reply.thread_id),
      message_id: str(reply.in_reply_to),
    }) ||
    findCipcResponseDuplicate(records, enquiry);
  if (!match) {
    return {
      linked: false,
      created: false,
      idempotent: true,
      record: null,
      reason: 'no_matching_record',
    };
  }
  const current = { ...asObj(match) };
  const replies = asArr(current.replies).map((row) => asObj(row));
  if (replyId && replies.some((row) => str(row.reply_id || row.message_id) === replyId)) {
    return {
      linked: true,
      created: false,
      idempotent: true,
      record: current,
      reason: 'already_linked',
    };
  }
  const body = str(reply.body || reply.text || reply.email_text);
  const question = replyLooksLikeQuestionOrCondition(body);
  replies.push({
    reply_id: replyId || buildCipcResponsePublicReference('', { email: body.slice(0, 40) }),
    message_id: str(reply.message_id),
    thread_id: str(reply.thread_id || current.thread_id),
    sender_email: normalizeResponseEmail(reply.sender_email || reply.email),
    received_at: str(reply.received_at) || new Date().toISOString(),
    question_or_condition: question,
    treated_as_approval: false,
    snippet: body.slice(0, 400),
  });
  current.replies = replies;
  current.thread_id = current.thread_id || str(reply.thread_id);
  current.response_state = question ? 'question_or_condition' : 'replied';
  current.next_action = question
    ? 'Reply contains a question or condition. Operator review required. Do not treat as yes/no approval.'
    : 'Reply linked to existing matter. Operator review required. Do not treat as send approval.';
  current.control_flow_state = deriveCipcResponseState(current);
  return {
    linked: true,
    created: false,
    idempotent: false,
    record: current,
    reason: 'linked',
  };
}

/**
 * Buyer-facing confirmation. No operator/test jargon.
 *
 * @param {Record<string, unknown>} overlay
 * @returns {{ reference: string, message: string }}
 */
export function buildCipcResponsePublicConfirmation(overlay) {
  const row = asObj(overlay);
  const reference = str(row.public_reference) || 'CD-PENDING';
  return {
    reference,
    message:
      `Thank you. We have recorded your enquiry under reference ${reference}. ` +
      'We will reply using the contact details you provided. This enquiry is not a filing instruction and does not start CIPC work until scope is agreed.',
  };
}

/**
 * Combine intake inference + overlay + duplicate check (pure).
 *
 * @param {{
 *   emailText: string,
 *   body?: Record<string, unknown>,
 *   interpreted?: Record<string, unknown>,
 *   existingRecords?: Array<Record<string, unknown>>,
 *   ticket_id?: string,
 *   lead_id?: string,
 *   now?: string,
 * }} args
 * @returns {Record<string, unknown>}
 */
export function applyCipcResponseIntake(args) {
  const enquiry = parseCipcEnquiryFromIntake(args.emailText, args.body);
  const duplicate = findCipcResponseDuplicate(args.existingRecords || [], enquiry);
  const overlay = buildCipcResponseOverlay({
    enquiry,
    interpreted: args.interpreted,
    ticket_id: str(args.ticket_id || duplicate?.ticket_id),
    lead_id: str(args.lead_id || duplicate?.lead_id),
    stored: duplicate ? asObj(duplicate) : {},
    now: args.now,
  });
  if (duplicate) {
    overlay.ticket_id = str(duplicate.ticket_id) || overlay.ticket_id;
    overlay.lead_id = str(duplicate.lead_id) || overlay.lead_id;
    overlay.public_reference = str(duplicate.public_reference) || overlay.public_reference;
    overlay.do_not_contact = overlay.do_not_contact || duplicate.do_not_contact === true;
    if (overlay.do_not_contact) overlay.send_state = 'blocked';
    overlay.duplicate_of = '';
    overlay.next_action = str(duplicate.next_action) || overlay.next_action;
    overlay.control_flow_state = deriveCipcResponseState(overlay);
  }
  const confirmation = buildCipcResponsePublicConfirmation(overlay);
  return {
    enquiry,
    overlay,
    duplicate: Boolean(duplicate),
    existing: duplicate,
    confirmation,
    created_new_record: !duplicate,
  };
}
