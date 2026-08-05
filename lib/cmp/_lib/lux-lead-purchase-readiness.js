/**
 * Lux Purchase Readiness workflow (Viewing by Invitation → Purchase).
 * Stored in leads.qualification_json.private_client_purchase_readiness — no schema migration.
 * No live email / WhatsApp / SMS / payment / contract — draft text only for operator copy.
 *
 * Journey step: Viewing by Invitation → Purchase
 *
 * Not a payment, legal, conveyancing, banking, tax, immigration, KYC/AML, or live
 * transaction system — controlled operator readiness for the next private conversation.
 */

import { parseLuxOperatorWorkflow } from './lux-lead-operator-workflow.js';
import { buildLuxPrivateClientQualificationView } from './lux-lead-qualification.js';
import { parsePrivateClientShortlist } from './lux-lead-shortlist.js';
import {
  LUX_PRESENTATION_VIEWING_NEXT_STEP,
  parsePrivateClientPresentation,
} from './lux-lead-confidential-presentation.js';
import { parsePrivateClientViewing } from './lux-lead-viewing-by-invitation.js';

/** Full buyer journey (Jan-approved private-client path). */
export const LUX_PURCHASE_BUYER_JOURNEY_LABEL =
  'Discover → Express Interest → Private Conversation → Confidential Presentation → Viewing by Invitation → Purchase';

/** Panel-focused journey segment shown above the checklist. */
export const LUX_PURCHASE_JOURNEY_LABEL = 'Viewing by Invitation → Purchase';

/**
 * Purchase readiness levels (manual selection — not a live transaction state).
 * @type {readonly { id: string, label: string }[]}
 */
export const LUX_PURCHASE_READINESS_LEVELS = Object.freeze([
  { id: 'exploring', label: 'Exploring' },
  { id: 'interested', label: 'Interested' },
  { id: 'serious', label: 'Serious' },
  { id: 'ready_for_private_purchase_discussion', label: 'Ready for private purchase discussion' },
  { id: 'not_proceeding', label: 'Not proceeding' },
]);

/**
 * Next private operator actions (manual only — no calendar/payment/contract send).
 * @type {readonly { id: string, label: string }[]}
 */
export const LUX_PURCHASE_NEXT_ACTIONS = Object.freeze([
  { id: 'follow_up_conversation', label: 'Follow-up conversation' },
  { id: 'arrange_second_viewing', label: 'Arrange second viewing' },
  { id: 'request_additional_information', label: 'Request additional information' },
  { id: 'prepare_purchase_discussion', label: 'Prepare purchase discussion' },
  { id: 'close_not_proceeding', label: 'Close as not proceeding' },
]);

/**
 * Neutral manual document / information checklist prompts (operator guidance only).
 * Not KYC/AML/legal/finance advice — reminders for the private conversation prep.
 * @type {readonly { id: string, label: string }[]}
 */
export const LUX_PURCHASE_DOCUMENTS_CHECKLIST = Object.freeze([
  { id: 'confirm_preferred_residence', label: 'Confirm preferred residence / purchase target' },
  { id: 'confirm_timing', label: 'Confirm buyer timing preference' },
  { id: 'note_viewing_questions', label: 'Capture questions raised at the viewing' },
  { id: 'discretion_preference', label: 'Confirm discretionary communication preference' },
  { id: 'prep_talking_points', label: 'Prepare private purchase discussion talking points' },
]);

const READINESS_IDS = new Set(LUX_PURCHASE_READINESS_LEVELS.map((x) => x.id));
const NEXT_ACTION_IDS = new Set(LUX_PURCHASE_NEXT_ACTIONS.map((x) => x.id));
const DOC_IDS = new Set(LUX_PURCHASE_DOCUMENTS_CHECKLIST.map((x) => x.id));

/**
 * Jan functional test sequence for the Purchase Readiness panel.
 * Local UI checkboxes only — not persisted; synthetic/test use.
 *
 * @type {readonly { id: string, label: string }[]}
 */
