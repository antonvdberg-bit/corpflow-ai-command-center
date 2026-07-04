/**
 * Business Operations Monitor v1 — read-only evaluation for Lead Rescue + CMP delivery.
 *
 * Pure evaluation helpers (no I/O). Loaders live in scripts/business-operations-monitor.mjs
 * and the GET /api/factory/business-operations-monitor route.
 *
 * @see docs/runbooks/BUSINESS_OPERATIONS_MONITOR_V1.md
 */

import {
  AI_LEAD_RESCUE_PRODUCT,
  isAiLeadRescueLead,
  leadRowToAiLeadRescueDetail,
  normalizeAiLeadRescueStatus,
  parseAiLeadRescueActivity,
  parseAiLeadRescueSetupChecklist,
} from '../cmp/_lib/ai-lead-rescue-operator.js';

export const BUSINESS_OPS_MONITOR_SCHEMA = 'corpflow.business_operations_monitor.v1';

/** @typedef {'info' | 'warning' | 'urgent'} MonitorSeverity */
/** @typedef {'corpflowai' | 'erpnext' | 'n8n' | 'github'} MonitorSource */
/** @typedef {'lead' | 'invoice' | 'payment' | 'setup' | 'review' | 'delivery' | 'monitor'} MonitorObjectType */

/**
 * @typedef {{
 *   severity: MonitorSeverity,
 *   source: MonitorSource,
 *   objectType: MonitorObjectType,
 *   objectRef: string,
 *   status: string,
 *   ageHours: number | null,
 *   actionRequired: string,
 *   antonNeeded: boolean,
 *   recommendedNextAction: string,
 *   safeToIgnore: boolean,
 *   link: string | null,
 * }} BusinessOpsFinding
 */

/** @type {readonly string[]} */
export const TERMINAL_LEAD_STATUSES = Object.freeze(['LOST', 'PAUSED', 'MONTHLY_ACTIVE']);

/** @type {readonly string[]} */
export const INVOICE_EXPECTED_STATUSES = Object.freeze(['QUOTE_SENT', 'PAYMENT_PENDING']);

/** @type {readonly string[]} */
export const SETUP_WINDOW_STATUSES = Object.freeze(['PAID_SETUP', 'SETUP_IN_PROGRESS']);

/** @type {readonly string[]} */
export const CLIENT_REVIEW_WORKFLOW_STATES = Object.freeze([
  'in_review',
  'changes_requested',
  'awaiting_client_programme_decisions',
  'preview_ready',
]);

export const DEFAULT_THRESHOLDS = Object.freeze({
  intakeReviewWarningHours: 2,
  intakeReviewUrgentHours: 4,
  invoiceMissingWarningHours: 12,
  invoiceMissingUrgentHours: 24,
  paymentPendingWarningHours: 72,
  paymentPendingUrgentHours: 120,
  setupWindowWarningHours: 24,
  setupWindowUrgentHours: 48,
  clientReviewWarningHours: 48,
  clientReviewUrgentHours: 96,
  deliveryStaleWarningHours: 48,
  deliveryStaleUrgentHours: 72,
});

/**
 * @param {unknown} v
 * @returns {Date | null}
 */
