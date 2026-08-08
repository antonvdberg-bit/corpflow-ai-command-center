/**
 * Paste into live n8n Code node: "Evaluate Anton-required exceptions"
 * Workflow: CorpFlowAI — GitHub Heartbeat Checker (in place — do not create a second workflow)
 * Docs: docs/runbooks/N8N_CURSOR_COMPLETION_EVENT_LIVE_APPLY_661.md
 *
 * Preserves #684 needs:anton exception path + open-PR silence.
 * Adds corpflow.cursor_completion_event.v1 + corpflow.codex_completion_event.v1 consumption.
 *
 * This file is the apply-ready source. Mirror:
 *   lib/server/cursor-agent-lifecycle.js (shouldNotifyCursorCompletionEvent)
 *   lib/server/codex-github-lifecycle.js (shouldNotifyCodexCompletionEvent)
 * + ops-notification-policy exception fingerprinting.
 */

// --- BEGIN n8n jsCode ---
const now = Date.now();
const staticData = $getWorkflowStaticData('global');
if (!staticData.exceptionFingerprints || typeof staticData.exceptionFingerprints !== 'object') {
  staticData.exceptionFingerprints = {};
}
const seen = staticData.exceptionFingerprints;

const issuesRaw = $('GitHub: open needs:anton issues').all().map((i) => i.json).flat();
const prs = $('GitHub: open PRs (log only)').all().map((i) => i.json).flat();
const issues = (Array.isArray(issuesRaw) ? issuesRaw : []).filter((i) => i && !i.pull_request);

// Optional: synthetic / pinned test items injected as workflow static input or manual pin
const syntheticEvents = Array.isArray(staticData.syntheticCursorCompletionEvents)
  ? staticData.syntheticCursorCompletionEvents
  : [];

function labelNames(item) {
  if (!item || !Array.isArray(item.labels)) return [];
  return item.labels
    .map((l) => (typeof l === 'string' ? l : (l && l.name) || ''))
    .filter(Boolean);
}

function parsePacket(body) {
  const text = String(body || '');
  const marker = '### ANTON DECISION PACKET';
  const idx = text.indexOf(marker);
  if (idx < 0) return null;
  const after = text.slice(idx + marker.length);
  const nextHeading = after.search(/\n#{1,3}\s/);
  const block = nextHeading >= 0 ? after.slice(0, nextHeading) : after;
  const out = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*[-*]?\s*([A-Za-z0-9_ /-]+)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase().replace(/[ /]+/g, '_').replace(/_+/g, '_');
    out[key] = m[2].trim();
  }
  return out;
}

function hasResolved(body, approvalType) {
  const text = String(body || '');
  if (!text.includes('### ANTON DECISION RESOLVED')) return false;
  if (!approvalType) return true;
  return text.toLowerCase().includes(String(approvalType).toLowerCase());
}

function fingerprint(parts) {
  return [parts.kind, parts.target, parts.decisionType, parts.evidence, parts.blockerState].join('|');
}

function parseCursorCompletionEvent(body) {
  const text = String(body || '');
  const m = text.match(/<!--\s*corpflow\.cursor_completion_event\.v1\s+(\{[\s\S]*?\})\s*-->/i);
  if (!m) return null;
  try {
    const e = JSON.parse(m[1]);
    if (!e || e.schema !== 'corpflow.cursor_completion_event.v1') return null;
    return e;
  } catch {
    return null;
  }
}

function parseCodexCompletionEvent(body) {
  const text = String(body || '');
  const m = text.match(/<!--\s*corpflow\.codex_completion_event\.v1\s+(\{[\s\S]*?\})\s*-->/i);
  if (!m) return null;
  try {
    const e = JSON.parse(m[1]);
    if (!e || e.schema !== 'corpflow.codex_completion_event.v1') return null;
    return e;
  } catch {
    return null;
  }
}

function parseExecutorCompletionEvent(body) {
  return parseCursorCompletionEvent(body) || parseCodexCompletionEvent(body);
}

