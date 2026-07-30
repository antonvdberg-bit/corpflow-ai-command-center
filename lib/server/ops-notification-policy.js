/**
 * Exception-only ops notification policy (issues #658 + #684).
 *
 * GitHub remains source of truth; Telegram pages only when Anton is genuinely
 * required now. Slack is retired — see
 * docs/operations/SLACK_TELEGRAM_DEPENDENCY_AUDIT_658.md.
 *
 * #684: disable open-PR / WIP / routine-review heartbeats; fingerprint dedupe
 * (no hourly repeat of unchanged alerts); message only when Anton required: yes.
 *
 * @see docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md §4 severity ladder
 * @see docs/n8n/anton-decision-inbox-exception-notify.md
 */

/** @typedef {{ ok?: boolean, needs_attention?: boolean, reasons?: string[] }} DeliveryVerdictSnapshot */

/**
 * @typedef {{
 *   kind: string,
 *   target: string,
 *   severity: string,
 *   stale?: string,
 *   why: string,
 *   next: string,
 *   anton: boolean,
 *   decisionType?: string,
 *   evidence?: string,
 *   blockerState?: string,
 *   recommendation?: string,
 *   consequence?: string,
 *   workstream?: string,
 *   link?: string,
 *   fingerprint?: string,
 * }} HeartbeatAlert
 */

const MS_PER_HOUR = 60 * 60 * 1000;

/** Digest staleness — logged as a signal only; does not page (#684 Anton-required gate). */
export const DISPATCHER_DIGEST_STALE_HOURS = 12;

