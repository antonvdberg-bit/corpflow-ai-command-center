/**
 * Business Operations Dispatcher v1 — classify monitor findings to executors.
 *
 * Consumes `corpflow.business_operations_monitor.v1` findings (pure functions).
 * Does not replace the monitor endpoint.
 *
 * @see docs/runbooks/BUSINESS_OPERATIONS_DISPATCHER_V1.md
 */

import { BUSINESS_OPS_MONITOR_SCHEMA } from './business-operations-monitor.js';

export const BUSINESS_OPS_DISPATCHER_SCHEMA = 'corpflow.business_operations_dispatcher.v1';

/** @typedef {'anton' | 'cursor' | 'codex' | 'n8n' | 'no_action'} DispatcherOwner */

/**
 * @typedef {import('./business-operations-monitor.js').BusinessOpsFinding} BusinessOpsFinding
 */

/**
 * @typedef {{
 *   owner: DispatcherOwner,
 *   severity: import('./business-operations-monitor.js').MonitorSeverity,
 *   source: import('./business-operations-monitor.js').MonitorSource,
 *   objectType: import('./business-operations-monitor.js').MonitorObjectType,
 *   objectRef: string,
 *   gated: boolean,
 *   reason: string,
 *   recommendedNextAction: string,
 *   executorPrompt: string,
 *   antonNeeded: boolean,
 *   safeToIgnore: boolean,
 *   link: string | null,
 * }} BusinessOpsRouting
 */

/**
 * Whether the Telegram ops path should page Anton for this routing.
 *
 * @param {BusinessOpsRouting} routing
 * @returns {boolean}
 */
export function shouldPageAntonForRouting(routing) {
  if (!routing || typeof routing !== 'object') return false;
  return routing.owner === 'anton' || routing.gated === true;
}

/**
 * @param {DispatcherOwner} owner
 * @param {BusinessOpsFinding} finding
 * @returns {string}
 */
function executorPromptFor(owner, finding) {
  const ref = finding.objectRef || 'unknown';
  const action = finding.actionRequired || 'Review finding';
  switch (owner) {
    case 'anton':
      return `Operator decision required (${ref}): ${action}. Use the linked admin surface; do not automate payment or client sends.`;
    case 'cursor':
      return `Repo/app delivery task (${ref}): ${action}. Open PR on approved branch; post STATUS to Operator Bridge #249 when ready.`;
    case 'codex':
      return `Research or decision memo (${ref}): ${action}. Return patch-ready packet or ADR-lite recommendation; no production changes.`;
    case 'n8n':
      return `Hosted automation (${ref}): ${action}. Retry/digest/queue only — no customer-facing sends.`;
    default:
      return '';
  }
}

/**
 * Classify one monitor finding into an executor routing.
 *
 * @param {BusinessOpsFinding} finding
 * @returns {BusinessOpsRouting}
 */