function shouldNotifyCursorCompletionEvent(event) {
  if (!event || typeof event !== 'object') return false;
  const status = String(event.status || '').toUpperCase();
  if (status === 'RUNNING' || status === 'PENDING' || status === 'WORKING') return false;
  const antonRequired = Boolean(event.anton_required);
  const notifyHint = Boolean(event.notify);
  const recoveryExhausted = Boolean(event.recovery_exhausted);
  if (status === 'COMPLETED' && !antonRequired) return false;
  if (status === 'COMPLETED' && antonRequired) return true;
  if (status === 'FAILED' && (antonRequired || notifyHint || recoveryExhausted)) return true;
  if (status === 'STALE' && (antonRequired || notifyHint || recoveryExhausted)) return true;
  return false;
}

function cursorFingerprint(event) {
  if (event.fingerprint && String(event.fingerprint).trim()) return String(event.fingerprint).trim();
  const prefix =
    event.schema === 'corpflow.codex_completion_event.v1' || event.executor === 'codex'
      ? 'codex_github_lifecycle'
      : 'cursor_lifecycle';
  return [
    prefix,
    event.executor || (prefix.startsWith('codex') ? 'codex' : 'cursor'),
    event.lifecycle_identity ||
      event.cursor_agent_id ||
      event.agent_run_id ||
      event.cursor_run_id ||
      'no-agent',
    event.source_issue || 'no-issue',
    event.status || 'no-phase',
    event.pr || 'no-pr',
    event.sha || 'no-sha',
    event.ci_check_result || 'no-ci',
    event.branch || event.codex_task_id || 'no-branch',
  ].join('|');
}

function formatCursorMsg(a, event) {
  return [
    'ANTON DECISION INBOX',
    'Anton required: yes',
    'Workstream: ' + a.workstream,
    'Issue/PR: ' + a.target,
    'Executor: ' + (event.executor || 'cursor'),
    'Agent/run ID: ' + (event.agent_run_id || event.cursor_agent_id || event.cursor_run_id || 'n/a'),
    'PR: ' + (event.pr != null ? '#' + event.pr : 'n/a'),
    'Status/checks: ' + (event.status || 'n/a') + ' / ' + (event.ci_check_result || 'unknown'),
    'What finished or failed: ' + (event.what_moved || event.blocker || event.status || 'n/a'),
    'Link: ' + a.link,
    'Why needed now: ' + a.why,
    'Exact action: ' + a.next,
    'Recommendation: ' + a.recommendation,
    'Consequence of delay: ' + a.consequence,
    'Urgency: ' + (a.urgency || 'P0'),
  ].join('\n');
}

const alerts = [];
const allSignals = [];

// Log-only: open PR count / WIP — never page (#684)
const openPrCount = Array.isArray(prs) ? prs.length : 0;
allSignals.push({
  kind: 'open_pr_observed',
  target: 'open PRs',
  anton: false,
  why: openPrCount + ' open PR(s) — routine silence',
});
if (openPrCount > 2) {
  allSignals.push({
    kind: 'wip_cap',
    target: 'open PRs',
    anton: false,
    why: 'WIP cap exceeded — log only, no Telegram',
  });
}

// Existing needs:anton path (#684) — preserved
for (const issue of issues) {
  const labels = labelNames(issue);
  if (!labels.includes('needs:anton')) continue;
  const packet = parsePacket(issue.body);
  if (!packet) {
    allSignals.push({
      kind: 'needs_anton_incomplete',
      target: '#' + issue.number,
      anton: false,
      why: 'needs:anton without decision packet — silent',
    });
    continue;
  }
  const approvalType =
    labels.find((l) => l.startsWith('approval:')) || packet.approval_type || 'approval:merge';
  if (hasResolved(issue.body, approvalType)) continue;
  const evidence =
    packet.target_sha && packet.target_sha !== 'n/a'
      ? 'sha:' + packet.target_sha
      : 'packet:' + (packet.urgency_or_expiry || 'present');
  const blockerState = 'needs_anton';
  const target = '#' + issue.number;
  const fp = fingerprint({
    kind: 'needs_anton',
    target,
    decisionType: approvalType,
    evidence,
    blockerState,
  });
  const alert = {
    kind: 'needs_anton',
    target,
    anton: true,
    decisionType: approvalType,
    evidence,
    blockerState,
    fingerprint: fp,
    workstream: packet.project_workstream || 'ops',
    why: packet.exact_decision_required || 'protected-action approval required (needs:anton)',
    next: packet.exact_decision_required || 'record durable approval for ' + approvalType,
    recommendation: packet.recommended_decision || 'approve or reject with durable packet',
    consequence: packet.consequence_of_reject_or_defer || 'protected action remains blocked',
    link:
      issue.html_url ||
      'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/' + issue.number,
    urgency: packet.urgency_or_expiry || 'normal',
  };
  allSignals.push(alert);
  if (seen[fp]) continue;
  seen[fp] = true;
  alerts.push(alert);
}

