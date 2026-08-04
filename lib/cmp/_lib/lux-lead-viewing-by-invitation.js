/**
 * Lux Viewing by Invitation workflow (issue #752).
 * Stored in leads.qualification_json.private_client_viewing — no schema migration.
 * No live email / WhatsApp / SMS send — draft text only for operator copy.
 *
 * Journey step: Confidential Presentation → Viewing by Invitation → Purchase
 */

import { parseLuxOperatorWorkflow } from './lux-lead-operator-workflow.js';
import { buildLuxPrivateClientQualificationView } from './lux-lead-qualification.js';
import { parsePrivateClientShortlist } from './lux-lead-shortlist.js';
import {
  LUX_PRESENTATION_VIEWING_NEXT_STEP,
  parsePrivateClientPresentation,
} from './lux-lead-confidential-presentation.js';

/** Full buyer journey (Jan-approved private-client path). */
export const LUX_VIEWING_BUYER_JOURNEY_LABEL =
  'Discover → Express Interest → Private Conversation → Confidential Presentation → Viewing by Invitation → Purchase';

/** Panel-focused journey segment shown above the checklist. */
export const LUX_VIEWING_JOURNEY_LABEL =
  'Confidential Presentation → Viewing by Invitation → Purchase';

/**
 * Allowed viewing formats (manual selection; no calendar integration).
 * @type {readonly { id: string, label: string }[]}
 */
export const LUX_VIEWING_FORMATS = Object.freeze([
  { id: 'private_on_site', label: 'Private on-site viewing' },
  { id: 'private_virtual', label: 'Private virtual walkthrough' },
  { id: 'concierge_escort', label: 'Concierge-escorted introduction' },
]);

const VIEWING_FORMAT_IDS = new Set(LUX_VIEWING_FORMATS.map((f) => f.id));

/**
 * Jan functional test sequence for the Viewing by Invitation panel (#752).
 * Local UI checkboxes only — not persisted; synthetic/test use.
 *
 * @type {readonly { id: string, label: string }[]}
 */
export const LUX_VIEWING_BY_INVITATION_JAN_TEST_CHECKLIST = Object.freeze([
  { id: 'select_qualified', label: 'Select a qualified/shortlisted test lead.' },
  { id: 'confirm_presentation', label: 'Confirm Confidential Presentation is present.' },
  { id: 'move_invited', label: 'Move the lead to invited or invitation-ready.' },
  { id: 'open_viewing', label: 'Open Viewing by Invitation.' },
  {
    id: 'add_viewing_notes',
    label: 'Add or review viewing notes, proposed date/time and access/concierge notes.',
  },
  { id: 'review_draft', label: 'Review the invitation draft.' },
  {
    id: 'voice_check',
    label: 'Confirm it feels private, selective and Rare & Exclusive.',
  },
  { id: 'send_disabled', label: 'Confirm Send is disabled/manual-only.' },
  { id: 'record_gaps', label: 'Record anything unclear, missing or not usable.' },
]);

const STAGE_RANK = Object.freeze({
  new: 0,
  contacted: 1,
  qualified: 2,
  invited: 3,
  closed: 4,
});

function safeStr(v, max = 500) {
  if (v == null) return '';
  return String(v).trim().slice(0, max);
}

