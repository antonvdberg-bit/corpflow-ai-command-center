/**
 * Lux confidential presentation packet (issue #717).
 * Stored in leads.qualification_json.private_client_presentation — no schema migration.
 * No live email / WhatsApp / SMS send — draft text only for operator copy.
 *
 * Journey step: Private Conversation → Confidential Presentation → Viewing by Invitation
 */

import { parseLuxOperatorWorkflow } from './lux-lead-operator-workflow.js';
import { buildLuxPrivateClientQualificationView } from './lux-lead-qualification.js';
import { parsePrivateClientShortlist } from './lux-lead-shortlist.js';

/** Canonical next step after confidential presentation (operator-selected). */
export const LUX_PRESENTATION_VIEWING_NEXT_STEP = 'viewing_by_invitation';

export const LUX_PRESENTATION_JOURNEY_LABEL =
  'Private Conversation → Confidential Presentation → Viewing by Invitation';

/**
 * Jan functional test sequence for the Confidential Presentation panel (#717).
 * Local UI checkboxes only — not persisted; synthetic/test use.
 *
 * @type {readonly { id: string, label: string }[]}
 */
export const LUX_CONFIDENTIAL_PRESENTATION_JAN_TEST_CHECKLIST = Object.freeze([
  { id: 'select_enquiry', label: 'Submit or select a test enquiry.' },
  { id: 'move_qualified', label: 'Move it to qualified (or invited).' },
  { id: 'complete_qualification', label: 'Complete qualification fields.' },
  { id: 'add_shortlist', label: 'Add at least one shortlisted residence.' },
  { id: 'open_presentation', label: 'Open the Confidential Presentation section.' },
  {
    id: 'draft_voice',
    label: 'Confirm the presentation draft reads like Rare & Exclusive, not a generic property email.',
  },
  { id: 'next_viewing', label: 'Confirm the next action is Viewing by Invitation.' },
  { id: 'record_gaps', label: 'Record what is unclear, missing or not usable.' },
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
 * @param {unknown} qj
 */
export function parsePrivateClientPresentation(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const raw =
    root.private_client_presentation && typeof root.private_client_presentation === 'object'
      ? root.private_client_presentation
      : {};
  const nextStepRaw = safeStr(raw.viewing_next_step, 64).toLowerCase();
  const viewing_next_step =
    nextStepRaw === LUX_PRESENTATION_VIEWING_NEXT_STEP ? LUX_PRESENTATION_VIEWING_NEXT_STEP : null;
  return {
    notes: raw.notes != null ? safeStr(raw.notes, 4000) || null : null,
    viewing_next_step,
    updated_at: nonempty(raw.updated_at) ? String(raw.updated_at).slice(0, 40) : null,
    updated_by: nonempty(raw.updated_by) ? String(raw.updated_by).slice(0, 320) : null,
  };
}

/**
 * Merge operator presentation notes / next-step into qualification_json (no schema change).
 * @param {Record<string, unknown>} qualificationJson
 * @param {{
 *   presentation_notes?: unknown,
 *   viewing_next_step?: unknown,
 * }} patch
 * @param {string} actorLabel
 * @param {string} nowIso
 */
export function mergePrivateClientPresentationPatch(qualificationJson, patch, actorLabel, nowIso) {
  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const prev = parsePrivateClientPresentation(qj);
  const p = patch && typeof patch === 'object' ? patch : {};
  let changed = false;

  let notes = prev.notes;
  if (p.presentation_notes !== undefined) {
    const note =
      p.presentation_notes === null || p.presentation_notes === ''
        ? null
        : safeStr(p.presentation_notes, 4000) || null;
    if ((prev.notes || null) !== note) {
      notes = note;
      changed = true;
    }
  }

  let viewing_next_step = prev.viewing_next_step;
  if (p.viewing_next_step !== undefined) {
    const raw = p.viewing_next_step;
    let next = null;
    if (raw === true || raw === 1 || raw === '1' || raw === 'true') {
      next = LUX_PRESENTATION_VIEWING_NEXT_STEP;
    } else if (raw === false || raw === 0 || raw === '0' || raw === 'false' || raw === null || raw === '') {
      next = null;
    } else {
      const s = safeStr(raw, 64).toLowerCase();
      next = s === LUX_PRESENTATION_VIEWING_NEXT_STEP ? LUX_PRESENTATION_VIEWING_NEXT_STEP : null;
    }
    if ((prev.viewing_next_step || null) !== next) {
      viewing_next_step = next;
      changed = true;
    }
  }

  if (!changed) return { ok: true, qj, changed: false };

  qj.private_client_presentation = {
    notes,
    viewing_next_step,
    updated_at: nowIso,
    updated_by: safeStr(actorLabel, 320) || 'unknown',
  };
  return { ok: true, qj, changed: true };
}

/**
 * Presentation-readiness checklist from existing lead + qualification + shortlist + presentation JSON.
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
export function buildLuxPresentationReadinessChecklist(leadLike) {
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

  const name = safeStr(leadLike?.name, 200);
  const email = safeStr(leadLike?.email, 254);
  const phone = safeStr(leadLike?.phone, 80);
  const contactPresent = Boolean(name || email || phone);

  const stageReady = stageRank >= STAGE_RANK.qualified;
  const qualificationSummary = qual.filled_count >= 4;
  const shortlistReady = shortlist.residences.length >= 1;
  const notesReady = Boolean(presentation.notes);
  const viewingReady = presentation.viewing_next_step === LUX_PRESENTATION_VIEWING_NEXT_STEP;

  const items = [
    {
      id: 'client_contact',
      label: 'Client name / contact present',
      ready: contactPresent,
      detail: contactPresent
        ? [name || null, email || null, phone || null].filter(Boolean).join(' · ')
        : 'Add name, email, or telephone on the enquiry',
    },
    {
      id: 'stage_qualified',
      label: 'Lead status is at least qualified / invited',
      ready: stageReady,
      detail: stageReady ? `Stage: ${stage}` : `Current stage: ${stage} — move to qualified or invited`,
    },
    {
      id: 'qualification_summary',
      label: 'Qualification summary captured',
      ready: qualificationSummary,
      detail: qualificationSummary
        ? `${qual.filled_count}/${qual.filled_count + qual.missing_count} fields present`
        : `${qual.filled_count} fields filled — capture at least four qualification fields`,
    },
    {
      id: 'shortlist_residences',
      label: 'Shortlisted residence(s) selected',
      ready: shortlistReady,
      detail: shortlistReady
        ? `${shortlist.residences.length} residence(s) on shortlist`
        : 'Associate at least one staged residence in Curated Shortlist',
    },
    {
      id: 'presentation_notes',
      label: 'Presentation notes completed',
      ready: notesReady,
      detail: notesReady ? 'Operator presentation notes saved' : 'Add confidential presentation notes below',
    },
    {
      id: 'viewing_next_step',
      label: 'Viewing by Invitation next step selected',
      ready: viewingReady,
      detail: viewingReady
        ? 'Next step: Viewing by Invitation'
        : 'Select Viewing by Invitation as the next step',
    },
  ];

  const ready_count = items.filter((i) => i.ready).length;
  return {
    items,
    ready_count,
    total_count: items.length,
    all_ready: ready_count === items.length,
    stage,
    presentation,
    qualification: qual,
    shortlist,
  };
}

/**
 * On-screen / copy-ready confidential presentation draft (no send).
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
export function buildLuxConfidentialPresentationPacket(leadLike) {
  const qj =
    leadLike?.qualificationJson && typeof leadLike.qualificationJson === 'object'
      ? leadLike.qualificationJson
      : leadLike?.qualification_json && typeof leadLike.qualification_json === 'object'
        ? leadLike.qualification_json
        : {};
  const readiness = buildLuxPresentationReadinessChecklist({ ...leadLike, qualificationJson: qj });
  const qual = readiness.qualification;
  const shortlist = readiness.shortlist;
  const presentation = readiness.presentation;
  const name = safeStr(leadLike?.name, 200) || 'Private client';
  const email = safeStr(leadLike?.email, 254);
  const phone = safeStr(leadLike?.phone, 80);

  const lines = [];
  lines.push('CONFIDENTIAL PRESENTATION (DRAFT — NOT SENT)');
  lines.push('Rare & Exclusive Collection · Private client advisory');
  lines.push('');
  lines.push(`Journey: ${LUX_PRESENTATION_JOURNEY_LABEL}`);
  lines.push('');
  lines.push(`Prepared for: ${name}`);
  if (email) lines.push(`Email: ${email}`);
  if (phone) lines.push(`Telephone: ${phone}`);
  lines.push('');
  lines.push('This introduction is confidential and shared by invitation only.');
  lines.push('It is not a public listing, open-market brochure, or generic property circular.');
  lines.push('');
  lines.push('Private-client brief');
  lines.push(`- Objective: ${qual.fields.buyer_objective || '—'}`);
  lines.push(`- Preferred area: ${qual.fields.preferred_area || '—'}`);
  lines.push(`- Property type: ${qual.fields.property_type || '—'}`);
  lines.push(`- Budget band: ${qual.fields.budget_band || '—'}`);
  lines.push(`- Timing: ${qual.fields.timing || '—'}`);
  lines.push(`- Residency / investment: ${qual.fields.residency_investment_interest || '—'}`);
  lines.push(`- Confidentiality: ${qual.fields.confidentiality_preference || '—'}`);
  lines.push('');
  lines.push('Residences for confidential review');
  if (!shortlist.residences.length) {
    lines.push('- (none associated yet — complete Curated Shortlist before presenting)');
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
  lines.push('Advisory notes for this presentation');
  if (presentation.notes) {
    lines.push(presentation.notes);
  } else {
    lines.push('(Operator presentation notes not yet captured.)');
  }
  lines.push('');
  lines.push('Suggested confidential briefing (copy-ready)');
  lines.push('---');
  lines.push(`Dear ${name},`);
  lines.push('');
  lines.push(
    'Following our private conversation, we have prepared a confidential presentation of residences aligned to your brief. These opportunities are introduced discreetly and are not offered through open catalogues.',
  );
  lines.push('');
  if (shortlist.residences.length) {
    lines.push('For your confidential review:');
    shortlist.residences.forEach((r, i) => {
      lines.push(
        `${i + 1}. ${r.title} — ${r.region || 'Mauritius'}${r.price_range ? ` (${r.price_range})` : ''}`,
      );
    });
    lines.push('');
  }
  if (presentation.notes) {
    lines.push(presentation.notes);
    lines.push('');
  }
  lines.push(
    'The natural next step, should you wish to proceed, is a Viewing by Invitation — arranged privately and only after mutual confirmation. No commitment is implied by this presentation.',
  );
  lines.push('');
  lines.push('Kind regards,');
  lines.push('Rare & Exclusive Collection advisory');
  lines.push('---');
  lines.push('');
  lines.push('Operator note: This draft is for review/copy only. No email, WhatsApp, or SMS was sent by the system.');
  lines.push(`Next action: Viewing by Invitation${presentation.viewing_next_step === LUX_PRESENTATION_VIEWING_NEXT_STEP ? ' (selected)' : ' (select in panel to mark ready)'}.`);

  const draft_text = lines.join('\n');
  return {
    journey_label: LUX_PRESENTATION_JOURNEY_LABEL,
    next_action_label: 'Viewing by Invitation',
    checklist: readiness.items,
    ready_count: readiness.ready_count,
    total_count: readiness.total_count,
    all_ready: readiness.all_ready,
    presentation_notes: presentation.notes,
    viewing_next_step: presentation.viewing_next_step,
    viewing_next_step_selected: presentation.viewing_next_step === LUX_PRESENTATION_VIEWING_NEXT_STEP,
    stage: readiness.stage,
    residences: shortlist.residences,
    draft_text,
    send_disabled: true,
    send_notice: 'No live send — copy the confidential presentation for operator/client review only.',
    jan_test_checklist: LUX_CONFIDENTIAL_PRESENTATION_JAN_TEST_CHECKLIST,
    updated_at: presentation.updated_at,
    updated_by: presentation.updated_by,
  };
}
