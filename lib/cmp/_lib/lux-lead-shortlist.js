/**
 * Lux curated shortlist / invitation packet (issue #685 Slice C).
 * Stored in leads.qualification_json.private_client_shortlist — no schema migration.
 * No live email / WhatsApp / SMS send — draft text only for operator copy.
 */

import {
  findLuxStagedPropertyBySlug,
  getPublicLuxStagedProperties,
} from '../../client/luxe-maurice-staged-properties.js';
import { buildLuxPrivateClientQualificationView } from './lux-lead-qualification.js';

const MAX_SHORTLIST = 8;

function safeStr(v, max = 500) {
  if (v == null) return '';
  return String(v).trim().slice(0, max);
}

/**
 * Catalogue available for operator association (public staged residences; no demo entries).
 * @returns {{ slug: string, title: string, region: string, property_type: string, price_range: string | null, status: string }[]}
 */
export function listLuxShortlistCatalogue() {
  return getPublicLuxStagedProperties().map((p) => ({
    slug: p.slug,
    title: p.title,
    region: p.region,
    property_type: p.property_type,
    price_range: p.price_range != null ? String(p.price_range) : null,
    status: p.status,
  }));
}

/**
 * Resolve a residence snapshot from staged catalogue or existing property_interest.
 * @param {string} slug
 * @param {unknown} propertyInterest
 */
export function resolveShortlistResidence(slug, propertyInterest) {
  const s = safeStr(slug, 64).toLowerCase();
  if (!s) return null;
  const staged = findLuxStagedPropertyBySlug(s);
  if (staged) {
    return {
      slug: staged.slug,
      title: staged.title,
      region: staged.region,
      property_type: staged.property_type,
      price_range: staged.price_range != null ? String(staged.price_range) : null,
      status: staged.status,
      source: 'staged_curated',
    };
  }
  const pi = propertyInterest && typeof propertyInterest === 'object' ? propertyInterest : null;
  if (pi && safeStr(pi.slug, 64).toLowerCase() === s) {
    return {
      slug: s,
      title: safeStr(pi.title, 200) || s,
      region: safeStr(pi.region, 200) || '',
      property_type: safeStr(pi.property_type, 120) || '',
      price_range: pi.price_range != null ? safeStr(pi.price_range, 120) : null,
      status: safeStr(pi.status, 120) || '',
      source: 'property_interest',
    };
  }
  return null;
}

/**
 * @param {unknown} qj
 */
export function parsePrivateClientShortlist(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const raw =
    root.private_client_shortlist && typeof root.private_client_shortlist === 'object'
      ? root.private_client_shortlist
      : {};
  const residencesRaw = Array.isArray(raw.residences) ? raw.residences : [];
  const residences = residencesRaw
    .map((r) => {
      if (!r || typeof r !== 'object') return null;
      const slug = safeStr(r.slug, 64).toLowerCase();
      if (!slug) return null;
      return {
        slug,
        title: safeStr(r.title, 200) || slug,
        region: safeStr(r.region, 200),
        property_type: safeStr(r.property_type, 120),
        price_range: r.price_range != null ? safeStr(r.price_range, 120) : null,
        status: safeStr(r.status, 120),
        source: safeStr(r.source, 64) || 'staged_curated',
      };
    })
    .filter(Boolean)
    .slice(0, MAX_SHORTLIST);

  return {
    residences,
    invitation_operator_note: raw.invitation_operator_note != null ? safeStr(raw.invitation_operator_note, 2000) || null : null,
    updated_at: raw.updated_at != null ? safeStr(raw.updated_at, 40) || null : null,
    updated_by: raw.updated_by != null ? safeStr(raw.updated_by, 320) || null : null,
  };
}

/**
 * @param {Record<string, unknown>} qualificationJson
 * @param {{
 *   shortlist_slugs?: unknown,
 *   invitation_operator_note?: unknown,
 * }} patch
 * @param {string} actorLabel
 * @param {string} nowIso
 * @param {unknown} [propertyInterest]
 */
export function mergePrivateClientShortlistPatch(qualificationJson, patch, actorLabel, nowIso, propertyInterest) {
  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const prev = parsePrivateClientShortlist(qj);
  const p = patch && typeof patch === 'object' ? patch : {};
  let changed = false;

  let residences = prev.residences;
  if (p.shortlist_slugs !== undefined) {
    const slugs = Array.isArray(p.shortlist_slugs)
      ? p.shortlist_slugs.map((s) => safeStr(s, 64).toLowerCase()).filter(Boolean)
      : [];
    const unique = [];
    const seen = new Set();
    for (const slug of slugs) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      const resolved = resolveShortlistResidence(slug, propertyInterest);
      if (resolved) {
        unique.push(resolved);
      }
    }
    if (unique.length > MAX_SHORTLIST) {
      return { ok: false, error: 'SHORTLIST_TOO_LONG', hint: `At most ${MAX_SHORTLIST} residences.`, qj, changed: false };
    }
    const prevKey = prev.residences.map((r) => r.slug).join('|');
    const nextKey = unique.map((r) => r.slug).join('|');
    if (prevKey !== nextKey) {
      residences = unique;
      changed = true;
    } else {
      residences = unique.length ? unique : prev.residences;
    }
  }

  let invitation_operator_note = prev.invitation_operator_note;
  if (p.invitation_operator_note !== undefined) {
    const note =
      p.invitation_operator_note === null || p.invitation_operator_note === ''
        ? null
        : safeStr(p.invitation_operator_note, 2000) || null;
    if ((prev.invitation_operator_note || null) !== note) {
      invitation_operator_note = note;
      changed = true;
    }
  }

  if (!changed) return { ok: true, qj, changed: false };

  qj.private_client_shortlist = {
    residences,
    invitation_operator_note,
    updated_at: nowIso,
    updated_by: safeStr(actorLabel, 320) || 'unknown',
  };
  return { ok: true, qj, changed: true };
}

