/**
 * CorpFlowAI MUR rapid-delivery discovery → operator workflow (no second CRM).
 * Product marker on leads.qualificationJson.intake_meta.product.
 */

import {
  RAPID_DELIVERY_OFFER_SLUGS,
  getRapidDeliveryOffer,
} from '../../public/rapid-delivery-offers.js';
import {
  corpFlowEnquiryUrgencyLabel,
  getCorpFlowServicePath,
  isCorpFlowServicePathId,
} from '../../public/corpflow-service-paths.js';

export const RAPID_DELIVERY_PRODUCT = 'corpflow-rapid-delivery';

export const RAPID_DELIVERY_INTAKE_NOTIFICATION_EVENT = 'corpflow.rapid_delivery.intake_received';

/**
 * Persistable operator status values (stored in qualificationJson.rapid_delivery_operator.status).
 * Legacy values `qualified` and `closed` remain accepted on read/write for existing rows.
 *
 * @type {readonly string[]}
 */
export const RAPID_DELIVERY_OPERATOR_STATUSES = Object.freeze([
  'new_intake',
  'reviewing',
  'discovery_booked',
  'quote_ready',
  'proposal_sent',
  'won',
  'not_fit',
  // Legacy (mapped to discovery_booked / won for display)
  'qualified',
  'closed',
]);

/** Statuses shown in the operator status control (excludes legacy aliases). */
export const RAPID_DELIVERY_OPERATOR_STATUS_OPTIONS = Object.freeze([
  { value: 'new_intake', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'discovery_booked', label: 'Discovery booked' },
  { value: 'quote_ready', label: 'Proposal required' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'won', label: 'Won' },
  { value: 'not_fit', label: 'Not proceeding' },
]);

/** Summary cards computed from the loaded list only. */
export const RAPID_DELIVERY_SUMMARY_CARD_DEFS = Object.freeze([
  { key: 'new', label: 'New', statuses: ['new_intake'] },
  { key: 'reviewing', label: 'Reviewing', statuses: ['reviewing'] },
  { key: 'discovery_booked', label: 'Discovery booked', statuses: ['discovery_booked', 'qualified'] },
  { key: 'proposal_required', label: 'Proposal required', statuses: ['quote_ready', 'proposal_sent'] },
  { key: 'won', label: 'Won', statuses: ['won', 'closed'] },
]);

const STATUS_LABEL_BY_VALUE = Object.freeze(
  Object.fromEntries([
    ...RAPID_DELIVERY_OPERATOR_STATUS_OPTIONS.map((o) => [o.value, o.label]),
    ['qualified', 'Discovery booked'],
    ['closed', 'Won'],
  ]),
);

/** Map legacy persisted values to the current select option value. */
const LEGACY_STATUS_TO_OPTION = Object.freeze({
  qualified: 'discovery_booked',
  closed: 'won',
});

/**
 * @param {string | null | undefined} leadId
 * @returns {string}
 */
