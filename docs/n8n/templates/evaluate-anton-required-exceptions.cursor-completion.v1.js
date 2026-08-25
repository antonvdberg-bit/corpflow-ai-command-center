/**
 * Paste into live n8n Code node: "Evaluate Anton-required exceptions"
 * Workflow: CorpFlowAI — GitHub Heartbeat Checker (in place — do not create a second workflow)
 * Docs: docs/runbooks/N8N_CURSOR_COMPLETION_EVENT_LIVE_APPLY_661.md
 *       docs/operations/CODEX_SPECIALIST_LIFECYCLE_V1.md
 *
 * Preserves #684 needs:anton exception path + open-PR silence.
 * Adds corpflow.cursor_completion_event.v1 + corpflow.codex_completion_event.v1 consumption.
 * Adds corpflow.ai_work_request.v1 / corpflow.ai_work_status.v1 machine readback (#1059).
 * Do not create a second workflow / dispatcher / database.
 *
 * This file is the apply-ready source. Mirror:
 *   lib/server/cursor-agent-lifecycle.js shouldNotifyCursorCompletionEvent()
 *   lib/server/codex-specialist-lifecycle.js shouldNotifyCodexCompletionEvent()
 */

// --- BEGIN n8n jsCode ---
const now = Date.now();
const staticData = $getWorkflowStaticData('global');
if (!staticData.exceptionFingerprints || typeof staticData.exceptionFingerprints !== 'object') {
  staticData.exceptionFingerprints = {};
}
if (!staticData.aiWorkStatusFingerprints || typeof staticData.aiWorkStatusFingerprints !== 'object') {
  staticData.aiWorkStatusFingerprints = {};
}
const seen = staticData.exceptionFingerprints;
const seenAiWork = staticData.aiWorkStatusFingerprints;

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

function parseHtmlJsonMarker(body, schema) {
  const text = String(body || '');
  const escaped = String(schema).replace(/\./g, '\\.');
  const m = text.match(new RegExp('<!--\\s*' + escaped + '\\s+(\\{[\\s\\S]*?\\})\\s*-->', 'i'));
  if (!m) return null;
  try {
    const e = JSON.parse(m[1]);
    if (!e || e.schema !== schema) return null;
    return e;
  } catch {
    return null;
  }
}

function parseAiWorkRequest(body) {
  return parseHtmlJsonMarker(body, 'corpflow.ai_work_request.v1');
}

function parseAiWorkStatus(body) {
  return parseHtmlJsonMarker(body, 'corpflow.ai_work_status.v1');
}

function hasFactoryHandoff(body) {
  return /corpflow\.factory_cursor_handoff\.v1|CORPFLOW FACTORY HANDOFF/i.test(String(body || ''));
}

function extractPickupFromText(body) {
  const text = String(body || '');
  const claim = parseHtmlJsonMarker(text, 'corpflow.cursor_activation_claim.v1');
  if (claim && (claim.agentRunId || claim.agent_run_id)) {
    return { picked_up: true, active: claim.status === 'pending' || claim.status === 'activated', agent: claim.agentRunId || claim.agent_run_id, run: null, status: null, blocker: null, pr: null, sha: null, branch: null, ci: null };
  }
  const origin = parseHtmlJsonMarker(text, 'corpflow.cursor_origin_metadata.v1');
  if (origin && (origin.cursorAgentId || origin.cursorRunId)) {
    return { picked_up: true, active: !origin.prNumber, agent: origin.cursorAgentId || null, run: origin.cursorRunId || null, status: null, blocker: null, pr: origin.prNumber || null, sha: origin.headSha || null, branch: origin.branch || null, ci: null };
  }
  const life = parseHtmlJsonMarker(text, 'corpflow.cursor_lifecycle_state.v1');
  if (life && life.cursorAgentId) {
    const phase = String(life.phase || '').toUpperCase();
    return {
      picked_up: true,
      active: phase === 'RUNNING' || phase === 'PENDING',
      agent: life.cursorAgentId,
      run: life.cursorRunId || null,
      status: phase,
      blocker: phase === 'FAILED' || phase === 'STALE' ? (life.lastError || phase) : null,
      pr: life.prNumber || null,
      sha: life.headSha || null,
      branch: life.branch || null,
      ci: null,
    };
  }
  const completion = parseCursorCompletionEvent(text);
  if (completion && (completion.cursor_agent_id || completion.cursor_run_id || completion.agent_run_id)) {
    const st = String(completion.status || '').toUpperCase();
    return {
      picked_up: true,
      active: st === 'RUNNING' || st === 'PENDING' || st === 'WORKING',
      agent: completion.cursor_agent_id || completion.agent_run_id || null,
      run: completion.cursor_run_id || null,
      status: st,
      blocker: completion.blocker || null,
      pr: completion.pr || null,
      sha: completion.sha || null,
      branch: completion.branch || null,
      ci: completion.ci_check_result || null,
      next: completion.next_action || null,
    };
  }
  return { picked_up: false, active: false, agent: null, run: null, status: null, blocker: null, pr: null, sha: null, branch: null, ci: null };
}