/**
 * On-screen / copy-ready private-client shortlist + invitation draft (no send).
 * @param {{
 *   name?: unknown,
 *   email?: unknown,
 *   phone?: unknown,
 *   message?: unknown,
 *   intent?: unknown,
 *   listing?: unknown,
 *   property_interest?: unknown,
 *   qualificationJson?: unknown,
 *   qualification_json?: unknown,
 * }} leadLike
 */
export function buildLuxInvitationPacketDraft(leadLike) {
  const qj =
    leadLike?.qualificationJson && typeof leadLike.qualificationJson === 'object'
      ? leadLike.qualificationJson
      : leadLike?.qualification_json && typeof leadLike.qualification_json === 'object'
        ? leadLike.qualification_json
        : {};
  const shortlist = parsePrivateClientShortlist(qj);
  const qual = buildLuxPrivateClientQualificationView({ ...leadLike, qualificationJson: qj });
  const name = safeStr(leadLike?.name, 200) || 'Private client';
  const email = safeStr(leadLike?.email, 254);
  const phone = safeStr(leadLike?.phone, 80);

  const lines = [];
  lines.push('PRIVATE CLIENT SHORTLIST / INVITATION (DRAFT — NOT SENT)');
  lines.push('Rare & Exclusive Collection · LuxeMaurice advisory');
  lines.push('');
  lines.push(`Prepared for: ${name}`);
  if (email) lines.push(`Email: ${email}`);
  if (phone) lines.push(`Telephone: ${phone}`);
  lines.push('');
  lines.push('Qualification summary');
  lines.push(`- Objective: ${qual.fields.buyer_objective || '—'}`);
  lines.push(`- Preferred area: ${qual.fields.preferred_area || '—'}`);
  lines.push(`- Property type: ${qual.fields.property_type || '—'}`);
  lines.push(`- Budget band: ${qual.fields.budget_band || '—'}`);
  lines.push(`- Timing: ${qual.fields.timing || '—'}`);
  lines.push(`- Residency / investment: ${qual.fields.residency_investment_interest || '—'}`);
  lines.push(`- Confidentiality: ${qual.fields.confidentiality_preference || '—'}`);
  if (qual.missing_count > 0) {
    lines.push(`- Missing: ${qual.missing.map((m) => m.label).join(', ')}`);
  }
  lines.push('');
  lines.push('Curated residences');
  if (!shortlist.residences.length) {
    lines.push('- (none associated yet — select staged residences on the operator desk)');
  } else {
    shortlist.residences.forEach((r, i) => {
      const band = r.price_range ? ` · ${r.price_range}` : '';
      const st = r.status ? ` · ${r.status}` : '';
      lines.push(`${i + 1}. ${r.title} (${r.slug})`);
      lines.push(`   ${r.region || 'Mauritius'} · ${r.property_type || 'Residence'}${band}${st}`);
    });
  }
  lines.push('');
  lines.push('Suggested client message (copy-ready)');
  lines.push('---');
  lines.push(`Dear ${name},`);
  lines.push('');
  lines.push(
    'Thank you for your enquiry. We have prepared a private shortlist of residences that may suit your requirements. These opportunities are shared by introduction only and are not published on open catalogues.',
  );
  lines.push('');
  if (shortlist.residences.length) {
    lines.push('For your private review:');
    shortlist.residences.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.title} — ${r.region || 'Mauritius'}${r.price_range ? ` (${r.price_range})` : ''}`);
    });
    lines.push('');
  }
  if (shortlist.invitation_operator_note) {
    lines.push(shortlist.invitation_operator_note);
    lines.push('');
  }
  lines.push(
    'If you would like to proceed, reply with your preferred next step and we will arrange a confidential briefing. No commitment is implied by this introduction.',
  );
  lines.push('');
  lines.push('Kind regards,');
  lines.push('Rare & Exclusive Collection advisory');
  lines.push('---');
  lines.push('');
  lines.push('Operator note: This draft is for review/copy only. No email, WhatsApp, or SMS was sent by the system.');

  const draft_text = lines.join('\n');
  return {
    residences: shortlist.residences,
    invitation_operator_note: shortlist.invitation_operator_note,
    catalogue: listLuxShortlistCatalogue(),
    draft_text,
    send_disabled: true,
    send_notice: 'No live send — copy the draft for operator/client review only.',
    updated_at: shortlist.updated_at,
    updated_by: shortlist.updated_by,
    qualification_complete: qual.complete,
    missing_qualification: qual.missing,
  };
}

/**
 * Append activity entry onto lux_operator_workflow without other workflow mutations.
 * @param {Record<string, unknown>} qualificationJson
 * @param {{ at: string, actor_label: string, kind: string, detail?: Record<string, unknown> }} entry
 */
export function appendLuxLeadActivity(qualificationJson, entry) {
  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const ow =
    qj.lux_operator_workflow && typeof qj.lux_operator_workflow === 'object'
      ? { ...qj.lux_operator_workflow }
      : {};
  const activity = Array.isArray(ow.activity) ? [...ow.activity] : [];
  activity.push({
    at: entry.at,
    actor_label: safeStr(entry.actor_label, 320) || 'unknown',
    kind: safeStr(entry.kind, 64) || 'activity',
    detail: entry.detail && typeof entry.detail === 'object' ? entry.detail : {},
  });
  ow.activity = activity.slice(-150);
  qj.lux_operator_workflow = ow;
  return qj;
}