export function rapidDeliveryReferenceFromLeadId(leadId) {
  const id = String(leadId || '').trim();
  if (!id) return 'CF-PENDING';
  const tail = id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  return `CF-${tail || 'XXXXXX'}`;
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isRapidDeliveryOfferSlug(slug) {
  return RAPID_DELIVERY_OFFER_SLUGS.includes(/** @type {any} */ (String(slug || '').trim()));
}

/**
 * @param {unknown} q
 * @returns {Record<string, unknown> | null}
 */
function asObject(q) {
  if (!q || typeof q !== 'object' || Array.isArray(q)) return null;
  return /** @type {Record<string, unknown>} */ (q);
}

/**
 * @param {{ qualificationJson?: unknown } | null | undefined} lead
 * @returns {boolean}
 */
export function isRapidDeliveryLead(lead) {
  const q = asObject(lead?.qualificationJson);
  const meta = asObject(q?.intake_meta);
  return String(meta?.product || '') === RAPID_DELIVERY_PRODUCT;
}

/**
 * @param {string} iso
 * @returns {Record<string, unknown>}
 */
export function defaultRapidDeliveryOperator(iso) {
  return {
    status: 'new_intake',
    notes: '',
    activity: [],
    created_at: iso,
    updated_at: iso,
  };
}

/**
 * @param {string} status
 * @returns {boolean}
 */
export function isRapidDeliveryOperatorStatus(status) {
  return RAPID_DELIVERY_OPERATOR_STATUSES.includes(String(status || ''));
}

/**
 * @param {unknown} status
 * @returns {string}
 */
export function normalizeRapidDeliveryStatus(status) {
  const s = String(status || '').trim();
  return isRapidDeliveryOperatorStatus(s) ? s : 'new_intake';
}

/**
 * Human-readable label for an operator status (never shows raw snake_case to operators).
 *
 * @param {string | null | undefined} status
 * @returns {string}
 */
export function rapidDeliveryStatusLabel(status) {
  const s = normalizeRapidDeliveryStatus(status);
  return STATUS_LABEL_BY_VALUE[s] || 'New';
}

/**
 * Value to show in `<select>` (maps legacy → current option values).
 *
 * @param {string | null | undefined} status
 * @returns {string}
 */
export function rapidDeliveryStatusSelectValue(status) {
  const s = normalizeRapidDeliveryStatus(status);
  return LEGACY_STATUS_TO_OPTION[s] || s;
}

/**
 * @param {Array<{ operator_status?: string | null }>} leads
 * @returns {Record<string, number>}
 */
export function countRapidDeliverySummaryCards(leads) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const def of RAPID_DELIVERY_SUMMARY_CARD_DEFS) counts[def.key] = 0;
  for (const lead of leads || []) {
    const st = normalizeRapidDeliveryStatus(lead?.operator_status);
    for (const def of RAPID_DELIVERY_SUMMARY_CARD_DEFS) {
      if (def.statuses.includes(st)) counts[def.key] += 1;
    }
  }
  return counts;
}

/**
 * @param {Record<string, unknown> | null | undefined} existing
 * @param {Record<string, unknown>} patch
 * @param {string} nowIso
 * @param {string} actor
 * @returns {Record<string, unknown>}
 */
export function mergeRapidDeliveryOperatorPatch(existing, patch, nowIso, actor) {
  const base = existing && typeof existing === 'object' ? { ...existing } : defaultRapidDeliveryOperator(nowIso);
  const next = { ...base };
  if (patch.status != null) {
    next.status = normalizeRapidDeliveryStatus(String(patch.status));
  }
  if (patch.notes != null) {
    next.notes = String(patch.notes).slice(0, 4000);
  }
  next.updated_at = nowIso;
  const activity = Array.isArray(next.activity) ? [...next.activity] : [];
  activity.push({
    at: nowIso,
    actor: actor || 'operator',
    status: next.status,
    note: patch.notes != null ? String(patch.notes).slice(0, 200) : undefined,
  });
  next.activity = activity.slice(-40);
  return next;
}

/**
 * @param {{ id: string, name?: string | null, email?: string | null, phone?: string | null, message?: string | null, status?: string | null, createdAt?: Date | string | null, qualificationJson?: unknown, tenantId?: string | null }} row
 */
/**
 * Recommended next operator action from status + enquiry shape (copy guidance only).
 *
 * @param {{ operator_status?: string | null, service_path?: string | null, offer_slug?: string | null, market_enquiry?: boolean }} item
 * @returns {string}
 */
export function recommendedRapidDeliveryNextAction(item) {
  const status = normalizeRapidDeliveryStatus(item?.operator_status);
  if (status === 'not_fit') return 'Mark closed as not proceeding; keep notes for future fit checks.';
  if (status === 'won' || status === 'closed') return 'Confirm ERPNext commercial record and delivery kickoff checklist.';
  if (status === 'proposal_sent') return 'Wait for prospect reply; log follow-up date in notes (manual contact only).';
  if (status === 'quote_ready') return 'Prepare proposal summary, then send only after Anton approval.';
  if (status === 'discovery_booked' || status === 'qualified') {
    return 'Run discovery call; confirm service path / sprint fit; capture scope notes.';
  }
  if (status === 'reviewing') {
    return 'Qualify fit against service path and capacity; book discovery or mark not proceeding.';
  }
  if (item?.market_enquiry || isCorpFlowServicePathId(item?.service_path)) {
    return 'Review qualified market enquiry; confirm service path fit; draft reply and book discovery if appropriate.';
  }
  return 'Review new intake; confirm offer fit; contact prospect manually if qualified.';
}