export function parseMonitorDate(v) {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {Date | string | null | undefined} from
 * @param {Date} now
 * @returns {number | null}
 */
export function ageHours(from, now) {
  const d = parseMonitorDate(from);
  if (!d) return null;
  const ms = now.getTime() - d.getTime();
  if (ms < 0) return 0;
  return Math.round((ms / 3600000) * 10) / 10;
}

/**
 * @param {number | null} ageH
 * @param {number} warnH
 * @param {number} urgentH
 * @returns {MonitorSeverity | null}
 */
export function severityForAge(ageH, warnH, urgentH) {
  if (ageH == null) return null;
  if (ageH >= urgentH) return 'urgent';
  if (ageH >= warnH) return 'warning';
  return null;
}

/**
 * @param {unknown} paymentStatus
 * @returns {boolean}
 */
export function isPaymentConfirmed(paymentStatus) {
  const ps = String(paymentStatus || 'none').trim().toLowerCase();
  return ps === 'paid' || ps === 'confirmed' || ps === 'received';
}

/**
 * @param {unknown} activity
 * @param {string} type
 * @returns {boolean}
 */
export function hasActivityType(activity, type) {
  if (!Array.isArray(activity)) return false;
  return activity.some((e) => e && typeof e === 'object' && String(e.type || '').trim() === type);
}

/**
 * @param {unknown} activity
 * @returns {string | null}
 */
export function findSetupWindowStartIso(activity) {
  if (!Array.isArray(activity)) return null;
  let earliest = null;
  for (const e of activity) {
    if (!e || typeof e !== 'object') continue;
    const type = String(e.type || '').trim();
    const statusAfter = normalizeAiLeadRescueStatus(e.status_after);
    const at = e.at != null ? String(e.at).trim() : '';
    if (!at) continue;
    const matches = type === 'payment_confirmed_manual' || statusAfter === 'PAID_SETUP';
    if (!matches) continue;
    if (!earliest || at < earliest) earliest = at;
  }
  return earliest;
}

/**
 * @param {string | null | undefined} adminBaseUrl
 * @param {string} leadId
 * @returns {string | null}
 */
export function leadAdminLink(adminBaseUrl, leadId) {
  const base = String(adminBaseUrl || '').trim().replace(/\/+$/, '');
  if (!base) return `/admin/lead-rescue/${leadId}`;
  return `${base}/admin/lead-rescue/${leadId}`;
}

/**
 * @param {string | null | undefined} changeBaseUrl
 * @param {string} ticketId
 * @returns {string | null}
 */
export function changeTicketLink(changeBaseUrl, ticketId) {
  const base = String(changeBaseUrl || '').trim().replace(/\/+$/, '');
  if (!base) return `/change?ticket=${encodeURIComponent(ticketId)}`;
  return `${base}/change?ticket=${encodeURIComponent(ticketId)}`;
}

/**
 * @param {import('@prisma/client').Lead} row
 * @param {Date} now
 * @param {typeof DEFAULT_THRESHOLDS} thresholds
 * @param {{ adminBaseUrl?: string | null }} [opts]
 * @returns {BusinessOpsFinding[]}
 */
export function evaluateLeadRescueRow(row, now, thresholds, opts = {}) {
  if (!row || !isAiLeadRescueLead(row.qualificationJson)) return [];
  const detail = leadRowToAiLeadRescueDetail(row);
  const status = detail.operations.status;
  if (TERMINAL_LEAD_STATUSES.includes(status)) return [];

  const findings = [];
  const activity = detail.activity || [];
  const submittedAt = row.createdAt;
  const updatedAt = row.updatedAt;
  const link = leadAdminLink(opts.adminBaseUrl, row.id);

  // 1) New intake without operator review
  if (status === 'NEW_INTAKE') {
    const reviewed =
      hasActivityType(activity, 'intake_reviewed') ||
      (detail.operations.owner != null && String(detail.operations.owner).trim() !== '');
    if (!reviewed) {
      const age = ageHours(submittedAt, now);
      const sev = severityForAge(
        age,
        thresholds.intakeReviewWarningHours,
        thresholds.intakeReviewUrgentHours,
      );
      if (sev) {
        findings.push({
          severity: sev,
          source: 'corpflowai',
          objectType: 'lead',
          objectRef: `lead:${row.id}`,
          status,
          ageHours: age,
          actionRequired: 'Review new Lead Rescue intake',
          antonNeeded: sev === 'urgent',
          recommendedNextAction:
            'Open admin lead detail, move to QUALIFYING, assign owner, log intake_reviewed activity',
          safeToIgnore: false,
          link,
        });
      }
    }
  }

  // 2) Ready for invoice but no invoice reference
  if (INVOICE_EXPECTED_STATUSES.includes(status)) {
    const invRef = detail.commercial.invoice_reference;
    if (!invRef || !String(invRef).trim()) {
      const age = ageHours(updatedAt, now);
      const sev = severityForAge(
        age,
        thresholds.invoiceMissingWarningHours,
        thresholds.invoiceMissingUrgentHours,
      );
      if (sev) {
        findings.push({
          severity: sev,
          source: 'corpflowai',
          objectType: 'invoice',
          objectRef: `lead:${row.id}`,
          status,
          ageHours: age,
          actionRequired: 'Record pro-forma / ERPNext invoice reference',
          antonNeeded: true,
          recommendedNextAction:
            'Send manual pro-forma (or ERPNext Quotation PDF if rehearsal go/no-go passed) and record invoice_reference on the Commercial card',
          safeToIgnore: false,
          link,
        });
      }
    }
  }

  // 3) Invoice exists but payment not confirmed after threshold
  const invRef = detail.commercial.invoice_reference;
  if (
    invRef &&
    String(invRef).trim() &&
    !isPaymentConfirmed(detail.commercial.payment_status) &&
    (INVOICE_EXPECTED_STATUSES.includes(status) || status === 'DEMO_BOOKED')
  ) {
    const age = ageHours(updatedAt, now);
    const sev = severityForAge(
      age,
      thresholds.paymentPendingWarningHours,
      thresholds.paymentPendingUrgentHours,
    );
    if (sev) {
      findings.push({
        severity: sev,
        source: 'corpflowai',
        objectType: 'payment',
        objectRef: `lead:${row.id}`,
        status: `${status} / payment:${detail.commercial.payment_status || 'none'}`,
        ageHours: age,
        actionRequired: 'Confirm payment / POP or chase buyer',
        antonNeeded: true,
        recommendedNextAction:
          'Verify bank receipt manually; update payment_status and ERPNext sandbox if cleared; do not start setup until paid',
        safeToIgnore: sev === 'warning',
        link,
      });
    }
  }

  // 4) Paid setup window approaching or breached
  if (SETUP_WINDOW_STATUSES.includes(status)) {
    const checklist = parseAiLeadRescueSetupChecklist(row.qualificationJson);
    if (!checklist.all_done) {
      const setupStart =
        findSetupWindowStartIso(activity) ||
        (status === 'PAID_SETUP' ? detail.operations.updated_at : null) ||
        updatedAt;
      const age = ageHours(setupStart, now);
      const sev = severityForAge(
        age,
        thresholds.setupWindowWarningHours,
        thresholds.setupWindowUrgentHours,
      );
      if (sev) {
        findings.push({
          severity: sev,
          source: 'corpflowai',
          objectType: 'setup',
          objectRef: `lead:${row.id}`,
          status: `${status} (${checklist.completed_count}/${checklist.total_count} checklist)`,
          ageHours: age,
          actionRequired: 'Complete 48-hour paid setup window',
          antonNeeded: true,
          recommendedNextAction:
            'Work setup checklist items; send buyer hand-over before window breach per AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md',
          safeToIgnore: false,
          link,
        });
      }
    }
  }

  // 6) Delivery item stale — active lead without owner movement
  if (
    !detail.operations.owner &&
    !['NEW_INTAKE', 'LOST', 'PAUSED'].includes(status) &&
    status !== 'MONTHLY_ACTIVE'
  ) {
    const age = ageHours(updatedAt, now);
    const sev = severityForAge(
      age,
      thresholds.deliveryStaleWarningHours,
      thresholds.deliveryStaleUrgentHours,
    );
    if (sev) {
      findings.push({
        severity: sev,
        source: 'corpflowai',
        objectType: 'delivery',
        objectRef: `lead:${row.id}`,
        status,
        ageHours: age,
        actionRequired: 'Assign owner and next action on active lead',
        antonNeeded: true,
        recommendedNextAction: 'Set owner + next_action on /admin/lead-rescue detail page',
        safeToIgnore: false,
        link,
      });
    }
  }

  return findings;
}

/**
 * @param {import('@prisma/client').CmpTicket} row
 * @param {Date} now
 * @param {typeof DEFAULT_THRESHOLDS} thresholds
 * @param {{ changeBaseUrl?: string | null }} [opts]
 * @returns {BusinessOpsFinding[]}
 */
export function evaluateCmpTicketRow(row, now, thresholds, opts = {}) {
  if (!row) return [];
  const findings = [];
  const cj = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const wf =
    cv.workflow_state != null ? String(cv.workflow_state).trim().toLowerCase() : '';
  const st = String(row.status || '').trim();
  const sg = String(row.stage || '').trim();
  const combined = `${st} ${sg}`.toLowerCase();
  const link = changeTicketLink(opts.changeBaseUrl, row.id);
  const ageUpdated = ageHours(row.updatedAt, now);

  // 5) Client review / approval waiting
  if (CLIENT_REVIEW_WORKFLOW_STATES.includes(wf)) {
    const sev = severityForAge(
      ageUpdated,
      thresholds.clientReviewWarningHours,
      thresholds.clientReviewUrgentHours,
    );
    if (sev) {
      findings.push({
        severity: sev,
        source: 'corpflowai',
        objectType: 'review',
        objectRef: `ticket:${row.id}`,
        status: wf,
        ageHours: ageUpdated,
        actionRequired: 'Client review or approval pending on Change Console',
        antonNeeded: sev === 'urgent',
        recommendedNextAction:
          'Open /change ticket, nudge client or record decision; update workflow_state when resolved',
        safeToIgnore: sev === 'warning',
        link,
      });
    }
  }

  // 6) Delivery stale — Approved/Build CMP ticket without movement
  const approvedBuild = combined.includes('approved') && combined.includes('build');
  const terminalTicket = combined.includes('closed') || st.toLowerCase() === 'closed';
  if (approvedBuild && !terminalTicket) {
    const sev = severityForAge(
      ageUpdated,
      thresholds.deliveryStaleWarningHours,
      thresholds.deliveryStaleUrgentHours,
    );
    if (sev) {
      findings.push({
        severity: sev,
        source: 'corpflowai',
        objectType: 'delivery',
        objectRef: `ticket:${row.id}`,
        status: `${st} / ${sg}`.trim(),
        ageHours: ageUpdated,
        actionRequired: 'CMP delivery ticket stale — no recent movement',
        antonNeeded: false,
        recommendedNextAction:
          'Check PR/preview/CI on /change; run cmp-monitor cron evidence or assign next build step',
        safeToIgnore: false,
        link,
      });
    }
  }

  return findings;
}

/**
 * @param {Array<{ name: string, ok: boolean | null, skipped?: boolean, error?: string | null }>} sources
 * @returns {BusinessOpsFinding[]}
 */
export function evaluateSourceHealthFindings(sources) {
  const findings = [];
  if (!Array.isArray(sources)) return findings;

  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    const name = String(src.name || 'unknown').trim();
    if (src.skipped) {
      findings.push({
        severity: 'info',
        source: name === 'erpnext' ? 'erpnext' : 'monitor',
        objectType: 'monitor',
        objectRef: `source:${name}`,
        status: 'skipped',
        ageHours: null,
        actionRequired: 'Optional monitor source not configured',
        antonNeeded: false,
        recommendedNextAction: `Configure ${name} env references in n8n or hosted scheduler when ready`,
        safeToIgnore: true,
        link: null,
      });
      continue;
    }
    if (src.ok === false) {
      findings.push({
        severity: 'urgent',
        source: name === 'erpnext' ? 'erpnext' : name === 'github' ? 'github' : 'corpflowai',
        objectType: 'monitor',
        objectRef: `source:${name}`,
        status: 'unreachable',
        ageHours: null,
        actionRequired: `Monitor source failed: ${name}`,
        antonNeeded: true,
        recommendedNextAction:
          name === 'erpnext'
            ? 'Check ERPNext sandbox loopback / SSH tunnel; do not expose credentials in repo'
            : 'Check hosted endpoint health and n8n workflow execution log',
        safeToIgnore: false,
        link: null,
      });
    }
  }

  return findings;
}

