/**
 * Exception-only ops notification policy (issue #658).
 *
 * GitHub remains source of truth; Telegram is exception-only. Slack is retired
 * from CorpFlow operations — see docs/operations/SLACK_TELEGRAM_DEPENDENCY_AUDIT_658.md.
 *
 * @see docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md §4 severity ladder
 */

/** @typedef {{ ok?: boolean, needs_attention?: boolean, reasons?: string[] }} DeliveryVerdictSnapshot */

/** @typedef {{ kind: string, target: string, severity: string, stale?: string, why: string, next: string, anton: boolean }} HeartbeatAlert */

const MS_PER_HOUR = 60 * 60 * 1000;

/** Digest staleness threshold — exception when dispatcher digest missing (active day). */
export const DISPATCHER_DIGEST_STALE_HOURS = 12;

/** Open-PR WIP cap — exception only when exceeded (not routine "PR exists" noise). */
export const OPEN_PR_WIP_CAP = 2;

/**
 * Whether a CMP delivery checkpoint alert should fire (transition-only).
 * Suppresses unchanged blocked / needs_attention states across cron runs.
 *
 * @param {{
 *   prevVerdict?: DeliveryVerdictSnapshot | null,
 *   deliveryVerdict?: DeliveryVerdictSnapshot | null,
 * }} input
 * @returns {boolean}
 */
export function shouldEmitDeliveryCheckpointAlert({ prevVerdict, deliveryVerdict }) {
  if (!deliveryVerdict || typeof deliveryVerdict !== 'object') return false;

  const nowOk = Boolean(deliveryVerdict.ok);
  const prevOk =
    prevVerdict && typeof prevVerdict.ok === 'boolean' ? Boolean(prevVerdict.ok) : null;
  const newlyBlocked = prevOk === true && nowOk === false;
  const firstVerdictBlocked = prevOk === null && !nowOk;

  const needsAttention = Boolean(deliveryVerdict.needs_attention);
  const prevNeedsAttention =
    prevVerdict && typeof prevVerdict.needs_attention === 'boolean'
      ? Boolean(prevVerdict.needs_attention)
      : null;
  const newlyNeedsAttention = needsAttention && prevNeedsAttention !== true;

  return newlyBlocked || firstVerdictBlocked || newlyNeedsAttention;
}

/**
 * Evaluate GitHub heartbeat signals for exception-only Telegram paging.
 * Mirrors docs/n8n/templates/github-heartbeat-checker.template.json (inactive).
 *
 * Routine open-PR age / CI-surfacing checks are intentionally omitted (#658).
 *
 * @param {{
 *   now?: number,
 *   comments?: Array<{ body?: string, created_at?: string }>,
 *   prs?: Array<{ number?: number, created_at?: string }>,
 * }} input
 * @returns {{
 *   checked: string[],
 *   alert_count: number,
 *   alerts: HeartbeatAlert[],
 *   all_signals: HeartbeatAlert[],
 *   evaluated_at_utc: string,
 * }}
 */
export function evaluateGithubHeartbeatSignals(input = {}) {
  const now = Number.isFinite(input.now) ? input.now : Date.now();
  const comments = Array.isArray(input.comments) ? input.comments : [];
  const prs = Array.isArray(input.prs) ? input.prs : [];
  const alerts = /** @type {HeartbeatAlert[]} */ ([]);

  const digest = comments.find(
    (c) => c && typeof c.body === 'string' && c.body.includes('Dispatcher Digest'),
  );
  const lastDigestMs = digest ? new Date(digest.created_at || 0).getTime() : 0;
  if (!digest || now - lastDigestMs > DISPATCHER_DIGEST_STALE_HOURS * MS_PER_HOUR) {
    const staleH = digest ? Math.round((now - lastDigestMs) / MS_PER_HOUR) : null;
    alerts.push({
      kind: 'digest_stale',
      target: '#493',
      severity: 'error',
      stale: staleH != null ? `${staleH}h` : 'none found',
      why: 'no dispatcher digest within the 12h active-day window',
      next: 'Cursor posts a dispatcher digest',
      anton: false,
    });
  }

  if (prs.length > OPEN_PR_WIP_CAP) {
    alerts.push({
      kind: 'wip_cap',
      target: 'open PRs',
      severity: 'error',
      stale: 'n/a',
      why: `${prs.length} open PRs exceeds WIP cap of ${OPEN_PR_WIP_CAP}`,
      next: 'merge or close PRs to drain WIP',
      anton: true,
    });
  }

  const paging = alerts.filter((a) => a.severity === 'error' || a.severity === 'fatal');

  return {
    checked: ['#493 comments', 'open PRs', 'open Action-Plan issues'],
    alert_count: paging.length,
    alerts: paging,
    all_signals: alerts,
    evaluated_at_utc: new Date(now).toISOString(),
  };
}

/**
 * Whether a business-ops monitor finding should page Telegram (urgent only).
 *
 * @param {{ severity?: string, safeToIgnore?: boolean, antonNeeded?: boolean }} finding
 * @returns {boolean}
 */
export function shouldPageBusinessOpsFinding(finding) {
  if (!finding || typeof finding !== 'object') return false;
  if (finding.safeToIgnore) return false;
  return finding.severity === 'urgent';
}