/**
 * Copy-ready first response draft for operator paste (no live send).
 *
 * @param {{
 *   name?: string | null,
 *   business_name?: string | null,
 *   service_path_title?: string | null,
 *   offer_title?: string | null,
 *   primary_pain?: string | null,
 *   reference?: string | null,
 * }} item
 * @returns {string}
 */
export function buildRapidDeliveryResponseDraft(item) {
  const contact = String(item?.name || 'there').trim() || 'there';
  const business = String(item?.business_name || 'your business').trim() || 'your business';
  const pathOrOffer =
    String(item?.service_path_title || item?.offer_title || 'your enquiry').trim() || 'your enquiry';
  const pain = String(item?.primary_pain || '').trim();
  const reference = String(item?.reference || '').trim();
  const lines = [
    `Hi ${contact},`,
    ``,
    `Thank you for contacting CorpFlowAI about ${pathOrOffer} for ${business}.`,
    pain ? `` : null,
    pain ? `You described: ${pain}` : null,
    ``,
    `We review each enquiry manually before proposing next steps. If there is a practical fit, the usual next step is a short discovery conversation to confirm scope — not an automated sales sequence.`,
    ``,
    `No payment is required to continue this conversation.`,
    reference ? `` : null,
    reference ? `Your reference: ${reference}` : null,
    ``,
    `Kind regards,`,
    `CorpFlowAI`,
  ].filter((line) => line != null);
  return lines.join('\n');
}

export function leadRowToRapidDeliveryListItem(row) {
  const q = asObject(row.qualificationJson);
  const meta = asObject(q?.intake_meta) || {};
  const op = asObject(q?.rapid_delivery_operator) || {};
  const offerSlug = String(meta.offer_slug || '');
  const offer = isRapidDeliveryOfferSlug(offerSlug) ? getRapidDeliveryOffer(offerSlug) : null;
  const servicePath = String(meta.service_path || '');
  const path = isCorpFlowServicePathId(servicePath) ? getCorpFlowServicePath(servicePath) : null;
  const discoveryNotes = String(meta.message || row.message || '') || null;
  const marketEnquiry = meta.market_enquiry === true || Boolean(path);
  const base = {
    id: row.id,
    reference: rapidDeliveryReferenceFromLeadId(row.id),
    tenant_id: row.tenantId || null,
    name: row.name || null,
    email: row.email || null,
    phone: row.phone || null,
    business_name: String(meta.business_name || '') || null,
    offer_slug: offerSlug || null,
    offer_title: offer?.title || null,
    offer_path: offer?.path || (offerSlug ? `/offers/${offerSlug}` : null),
    starting_price_mur: offer?.startingPriceMur || null,
    service_path: servicePath || null,
    service_path_title: path?.title || null,
    website: String(meta.website || '') || null,
    urgency: String(meta.urgency || '') || null,
    urgency_label: meta.urgency ? corpFlowEnquiryUrgencyLabel(String(meta.urgency)) : null,
    consent_to_contact: meta.consent_to_contact === true || String(meta.consent_to_contact) === 'true',
    source_host: String(meta.host || '') || null,
    market_enquiry: marketEnquiry,
    primary_pain: String(meta.primary_pain || '') || null,
    enquiry_channels: String(meta.enquiry_channels || '') || null,
    discovery_notes: discoveryNotes,
    lead_status: row.status || null,
    operator_status: normalizeRapidDeliveryStatus(op.status),
    operator_status_label: rapidDeliveryStatusLabel(op.status),
    operator_notes: String(op.notes || '') || '',
    created_at: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updated_at: op.updated_at ? String(op.updated_at) : null,
  };
  return {
    ...base,
    recommended_next_action: recommendedRapidDeliveryNextAction(base),
    response_draft: buildRapidDeliveryResponseDraft(base),
  };
}

/**
 * @param {{ id: string, name?: string | null, email?: string | null, phone?: string | null, message?: string | null, status?: string | null, createdAt?: Date | string | null, updatedAt?: Date | string | null, qualificationJson?: unknown, tenantId?: string | null }} row
 */
