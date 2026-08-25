/**
 * #994 — shared Prospect detail / action patch over existing JSON namespaces.
 * No schema. No external send. Staff / Core environment only.
 */

import {
  AI_LEAD_RESCUE_PRODUCT,
  appendAiLeadRescueActivity,
  mergeAiLeadRescueOperatorPatch,
  normalizeAiLeadRescueStatus,
} from '../cmp/_lib/ai-lead-rescue-operator.js';
import {
  RAPID_DELIVERY_PRODUCT,
  mergeRapidDeliveryOperatorPatch,
  normalizeRapidDeliveryStatus,
} from '../cmp/_lib/rapid-delivery-operator.js';
import {
  assertSafeProspectIntervention,
  detectProspectProduct,
  isCanonicalStageTransitionAllowed,
  mapCanonicalStageToNativeStatus,
  mapNativeStatusToCanonicalStage,
} from '../cmp/_lib/prospect-operations-view-model.js';
import {
  assertCommercialApprovalPatchSafe,
  mergeCommercialApprovalIntoQualification,
} from '../revenue/commercial-approval-record.js';
import {
  assertWebsiteRescueDeliveryPatchSafe,
  mergeWebsiteRescueDeliveryIntoQualification,
} from '../website-rescue/onboarding-delivery-record.js';

const PROTECTED_BODY_FLAGS = Object.freeze([
  'external_send',
  'send',
  'email_send',
  'whatsapp_send',
  'sms_send',
  'payment_process',
  'payment_execute',
  'collect_payment',
  'deploy',
  'real_dns_cutover_executed',
  'real_client_production_deploy',
]);

/**
 * @param {unknown} body
 * @returns {{ ok: true } | { ok: false, error: string, http_status: number }}
 */
export function assertProspectPatchNotProtected(body) {
  const b = body && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body) : {};
  for (const key of PROTECTED_BODY_FLAGS) {
    if (b[key] === true) {
      return { ok: false, error: 'PROTECTED_ACTION_BLOCKED', http_status: 403 };
    }
  }
  const intervention = b.intervention != null ? String(b.intervention).trim() : '';
  if (intervention) {
    const gate = assertSafeProspectIntervention(intervention);
    if (!gate.ok) {
      return { ok: false, error: gate.error, http_status: 403 };
    }
  }
  return { ok: true };
}

/**
 * Persist #551 commercial-rail evidence into existing qualificationJson.
 *
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} patch
 * @param {{ actorLabel: string, nowIso: string, product: string }} opts
 */
function attachCommercialApprovalIfPresent(row, patch, opts) {
  if (patch.commercial_approval === undefined || patch.commercial_approval === null) {
    return { ok: true, row };
  }
  const merged = mergeCommercialApprovalIntoQualification(row.qualificationJson, patch.commercial_approval, {
    actorLabel: opts.actorLabel,
    nowIso: opts.nowIso,
    prospectId: String(row.id || ''),
    product: opts.product,
  });
  if (!merged.ok) return merged;
  return {
    ok: true,
    row: {
      ...row,
      qualificationJson: merged.qualificationJson,
    },
  };
}

/**
 * Persist #716 Website Rescue onboarding/delivery into existing qualificationJson.
 *
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} patch
 * @param {{ actorLabel: string, nowIso: string, product: string }} opts
 */
function attachWebsiteRescueDeliveryIfPresent(row, patch, opts) {
  if (patch.website_rescue_delivery === undefined || patch.website_rescue_delivery === null) {
    return { ok: true, row };
  }
  if (opts.product !== RAPID_DELIVERY_PRODUCT) {
    return { ok: false, error: 'website_rescue_delivery_not_applicable', http_status: 400 };
  }
  const qj =
    row.qualificationJson && typeof row.qualificationJson === 'object' && !Array.isArray(row.qualificationJson)
      ? /** @type {Record<string, unknown>} */ (row.qualificationJson)
      : {};
  const intakeMeta = qj.intake_meta && typeof qj.intake_meta === 'object' ? qj.intake_meta : {};
  const merged = mergeWebsiteRescueDeliveryIntoQualification(row.qualificationJson, patch.website_rescue_delivery, {
    actorLabel: opts.actorLabel,
    nowIso: opts.nowIso,
    prospectId: String(row.id || ''),
    organisationName: String(intakeMeta.business_name || row.name || ''),
    personName: String(row.name || ''),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    website: String(intakeMeta.website || ''),
  });
  if (!merged.ok) return merged;
  return {
    ok: true,
    row: {
      ...row,
      qualificationJson: merged.qualificationJson,
    },
  };
}

/**
 * Commercial rail first so #716 reads the current financially_approved boolean.
 *
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} patch
 * @param {{ actorLabel: string, nowIso: string, product: string }} opts
 */
function attachPersistedNamespaces(row, patch, opts) {
  const commercial = attachCommercialApprovalIfPresent(row, patch, opts);
  if (!commercial.ok) return commercial;
  return attachWebsiteRescueDeliveryIfPresent(commercial.row, patch, opts);
}

/**
 * Apply owner / stage / next-action / due / urgency / note onto existing JSON.
 *
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} patch
 * @param {{ actorLabel?: string, nowIso?: string }} [opts]
 * @returns {{
 *   ok: true,
 *   row: Record<string, unknown>,
 * } | {
 *   ok: false,
 *   error: string,
 *   http_status: number,
 * }}
 */