function deriveAiWorkStatus(issue, extraTexts) {
  const bodies = [String(issue && issue.body || '')].concat(Array.isArray(extraTexts) ? extraTexts : []);
  let request = null;
  let postedStatus = null;
  for (const body of bodies) {
    const req = parseAiWorkRequest(body);
    if (req && Number(req.source_issue) === Number(issue.number)) request = req;
    const st = parseAiWorkStatus(body);
    if (st && String(st.work_request_id || '') === String((request && request.work_request_id) || st.work_request_id || '')) {
      postedStatus = st;
    }
  }
  if (!request) return null;
  const merged = { picked_up: false, active: false, agent: null, run: null, status: null, blocker: null, pr: null, sha: null, branch: null, ci: null, next: null, named_blocker: false, completed: false };
  for (const body of bodies) {
    const ev = extractPickupFromText(body);
    merged.picked_up = merged.picked_up || ev.picked_up;
    merged.active = merged.active || ev.active;
    merged.agent = ev.agent || merged.agent;
    merged.run = ev.run || merged.run;
    merged.status = ev.status || merged.status;
    merged.blocker = ev.blocker || merged.blocker;
    merged.pr = ev.pr || merged.pr;
    merged.sha = ev.sha || merged.sha;
    merged.branch = ev.branch || merged.branch;
    merged.ci = ev.ci || merged.ci;
    merged.next = ev.next || merged.next;
    if (ev.status === 'COMPLETED') merged.completed = true;
    if (ev.blocker && (ev.status === 'FAILED' || ev.status === 'STALE' || ev.status === 'BLOCKED')) merged.named_blocker = true;
  }
  const handoffOnly = bodies.some(hasFactoryHandoff) && !merged.picked_up;
  let status = 'REQUESTED';
  let next = merged.next;
  if (merged.completed && merged.picked_up) {
    status = 'COMPLETED';
    next = next || 'Operator review — do not treat as merged or deployed';
  } else if (merged.named_blocker && !merged.active) {
    status = 'BLOCKED';
    next = next || 'Inspect named blocker';
  } else if (merged.picked_up) {
    status = 'IN_PROGRESS';
    next = next || 'Await Cursor terminal evidence on the same work record';
  } else {
    next = next || (handoffOnly
      ? 'Factory handoff is not Cursor pickup — wait for agent/run evidence'
      : 'Wait for independent Cursor pickup evidence');
  }
  const obj = {
    work_request_id: request.work_request_id,
    source_issue: request.source_issue,
    status: status,
    cursor_agent_id: merged.agent,
    cursor_run_id: merged.run,
    branch: merged.branch,
    pr_number: merged.pr,
    pr_url: postedStatus && postedStatus.pr_url || null,
    head_sha: merged.sha,
    ci_state: merged.ci,
    blocker: status === 'BLOCKED' ? merged.blocker : null,
    next_action: next,
    updated_at: new Date(now).toISOString(),
    protected_action_required: Boolean(request.protected_action_required),
  };
  obj.fingerprint = [
    'ai_work_request',
    obj.work_request_id || 'no-id',
    obj.status,
    obj.cursor_agent_id || 'no-agent',
    obj.cursor_run_id || 'no-run',
    obj.pr_number || 'no-pr',
    obj.head_sha || 'no-sha',
    obj.ci_state || 'no-ci',
    obj.blocker || 'no-blocker',
    obj.protected_action_required ? 'protected' : 'unprotected',
  ].join('|');
  return obj;
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

function shouldNotifyCodexCompletionEvent(event) {
  if (!event || typeof event !== 'object') return false;
  const status = String(event.status || '').toUpperCase();
  if (status === 'RUNNING') return false;
  const antonRequired = Boolean(event.anton_required);
  const notifyHint = Boolean(event.notify);
  if (status === 'AWAITING_HUMAN_TRIGGER' && antonRequired) return true;
  if (status === 'COMPLETED' && !antonRequired) return false;
  if (status === 'COMPLETED' && antonRequired) return true;
  if (status === 'FAILED' && (antonRequired || notifyHint)) return true;
  if (status === 'STALE' && (antonRequired || notifyHint)) return true;
  return false;
}

function cursorFingerprint(event) {
  if (event.fingerprint && String(event.fingerprint).trim()) return String(event.fingerprint).trim();
  return [
    'cursor_lifecycle',
    event.executor || 'cursor',
    event.cursor_agent_id || event.agent_run_id || event.cursor_run_id || 'no-agent',
    event.source_issue || 'no-issue',
    event.status || 'no-phase',
    event.pr || 'no-pr',
    event.sha || 'no-sha',
    event.ci_check_result || 'no-ci',
    event.branch || 'no-branch',
  ].join('|');
}

function codexFingerprint(event) {
  if (event.fingerprint && String(event.fingerprint).trim()) return String(event.fingerprint).trim();
  return [
    'codex_lifecycle',
    event.executor || 'codex',
    event.source_issue || 'no-issue',
    event.pr || 'no-pr',
    event.attempt || 'no-attempt',
    event.human_trigger_comment_id || 'no-trigger',
    event.status || 'no-status',
    event.sha || 'no-sha',
    event.ci_check_result || 'no-checks',
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

function formatCodexMsg(a, event) {
  return [
    'ANTON DECISION INBOX',
    'Anton required: yes',
    'Workstream: ' + a.workstream,
    'Issue/PR: ' + a.target,
    'Executor: codex',
    'PR: ' + (event.pr != null ? '#' + event.pr : 'n/a'),
    'Attempt: ' + (event.attempt || 'n/a'),
    'Human trigger comment: ' + (event.human_trigger_comment_id || 'n/a'),
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
  const fromCursor = parseCursorCompletionEvent(body);
  if (fromCursor) eventCandidates.push({ event: fromCursor, issue, kind: 'cursor' });
  const fromCodex = parseCodexCompletionEvent(body);
  if (fromCodex) eventCandidates.push({ event: fromCodex, issue, kind: 'codex' });
}

for (const se of syntheticEvents) {
  if (se && typeof se === 'object') {
    const kind = se.schema === 'corpflow.codex_completion_event.v1' ? 'codex' : 'cursor';
    eventCandidates.push({ event: se, issue: null, kind });
  }
}

for (const { event, issue, kind } of eventCandidates) {
  const status = String(event.status || '').toUpperCase();
  const isCodex = kind === 'codex' || event.schema === 'corpflow.codex_completion_event.v1';
  const fp = isCodex ? codexFingerprint(event) : cursorFingerprint(event);
  const notify = isCodex
    ? shouldNotifyCodexCompletionEvent(event)
    : shouldNotifyCursorCompletionEvent(event);
  const target =
    event.source_issue != null
      ? '#' + event.source_issue + (event.pr != null ? ' / PR #' + event.pr : '')
      : issue
        ? '#' + issue.number
        : isCodex
          ? 'codex-event'
          : 'cursor-event';
  const signal = {
    kind: isCodex ? 'codex_completion' : 'cursor_completion',
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
    kind: isCodex ? 'codex_completion' : 'cursor_completion',
    target,
    anton: true,
    decisionType: (isCodex ? 'codex:' : 'cursor:') + status.toLowerCase(),
    evidence: fp,
    blockerState: event.blocker || status,
    fingerprint: fp,
    workstream: isCodex ? 'codex-specialist-loop' : 'cursor-control-loop',
    why:
      event.blocker ||
      (status === 'AWAITING_HUMAN_TRIGGER'
        ? 'Post the exact @codex comment on the PR'
        : status === 'COMPLETED'
          ? (isCodex ? 'Codex' : 'Cursor') + ' completion requires Anton disposition'
          : (isCodex ? 'Codex' : 'Cursor') + ' ' + status + ' requires Anton'),
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
    _isCodex: isCodex,
  };
  alerts.push(alert);
}

function formatMsg(a) {
  if (a.kind === 'codex_completion' && a._event) return formatCodexMsg(a, a._event);
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

const commentBag = staticData.issueCommentsByNumber && typeof staticData.issueCommentsByNumber === 'object'
  ? staticData.issueCommentsByNumber
  : {};
const aiWorkStatuses = [];
const aiWorkChanged = [];
for (const issue of issues) {
  const extra = [];
  const keyed = commentBag[issue.number] || commentBag[String(issue.number)];
  if (Array.isArray(keyed)) {
    for (const c of keyed) extra.push(typeof c === 'string' ? c : String(c && c.body || ''));
  }
  const derived = deriveAiWorkStatus(issue, extra);
  if (!derived) continue;
  allSignals.push({
    kind: 'ai_work_request',
    target: '#' + derived.source_issue,
    anton: false,
    status: derived.status,
    fingerprint: derived.fingerprint,
    why: derived.status === 'IN_PROGRESS' || derived.status === 'REQUESTED' || (derived.status === 'COMPLETED' && !derived.protected_action_required)
      ? derived.status + ' — silent machine readback'
      : derived.status + ' — machine readback',
  });
  aiWorkStatuses.push(derived);
  if (seenAiWork[derived.fingerprint]) continue;
  seenAiWork[derived.fingerprint] = true;
  aiWorkChanged.push(derived);
}

const alertText = alerts.map(formatMsg).join('\n\n---\n\n');
return [
  {
    json: {
      checked: [
        'needs:anton issues',
        'open PRs (log only)',
        'cursor completion events (body + synthetic)',
        'codex completion events (body + synthetic)',
        'ai work request correlation (#1059)',
      ],
      alert_count: alerts.length,
      alerts: alerts.map((a) => {
        const { _event, _isCodex, ...rest } = a;
        return rest;
      }),
      all_signals: allSignals,
      should_alert: alerts.length > 0,
      alert_text: alertText,
      open_pr_count: openPrCount,
      ai_work_statuses: aiWorkStatuses,
      ai_work_changed: aiWorkChanged,
      evaluated_at_utc: new Date(now).toISOString(),
      dedupe: 'fingerprint',
    },
  },
];
// --- END n8n jsCode ---
