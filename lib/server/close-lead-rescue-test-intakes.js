/**
 * Operator-only batch close for approved AI Lead Rescue test intakes.
 *
 * No client sends, no invoice/payment changes. Status → LOST + activity log.
 *
 * @see docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md
 */

import { isAiLeadRescueLead, normalizeAiLeadRescueStatus } from '../cmp/_lib/ai-lead-rescue-operator.js';

/** Anton-approved test Lead Rescue intake IDs (2026-07-06). */
export const APPROVED_TEST_LEAD_INTAKE_IDS = Object.freeze([
  'cmqyoljm20000l204i639y3w0',
  'cmqyp3yeb0005l204feh39c11',
  'cmqypc6p6000al20482ogb2ll',
  'cmqypgs6t000fl2045uyvp9y3',
  'cmqypl7mx000kl204aleh73mv',
  'cmqypvttp000pl20432k4ag7p',
  'cmr7mvd070000l404r6s284py',
]);

export const CLOSE_TEST_INTAKE_TARGET_STATUS = 'LOST';

const TERMINAL_SKIP_STATUSES = new Set(['LOST', 'PAUSED', 'MONTHLY_ACTIVE']);

/**
 * @param {string} [actorLabel]
 */
export function buildCloseTestIntakeActivity(actorLabel) {
  return {
    channel: 'internal',
    type: 'intake_closed_test_data',
    note:
      'Operator-approved closure of test intake data (no client contact, invoice, or payment change).',
    status_after: CLOSE_TEST_INTAKE_TARGET_STATUS,
    actor_label: actorLabel || 'factory-admin',
  };
}

/**
 * @param {import('@prisma/client').Lead | null | undefined} row
 */
export function describeTestIntakeRow(row) {
  if (!row) {
    return { eligible: false, reason: 'NOT_FOUND' };
  }
  if (!isAiLeadRescueLead(row.qualificationJson)) {
    return { eligible: false, reason: 'NOT_AI_LEAD_RESCUE', status: row.status };
  }
  const status = normalizeAiLeadRescueStatus(row.status) || row.status;
  if (TERMINAL_SKIP_STATUSES.has(String(status))) {
    return { eligible: false, reason: 'ALREADY_TERMINAL', status };
  }
  return { eligible: true, reason: 'OK', status };
}

/**
 * @param {{
 *   dryRun?: boolean,
 *   actorLabel?: string,
 *   prismaClient: import('@prisma/client').PrismaClient,
 *   applyPatch: typeof import('./admin-lead-rescue-api.js').applyAiLeadRescuePatch,
 *   leadIds?: string[],
 * }} args
 */
export async function closeLeadRescueTestIntakes(args) {
  const dryRun = args.dryRun !== false;
  const actorLabel = String(args.actorLabel || 'factory-admin').trim() || 'factory-admin';
  const ids = Array.isArray(args.leadIds) ? args.leadIds : [...APPROVED_TEST_LEAD_INTAKE_IDS];
  const db = args.prismaClient;
  const applyPatch = args.applyPatch;

  /** @type {Array<Record<string, unknown>>} */
  const results = [];

  for (const id of ids) {
    const row = await db.lead.findUnique({ where: { id } });
    const desc = describeTestIntakeRow(row);

    if (!desc.eligible) {
      results.push({
        id,
        action: 'skipped',
        reason: desc.reason,
        status: desc.status ?? null,
      });
      continue;
    }

    if (dryRun) {
      results.push({
        id,
        action: 'would_close',
        from_status: desc.status,
        to_status: CLOSE_TEST_INTAKE_TARGET_STATUS,
        activity_type: 'intake_closed_test_data',
      });
      continue;
    }

    const patchResult = await applyPatch({
      prismaClient: db,
      actorLabel,
      body: {
        id,
        status: CLOSE_TEST_INTAKE_TARGET_STATUS,
        activity_append: buildCloseTestIntakeActivity(actorLabel),
      },
    });

    results.push({
      id,
      action: patchResult.ok ? 'closed' : 'failed',
      from_status: desc.status,
      to_status: patchResult.ok ? CLOSE_TEST_INTAKE_TARGET_STATUS : null,
      error: patchResult.ok ? null : patchResult.error,
      message: patchResult.ok ? null : patchResult.message,
      lead_status: patchResult.ok ? patchResult.lead?.operations?.status : null,
    });
  }

  const closed = results.filter((r) => r.action === 'closed').length;
  const wouldClose = results.filter((r) => r.action === 'would_close').length;
  const failed = results.filter((r) => r.action === 'failed').length;

  return {
    ok: failed === 0,
    dry_run: dryRun,
    target_status: CLOSE_TEST_INTAKE_TARGET_STATUS,
    summary: { total: results.length, closed, would_close: wouldClose, skipped: results.length - closed - wouldClose - failed, failed },
    results,
  };
}
