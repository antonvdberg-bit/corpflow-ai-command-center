/**
 * Lux private-client qualification + curated shortlist (issue #685).
 * Stored only in lead.qualification_json — no DB/schema change.
 *
 * Keys:
 *   qualification_json.private_client_qualification
 *   qualification_json.curated_shortlist
 *
 * Operator surfaces only (/change + concierge-lead-operator-patch).
 * No live email / WhatsApp / SMS send.
 */

import {
  findLuxStagedPropertyBySlug,
  getPublicLuxStagedProperties,
  isLuxStagedPropertySlug,
} from '../../client/luxe-maurice-staged-properties.js';

/** @type {readonly string[]} */
export const LUX_QUALIFICATION_FIELDS = Object.freeze([
  'buyer_objective',
  'preferred_area',
  'property_type',
  'budget_band',
  'timing',
  'residency_investment_interest',
  'confidentiality_preference',
]);

const FIELD_LABELS = Object.freeze({
  buyer_objective: 'Buyer objective',
  preferred_area: 'Preferred area',
  property_type: 'Property type',
  budget_band: 'Budget band',
  timing: 'Timing',
  residency_investment_interest: 'Residency / investment interest',
  confidentiality_preference: 'Confidentiality preference',
});

const MAX_SHORTLIST = 12;
const MAX_FIELD = 500;
const MAX_SHORTLIST_NOTE = 800;

/**
 * @param {unknown} v
 * @param {number} [max]
 */
function trimField(v, max = MAX_FIELD) {
  if (v == null) return '';
  return String(v).trim().slice(0, max);
}

/**
 * Seed qualification gaps from existing access_request / property_interest / message.
 * Does not invent client facts — only maps already-stored fields.
 * @param {unknown} qualificationJson
 * @returns {Record<string, string>}
 */
export function deriveLuxQualificationHints(qualificationJson) {
  const root = qualificationJson && typeof qualificationJson === 'object' ? qualificationJson : {};
  const ar = root.access_request && typeof root.access_request === 'object' ? root.access_request : {};
  const pi = root.property_interest && typeof root.property_interest === 'object' ? root.property_interest : {};
  const hints = {};

  if (ar.access_intent) hints.buyer_objective = trimField(ar.access_intent);
  else if (ar.access_category) hints.buyer_objective = trimField(ar.access_category);

  if (ar.desired_location) hints.preferred_area = trimField(ar.desired_location);
  else if (pi.region) hints.preferred_area = trimField(pi.region);

  if (ar.property_type) hints.property_type = trimField(ar.property_type);
  else if (pi.property_type) hints.property_type = trimField(pi.property_type);

  const min = ar.budget_min != null && Number.isFinite(Number(ar.budget_min)) ? Number(ar.budget_min) : null;
  const max = ar.budget_max != null && Number.isFinite(Number(ar.budget_max)) ? Number(ar.budget_max) : null;
  const currency = ar.currency_code != null ? String(ar.currency_code).trim() : 'USD';
  if (min != null || max != null) {
    const left = min != null ? `${currency} ${Math.round(min).toLocaleString('en-US')}` : '';
    const right = max != null ? `${currency} ${Math.round(max).toLocaleString('en-US')}` : '';
    hints.budget_band = left && right ? `${left} – ${right}` : left || right;
  } else if (pi.price_range) {
    hints.budget_band = trimField(pi.price_range);
  }

  return hints;
}

/**
 * @param {unknown} qj
 * @returns {{
 *   buyer_objective: string,
 *   preferred_area: string,
 *   property_type: string,
 *   budget_band: string,
 *   timing: string,
 *   residency_investment_interest: string,
 *   confidentiality_preference: string,
 *   updated_at: string | null,
 *   updated_by: string | null,
 * }}
 */