/**
 * @param {BusinessOpsFinding[]} findings
 * @returns {{ urgent: number, warning: number, info: number, actionRequired: number }}
 */
export function summarizeFindings(findings) {
  const list = Array.isArray(findings) ? findings : [];
  let urgent = 0;
  let warning = 0;
  let info = 0;
  let actionRequired = 0;
  for (const f of list) {
    if (!f || typeof f !== 'object') continue;
    if (f.severity === 'urgent') urgent += 1;
    else if (f.severity === 'warning') warning += 1;
    else info += 1;
    if (!f.safeToIgnore) actionRequired += 1;
  }
  return { urgent, warning, info, actionRequired };
}

/**
 * @param {{
 *   leads?: import('@prisma/client').Lead[],
 *   cmpTickets?: import('@prisma/client').CmpTicket[],
 *   sources?: Array<{ name: string, ok: boolean | null, skipped?: boolean, error?: string | null }>,
 *   now?: Date,
 *   thresholds?: Partial<typeof DEFAULT_THRESHOLDS>,
 *   adminBaseUrl?: string | null,
 *   changeBaseUrl?: string | null,
 * }} input
 * @returns {{
 *   schema: string,
 *   version: number,
 *   ok: boolean,
 *   evaluated_at: string,
 *   product: string,
 *   summary: ReturnType<typeof summarizeFindings>,
 *   sources: Array<{ name: string, ok: boolean | null, skipped?: boolean, error?: string | null }>,
 *   findings: BusinessOpsFinding[],
 *   thresholds: typeof DEFAULT_THRESHOLDS,
 * }}
 */