// Cursor + Codex completion events from issue bodies (and optional synthetic pins)
const eventCandidates = [];
for (const issue of issues) {
  const body = String(issue.body || '');
  const fromBody = parseExecutorCompletionEvent(body);
  if (fromBody) eventCandidates.push({ event: fromBody, issue });
  // Completion comments usually live on the issue thread (not only issue.body).
  // Operators can pin syntheticEvents for matrix tests, or extend GitHub fetch
  // to claimed-issue comments for live comment scanning.
}

for (const se of syntheticEvents) {
  if (se && typeof se === 'object') eventCandidates.push({ event: se, issue: null });
}

for (const { event, issue } of eventCandidates) {
  const status = String(event.status || '').toUpperCase();
  const fp = cursorFingerprint(event);
  const notify = shouldNotifyCursorCompletionEvent(event);
  const target =
    event.source_issue != null
      ? '#' + event.source_issue + (event.pr != null ? ' / PR #' + event.pr : '')
      : issue
        ? '#' + issue.number
        : 'cursor-event';
  const signal = {
    kind: 'cursor_completion',
    target,
    anton: notify,
    status,
    fingerprint: fp,
    why: notify
      ? status + (event.blocker ? ' — ' + event.blocker : ' — Anton required')
      : status + ' — silent',
  };
  allSignals.push(signal);
  if (!notify) continue;
  if (seen[fp]) continue;
  seen[fp] = true;
  const alert = {
    kind: 'cursor_completion',
    target,
    anton: true,
    decisionType: 'cursor:' + status.toLowerCase(),
    evidence: fp,
    blockerState: event.blocker || status,
    fingerprint: fp,
    workstream: 'cursor-control-loop',
    why:
      event.blocker ||
      (status === 'COMPLETED'
        ? 'Cursor completion requires Anton disposition'
        : 'Cursor ' + status + ' requires Anton'),
    next: event.next_action || 'Review issue/PR and record disposition',
    recommendation:
      event.next_action || 'Review PR evidence; do not auto-merge; decide next action',
    consequence: 'Control-loop stall; delivery disposition delayed',
    link:
      event.pr_url ||
      (issue && issue.html_url) ||
      (event.source_issue
        ? 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/' +
          event.source_issue
        : 'https://github.com/antonvdberg-bit/corpflow-ai-command-center'),
    urgency: 'P0',
    _event: event,
  };
  alerts.push(alert);
}

function formatMsg(a) {
  if (a.kind === 'cursor_completion' && a._event) return formatCursorMsg(a, a._event);
  return [
    'ANTON DECISION INBOX',
    'Anton required: yes',
    'Workstream: ' + a.workstream,
    'Issue/PR: ' + a.target,
    'Link: ' + a.link,
    'Why needed now: ' + a.why,
    'Exact action: ' + a.next,
    'Recommendation: ' + a.recommendation,
    'Consequence of delay: ' + a.consequence,
    'Urgency: ' + (a.urgency || 'normal'),
  ].join('\n');
}

const alertText = alerts.map(formatMsg).join('\n\n---\n\n');
return [
  {
    json: {
      checked: [
        'needs:anton issues',
        'open PRs (log only)',
        'cursor completion events (body + synthetic)',
      ],
      alert_count: alerts.length,
      alerts: alerts.map((a) => {
        const { _event, ...rest } = a;
        return rest;
      }),
      all_signals: allSignals,
      should_alert: alerts.length > 0,
      alert_text: alertText,
      open_pr_count: openPrCount,
      evaluated_at_utc: new Date(now).toISOString(),
      dedupe: 'fingerprint',
    },
  },
];
// --- END n8n jsCode ---