export function parseLuxPrivateClientQualification(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const raw =
    root.private_client_qualification && typeof root.private_client_qualification === 'object'
      ? root.private_client_qualification
      : {};
  const hints = deriveLuxQualificationHints(root);
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of LUX_QUALIFICATION_FIELDS) {
    const stored = trimField(raw[key]);
    out[key] = stored || hints[key] || '';
  }
  return {
    buyer_objective: out.buyer_objective,
    preferred_area: out.preferred_area,
    property_type: out.property_type,
    budget_band: out.budget_band,
    timing: out.timing,
    residency_investment_interest: out.residency_investment_interest,
    confidentiality_preference: out.confidentiality_preference,
    updated_at: raw.updated_at != null ? String(raw.updated_at).trim().slice(0, 40) || null : null,
    updated_by: raw.updated_by != null ? String(raw.updated_by).trim().slice(0, 320) || null : null,
  };
}

/**
 * @param {ReturnType<typeof parseLuxPrivateClientQualification>} qual
 */
export function luxQualificationMissingFields(qual) {
  return LUX_QUALIFICATION_FIELDS.filter((k) => !trimField(qual?.[k]));
}

/**
 * @param {ReturnType<typeof parseLuxPrivateClientQualification>} qual
 * @param {{ stage?: string | null }} [opts]
 */
export function luxQualificationRecommendedNextAction(qual, opts = {}) {
  const missing = luxQualificationMissingFields(qual);
  const stage = opts.stage != null ? String(opts.stage).trim().toLowerCase() : '';
  if (missing.length) {
    const labels = missing.slice(0, 3).map((k) => FIELD_LABELS[k] || k);
    const more = missing.length > 3 ? ` (+${missing.length - 3} more)` : '';
    return `Capture missing qualification: ${labels.join(', ')}${more}.`;
  }
  if (stage === 'new' || stage === 'contacted') {
    return 'Qualification complete — advance stage to Qualified when fit is confirmed.';
  }
  if (stage === 'qualified') {
    return 'Build or confirm the curated shortlist / private invitation packet.';
  }
  if (stage === 'invited') {
    return 'Await private-client response; close when the invitation cycle completes.';
  }
  if (stage === 'closed') {
    return 'Qualification archived with closed enquiry.';
  }
  return 'Qualification complete — confirm next CRM stage action.';
}

/**
 * @param {unknown} qj
 */
export function luxPrivateClientQualificationForApi(qj) {
  const qual = parseLuxPrivateClientQualification(qj);
  const missing = luxQualificationMissingFields(qual);
  return {
    ...qual,
    missing_fields: missing,
    missing_field_labels: missing.map((k) => FIELD_LABELS[k] || k),
    recommended_next_action: luxQualificationRecommendedNextAction(qual),
    field_labels: { ...FIELD_LABELS },
  };
}

/**
 * @param {Record<string, unknown>} qualificationJson
 * @param {Record<string, unknown>} patchFields
 * @param {string} actorLabel
 * @param {string} nowIso
 */
export function mergeLuxPrivateClientQualificationPatch(qualificationJson, patchFields, actorLabel, nowIso) {
  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const prev = parseLuxPrivateClientQualification(qj);
  const next = { ...prev };
  let changed = false;
  const src = patchFields && typeof patchFields === 'object' ? patchFields : {};
  for (const key of LUX_QUALIFICATION_FIELDS) {
    if (src[key] === undefined) continue;
    const v = trimField(src[key]);
    if (v !== String(prev[key] || '')) {
      next[key] = v;
      changed = true;
    }
  }
  if (!changed) return qj;
  qj.private_client_qualification = {
    buyer_objective: next.buyer_objective,
    preferred_area: next.preferred_area,
    property_type: next.property_type,
    budget_band: next.budget_band,
    timing: next.timing,
    residency_investment_interest: next.residency_investment_interest,
    confidentiality_preference: next.confidentiality_preference,
    updated_at: nowIso,
    updated_by: String(actorLabel || 'unknown').trim().slice(0, 320) || 'unknown',
  };
  return qj;
}

/**
 * @param {unknown} qj
 * @returns {{
 *   items: Array<{
 *     slug: string,
 *     title: string,
 *     region: string,
 *     property_type: string,
 *     price_range: string,
 *     status: string,
 *     note: string,
 *     added_at: string | null,
 *   }>,
 *   updated_at: string | null,
 *   updated_by: string | null,
 * }}
 */
