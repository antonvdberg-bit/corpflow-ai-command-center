/**
 * Append-only transition / action audit for Change Console (console_json.transition_history).
 */

import { computeRealityPanel } from './reality-panel-compute.js';
import { deriveChangeStage } from './change-stage-engine.js';

const MAX_HISTORY = 200;

/**
 * @typedef {{
 *   event: string,
 *   from_stage: string,
 *   to_stage: string,
 *   actor: 'client' | 'operator' | 'system',
 *   timestamp: string,
 *   reason: string,
 *   blocker?: string,
 * }} ChangeTransitionEntry
 */

/**
 * @param {Record<string, unknown>} consoleJson
 * @param {ChangeTransitionEntry} entry
 * @returns {Record<string, unknown>}
 */
export function appendTransitionEntry(consoleJson, entry) {
  const base = consoleJson && typeof consoleJson === 'object' ? { ...consoleJson } : {};
  const hist = Array.isArray(base.transition_history) ? [...base.transition_history] : [];
  hist.push(entry);
  base.transition_history = hist.slice(-MAX_HISTORY);
  base.last_transition_at = entry.timestamp;
  if (entry.event === 'primary_action' || entry.event === 'action_executed') {
    base.last_action_taken = String(entry.reason || '').slice(0, 500);
  }
  return base;
}

/**
 * @param {Record<string, unknown>} consoleJson
 * @returns {{
 *   transitions: ChangeTransitionEntry[],
 *   last_transition_at: string | null,
 *   last_action_taken: string | null,
 *   previous_stages: string[],
 * }}
 */
export function buildChangeStageHistory(consoleJson) {
  const cj = consoleJson && typeof consoleJson === 'object' ? consoleJson : {};
  const hist = Array.isArray(cj.transition_history)
    ? /** @type {ChangeTransitionEntry[]} */ (cj.transition_history.filter((x) => x && typeof x === 'object'))
    : [];
  const tail = hist.slice(-50);
  const seen = new Set();
  const previous_stages = [];
  for (const e of tail) {
    if (typeof e.from_stage === 'string' && e.from_stage && !seen.has(e.from_stage)) {
      seen.add(e.from_stage);
      previous_stages.push(e.from_stage);
    }
    if (typeof e.to_stage === 'string' && e.to_stage && !seen.has(e.to_stage)) {
      seen.add(e.to_stage);
      previous_stages.push(e.to_stage);
    }
  }
  return {
    transitions: tail,
    last_transition_at: typeof cj.last_transition_at === 'string' ? cj.last_transition_at : null,
    last_action_taken: typeof cj.last_action_taken === 'string' ? cj.last_action_taken : null,
    previous_stages: previous_stages.slice(-20),
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   rowBefore: { id: string; tenantId?: string | null; status?: string | null; stage?: string | null; consoleJson?: unknown },
 *   consoleJsonAfter: Record<string, unknown>,
 *   statusAfter: string,
 *   stageAfter: string,
 *   actor: 'client' | 'operator' | 'system',
 *   action: string,
 * }} args
 * @returns {Promise<Record<string, unknown>>}
 */
export async function enrichConsoleJsonWithChangeAudit(prisma, args) {
  const { rowBefore, consoleJsonAfter, statusAfter, stageAfter, actor, action } = args;
  const ts = new Date().toISOString();

  const ticketShape = (status, stage, cj) => ({
    id: rowBefore.id,
    tenantId: rowBefore.tenantId != null ? rowBefore.tenantId : null,
    status: status != null ? String(status) : '',
    stage: stage != null ? String(stage) : '',
    consoleJson: cj && typeof cj === 'object' ? cj : {},
  });

  /** Same-request Prisma read dedupe for attachment counts + tenant hero lookups. */
  const queryCache = {
    attachmentCountByTicketId: new Map(),
    tenantHeroByTenantId: new Map(),
  };

  let rpBefore;
  let rpAfter;
  try {
    rpBefore = await computeRealityPanel(prisma, ticketShape(rowBefore.status, rowBefore.stage, rowBefore.consoleJson), queryCache);
  } catch {
    rpBefore = { blocker: { code: 'none', label: '' }, next_action: 'FIX' };
  }
  try {
    rpAfter = await computeRealityPanel(prisma, ticketShape(statusAfter, stageAfter, consoleJsonAfter), queryCache);
  } catch {
    rpAfter = { blocker: { code: 'none', label: '' }, next_action: 'FIX' };
  }

  const safeRp = (rp) =>
    rp && typeof rp === 'object' && !('error' in rp && rp.error)
      ? /** @type {Record<string, unknown>} */ (rp)
      : { blocker: { code: 'none', label: '' }, next_action: 'FIX' };

  const csBefore = deriveChangeStage({
    ticket: {
      id: rowBefore.id,
      status: rowBefore.status != null ? String(rowBefore.status) : '',
      stage: rowBefore.stage != null ? String(rowBefore.stage) : '',
      tenantId: rowBefore.tenantId != null ? String(rowBefore.tenantId) : null,
    },
    consoleJson: rowBefore.consoleJson && typeof rowBefore.consoleJson === 'object' ? rowBefore.consoleJson : {},
    reality_panel: safeRp(rpBefore),
  });

  const csAfter = deriveChangeStage({
    ticket: {
      id: rowBefore.id,
      status: String(statusAfter || ''),
      stage: String(stageAfter || ''),
      tenantId: rowBefore.tenantId != null ? String(rowBefore.tenantId) : null,
    },
    consoleJson: consoleJsonAfter,
    reality_panel: safeRp(rpAfter),
  });

  const blockerAfter =
    rpAfter && typeof rpAfter === 'object' && rpAfter.blocker && typeof rpAfter.blocker === 'object'
      ? String(rpAfter.blocker.code || '').trim()
      : '';

  let next = { ...consoleJsonAfter };

  if (csBefore.current_stage !== csAfter.current_stage) {
    next = appendTransitionEntry(next, {
      event: 'stage_transition',
      from_stage: csBefore.current_stage,
      to_stage: csAfter.current_stage,
      actor,
      timestamp: ts,
      reason: `after:${action}`,
      blocker: blockerAfter || undefined,
    });
  }

  const isRecoveryRetry =
    csAfter &&
    typeof csAfter === 'object' &&
    (csAfter.dominant_action === 'FIX_PREVIEW_TRUTH' ||
      csAfter.dominant_action === 'RESTORE_PREVIEW_AUTOMATION' ||
      csAfter.dominant_action === 'FIX_DELIVERY_INTEGRITY');

  next = appendTransitionEntry(next, {
    event: isRecoveryRetry ? 'recovery_retry' : 'primary_action',
    from_stage: csAfter.current_stage,
    to_stage: csAfter.current_stage,
    actor,
    timestamp: new Date().toISOString(),
    reason: `${action}:${csAfter.dominant_action}`,
    blocker: blockerAfter || undefined,
  });

  return next;
}