export function leadRowToRapidDeliveryDetail(row) {
  const list = leadRowToRapidDeliveryListItem(row);
  const q = asObject(row.qualificationJson);
  const meta = asObject(q?.intake_meta) || {};
  const op = asObject(q?.rapid_delivery_operator) || {};
  return {
    ...list,
    message: row.message || null,
    intake_meta: {
      business_name: meta.business_name ?? null,
      offer_slug: meta.offer_slug ?? null,
      service_path: meta.service_path ?? null,
      website: meta.website ?? null,
      urgency: meta.urgency ?? null,
      consent_to_contact: meta.consent_to_contact ?? null,
      enquiry_channels: meta.enquiry_channels ?? null,
      primary_pain: meta.primary_pain ?? null,
      message: meta.message ?? null,
      product: meta.product ?? null,
      host: meta.host ?? null,
      market_enquiry: meta.market_enquiry ?? null,
    },
    rapid_delivery_operator: {
      status: normalizeRapidDeliveryStatus(op.status),
      notes: op.notes ?? '',
      updated_at: op.updated_at ?? null,
    },
    row_updated_at: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

/**
 * Build operator-facing proposal-ready summary (copy/paste into ERPNext or email).
 * No automated outreach; Anton sends manually after approval.
 *
 * @param {{ id: string, name?: string | null, email?: string | null, phone?: string | null, message?: string | null, qualificationJson?: unknown }} row
 * @returns {{
 *   ok: true,
 *   reference: string,
 *   markdown: string,
 *   plain_text: string,
 *   offer_slug: string | null,
 *   sections: Record<string, unknown>,
 * } | { ok: false, error: string }}
 */
export function buildRapidDeliveryProposalSummary(row) {
  if (!isRapidDeliveryLead(row)) {
    return { ok: false, error: 'NOT_RAPID_DELIVERY_LEAD' };
  }
  const q = asObject(row.qualificationJson);
  const meta = asObject(q?.intake_meta) || {};
  const offerSlug = String(meta.offer_slug || '');
  const offer = isRapidDeliveryOfferSlug(offerSlug) ? getRapidDeliveryOffer(offerSlug) : null;
  const servicePath = String(meta.service_path || '');
  const path = isCorpFlowServicePathId(servicePath) ? getCorpFlowServicePath(servicePath) : null;
  const reference = rapidDeliveryReferenceFromLeadId(row.id);
  const mur = offer?.startingPriceMur
    ? `MUR ${offer.startingPriceMur.toLocaleString('en-MU')}`
    : path
      ? 'Scope and price confirmed after discovery (no fixed public price for this path)'
      : 'MUR (see catalog)';
  const offerPath = offer?.path || (offerSlug ? `/offers/${offerSlug}` : null);
  const offerUrl = offerPath ? `https://corpflowai.com${offerPath}` : null;
  const primaryPain = String(meta.primary_pain || '—');
  const discoveryNotes = String(meta.message || row.message || '—');
  const deliveryScope = offer?.deliveredOutputs || (path ? path.bullets : []);
  const clientProvides = offer?.clientProvides || [
    'Business context and access needed for discovery',
    'A decision-maker available for a short review call',
    'Honest constraints on tools, timing and approvals',
  ];
  const listItem = leadRowToRapidDeliveryListItem(row);
  const guardrails = [
    'No guaranteed revenue outcomes.',
    'Final scope confirmed after discovery; third-party fees quoted separately.',
    'Mauritius delivery-sprint clients pay deposits and balances in MUR by manual bank transfer (ERPNext invoice). USD banking for this sprint path is still being obtained — do not ask MUR sprint clients to pay in USD.',
    'No card capture on public marketing pages.',
    'Outreach and send of this summary require explicit Anton approval.',
  ];
  const nextSteps = [
    listItem.recommended_next_action,
    'Confirm fit on /admin/rapid-delivery or /change/revenue.',
    'Use the copy-ready response draft only — do not auto-send.',
    'Call using docs/revenue/templates/discovery-call-script.md if not already done.',
    'Demonstrate delivery proof (links above) on the discovery call.',
    'Send quote using docs/revenue/templates/quote-email.md only after Anton approval.',
    'Record authoritative commercial state in ERPNext.',
  ];

  const sections = {
    prospect: {
      business: String(meta.business_name || '—'),
      contact: row.name || '—',
      email: row.email || '—',
      phone: row.phone || '—',
      website: String(meta.website || '—'),
      enquiry_channels: String(meta.enquiry_channels || '—'),
      primary_pain: primaryPain,
      urgency: meta.urgency ? corpFlowEnquiryUrgencyLabel(String(meta.urgency)) : '—',
      source_host: String(meta.host || '—'),
      consent_to_contact: meta.consent_to_contact === true || String(meta.consent_to_contact) === 'true' ? 'Yes' : '—',
      reference,
    },
    recommended_sprint: offer?.title || path?.title || offerSlug || 'Not specified',
    service_path: path?.title || servicePath || null,
    starting_price: offer ? `from ${mur}` : mur,
    deposit: offer?.depositNote ||
      (path
        ? 'Commercial terms confirmed after discovery — no deposit collected on the public enquiry form.'
        : '50% deposit in MUR via manual bank transfer (ERPNext invoice); balance per quote. Mauritius sprint clients pay in MUR.'),
    prospect_needs: {
      primary_pain: primaryPain,
      discovery_notes: discoveryNotes,
    },
    delivery_scope: deliveryScope,
    client_responsibilities: clientProvides,
    timeline: offer?.deliveryTimeline || (meta.urgency ? corpFlowEnquiryUrgencyLabel(String(meta.urgency)) : '—'),
    delivery_proof: {
      statement: offer?.proofLanguage || 'Show CorpFlowAI homepage proof section, /standards and relevant test surfaces.',
      offer_url: offerUrl,
      standards_url: 'https://corpflowai.com/standards',
      process_url: 'https://corpflowai.com/process',
    },
    commercial_guardrails: guardrails,
    operator_next_steps: nextSteps,
    recommended_next_action: listItem.recommended_next_action,
    response_draft: listItem.response_draft,
  };

  const lines = [
    `# CorpFlowAI proposal-ready summary`,
    ``,
    `**Reference:** ${reference}`,
    `**Service path / offer:** ${sections.recommended_sprint}`,
    `**Starting price:** ${sections.starting_price}`,
    `**Deposit:** ${sections.deposit}`,
    `**Recommended next action:** ${sections.recommended_next_action}`,
    ``,
    `## Prospect`,
    `- Business: ${sections.prospect.business}`,
    `- Contact: ${sections.prospect.contact}`,
    `- Email: ${sections.prospect.email}`,
    `- Phone: ${sections.prospect.phone}`,
    `- Website: ${sections.prospect.website}`,
    `- Enquiry channels today: ${sections.prospect.enquiry_channels}`,
    `- Timing: ${sections.prospect.urgency}`,
    `- Source host: ${sections.prospect.source_host}`,
    `- Consent to contact: ${sections.prospect.consent_to_contact}`,
    `- Primary pain: ${primaryPain}`,
    ``,
    `## Prospect needs`,
    `- Primary pain: ${primaryPain}`,
    `- Discovery notes: ${discoveryNotes}`,
    ``,
    `## Copy-ready response draft (do not auto-send)`,
    sections.response_draft,
    ``,
    `## Delivery scope`,
    ...deliveryScope.map((o) => `- ${o}`),
    ``,
    `## Client responsibilities`,
    ...clientProvides.map((o) => `- ${o}`),
    ``,
    `## Timeline`,
    sections.timeline,
    ``,
    `## Delivery proof (demonstrate on call — do not auto-send)`,
    sections.delivery_proof.statement,
    offerUrl ? `- Public offer page: ${offerUrl}` : '',
    `- Operating standards: https://corpflowai.com/standards`,
    `- Process: https://corpflowai.com/process`,
    ``,
    `## Commercial guardrails`,
    ...guardrails.map((g) => `- ${g}`),
    ``,
    `## Operator next steps`,
    ...nextSteps.map((s, i) => `${i + 1}. ${s}`),
  ].filter((line) => line !== '');

  const markdown = lines.join('\n');
  const plain_text = markdown
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^- /gm, '• ');

  return {
    ok: true,
    reference,
    offer_slug: offerSlug || null,
    markdown,
    plain_text,
    sections,
  };
}