export function buildBusinessOperationsMonitorReport(input = {}) {
  const now = input.now instanceof Date ? input.now : new Date();
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(input.thresholds || {}) };
  const leads = Array.isArray(input.leads) ? input.leads : [];
  const tickets = Array.isArray(input.cmpTickets) ? input.cmpTickets : [];
  const sources = Array.isArray(input.sources) ? input.sources : [];

  /** @type {BusinessOpsFinding[]} */
  const findings = [];

  for (const row of leads) {
    findings.push(...evaluateLeadRescueRow(row, now, thresholds, { adminBaseUrl: input.adminBaseUrl }));
  }
  for (const row of tickets) {
    findings.push(...evaluateCmpTicketRow(row, now, thresholds, { changeBaseUrl: input.changeBaseUrl }));
  }
  findings.push(...evaluateSourceHealthFindings(sources));

  const severityRank = { urgent: 0, warning: 1, info: 2 };
  findings.sort(
    (a, b) =>
      (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9) ||
      String(a.objectRef).localeCompare(String(b.objectRef)),
  );

  const summary = summarizeFindings(findings);

  return {
    schema: BUSINESS_OPS_MONITOR_SCHEMA,
    version: 1,
    ok: summary.urgent === 0,
    evaluated_at: now.toISOString(),
    product: AI_LEAD_RESCUE_PRODUCT,
    summary,
    sources,
    findings,
    thresholds,
  };
}
