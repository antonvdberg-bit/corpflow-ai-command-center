/**
 * CorpFlowAI MUR rapid-delivery discovery → operator workflow (no second CRM).
 * Product marker on leads.qualificationJson.intake_meta.product.
 */

import {
  RAPID_DELIVERY_OFFER_SLUGS,
  getRapidDeliveryOffer,
} from '../../public/rapid-delivery-offers.js';
import {
  buildMarketEnquiryResponseDraft,
  marketServicePathLabel,
  marketUrgencyLabel,
  recommendedMarketEnquiryNextAction,
} from '../../public/corpflow-market-service-paths.js';

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
export function leadRowToRapidDeliveryListItem(row) {
  const q = asObject(row.qualificationJson);
  const meta = asObject(q?.intake_meta) || {};
  const op = asObject(q?.rapid_delivery_operator) || {};
  const offerSlug = String(meta.offer_slug || '');
  const offer = isRapidDeliveryOfferSlug(offerSlug) ? getRapidDeliveryOffer(offerSlug) : null;
  const discoveryNotes = String(meta.message || row.message || '') || null;
  const servicePath = String(meta.service_path || '') || null;
  const operatorStatus = normalizeRapidDeliveryStatus(op.status);
  const source =
    String(meta.source || meta.page || meta.host || '').trim() ||
    String(meta.host || '') ||
    null;
  return {
    id: row.id,
    reference: rapidDeliveryReferenceFromLeadId(row.id),
    tenant_id: row.tenantId || null,
    name: row.name || null,
    email: row.email || null,
    phone: row.phone || null,
    business_name: String(meta.business_name || '') || null,
    website: String(meta.website || '') || null,
    service_path: servicePath,
    service_path_label: servicePath ? marketServicePathLabel(servicePath) : null,
    offer_slug: offerSlug || null,
    offer_title: offer?.title || null,
    offer_path: offer?.path || (offerSlug ? `/offers/${offerSlug}` : null),
    starting_price_mur: offer?.startingPriceMur || null,
    primary_pain: String(meta.primary_pain || '') || null,
    enquiry_channels: String(meta.enquiry_channels || '') || null,
    urgency: String(meta.urgency || '') || null,
    urgency_label: meta.urgency ? marketUrgencyLabel(String(meta.urgency)) : null,
    consent_contact: meta.consent_contact === true || meta.consent_contact === 'true' || null,
    source,
    source_host: String(meta.host || '') || null,
    discovery_notes: discoveryNotes,
    lead_status: row.status || null,
    operator_status: operatorStatus,
    operator_status_label: rapidDeliveryStatusLabel(op.status),
    recommended_next_action: recommendedMarketEnquiryNextAction({
      service_path: servicePath,
      offer_slug: offerSlug,
      urgency: String(meta.urgency || ''),
      operator_status: operatorStatus,
    }),
    response_draft: buildMarketEnquiryResponseDraft({
      contactName: row.name,
      businessName: String(meta.business_name || ''),
      servicePathId: servicePath,
      offerTitle: offer?.title || null,
      primaryPain: String(meta.primary_pain || ''),
      reference: rapidDeliveryReferenceFromLeadId(row.id),
    }),
    operator_notes: String(op.notes || '') || '',
    created_at: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updated_at: op.updated_at ? String(op.updated_at) : null,
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
  const responseDraft = buildMarketEnquiryResponseDraft({
    contactName: row.name,
    businessName: String(meta.business_name || ''),
    servicePathId: String(meta.service_path || ''),
    offerTitle: list.offer_title,
    primaryPain: String(meta.primary_pain || ''),
    reference: list.reference,
  });
  return {
    ...list,
    message: row.message || null,
    intake_meta: {
      business_name: meta.business_name ?? null,
      offer_slug: meta.offer_slug ?? null,
      service_path: meta.service_path ?? null,
      website: meta.website ?? null,
      enquiry_channels: meta.enquiry_channels ?? null,
      primary_pain: meta.primary_pain ?? null,
      urgency: meta.urgency ?? null,
      consent_contact: meta.consent_contact ?? null,
      message: meta.message ?? null,
      product: meta.product ?? null,
      source: meta.source ?? null,
      page: meta.page ?? null,
      host: meta.host ?? null,
    },
    rapid_delivery_operator: {
      status: normalizeRapidDeliveryStatus(op.status),
      notes: op.notes ?? '',
      updated_at: op.updated_at ?? null,
    },
    response_draft: responseDraft,
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
  const reference = rapidDeliveryReferenceFromLeadId(row.id);
  const mur = offer?.startingPriceMur
    ? `MUR ${offer.startingPriceMur.toLocaleString('en-MU')}`
    : 'MUR (see catalog)';
  const offerPath = offer?.path || (offerSlug ? `/offers/${offerSlug}` : null);
  const offerUrl = offerPath ? `https://corpflowai.com${offerPath}` : null;
  const primaryPain = String(meta.primary_pain || '—');
  const discoveryNotes = String(meta.message || row.message || '—');
  const deliveryScope = offer?.deliveredOutputs || [];
  const clientProvides = offer?.clientProvides || [];
  const guardrails = [
    'No guaranteed revenue outcomes.',
    'Final scope confirmed after discovery; third-party fees quoted separately.',
    'Mauritius delivery-sprint clients pay deposits and balances in MUR by manual bank transfer (ERPNext invoice). USD banking for this sprint path is still being obtained — do not ask MUR sprint clients to pay in USD.',
    'No card capture on public marketing pages.',
    'Outreach and send of this summary require explicit Anton approval.',
  ];
  const nextSteps = [
    'Confirm fit on /admin/rapid-delivery or /change/revenue.',
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
      enquiry_channels: String(meta.enquiry_channels || '—'),
      primary_pain: primaryPain,
      reference,
    },
    recommended_sprint: offer?.title || offerSlug || 'Not specified',
    starting_price: `from ${mur}`,
    deposit: offer?.depositNote ||
      '50% deposit in MUR via manual bank transfer (ERPNext invoice); balance per quote. Mauritius sprint clients pay in MUR.',
    prospect_needs: {
      primary_pain: primaryPain,
      discovery_notes: discoveryNotes,
    },
    delivery_scope: deliveryScope,
    client_responsibilities: clientProvides,
    timeline: offer?.deliveryTimeline || '—',
    delivery_proof: {
      statement: offer?.proofLanguage || 'Show corresponding offer page and /standards.',
      offer_url: offerUrl,
      standards_url: 'https://corpflowai.com/standards',
      process_url: 'https://corpflowai.com/process',
    },
    commercial_guardrails: guardrails,
    operator_next_steps: nextSteps,
  };

  const lines = [
    `# CorpFlowAI proposal-ready summary`,
    ``,
    `**Reference:** ${reference}`,
    `**Offer:** ${sections.recommended_sprint}`,
    `**Starting price:** ${sections.starting_price}`,
    `**Deposit:** ${sections.deposit}`,
    ``,
    `## Prospect`,
    `- Business: ${sections.prospect.business}`,
    `- Contact: ${sections.prospect.contact}`,
    `- Email: ${sections.prospect.email}`,
    `- Phone: ${sections.prospect.phone}`,
    `- Enquiry channels today: ${sections.prospect.enquiry_channels}`,
    `- Primary pain: ${primaryPain}`,
    ``,
    `## Prospect needs`,
    `- Primary pain: ${primaryPain}`,
    `- Discovery notes: ${discoveryNotes}`,
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