export function parseLuxCuratedShortlist(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const raw = root.curated_shortlist && typeof root.curated_shortlist === 'object' ? root.curated_shortlist : {};
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items = itemsRaw
    .map((it) => {
      if (!it || typeof it !== 'object') return null;
      const slug = trimField(it.slug, 64).toLowerCase();
      if (!slug || !isLuxStagedPropertySlug(slug)) return null;
      const staged = findLuxStagedPropertyBySlug(slug);
      return {
        slug,
        title: trimField(it.title) || (staged?.title ? String(staged.title) : slug),
        region: trimField(it.region) || (staged?.region ? String(staged.region) : ''),
        property_type: trimField(it.property_type) || (staged?.property_type ? String(staged.property_type) : ''),
        price_range: trimField(it.price_range) || (staged?.price_range ? String(staged.price_range) : ''),
        status: trimField(it.status) || (staged?.status ? String(staged.status) : ''),
        note: trimField(it.note, MAX_SHORTLIST_NOTE),
        added_at: it.added_at != null ? String(it.added_at).trim().slice(0, 40) || null : null,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_SHORTLIST);
  return {
    items,
    updated_at: raw.updated_at != null ? String(raw.updated_at).trim().slice(0, 40) || null : null,
    updated_by: raw.updated_by != null ? String(raw.updated_by).trim().slice(0, 320) || null : null,
  };
}

/**
 * Replace shortlist from operator-supplied slug list (+ optional per-slug notes).
 * Only staged (non-demo public) catalog slugs are accepted; unknown slugs skipped.
 *
 * @param {Record<string, unknown>} qualificationJson
 * @param {{ slugs?: unknown, notes_by_slug?: Record<string, unknown> | null }} patch
 * @param {string} actorLabel
 * @param {string} nowIso
 */
export function mergeLuxCuratedShortlistPatch(qualificationJson, patch, actorLabel, nowIso) {
  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const prev = parseLuxCuratedShortlist(qj);
  const prevNotes = Object.fromEntries(prev.items.map((it) => [it.slug, it.note || '']));
  const prevAdded = Object.fromEntries(prev.items.map((it) => [it.slug, it.added_at]));

  const slugsIn = Array.isArray(patch?.slugs) ? patch.slugs : null;
  if (!slugsIn) return qj;

  const notesBySlug =
    patch?.notes_by_slug && typeof patch.notes_by_slug === 'object' ? patch.notes_by_slug : {};

  const seen = new Set();
  const items = [];
  for (const rawSlug of slugsIn) {
    const slug = trimField(rawSlug, 64).toLowerCase();
    if (!slug || seen.has(slug) || !isLuxStagedPropertySlug(slug)) continue;
    const staged = findLuxStagedPropertyBySlug(slug);
    if (!staged || staged.demo === true) continue;
    seen.add(slug);
    const noteFromPatch = notesBySlug[slug] !== undefined ? trimField(notesBySlug[slug], MAX_SHORTLIST_NOTE) : null;
    items.push({
      slug,
      title: String(staged.title || slug),
      region: String(staged.region || ''),
      property_type: String(staged.property_type || ''),
      price_range: staged.price_range != null ? String(staged.price_range) : '',
      status: String(staged.status || ''),
      note: noteFromPatch != null ? noteFromPatch : prevNotes[slug] || '',
      added_at: prevAdded[slug] || nowIso,
    });
    if (items.length >= MAX_SHORTLIST) break;
  }

  const prevKey = prev.items.map((i) => `${i.slug}|${i.note || ''}`).join(';');
  const nextKey = items.map((i) => `${i.slug}|${i.note || ''}`).join(';');
  if (prevKey === nextKey) return qj;

  qj.curated_shortlist = {
    items,
    updated_at: nowIso,
    updated_by: String(actorLabel || 'unknown').trim().slice(0, 320) || 'unknown',
  };
  return qj;
}

/**
 * Copy-ready private-client shortlist / invitation summary (on-screen only).
 * @param {{
 *   lead_name?: string | null,
 *   email?: string | null,
 *   phone?: string | null,
 *   qualification?: ReturnType<typeof parseLuxPrivateClientQualification> | null,
 *   shortlist?: ReturnType<typeof parseLuxCuratedShortlist> | null,
 * }} input
 */
export function buildLuxInvitationPacketDraft(input) {
  const name = trimField(input?.lead_name) || 'Private client';
  const email = trimField(input?.email) || '—';
  const phone = trimField(input?.phone) || '—';
  const qual = input?.qualification || parseLuxPrivateClientQualification(null);
  const shortlist = input?.shortlist || parseLuxCuratedShortlist(null);
  const items = shortlist.items || [];

  const lines = [
    'Rare & Exclusive Collection — private shortlist / invitation (draft)',
    '',
    `Prepared for: ${name}`,
    `Contact: ${email} · ${phone}`,
    '',
    'Qualification summary',
    `• Buyer objective: ${qual.buyer_objective || '—'}`,
    `• Preferred area: ${qual.preferred_area || '—'}`,
    `• Property type: ${qual.property_type || '—'}`,
    `• Budget band: ${qual.budget_band || '—'}`,
    `• Timing: ${qual.timing || '—'}`,
    `• Residency / investment: ${qual.residency_investment_interest || '—'}`,
    `• Confidentiality: ${qual.confidentiality_preference || '—'}`,
    '',
  ];

  if (!items.length) {
    lines.push('Curated residences: none associated yet.');
    lines.push('Operator: add staged residences on /change, then regenerate this draft.');
  } else {
    lines.push(`Curated residences (${items.length})`);
    items.forEach((it, idx) => {
      lines.push('');
      lines.push(`${idx + 1}. ${it.title} (${it.slug})`);
      lines.push(`   Region: ${it.region || '—'} · Type: ${it.property_type || '—'}`);
      lines.push(`   Status: ${it.status || '—'} · Range: ${it.price_range || '—'}`);
      if (it.note) lines.push(`   Note: ${it.note}`);
    });
  }

  lines.push('');
  lines.push('Invitation note (draft — not sent)');
  lines.push(
    `Dear ${name}, thank you for your private enquiry. We have prepared a shortlist of residences matched to your stated preferences for confidential review. Please reply to confirm which introductions you would like to pursue.`,
  );
  lines.push('');
  lines.push('— Rare & Exclusive Collection advisory');
  lines.push('(Draft only — copy for operator/client review. No automatic send.)');

  return lines.join('\n');
}

/**
 * Staged catalog options for the operator shortlist picker (excludes demo).
 */
export function luxShortlistCatalogOptions() {
  return getPublicLuxStagedProperties().map((p) => ({
    slug: p.slug,
    title: p.title,
    region: p.region,
    property_type: p.property_type,
    price_range: p.price_range || '',
    status: p.status,
  }));
}

/**
 * API shape for list/detail.
 * @param {unknown} qj
 * @param {{ stage?: string | null, lead_name?: string | null, email?: string | null, phone?: string | null }} [opts]
 */
export function luxQualificationShortlistForApi(qj, opts = {}) {
  const qualification = parseLuxPrivateClientQualification(qj);
  const missing = luxQualificationMissingFields(qualification);
  const shortlist = parseLuxCuratedShortlist(qj);
  const invitation_draft = buildLuxInvitationPacketDraft({
    lead_name: opts.lead_name,
    email: opts.email,
    phone: opts.phone,
    qualification,
    shortlist,
  });
  return {
    private_client_qualification: {
      ...qualification,
      missing_fields: missing,
      missing_field_labels: missing.map((k) => FIELD_LABELS[k] || k),
      recommended_next_action: luxQualificationRecommendedNextAction(qualification, { stage: opts.stage }),
      field_labels: { ...FIELD_LABELS },
    },
    curated_shortlist: {
      ...shortlist,
      catalog_options: luxShortlistCatalogOptions(),
    },
    invitation_draft,
  };
}