export function classifyBusinessOpsFinding(finding) {
  const f = finding && typeof finding === 'object' ? finding : {};
  const severity = f.severity === 'urgent' || f.severity === 'warning' ? f.severity : 'info';
  const objectType = f.objectType || 'monitor';
  const objectRef = String(f.objectRef || 'unknown');
  const source = f.source || 'corpflowai';
  const link = f.link != null ? String(f.link) : null;
  const recommendedNextAction = String(f.recommendedNextAction || f.actionRequired || '').trim();
  const safeToIgnore = Boolean(f.safeToIgnore);
  const base = {
    severity,
    source,
    objectType,
    objectRef,
    recommendedNextAction,
    safeToIgnore,
    link,
    antonNeeded: false,
    gated: false,
    reason: '',
    owner: /** @type {DispatcherOwner} */ ('no_action'),
    executorPrompt: '',
  };

  // ERPNext optional cross-check — research path even when informational.
  if (
    objectType === 'monitor' &&
    (f.status === 'skipped' || severity === 'info') &&
    (source === 'erpnext' || objectRef.includes('erpnext'))
  ) {
    return {
      ...base,
      owner: 'codex',
      reason: 'ERPNext cross-check not configured; research/decision memo if integration is blocking pilots.',
      executorPrompt: executorPromptFor('codex', f),
      antonNeeded: false,
    };
  }

  // Silent success — informational / explicitly ignorable.
  if (safeToIgnore && severity === 'info') {
    return {
      ...base,
      owner: 'no_action',
      reason: 'Informational finding marked safeToIgnore; no executor action.',
      executorPrompt: '',
      antonNeeded: false,
    };
  }

  // Monitor / infrastructure findings.
  if (objectType === 'monitor') {
    if (f.status === 'skipped' || severity === 'info') {
      return {
        ...base,
        owner: 'no_action',
        reason: 'Optional monitor source not configured; no paging.',
        executorPrompt: '',
        antonNeeded: false,
      };
    }

    const isDb =
      objectRef.includes('corpflowai_db') ||
      String(f.actionRequired || '')
        .toLowerCase()
        .includes('database');
    if (severity === 'urgent') {
      return {
        ...base,
        owner: 'n8n',
        gated: isDb,
        antonNeeded: isDb,
        reason: isDb
          ? 'Critical CorpFlow DB monitor source unreachable — n8n retry plus Anton gate for production continuity.'
          : 'Monitor source unreachable — n8n retry/digest path.',
        executorPrompt: executorPromptFor('n8n', f),
      };
    }

    return {
      ...base,
      owner: 'n8n',
      reason: 'Monitor degradation — n8n handles retry/digest without Anton page unless gated.',
      executorPrompt: executorPromptFor('n8n', f),
    };
  }

  // Commercial / payment / operator judgement — Anton only.
  if (objectType === 'payment' || objectType === 'invoice') {
    return {
      ...base,
      owner: 'anton',
      gated: true,
      antonNeeded: true,
      reason: 'Commercial or payment judgement — hard-gated operator decision.',
      executorPrompt: executorPromptFor('anton', f),
    };
  }

  if (objectType === 'setup') {
    return {
      ...base,
      owner: 'anton',
      gated: true,
      antonNeeded: true,
      reason: 'Paid setup window — operator delivery judgement (no autonomous client sends).',
      executorPrompt: executorPromptFor('anton', f),
    };
  }

  // CMP delivery / repo-app tooling — Cursor.
  if (objectType === 'delivery' && objectRef.startsWith('ticket:')) {
    return {
      ...base,
      owner: 'cursor',
      gated: false,
      antonNeeded: false,
      reason: 'CMP delivery stale — repo/app/admin tooling work (PR, preview, CI surfacing).',
      executorPrompt: executorPromptFor('cursor', f),
    };
  }

  // Client review on Change Console — Cursor for pipeline; Anton only when urgent client gate.
  if (objectType === 'review') {
    if (severity === 'urgent') {
      return {
        ...base,
        owner: 'anton',
        gated: true,
        antonNeeded: true,
        reason: 'Urgent client review/approval — operator must nudge or record decision.',
        executorPrompt: executorPromptFor('anton', f),
      };
    }
    return {
      ...base,
      owner: 'cursor',
      gated: false,
      antonNeeded: false,
      reason: 'Client review pending — Cursor handles /change workflow or console fixes.',
      executorPrompt: executorPromptFor('cursor', f),
    };
  }

  // Lead intake SLA — n8n digest (not Anton Telegram).
  if (objectType === 'lead') {
    return {
      ...base,
      owner: severity === 'urgent' ? 'anton' : 'n8n',
      gated: severity === 'urgent',
      antonNeeded: severity === 'urgent',
      reason:
        severity === 'urgent'
          ? 'Intake SLA breached — Anton must review intake.'
          : 'Intake review reminder — n8n digest/queue only.',
      executorPrompt: executorPromptFor(severity === 'urgent' ? 'anton' : 'n8n', f),
    };
  }

  // Lead delivery without owner — n8n digest unless urgent.
  if (objectType === 'delivery' && objectRef.startsWith('lead:')) {
    return {
      ...base,
      owner: f.antonNeeded && severity === 'urgent' ? 'anton' : 'n8n',
      gated: Boolean(f.antonNeeded && severity === 'urgent'),
      antonNeeded: Boolean(f.antonNeeded && severity === 'urgent'),
      reason: 'Active lead missing owner movement — queue via n8n unless urgent operator gate.',
      executorPrompt: executorPromptFor(f.antonNeeded && severity === 'urgent' ? 'anton' : 'n8n', f),
    };
  }

  // Fallback: respect monitor antonNeeded without paging for soft warnings.
  if (f.antonNeeded && severity === 'urgent') {
    return {
      ...base,
      owner: 'anton',
      gated: true,
      antonNeeded: true,
      reason: 'Monitor marked urgent operator gate.',
      executorPrompt: executorPromptFor('anton', f),
    };
  }

  if (safeToIgnore) {
    return {
      ...base,
      owner: 'no_action',
      reason: 'Finding marked safeToIgnore.',
      executorPrompt: '',
    };
  }

  return {
    ...base,
    owner: 'codex',
    reason: 'Unclassified finding — Codex research/decision memo before implementation.',
    executorPrompt: executorPromptFor('codex', f),
  };
}

/**
 * @param {BusinessOpsRouting[]} routings
 */
export function summarizeDispatcherRoutings(routings) {
  const list = Array.isArray(routings) ? routings : [];
  const routes = { anton: 0, cursor: 0, codex: 0, n8n: 0, no_action: 0 };
  let page_anton = 0;
  for (const r of list) {
    if (!r || typeof r !== 'object') continue;
    if (routes[r.owner] != null) routes[r.owner] += 1;
    if (shouldPageAntonForRouting(r)) page_anton += 1;
  }
  const silent = list.length > 0 && page_anton === 0 && routes.cursor + routes.codex + routes.n8n === 0;
  return { routes, page_anton, silent };
}

/**
 * @param {import('./business-operations-monitor.js').BusinessOpsFinding[] | { findings?: unknown[] }} monitorInput
 * @param {{ evaluated_at?: string }} [opts]
 */
export function buildBusinessOperationsDispatcherReport(monitorInput, opts = {}) {
  const findings = Array.isArray(monitorInput)
    ? monitorInput
    : Array.isArray(monitorInput?.findings)
      ? monitorInput.findings
      : [];

  const routings = findings
    .filter((f) => f && typeof f === 'object')
    .map((f) => classifyBusinessOpsFinding(/** @type {BusinessOpsFinding} */ (f)));

  const summary = summarizeDispatcherRoutings(routings);
  const hasUrgentAnton = routings.some(
    (r) => shouldPageAntonForRouting(r) && (r.severity === 'urgent' || r.gated),
  );

  return {
    schema: BUSINESS_OPS_DISPATCHER_SCHEMA,
    version: 1,
    ok: !hasUrgentAnton,
    evaluated_at: opts.evaluated_at || new Date().toISOString(),
    monitor_schema: BUSINESS_OPS_MONITOR_SCHEMA,
    summary,
    routings,
  };
}