function nonempty(v) {
  const s = safeStr(v);
  return s ? s : null;
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
function normalizeViewingFormat(raw) {
  const s = safeStr(raw, 64).toLowerCase();
  return VIEWING_FORMAT_IDS.has(s) ? s : null;
}

/**
 * @param {string | null} formatId
 * @returns {string}
 */
export function luxViewingFormatLabel(formatId) {
  const id = safeStr(formatId, 64);
  const hit = LUX_VIEWING_FORMATS.find((f) => f.id === id);
  return hit ? hit.label : id || '—';
}

/**
 * @param {unknown} qj
 */
export function parsePrivateClientViewing(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const raw =
    root.private_client_viewing && typeof root.private_client_viewing === 'object'
      ? root.private_client_viewing
      : {};
  return {
    viewing_format: normalizeViewingFormat(raw.viewing_format),
    proposed_datetime: raw.proposed_datetime != null ? safeStr(raw.proposed_datetime, 500) || null : null,
    access_concierge_notes:
      raw.access_concierge_notes != null ? safeStr(raw.access_concierge_notes, 4000) || null : null,
    updated_at: nonempty(raw.updated_at) ? String(raw.updated_at).slice(0, 40) : null,
    updated_by: nonempty(raw.updated_by) ? String(raw.updated_by).slice(0, 320) : null,
  };
}

/**
 * Merge operator viewing fields into qualification_json (no schema change).
 * @param {Record<string, unknown>} qualificationJson
 * @param {{
 *   viewing_format?: unknown,
 *   viewing_proposed_datetime?: unknown,
 *   viewing_access_notes?: unknown,
 * }} patch
 * @param {string} actorLabel
 * @param {string} nowIso
 */
export function mergePrivateClientViewingPatch(qualificationJson, patch, actorLabel, nowIso) {
  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const prev = parsePrivateClientViewing(qj);
  const p = patch && typeof patch === 'object' ? patch : {};
  let changed = false;

  let viewing_format = prev.viewing_format;
  if (p.viewing_format !== undefined) {
    const next =
      p.viewing_format === null || p.viewing_format === ''
        ? null
        : normalizeViewingFormat(p.viewing_format);
    if ((prev.viewing_format || null) !== next) {
      viewing_format = next;
      changed = true;
    }
  }

  let proposed_datetime = prev.proposed_datetime;
  if (p.viewing_proposed_datetime !== undefined) {
    const next =
      p.viewing_proposed_datetime === null || p.viewing_proposed_datetime === ''
        ? null
        : safeStr(p.viewing_proposed_datetime, 500) || null;
    if ((prev.proposed_datetime || null) !== next) {
      proposed_datetime = next;
      changed = true;
    }
  }

  let access_concierge_notes = prev.access_concierge_notes;
  if (p.viewing_access_notes !== undefined) {
    const next =
      p.viewing_access_notes === null || p.viewing_access_notes === ''
        ? null
        : safeStr(p.viewing_access_notes, 4000) || null;
    if ((prev.access_concierge_notes || null) !== next) {
      access_concierge_notes = next;
      changed = true;
    }
  }

  if (!changed) return { ok: true, qj, changed: false };

  qj.private_client_viewing = {
    viewing_format,
    proposed_datetime,
    access_concierge_notes,
    updated_at: nowIso,
    updated_by: safeStr(actorLabel, 320) || 'unknown',
  };
  return { ok: true, qj, changed: true };
}

/**
 * Invitation-readiness checklist from existing lead + qualification + shortlist + presentation + viewing JSON.
 * @param {{
 *   name?: unknown,
 *   email?: unknown,
 *   phone?: unknown,
 *   contact?: unknown,
 *   message?: unknown,
 *   intent?: unknown,
 *   listing?: unknown,
 *   property_interest?: unknown,
 *   qualificationJson?: unknown,
 *   qualification_json?: unknown,
 * }} leadLike
 */
export function buildLuxViewingReadinessChecklist(leadLike) {
  const qj =
    leadLike?.qualificationJson && typeof leadLike.qualificationJson === 'object'
      ? leadLike.qualificationJson
      : leadLike?.qualification_json && typeof leadLike.qualification_json === 'object'
        ? leadLike.qualification_json
        : {};
  const ow = parseLuxOperatorWorkflow(qj);
  const stage = safeStr(ow.stage, 40) || 'new';
  const stageRank = STAGE_RANK[stage] != null ? STAGE_RANK[stage] : 0;
  const qual = buildLuxPrivateClientQualificationView({ ...leadLike, qualificationJson: qj });
  const shortlist = parsePrivateClientShortlist(qj);
  const presentation = parsePrivateClientPresentation(qj);
  const viewing = parsePrivateClientViewing(qj);

  const name = safeStr(leadLike?.name, 200);
  const email = safeStr(leadLike?.email, 254);
  const phone = safeStr(leadLike?.phone, 80);
  const contactPresent = Boolean(name || email || phone);

  const stageInvitedOrReady =
    stageRank >= STAGE_RANK.invited ||
    presentation.viewing_next_step === LUX_PRESENTATION_VIEWING_NEXT_STEP;
  const qualificationSummary = qual.filled_count >= 4;
  const shortlistReady = shortlist.residences.length >= 1;
  const presentationReady =
    Boolean(presentation.notes) ||
    presentation.viewing_next_step === LUX_PRESENTATION_VIEWING_NEXT_STEP;
  const formatReady = Boolean(viewing.viewing_format);
  const datetimeReady = Boolean(viewing.proposed_datetime);
  const accessReady = Boolean(viewing.access_concierge_notes);
  const manualNextReady = formatReady && datetimeReady && accessReady;

  const items = [
    {
      id: 'client_contact',
      label: 'Client contact details present',
      ready: contactPresent,
      detail: contactPresent
        ? [name || null, email || null, phone || null].filter(Boolean).join(' · ')
        : 'Add name, email, or telephone on the enquiry',
    },
    {
      id: 'stage_invited',
      label: 'Lead status is invited or ready to invite',
      ready: stageInvitedOrReady,
      detail: stageInvitedOrReady
        ? stageRank >= STAGE_RANK.invited
          ? `Stage: ${stage}`
          : `Stage: ${stage} · Viewing by Invitation selected on Confidential Presentation`
        : `Current stage: ${stage} — move to invited, or select Viewing by Invitation on Confidential Presentation`,
    },
    {
      id: 'qualification_summary',
      label: 'Qualification summary exists',
      ready: qualificationSummary,
      detail: qualificationSummary
        ? `${qual.filled_count}/${qual.filled_count + qual.missing_count} fields present`
        : `${qual.filled_count} fields filled — capture at least four qualification fields`,
    },
    {
      id: 'shortlist_residences',
      label: 'Shortlist / residence selected',
      ready: shortlistReady,
      detail: shortlistReady
        ? `${shortlist.residences.length} residence(s) on shortlist`
        : 'Associate at least one staged residence in Curated Shortlist',
    },
    {
      id: 'presentation_ready',
      label: 'Confidential Presentation draft exists or was reviewed',
      ready: presentationReady,
      detail: presentationReady
        ? presentation.notes
          ? 'Presentation notes saved'
          : 'Viewing by Invitation next step marked on Confidential Presentation'
        : 'Complete Confidential Presentation notes or select Viewing by Invitation as next step',
    },
    {
      id: 'viewing_format',
      label: 'Viewing format selected',
      ready: formatReady,
      detail: formatReady
        ? luxViewingFormatLabel(viewing.viewing_format)
        : 'Select private on-site, virtual, or concierge-escorted format',
    },
    {
      id: 'proposed_datetime',
      label: 'Proposed viewing date/time noted',
      ready: datetimeReady,
      detail: datetimeReady
        ? String(viewing.proposed_datetime)
        : 'Enter a proposed date/time placeholder (manual notes — no calendar booking)',
    },
    {
      id: 'access_notes',
      label: 'Access / concierge notes captured',
      ready: accessReady,
      detail: accessReady
        ? 'Access / concierge notes saved'
        : 'Capture gate codes, escort, arrival, or discretion notes',
    },
    {
      id: 'manual_invite_next',
      label: 'Next action: manual invitation / arrange viewing',
      ready: manualNextReady,
      detail: manualNextReady
        ? 'Ready for operator to invite manually (send disabled)'
        : 'Complete format, proposed date/time, and access notes first',
    },
  ];

  const ready_count = items.filter((i) => i.ready).length;
  return {
    items,
    ready_count,
    total_count: items.length,
    all_ready: ready_count === items.length,
    stage,
    viewing,
    presentation,
    qualification: qual,
    shortlist,
  };
}

/**
 * On-screen / copy-ready Viewing by Invitation draft (no send).
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
export function buildLuxViewingByInvitationPacket(leadLike) {
  const qj =
    leadLike?.qualificationJson && typeof leadLike.qualificationJson === 'object'
      ? leadLike.qualificationJson
      : leadLike?.qualification_json && typeof leadLike.qualification_json === 'object'
        ? leadLike.qualification_json
        : {};
  const readiness = buildLuxViewingReadinessChecklist({ ...leadLike, qualificationJson: qj });
  const qual = readiness.qualification;
  const shortlist = readiness.shortlist;
  const presentation = readiness.presentation;
  const viewing = readiness.viewing;
  const name = safeStr(leadLike?.name, 200) || 'Private client';
  const email = safeStr(leadLike?.email, 254);
  const phone = safeStr(leadLike?.phone, 80);
  const formatLabel = luxViewingFormatLabel(viewing.viewing_format);

  const lines = [];
  lines.push('VIEWING BY INVITATION (DRAFT — NOT SENT)');
  lines.push('Rare & Exclusive Collection · Private client advisory');
  lines.push('');
  lines.push(`Buyer journey: ${LUX_VIEWING_BUYER_JOURNEY_LABEL}`);
  lines.push(`Current step: ${LUX_VIEWING_JOURNEY_LABEL}`);
  lines.push('');
  lines.push(`Prepared for: ${name}`);
  if (email) lines.push(`Email: ${email}`);
  if (phone) lines.push(`Telephone: ${phone}`);
  lines.push('');
  lines.push('This viewing is by invitation only.');
  lines.push('It is not an open house, public showing, or general broker appointment.');
  lines.push('');
  lines.push('Private-client brief (from qualification)');
  lines.push(`- Objective: ${qual.fields.buyer_objective || '—'}`);
  lines.push(`- Preferred area: ${qual.fields.preferred_area || '—'}`);
  lines.push(`- Property type: ${qual.fields.property_type || '—'}`);
  lines.push(`- Budget band: ${qual.fields.budget_band || '—'}`);
  lines.push(`- Timing: ${qual.fields.timing || '—'}`);
  lines.push(`- Confidentiality: ${qual.fields.confidentiality_preference || '—'}`);
  lines.push('');
  lines.push('Residence(s) for invited viewing');
  if (!shortlist.residences.length) {
    lines.push('- (none associated yet — complete Curated Shortlist before inviting)');
  } else {
    shortlist.residences.forEach((r, i) => {
      const band = r.price_range ? ` · ${r.price_range}` : '';
      const st = r.status ? ` · ${r.status}` : '';
      lines.push(`${i + 1}. ${r.title}`);
      lines.push(`   ${r.region || 'Mauritius'} · ${r.property_type || 'Residence'}${band}${st}`);
      lines.push(`   Ref: ${r.slug}`);
    });
  }
  lines.push('');
  lines.push('Viewing arrangement');
  lines.push(`- Format: ${viewing.viewing_format ? formatLabel : '(not yet selected)'}`);
  lines.push(
    `- Proposed date/time: ${viewing.proposed_datetime || '(operator placeholder not yet entered)'}`,
  );
  lines.push('');
  lines.push('Access / concierge notes');
  if (viewing.access_concierge_notes) {
    lines.push(viewing.access_concierge_notes);
  } else {
    lines.push('(Access / concierge notes not yet captured.)');
  }
  if (presentation.notes) {
    lines.push('');
    lines.push('From confidential presentation');
    lines.push(presentation.notes);
  }
  lines.push('');
  lines.push('Suggested invitation (copy-ready)');
  lines.push('---');
  lines.push(`Dear ${name},`);
  lines.push('');
  lines.push(
    'Following our confidential presentation, we are pleased to extend a Viewing by Invitation for the residence(s) aligned to your private brief. This introduction remains discreet and is arranged only by mutual confirmation.',
  );
  lines.push('');
  if (shortlist.residences.length) {
    lines.push('Invitation applies to:');
    shortlist.residences.forEach((r, i) => {
      lines.push(
        `${i + 1}. ${r.title} — ${r.region || 'Mauritius'}${r.price_range ? ` (${r.price_range})` : ''}`,
      );
    });
    lines.push('');
  }
  if (viewing.viewing_format) {
    lines.push(`Proposed format: ${formatLabel}.`);
  }
  if (viewing.proposed_datetime) {
    lines.push(`Proposed timing: ${viewing.proposed_datetime}.`);
  }
  if (viewing.access_concierge_notes) {
    lines.push('');
    lines.push('Arrival / access notes for your convenience:');
    lines.push(viewing.access_concierge_notes);
  }
  lines.push('');
  lines.push(
    'Please confirm whether this timing suits you, or suggest an alternative. No commitment is implied by accepting this invitation — the next step after a successful viewing remains a private purchase conversation, should you wish to proceed.',
  );
  lines.push('');
  lines.push('Kind regards,');
  lines.push('Rare & Exclusive Collection advisory');
  lines.push('---');
  lines.push('');
  lines.push(
    'Operator note: This draft is for review/copy only. No email, WhatsApp, or SMS was sent by the system.',
  );
  lines.push(
    `Next action: Manual invitation / arrange viewing${readiness.all_ready ? ' (checklist complete)' : ' (complete readiness items in panel)'}.`,
  );

  const draft_text = lines.join('\n');
  return {
    journey_label: LUX_VIEWING_JOURNEY_LABEL,
    buyer_journey_label: LUX_VIEWING_BUYER_JOURNEY_LABEL,
    next_action_label: 'Manual invitation / arrange viewing',
    checklist: readiness.items,
    ready_count: readiness.ready_count,
    total_count: readiness.total_count,
    all_ready: readiness.all_ready,
    viewing_format: viewing.viewing_format,
    viewing_format_label: viewing.viewing_format ? formatLabel : null,
    proposed_datetime: viewing.proposed_datetime,
    access_concierge_notes: viewing.access_concierge_notes,
    presentation_notes: presentation.notes,
    stage: readiness.stage,
    residences: shortlist.residences,
    draft_text,
    send_disabled: true,
    send_notice: 'No live send — copy the viewing invitation for operator/client review only.',
    jan_test_checklist: LUX_VIEWING_BY_INVITATION_JAN_TEST_CHECKLIST,
    viewing_formats: LUX_VIEWING_FORMATS,
    updated_at: viewing.updated_at,
    updated_by: viewing.updated_by,
  };
}