export function applySharedProspectOperatorPatch(row, patch, opts = {}) {
  const protectedGate = assertProspectPatchNotProtected(patch);
  if (!protectedGate.ok) return protectedGate;

  if (patch.commercial_approval !== undefined && patch.commercial_approval !== null) {
    const commercialGate = assertCommercialApprovalPatchSafe(patch.commercial_approval);
    if (!commercialGate.ok) return commercialGate;
  }
  if (patch.website_rescue_delivery !== undefined && patch.website_rescue_delivery !== null) {
    const deliveryGate = assertWebsiteRescueDeliveryPatchSafe(patch.website_rescue_delivery);
    if (!deliveryGate.ok) return deliveryGate;
  }

  const product = detectProspectProduct(row?.qualificationJson);
  if (product !== AI_LEAD_RESCUE_PRODUCT && product !== RAPID_DELIVERY_PRODUCT) {
    return { ok: false, error: 'prospect_not_found', http_status: 404 };
  }

  const actorLabel = String(opts.actorLabel || 'operator').trim().slice(0, 320) || 'operator';
  const nowIso = String(opts.nowIso || new Date().toISOString());
  const qjPrev =
    row.qualificationJson && typeof row.qualificationJson === 'object' && !Array.isArray(row.qualificationJson)
      ? /** @type {Record<string, unknown>} */ (row.qualificationJson)
      : {};

  const statusProvided = patch.status !== undefined && String(patch.status).trim();
  const stageProvided = patch.canonical_stage !== undefined && String(patch.canonical_stage).trim();
  const nativeFromCanonical = stageProvided
    ? mapCanonicalStageToNativeStatus(product, String(patch.canonical_stage || ''))
    : null;
  if (stageProvided && !nativeFromCanonical) {
    return { ok: false, error: 'invalid_canonical_stage', http_status: 400 };
  }

  const currentNative =
    product === AI_LEAD_RESCUE_PRODUCT
      ? String(row.status || '')
      : String(
          qjPrev.rapid_delivery_operator && typeof qjPrev.rapid_delivery_operator === 'object'
            ? /** @type {Record<string, unknown>} */ (qjPrev.rapid_delivery_operator).status || ''
            : '',
        );
  const currentStage = mapNativeStatusToCanonicalStage(product, currentNative);
  const stageChanged = stageProvided && String(patch.canonical_stage) !== currentStage;
  if (stageChanged) {
    const toStage = String(patch.canonical_stage || '');
    if (!isCanonicalStageTransitionAllowed(currentStage, toStage)) {
      return { ok: false, error: 'invalid_stage_transition', http_status: 400 };
    }
  }

  const requestedNative = stageChanged
    ? nativeFromCanonical
    : statusProvided
      ? String(patch.status).trim()
      : null;

  if (product === AI_LEAD_RESCUE_PRODUCT) {
    const nativeStatus = requestedNative ? normalizeAiLeadRescueStatus(requestedNative) : null;
    if (requestedNative && !nativeStatus) {
      return { ok: false, error: 'invalid_status', http_status: 400 };
    }
    let merged = mergeAiLeadRescueOperatorPatch(
      qjPrev,
      {
        owner: patch.owner,
        next_action: patch.next_action,
        next_action_due: patch.next_action_due,
        priority: patch.priority,
        urgency: patch.urgency,
        waiting_on: patch.waiting_on,
        notes: patch.notes,
        note_append: patch.note_append,
      },
      actorLabel,
      nowIso,
    );
    if (patch.note_append != null && String(patch.note_append).trim()) {
      const activityResult = appendAiLeadRescueActivity(
        merged,
        {
          channel: 'internal',
          type: 'note',
          note: patch.note_append,
          next_action: patch.next_action,
          next_action_date: patch.next_action_due,
          status_after: nativeStatus || currentNative,
        },
        actorLabel,
        nowIso,
      );
      if (!activityResult.ok) {
        return { ok: false, error: activityResult.error, http_status: 400 };
      }
      merged = activityResult.qj;
    }
    const nextRow = {
      ...row,
      qualificationJson: merged,
      updatedAt: new Date(nowIso),
    };
    if (nativeStatus) nextRow.status = nativeStatus;
    return attachPersistedNamespaces(nextRow, patch, { actorLabel, nowIso, product });
  }

  const nativeStatus = requestedNative ? normalizeRapidDeliveryStatus(requestedNative) : null;
  if (requestedNative && !nativeStatus) {
    return { ok: false, error: 'invalid_status', http_status: 400 };
  }
  const q = { ...qjPrev };
  q.rapid_delivery_operator = mergeRapidDeliveryOperatorPatch(
    /** @type {Record<string, unknown> | null} */ (q.rapid_delivery_operator),
    {
      status: nativeStatus || undefined,
      owner: patch.owner,
      next_action: patch.next_action,
      next_action_due: patch.next_action_due,
      priority: patch.priority,
      urgency: patch.urgency,
      waiting_on: patch.waiting_on,
      notes: patch.notes,
      note_append: patch.note_append,
    },
    nowIso,
    actorLabel,
  );
  const nextRow = {
    ...row,
    qualificationJson: q,
    updatedAt: new Date(nowIso),
  };
  if (nativeStatus === 'won' || nativeStatus === 'closed') {
    nextRow.status = 'CLOSED';
  }
  return attachPersistedNamespaces(nextRow, patch, { actorLabel, nowIso, product });
}
