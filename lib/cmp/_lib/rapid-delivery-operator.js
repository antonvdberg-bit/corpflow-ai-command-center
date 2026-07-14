/**
 * CorpFlowAI MUR rapid-delivery discovery → operator workflow (no second CRM).
 * Product marker on leads.qualificationJson.intake_meta.product.
 */

import {
  RAPID_DELIVERY_OFFER_SLUGS,
  getRapidDeliveryOffer,
} from '../../public/rapid-delivery-offers.js';

export const RAPID_DELIVERY_PRODUCT = 'corpflow-rapid-delivery';

export const RAPID_DELIVERY_INTAKE_NOTIFICATION_EVENT = 'corpflow.rapid_delivery.intake_received';

/** @type {readonly string[]} */
export const RAPID_DELIVERY_OPERATOR_STATUSES = Object.freeze([
  'new_intake',
  'reviewing',
  'qualified',
  'not_fit',
  'quote_ready',
  'closed',
]);

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
 * @param {{ id: string, name?: string | null, email?: string | null, phone?: string | null, status?: string | null, createdAt?: Date | string | null, qualificationJson?: unknown, tenantId?: string | null }} row
 */
export function leadRowToRapidDeliveryListItem(row) {
  const q = asObject(row.qualificationJson);
  const meta = asObject(q?.intake_meta) || {};
  const op = asObject(q?.rapid_delivery_operator) || {};
  const offerSlug = String(meta.offer_slug || '');
  const offer = isRapidDeliveryOfferSlug(offerSlug) ? getRapidDeliveryOffer(offerSlug) : null;
  return {
    id: row.id,
    reference: rapidDeliveryReferenceFromLeadId(row.id),
    tenant_id: row.tenantId || null,
    name: row.name || null,
    email: row.email || null,
    phone: row.phone || null,
    business_name: String(meta.business_name || '') || null,
    offer_slug: offerSlug || null,
    offer_title: offer?.title || null,
    starting_price_mur: offer?.startingPriceMur || null,
    primary_pain: String(meta.primary_pain || '') || null,
    enquiry_channels: String(meta.enquiry_channels || '') || null,
    lead_status: row.status || null,
    operator_status: normalizeRapidDeliveryStatus(op.status),
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
  return {
    ...list,
    message: row.message || null,
    intake_meta: meta,
    rapid_delivery_operator: op,
    qualification_json: q,
    row_updated_at: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

/**
 * Build operator-facing proposal-ready summary (copy/paste into ERPNext or email).
 * No automated outreach; Anton sends manually after approval.
 *
 * @param {{ id: string, name?: string | null, email?: string | null, phone?: string | null, message?: string | null, qualificationJson?: unknown }} row
 * @returns {{ ok: true, reference: string, markdown: string, offer_slug: string | null } | { ok: false, error: string }}
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

  const lines = [
    `# CorpFlowAI proposal-ready summary`,
    ``,
    `**Reference:** ${reference}`,
    `**Offer:** ${offer?.title || offerSlug || 'Not specified'}`,
    `**Starting price:** from ${mur}`,
    `**Deposit:** ${offer?.depositNote || '50% deposit before work; balance per quote'}`,
    ``,
    `## Prospect`,
    `- Business: ${String(meta.business_name || '—')}`,
    `- Contact: ${row.name || '—'}`,
    `- Email: ${row.email || '—'}`,
    `- Phone: ${row.phone || '—'}`,
    `- Enquiry channels today: ${String(meta.enquiry_channels || '—')}`,
    `- Primary pain: ${String(meta.primary_pain || '—')}`,
    ``,
    `## Discovery notes`,
    String(meta.message || row.message || '—'),
    ``,
    `## What CorpFlowAI will deliver (catalog)`,
    ...(offer?.deliveredOutputs || []).map((o) => `- ${o}`),
    ``,
    `## What the client provides`,
    ...(offer?.clientProvides || []).map((o) => `- ${o}`),
    ``,
    `## Timeline`,
    offer?.deliveryTimeline || '—',
    ``,
    `## Delivery proof (demonstrate on call — do not auto-send)`,
    offer?.proofLanguage || 'Show corresponding /offers/{slug} proof section and /standards.',
    offerSlug ? `- Public offer page: https://corpflowai.com/offers/${offerSlug}` : '',
    `- Operating standards: https://corpflowai.com/standards`,
    `- Process: https://corpflowai.com/process`,
    ``,
    `## Commercial guardrails`,
    `- No guaranteed revenue outcomes.`,
    `- Final scope confirmed after discovery; third-party fees quoted separately.`,
    `- Manual bank transfer / ERPNext invoice path — no card capture on public pages.`,
    `- Outreach and send of this summary require explicit Anton approval.`,
    ``,
    `## Operator next steps`,
    `1. Confirm fit on /admin/rapid-delivery or /change/revenue.`,
    `2. Call using docs/revenue/templates/discovery-call-script.md if not already done.`,
    `3. Demonstrate delivery proof (links above) on the discovery call.`,
    `4. Send quote using docs/revenue/templates/quote-email.md only after Anton approval.`,
    `5. Record authoritative commercial state in ERPNext.`,
  ].filter((line) => line !== '');

  return {
    ok: true,
    reference,
    offer_slug: offerSlug || null,
    markdown: lines.join('\n'),
  };
}