export const LUX_PURCHASE_READINESS_JAN_TEST_CHECKLIST = Object.freeze([
  { id: 'select_viewing_lead', label: 'Select a lead that has reached Viewing by Invitation.' },
  { id: 'confirm_viewing_details', label: 'Confirm the viewing details are present.' },
  { id: 'capture_outcome', label: 'Capture the viewing outcome.' },
  { id: 'select_readiness', label: 'Select buyer intent / purchase readiness.' },
  { id: 'add_next_action', label: 'Add next manual action.' },
  { id: 'review_draft', label: 'Review the Private Purchase Discussion draft.' },
  {
    id: 'voice_check',
    label: 'Confirm it feels Rare & Exclusive and suitable for a private client.',
  },
  { id: 'send_disabled', label: 'Confirm Send is disabled/manual-only.' },
  { id: 'record_gaps', label: 'Record anything unclear, missing, or not usable.' },
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
function normalizeReadiness(raw) {
  const s = safeStr(raw, 80).toLowerCase();
  return READINESS_IDS.has(s) ? s : null;
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
function normalizeNextAction(raw) {
  const s = safeStr(raw, 80).toLowerCase();
  return NEXT_ACTION_IDS.has(s) ? s : null;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeDocumentsSelected(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const id = safeStr(item, 80).toLowerCase();
    if (!id || !DOC_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * @param {string | null} id
 * @returns {string}
 */
export function luxPurchaseReadinessLabel(id) {
  const hit = LUX_PURCHASE_READINESS_LEVELS.find((x) => x.id === safeStr(id, 80));
  return hit ? hit.label : id || '—';
}

/**
 * @param {string | null} id
 * @returns {string}
 */
export function luxPurchaseNextActionLabel(id) {
  const hit = LUX_PURCHASE_NEXT_ACTIONS.find((x) => x.id === safeStr(id, 80));
  return hit ? hit.label : id || '—';
}

/**
 * @param {unknown} qj
 */
export function parsePrivateClientPurchaseReadiness(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const raw =
    root.private_client_purchase_readiness &&
    typeof root.private_client_purchase_readiness === 'object'
      ? root.private_client_purchase_readiness
      : {};
  return {
    viewing_outcome_notes:
      raw.viewing_outcome_notes != null ? safeStr(raw.viewing_outcome_notes, 4000) || null : null,
    buyer_intent: raw.buyer_intent != null ? safeStr(raw.buyer_intent, 4000) || null : null,
    preferred_residence:
      raw.preferred_residence != null ? safeStr(raw.preferred_residence, 320) || null : null,
    purchase_readiness: normalizeReadiness(raw.purchase_readiness),
    next_private_action: normalizeNextAction(raw.next_private_action),
    documents_selected: normalizeDocumentsSelected(raw.documents_selected),
    documents_notes: raw.documents_notes != null ? safeStr(raw.documents_notes, 4000) || null : null,
    manual_transaction_notes:
      raw.manual_transaction_notes != null
        ? safeStr(raw.manual_transaction_notes, 4000) || null
        : null,
    operator_notes: raw.operator_notes != null ? safeStr(raw.operator_notes, 4000) || null : null,
    updated_at: nonempty(raw.updated_at) ? String(raw.updated_at).slice(0, 40) : null,
    updated_by: nonempty(raw.updated_by) ? String(raw.updated_by).slice(0, 320) : null,
  };
}

/**
 * Merge operator purchase-readiness fields into qualification_json (no schema change).
 * @param {Record<string, unknown>} qualificationJson
 * @param {{
 *   purchase_viewing_outcome?: unknown,
 *   purchase_buyer_intent?: unknown,
 *   purchase_preferred_residence?: unknown,
 *   purchase_readiness?: unknown,
 *   purchase_next_action?: unknown,
 *   purchase_documents_selected?: unknown,
 *   purchase_documents_notes?: unknown,
 *   purchase_transaction_notes?: unknown,
 *   purchase_operator_notes?: unknown,
 * }} patch
 * @param {string} actorLabel
 * @param {string} nowIso
 */
export function mergePrivateClientPurchaseReadinessPatch(
  qualificationJson,
  patch,
  actorLabel,
  nowIso,
) {
  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const prev = parsePrivateClientPurchaseReadiness(qj);
  const p = patch && typeof patch === 'object' ? patch : {};
  let changed = false;

  let viewing_outcome_notes = prev.viewing_outcome_notes;
  if (p.purchase_viewing_outcome !== undefined) {
    const next =
      p.purchase_viewing_outcome === null || p.purchase_viewing_outcome === ''
        ? null
        : safeStr(p.purchase_viewing_outcome, 4000) || null;
    if ((prev.viewing_outcome_notes || null) !== next) {
      viewing_outcome_notes = next;
      changed = true;
    }
  }

  let buyer_intent = prev.buyer_intent;
  if (p.purchase_buyer_intent !== undefined) {
    const next =
      p.purchase_buyer_intent === null || p.purchase_buyer_intent === ''
        ? null
        : safeStr(p.purchase_buyer_intent, 4000) || null;
    if ((prev.buyer_intent || null) !== next) {
      buyer_intent = next;
      changed = true;
    }
  }

  let preferred_residence = prev.preferred_residence;
  if (p.purchase_preferred_residence !== undefined) {
    const next =
      p.purchase_preferred_residence === null || p.purchase_preferred_residence === ''
        ? null
        : safeStr(p.purchase_preferred_residence, 320) || null;
    if ((prev.preferred_residence || null) !== next) {
      preferred_residence = next;
      changed = true;
    }
  }

  let purchase_readiness = prev.purchase_readiness;
  if (p.purchase_readiness !== undefined) {
    const next =
      p.purchase_readiness === null || p.purchase_readiness === ''
        ? null
        : normalizeReadiness(p.purchase_readiness);
    if ((prev.purchase_readiness || null) !== next) {
      purchase_readiness = next;
      changed = true;
    }
  }

  let next_private_action = prev.next_private_action;
  if (p.purchase_next_action !== undefined) {
    const next =
      p.purchase_next_action === null || p.purchase_next_action === ''
        ? null
        : normalizeNextAction(p.purchase_next_action);
    if ((prev.next_private_action || null) !== next) {
      next_private_action = next;
      changed = true;
    }
  }

  let documents_selected = prev.documents_selected;
  if (p.purchase_documents_selected !== undefined) {
    const next = normalizeDocumentsSelected(p.purchase_documents_selected);
    const prevKey = prev.documents_selected.join('|');
    const nextKey = next.join('|');
    if (prevKey !== nextKey) {
      documents_selected = next;
      changed = true;
    }
  }

  let documents_notes = prev.documents_notes;
  if (p.purchase_documents_notes !== undefined) {
    const next =
      p.purchase_documents_notes === null || p.purchase_documents_notes === ''
        ? null
        : safeStr(p.purchase_documents_notes, 4000) || null;
    if ((prev.documents_notes || null) !== next) {
      documents_notes = next;
      changed = true;
    }
  }

  let manual_transaction_notes = prev.manual_transaction_notes;
  if (p.purchase_transaction_notes !== undefined) {
    const next =
      p.purchase_transaction_notes === null || p.purchase_transaction_notes === ''
        ? null
        : safeStr(p.purchase_transaction_notes, 4000) || null;
    if ((prev.manual_transaction_notes || null) !== next) {
      manual_transaction_notes = next;
      changed = true;
    }
  }

  let operator_notes = prev.operator_notes;
  if (p.purchase_operator_notes !== undefined) {
    const next =
      p.purchase_operator_notes === null || p.purchase_operator_notes === ''
        ? null
        : safeStr(p.purchase_operator_notes, 4000) || null;
    if ((prev.operator_notes || null) !== next) {
      operator_notes = next;
      changed = true;
    }
  }

  if (!changed) return { ok: true, qj, changed: false };

  qj.private_client_purchase_readiness = {
    viewing_outcome_notes,
    buyer_intent,
    preferred_residence,
    purchase_readiness,
    next_private_action,
    documents_selected,
    documents_notes,
    manual_transaction_notes,
    operator_notes,
    updated_at: nowIso,
    updated_by: safeStr(actorLabel, 320) || 'unknown',
  };
  return { ok: true, qj, changed: true };
}

/**
 * Purchase-readiness checklist from existing lead + upstream CRM JSON + purchase fields.
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
export function buildLuxPurchaseReadinessChecklist(leadLike) {
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
  const purchase = parsePrivateClientPurchaseReadiness(qj);

  const name = safeStr(leadLike?.name, 200);
  const email = safeStr(leadLike?.email, 254);
  const phone = safeStr(leadLike?.phone, 80);
  const contactPresent = Boolean(name || email || phone);

  const stageInvitedOrBeyond =
    stageRank >= STAGE_RANK.invited ||
    presentation.viewing_next_step === LUX_PRESENTATION_VIEWING_NEXT_STEP;
  const shortlistReady = shortlist.residences.length >= 1;
  const presentationReady =
    Boolean(presentation.notes) ||
    presentation.viewing_next_step === LUX_PRESENTATION_VIEWING_NEXT_STEP;
  const viewingReady =
    Boolean(viewing.viewing_format) ||
    Boolean(viewing.proposed_datetime) ||
    Boolean(viewing.access_concierge_notes);
  const outcomeReady = Boolean(purchase.viewing_outcome_notes);
  const intentReady = Boolean(purchase.buyer_intent);
  const preferredReady = Boolean(purchase.preferred_residence);
  const readinessReady = Boolean(purchase.purchase_readiness);
  const documentsReady =
    purchase.documents_selected.length >= 1 || Boolean(purchase.documents_notes);
  const nextActionReady = Boolean(purchase.next_private_action);
  const manualNextReady =
    outcomeReady && intentReady && preferredReady && readinessReady && nextActionReady;

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
      label: 'Lead has reached invited / viewing stage',
      ready: stageInvitedOrBeyond,
      detail: stageInvitedOrBeyond
        ? stageRank >= STAGE_RANK.invited
          ? `Stage: ${stage}`
          : `Stage: ${stage} · Viewing by Invitation path marked`
        : `Current stage: ${stage} — move to invited after viewing invitation`,
    },
    {
      id: 'shortlist_residences',
      label: 'Shortlisted residence selected',
      ready: shortlistReady,
      detail: shortlistReady
        ? `${shortlist.residences.length} residence(s) on shortlist`
        : 'Associate at least one staged residence in Curated Shortlist',
    },
    {
      id: 'presentation_ready',
      label: 'Confidential Presentation exists or was reviewed',
      ready: presentationReady,
      detail: presentationReady
        ? presentation.notes
          ? 'Presentation notes saved'
          : 'Viewing by Invitation next step marked on Confidential Presentation'
        : 'Complete Confidential Presentation before purchase readiness',
    },
    {
      id: 'viewing_details',
      label: 'Viewing by Invitation details exist',
      ready: viewingReady,
      detail: viewingReady
        ? [
            viewing.viewing_format || null,
            viewing.proposed_datetime || null,
            viewing.access_concierge_notes ? 'access notes' : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : 'Complete Viewing by Invitation format / date-time / access notes first',
    },
    {
      id: 'viewing_outcome',
      label: 'Viewing outcome captured',
      ready: outcomeReady,
      detail: outcomeReady
        ? 'Viewing outcome notes saved'
        : 'Record how the invited viewing went (private notes)',
    },
    {
      id: 'buyer_intent',
      label: 'Buyer intent captured',
      ready: intentReady,
      detail: intentReady
        ? 'Buyer response / intent saved'
        : 'Capture the private-client response after the viewing',
    },
    {
      id: 'preferred_residence',
      label: 'Preferred residence or purchase target captured',
      ready: preferredReady,
      detail: preferredReady
        ? String(purchase.preferred_residence)
        : 'Select or note the preferred residence / purchase target',
    },
    {
      id: 'purchase_readiness',
      label: 'Purchase readiness level selected',
      ready: readinessReady,
      detail: readinessReady
        ? luxPurchaseReadinessLabel(purchase.purchase_readiness)
        : 'Select exploring / interested / serious / ready / not proceeding',
    },
    {
      id: 'documents_checklist',
      label: 'Required next documents / information listed (manual checklist)',
      ready: documentsReady,
      detail: documentsReady
        ? purchase.documents_selected.length
          ? `${purchase.documents_selected.length} checklist item(s) selected`
          : 'Documents / information notes saved'
        : 'Tick neutral prep items or add documents / information notes',
    },
    {
      id: 'manual_purchase_next',
      label: 'Next action is manual private purchase conversation',
      ready: manualNextReady && nextActionReady,
      detail:
        manualNextReady && nextActionReady
          ? `Next: ${luxPurchaseNextActionLabel(purchase.next_private_action)} (send disabled)`
          : 'Complete outcome, intent, preferred residence, readiness, and next action first',
    },
  ];

  const ready_count = items.filter((i) => i.ready).length;
  return {
    items,
    ready_count,
    total_count: items.length,
    all_ready: ready_count === items.length,
    stage,
    purchase,
    viewing,
    presentation,
    qualification: qual,
    shortlist,
  };
}

/**
 * On-screen / copy-ready Purchase Readiness / Private Purchase Discussion draft (no send).
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
export function buildLuxPurchaseReadinessPacket(leadLike) {
  const qj =
    leadLike?.qualificationJson && typeof leadLike.qualificationJson === 'object'
      ? leadLike.qualificationJson
      : leadLike?.qualification_json && typeof leadLike.qualification_json === 'object'
        ? leadLike.qualification_json
        : {};
  const readiness = buildLuxPurchaseReadinessChecklist({ ...leadLike, qualificationJson: qj });
  const qual = readiness.qualification;
  const shortlist = readiness.shortlist;
  const viewing = readiness.viewing;
  const purchase = readiness.purchase;
  const name = safeStr(leadLike?.name, 200) || 'Private client';
  const email = safeStr(leadLike?.email, 254);
  const phone = safeStr(leadLike?.phone, 80);
  const readinessLabel = luxPurchaseReadinessLabel(purchase.purchase_readiness);
  const nextActionLabel = luxPurchaseNextActionLabel(purchase.next_private_action);

  const preferredLabel = (() => {
    const pref = safeStr(purchase.preferred_residence, 320);
    if (!pref) return null;
    const bySlug = shortlist.residences.find(
      (r) => safeStr(r.slug, 64).toLowerCase() === pref.toLowerCase(),
    );
    if (bySlug) return `${bySlug.title} (${bySlug.slug})`;
    const byTitle = shortlist.residences.find(
      (r) => safeStr(r.title, 200).toLowerCase() === pref.toLowerCase(),
    );
    if (byTitle) return `${byTitle.title} (${byTitle.slug})`;
    return pref;
  })();

  const lines = [];
  lines.push('PURCHASE READINESS / PRIVATE PURCHASE DISCUSSION (DRAFT — NOT SENT)');
  lines.push('Rare & Exclusive Collection · Private client advisory');
  lines.push('');
  lines.push(`Buyer journey: ${LUX_PURCHASE_BUYER_JOURNEY_LABEL}`);
  lines.push(`Current step: ${LUX_PURCHASE_JOURNEY_LABEL}`);
  lines.push('');
  lines.push(`Prepared for: ${name}`);
  if (email) lines.push(`Email: ${email}`);
  if (phone) lines.push(`Telephone: ${phone}`);
  lines.push('');
  lines.push(
    'This note prepares a private purchase conversation after a Viewing by Invitation.',
  );
  lines.push(
    'It is not a contract, offer, payment request, legal advice, tax advice, finance advice, or immigration guidance.',
  );
  lines.push('');
  lines.push('Private-client brief (from qualification)');
  lines.push(`- Objective: ${qual.fields.buyer_objective || '—'}`);
  lines.push(`- Preferred area: ${qual.fields.preferred_area || '—'}`);
  lines.push(`- Property type: ${qual.fields.property_type || '—'}`);
  lines.push(`- Budget band: ${qual.fields.budget_band || '—'}`);
  lines.push(`- Timing: ${qual.fields.timing || '—'}`);
  lines.push(`- Confidentiality: ${qual.fields.confidentiality_preference || '—'}`);
  lines.push('');
  lines.push('Shortlisted residences');
  if (!shortlist.residences.length) {
    lines.push('- (none associated yet)');
  } else {
    shortlist.residences.forEach((r, i) => {
      const band = r.price_range ? ` · ${r.price_range}` : '';
      lines.push(`${i + 1}. ${r.title} — ${r.region || 'Mauritius'}${band} · Ref: ${r.slug}`);
    });
  }
  lines.push('');
  lines.push('Viewing by Invitation (context)');
  lines.push(`- Format: ${viewing.viewing_format || '(not set)'}`);
  lines.push(`- Proposed date/time: ${viewing.proposed_datetime || '(not set)'}`);
  if (viewing.access_concierge_notes) {
    lines.push(`- Access / concierge: ${viewing.access_concierge_notes}`);
  }
  lines.push('');
  lines.push('Viewing outcome');
  lines.push(purchase.viewing_outcome_notes || '(Viewing outcome not yet captured.)');
  lines.push('');
  lines.push('Buyer response / intent');
  lines.push(purchase.buyer_intent || '(Buyer intent not yet captured.)');
  lines.push('');
  lines.push(`Preferred residence / purchase target: ${preferredLabel || '(not yet selected)'}`);
  lines.push(
    `Purchase readiness: ${purchase.purchase_readiness ? readinessLabel : '(not yet selected)'}`,
  );
  lines.push(
    `Next private action: ${purchase.next_private_action ? nextActionLabel : '(not yet selected)'}`,
  );
  lines.push('');
  lines.push('Manual documents / information checklist');
  if (!purchase.documents_selected.length && !purchase.documents_notes) {
    lines.push('- (none listed yet)');
  } else {
    for (const id of purchase.documents_selected) {
      const hit = LUX_PURCHASE_DOCUMENTS_CHECKLIST.find((d) => d.id === id);
      lines.push(`- ${hit ? hit.label : id}`);
    }
    if (purchase.documents_notes) {
      lines.push(`- Notes: ${purchase.documents_notes}`);
    }
  }
  if (purchase.manual_transaction_notes) {
    lines.push('');
    lines.push('Manual transaction notes (operator)');
    lines.push(purchase.manual_transaction_notes);
  }
  if (purchase.operator_notes) {
    lines.push('');
    lines.push('Internal operator notes');
    lines.push(purchase.operator_notes);
  }
  lines.push('');
  lines.push('Suggested private purchase discussion note (copy-ready)');
  lines.push('---');
  lines.push(`Dear ${name},`);
  lines.push('');
  lines.push(
    'Thank you for joining the Viewing by Invitation. We appreciated the opportunity to introduce the residence in a private setting, consistent with the Rare & Exclusive Collection approach.',
  );
  lines.push('');
  if (preferredLabel) {
    lines.push(`Preferred residence under discussion: ${preferredLabel}.`);
    lines.push('');
  }
  if (purchase.buyer_intent) {
    lines.push('From our conversation after the viewing:');
    lines.push(purchase.buyer_intent);
    lines.push('');
  }
  if (purchase.purchase_readiness === 'not_proceeding') {
    lines.push(
      'We understand you may not wish to proceed at this time. Should your circumstances change, we remain available for a discreet conversation.',
    );
  } else if (purchase.purchase_readiness === 'ready_for_private_purchase_discussion') {
    lines.push(
      'If you are ready, we would be pleased to arrange a private purchase discussion — a confidential conversation about next steps, without any obligation and without any automated transaction.',
    );
  } else if (purchase.purchase_readiness) {
    lines.push(
      `At this stage we note your posture as “${readinessLabel}”. We will keep the next step suitably paced and private.`,
    );
  } else {
    lines.push(
      'When you are ready, we can arrange a private conversation about whether a purchase discussion is appropriate.',
    );
  }
  lines.push('');
  if (
    purchase.next_private_action &&
    purchase.next_private_action !== 'close_not_proceeding'
  ) {
    lines.push(`Proposed next private step: ${nextActionLabel}.`);
    lines.push('');
  }
  lines.push(
    'This message does not constitute an offer, contract, payment request, or legal, tax, finance, or immigration advice. Any formal process would be arranged separately, by mutual agreement, with the appropriate independent advisors.',
  );
  lines.push('');
  lines.push('Kind regards,');
  lines.push('Rare & Exclusive Collection advisory');
  lines.push('---');
  lines.push('');
  lines.push(
    'Operator note: This draft is for review/copy only. No email, WhatsApp, SMS, payment, or contract action was taken by the system.',
  );
  lines.push(
    `Next action: Manual private purchase conversation${readiness.all_ready ? ' (checklist complete)' : ' (complete readiness items in panel)'}.`,
  );

  const draft_text = lines.join('\n');
  return {
    journey_label: LUX_PURCHASE_JOURNEY_LABEL,
    buyer_journey_label: LUX_PURCHASE_BUYER_JOURNEY_LABEL,
    next_action_label: purchase.next_private_action
      ? nextActionLabel
      : 'Manual private purchase conversation',
    checklist: readiness.items,
    ready_count: readiness.ready_count,
    total_count: readiness.total_count,
    all_ready: readiness.all_ready,
    viewing_outcome_notes: purchase.viewing_outcome_notes,
    buyer_intent: purchase.buyer_intent,
    preferred_residence: purchase.preferred_residence,
    preferred_residence_label: preferredLabel,
    purchase_readiness: purchase.purchase_readiness,
    purchase_readiness_label: purchase.purchase_readiness ? readinessLabel : null,
    next_private_action: purchase.next_private_action,
    next_private_action_label: purchase.next_private_action ? nextActionLabel : null,
    documents_selected: purchase.documents_selected,
    documents_notes: purchase.documents_notes,
    manual_transaction_notes: purchase.manual_transaction_notes,
    operator_notes: purchase.operator_notes,
    stage: readiness.stage,
    residences: shortlist.residences,
    draft_text,
    send_disabled: true,
    send_notice:
      'No live send — copy the private purchase discussion note for operator/client review only. No payment or contract action.',
    jan_test_checklist: LUX_PURCHASE_READINESS_JAN_TEST_CHECKLIST,
    purchase_readiness_levels: LUX_PURCHASE_READINESS_LEVELS,
    purchase_next_actions: LUX_PURCHASE_NEXT_ACTIONS,
    documents_checklist: LUX_PURCHASE_DOCUMENTS_CHECKLIST,
    updated_at: purchase.updated_at,
    updated_by: purchase.updated_by,
  };
}
