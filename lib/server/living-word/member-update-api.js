/**
 * Living Word — Member Update Flow v1 (test-tenant pilot) — HTTP handlers.
 *
 * Admin-gated, non-public. Lives on the existing Living Word test tenant.
 *
 * HARD BOUNDARIES (enforced here + by the schema module):
 *  - no GHL writes, no GHL contact import, no outbound messaging
 *  - no DB writes in this build — durable persistence is gated on the Prisma
 *    migration approval (see implementation packet DB schema gate)
 *  - operator review required: canonical_write is ALWAYS false here
 *  - non-public: requires a factory admin session (verifyFactoryMasterAuth)
 *
 * Routes (all under the Living Word tenant surface):
 *   GET  /api/tenant/living-word/member-update          -> form schema + enums
 *   POST /api/tenant/living-word/member-update/identify  -> match + prefill
 *   POST /api/tenant/living-word/member-update/submit    -> validate + review payload
 */

import { verifyFactoryMasterAuth } from '../factory-master-auth.js';
import { matchMember } from './member-update-match.js';
import { getSyntheticMembers, SYNTHETIC_SEED_NOTICE } from './member-update-seed.js';
import {
  buildPrefill,
  computeProposedUpdate,
  IDENTIFY_FIELDS,
  LIVING_WORD_TENANT_ID,
  MEMBER_UPDATE_FORM_ID,
  PROVISIONAL_ENUMS_ARE_NOT_GHL_TRUTH,
  PROVISIONAL_SANDBOX_ENUMS,
  UPDATE_FIELDS,
  validateIdentifyBody,
  validateUpdateBody,
} from './member-update-schema.js';

/**
 * This build never exposes the flow publicly. Public/link exposure for the
 * 10-person adult pilot is a separate, explicitly-gated step.
 */
export const MEMBER_UPDATE_PUBLIC_LAUNCH_AUTHORIZED = false;

function ensureAdmin(req, res) {
  if (MEMBER_UPDATE_PUBLIC_LAUNCH_AUTHORIZED) return true;
  if (verifyFactoryMasterAuth(req)) return true;
  res.status(403).json({
    ok: false,
    error: 'admin_session_required',
    detail: 'Living Word Member Update Flow v1 is a non-public test-tenant pilot. Sign in as factory admin.',
  });
  return false;
}

function notice() {
  return {
    tenant_id: LIVING_WORD_TENANT_ID,
    form_id: MEMBER_UPDATE_FORM_ID,
    test_tenant_pilot: true,
    public_launch_authorized: MEMBER_UPDATE_PUBLIC_LAUNCH_AUTHORIZED,
    persistence: 'deferred_pending_migration_approval',
    seed: SYNTHETIC_SEED_NOTICE,
  };
}

/** GET — form schema + provisional enums (single source of truth for the UI). */
export function memberUpdateSchemaHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!ensureAdmin(req, res)) return undefined;

  return res.status(200).json({
    ok: true,
    ...notice(),
    identify_fields: IDENTIFY_FIELDS,
    update_fields: UPDATE_FIELDS,
    provisional_enums: PROVISIONAL_SANDBOX_ENUMS,
    provisional_enums_are_not_ghl_truth: PROVISIONAL_ENUMS_ARE_NOT_GHL_TRUTH,
  });
}

/** POST — identify + match against synthetic seed + prefill. */
export function memberUpdateIdentifyHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!ensureAdmin(req, res)) return undefined;

  const validated = validateIdentifyBody(req.body);
  if (!validated.ok) {
    return res.status(400).json({ ok: false, ...validated });
  }

  const match = matchMember(validated.data, getSyntheticMembers());
  const prefill = match.record ? buildPrefill(match.record) : {};

  return res.status(200).json({
    ok: true,
    ...notice(),
    match: { status: match.status, matched_by: match.matched_by, candidate_count: match.candidate_count },
    prefill,
  });
}

/** POST — validate update, compute blank-safe proposed change, return review payload. */
export function memberUpdateSubmitHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!ensureAdmin(req, res)) return undefined;

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const identify = body.identify && typeof body.identify === 'object' ? body.identify : {};
  const update = body.update && typeof body.update === 'object' ? body.update : body;

  const validatedUpdate = validateUpdateBody(update);
  if (!validatedUpdate.ok) {
    return res.status(400).json({ ok: false, ...validatedUpdate });
  }

  // Re-match (server-trusted) so prefill/diff is computed against the seed,
  // not against client-supplied "existing" values.
  const identifyValidated = validateIdentifyBody(identify);
  const match = identifyValidated.ok
    ? matchMember(identifyValidated.data, getSyntheticMembers())
    : { status: 'unconfirmed', matched_by: 'none', record: null, candidate_count: 0 };

  const existing = match.record || {};
  const { proposed, changes } = computeProposedUpdate(existing, validatedUpdate.data);

  return res.status(200).json({
    ok: true,
    ...notice(),
    review_required: true,
    canonical_write: false,
    match: { status: match.status, matched_by: match.matched_by, candidate_count: match.candidate_count },
    proposed_update: proposed,
    changes,
    change_count: changes.length,
  });
}