/**
 * Open-PR WIP cap — retained for logging / dispatcher discipline only.
 * Exceeding the cap alone must NOT page Telegram (#684).
 */
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
 * Hard gate: Telegram only when Anton is genuinely required now (#684).
 *
 * @param {{ anton?: boolean } | null | undefined} alert
 * @returns {boolean}
 */
export function shouldPageHeartbeatAlert(alert) {
  return Boolean(alert && typeof alert === 'object' && alert.anton === true);
}

/**
 * Dedupe fingerprint: issue/PR + decision type + SHA/evidence + blocker state.
 *
 * @param {Partial<HeartbeatAlert>} alert
 * @returns {string}
 */
export function buildHeartbeatAlertFingerprint(alert) {
  if (!alert || typeof alert !== 'object') return '';
  const kind = typeof alert.kind === 'string' ? alert.kind : '';
  const target = typeof alert.target === 'string' ? alert.target : '';
  const decisionType = typeof alert.decisionType === 'string' ? alert.decisionType : '';
  const evidence = typeof alert.evidence === 'string' ? alert.evidence : '';
  const blockerState = typeof alert.blockerState === 'string' ? alert.blockerState : '';
  if (typeof alert.fingerprint === 'string' && alert.fingerprint.trim()) {
    return alert.fingerprint.trim();
  }
  return [kind, target, decisionType, evidence, blockerState].join('|');
}

/**
 * Evaluate GitHub / Decision Inbox signals for exception-only Telegram paging.
 * Mirrors docs/n8n/templates/github-heartbeat-checker.template.json.
 *
 * Silent by default. Does NOT page for: open PRs, WIP cap alone, green/running CI,
 * active work, corpflow_test publish, unchanged state, digest stale without Anton.
 *
 * Pages only when `anton: true` (needs:anton protected approval, failed recovery
 * requiring Anton, or other explicit Anton-required exception).
 *
 * @param {{
 *   now?: number,
 *   comments?: Array<{ body?: string, created_at?: string }>,
 *   prs?: Array<{ number?: number, created_at?: string, labels?: unknown }>,
 *   decisionInboxItems?: Array<{
 *     number?: number | string,
 *     html_url?: string,
 *     labels?: unknown,
 *     workstream?: string,
 *     approval_type?: string,
 *     target_sha?: string,
 *     evidence?: string,
 *     why?: string,
 *     exact_action?: string,
 *     recommendation?: string,
 *     consequence?: string,
 *     blocker_state?: string,
 *     has_decision_packet?: boolean,
 *     resolved?: boolean,
 *   }>,
 *   recoveryEvents?: Array<{
 *     issueOrPr?: string,
 *     recoverable?: boolean,
 *     recovered?: boolean,
 *     antonRequired?: boolean,
 *     why?: string,
 *     exact_action?: string,
 *     recommendation?: string,
 *     consequence?: string,
 *     workstream?: string,
 *     link?: string,
 *     evidence?: string,
 *     decisionType?: string,
 *     blocker_state?: string,
 *   }>,
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
  const inboxItems = Array.isArray(input.decisionInboxItems) ? input.decisionInboxItems : [];
  const recoveryEvents = Array.isArray(input.recoveryEvents) ? input.recoveryEvents : [];
  const signals = /** @type {HeartbeatAlert[]} */ ([]);

  // --- Log-only signals (never page under #684) ---
  const digest = comments.find(
    (c) => c && typeof c.body === 'string' && c.body.includes('Dispatcher Digest'),
  );
  const lastDigestMs = digest ? new Date(digest.created_at || 0).getTime() : 0;
  if (!digest || now - lastDigestMs > DISPATCHER_DIGEST_STALE_HOURS * MS_PER_HOUR) {
    const staleH = digest ? Math.round((now - lastDigestMs) / MS_PER_HOUR) : null;
    signals.push({
      kind: 'digest_stale',
      target: '#493',
      severity: 'warning',
      stale: staleH != null ? `${staleH}h` : 'none found',
      why: 'no dispatcher digest within the 12h active-day window',
      next: 'Cursor posts a dispatcher digest',
      anton: false,
      decisionType: 'none',
      evidence: digest ? `digest:${digest.created_at || ''}` : 'digest:none',
      blockerState: 'digest_stale',
    });
  }

  if (prs.length > OPEN_PR_WIP_CAP) {
    signals.push({
      kind: 'wip_cap',
      target: 'open PRs',
      severity: 'warning',
      stale: 'n/a',
      why: `${prs.length} open PRs exceeds WIP cap of ${OPEN_PR_WIP_CAP} (log only — does not page)`,
      next: 'executor drains WIP via merge/close; no Anton page without a real decision',
      anton: false,
      decisionType: 'none',
      evidence: `open_pr_count:${prs.length}`,
      blockerState: 'wip_over_cap',
    });
  }

  // Open PRs / CI green alone → no signal that pages (explicit silence cases).
  for (const pr of prs) {
    if (!pr || pr.number == null) continue;
    signals.push({
      kind: 'open_pr_observed',
      target: `PR #${pr.number}`,
      severity: 'info',
      why: 'open PR observed (routine — no Telegram)',
      next: 'continue autonomous / CI path',
      anton: false,
      decisionType: 'none',
      evidence: `pr:${pr.number}`,
      blockerState: 'none',
    });
  }

  // --- Anton-required exceptions ---
  for (const item of inboxItems) {
    if (!item || typeof item !== 'object') continue;
    if (item.resolved) continue;
    const labels = Array.isArray(item.labels)
      ? item.labels.map((l) => (typeof l === 'string' ? l : l && /** @type {{name?:string}} */ (l).name) || '').filter(Boolean)
      : [];
    const needsAnton = labels.includes('needs:anton');
    if (!needsAnton) continue;
    if (item.has_decision_packet === false) continue;

    const approvalLabel =
      labels.find((l) => typeof l === 'string' && l.startsWith('approval:')) ||
      (typeof item.approval_type === 'string' ? item.approval_type : 'approval:merge');
    const target = item.number != null ? `#${item.number}` : 'unknown';
    const evidence =
      typeof item.evidence === 'string' && item.evidence
        ? item.evidence
        : typeof item.target_sha === 'string' && item.target_sha
          ? `sha:${item.target_sha}`
          : 'packet:present';
    const blockerState = typeof item.blocker_state === 'string' ? item.blocker_state : 'needs_anton';

    signals.push({
      kind: 'needs_anton',
      target,
      severity: 'error',
      why:
        typeof item.why === 'string' && item.why
          ? item.why
          : 'protected-action approval required (needs:anton)',
      next:
        typeof item.exact_action === 'string' && item.exact_action
          ? item.exact_action
          : `record durable approval for ${approvalLabel}`,
      anton: true,
      decisionType: approvalLabel,
      evidence,
      blockerState,
      workstream: typeof item.workstream === 'string' ? item.workstream : 'ops',
      recommendation:
        typeof item.recommendation === 'string' ? item.recommendation : 'approve or reject with durable packet',
      consequence:
        typeof item.consequence === 'string'
          ? item.consequence
          : 'protected action remains blocked',
      link:
        typeof item.html_url === 'string'
          ? item.html_url
          : `https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/${item.number}`,
    });
  }

  for (const event of recoveryEvents) {
    if (!event || typeof event !== 'object') continue;
    const target = typeof event.issueOrPr === 'string' ? event.issueOrPr : 'unknown';

    if (event.recoverable && event.recovered) {
      signals.push({
        kind: 'recoverable_failure',
        target,
        severity: 'info',
        why: typeof event.why === 'string' ? event.why : 'recoverable failure; autonomous recovery succeeded',
        next: 'no operator action',
        anton: false,
        decisionType: typeof event.decisionType === 'string' ? event.decisionType : 'recovery',
        evidence: typeof event.evidence === 'string' ? event.evidence : 'recovered',
        blockerState: 'cleared',
      });
      continue;
    }

    if (event.antonRequired && (event.recoverable === false || event.recovered === false)) {
      signals.push({
        kind: 'recovery_failed_needs_anton',
        target,
        severity: 'error',
        why:
          typeof event.why === 'string' && event.why
            ? event.why
            : 'autonomous recovery failed; operator intervention required',
        next:
          typeof event.exact_action === 'string' && event.exact_action
            ? event.exact_action
            : 'intervene on failed recovery',
        anton: true,
        decisionType: typeof event.decisionType === 'string' ? event.decisionType : 'recovery_failed',
        evidence: typeof event.evidence === 'string' ? event.evidence : 'recovery:failed',
        blockerState: typeof event.blocker_state === 'string' ? event.blocker_state : 'recovery_failed',
        workstream: typeof event.workstream === 'string' ? event.workstream : 'ops',
        recommendation:
          typeof event.recommendation === 'string'
            ? event.recommendation
            : 'inspect failure and decide next step',
        consequence:
          typeof event.consequence === 'string'
            ? event.consequence
            : 'workstream remains blocked',
        link: typeof event.link === 'string' ? event.link : '',
      });
    }
  }

  const withFp = signals.map((a) => ({
    ...a,
    fingerprint: buildHeartbeatAlertFingerprint(a),
  }));

  const paging = withFp.filter((a) => shouldPageHeartbeatAlert(a));

  return {
    checked: [
      '#493 comments',
      'open PRs (log only)',
      'needs:anton Decision Inbox',
      'recovery events',
    ],
    alert_count: paging.length,
    alerts: paging,
    all_signals: withFp,
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

/**
 * Fingerprint dedupe for heartbeat / exception Telegram paging (#684).
 * Suppresses repeat pages for the same issue/PR + decision + evidence + blocker
 * until that fingerprint changes. Does **not** re-alert on hour roll alone.
 *
 * @param {HeartbeatAlert[]} alerts
 * @param {Record<string, true> | null | undefined} seenKeys prior fingerprints
 * @param {number} [now] retained for call-site compat; unused for bucket maths
 * @returns {{ alerts: HeartbeatAlert[], seenKeys: Record<string, true>, hourBucket: number }}
 */
export function filterHeartbeatAlertsByFingerprintDedupe(alerts, seenKeys, now = Date.now()) {
  const list = Array.isArray(alerts) ? alerts : [];
  const hourBucket = Math.floor(Number(now) / MS_PER_HOUR);
  /** @type {Record<string, true>} */
  const nextSeen = seenKeys && typeof seenKeys === 'object' ? { ...seenKeys } : {};
  /** @type {HeartbeatAlert[]} */
  const paging = [];

  for (const alert of list) {
    if (!shouldPageHeartbeatAlert(alert)) continue;
    const key = buildHeartbeatAlertFingerprint(alert);
    if (!key) continue;
    if (nextSeen[key]) continue;
    nextSeen[key] = true;
    paging.push(alert);
  }

  return { alerts: paging, seenKeys: nextSeen, hourBucket };
}

/**
 * @deprecated Use {@link filterHeartbeatAlertsByFingerprintDedupe}. Retained name
 * for n8n/template call sites that still import the #658 helper; behaviour is
 * fingerprint persistence (no hourly repeat) per #684.
 *
 * @param {HeartbeatAlert[]} alerts
 * @param {Record<string, true> | null | undefined} seenKeys
 * @param {number} [now]
 */
export function filterHeartbeatAlertsByHourDedupe(alerts, seenKeys, now = Date.now()) {
  return filterHeartbeatAlertsByFingerprintDedupe(alerts, seenKeys, now);
}
