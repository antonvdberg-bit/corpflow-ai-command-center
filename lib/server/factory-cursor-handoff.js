/**
 * CorpFlowAI Cursor Factory Handoff — permanent Automation wake packet (#913).
 *
 * GitHub eligibility/capacity event → dedicated workflow success on main →
 * Cursor Automation MODE B. Does not call the Cursor API. This is the sole
 * production Cursor wake path (#930); the Background Agents API dispatcher
 * is legacy / diagnostic only. Reuses scan/WIP eligibility decisions.
 *
 * @see .github/workflows/factory-cursor-handoff.yml
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 */

export const FACTORY_CURSOR_HANDOFF_SCHEMA = 'corpflow.factory_cursor_handoff.v1';

/** Exact displayed GitHub Actions workflow name (Cursor Automation MODE B). */
export const FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME = 'CorpFlowAI Cursor Factory Handoff';

export const FACTORY_CURSOR_HANDOFF_MARKER = '<!-- corpflow.factory_cursor_handoff.v1 -->';

export const FACTORY_CURSOR_HANDOFF_HEADING = 'CORPFLOW FACTORY HANDOFF';

/** Suppress a second success-wake for the same issue within this window. */
export const FACTORY_HANDOFF_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toPositiveIssueNumber(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function emptyToNull(value) {
  const s = value == null ? '' : String(value).trim();
  return s || null;
}

/**
 * Parse the selected source issue from a handoff comment or summary body.
 *
 * @param {unknown} text
 * @returns {number | null}
 */
export function parseFactoryHandoffSourceIssue(text) {
  const body = String(text || '');
  if (!body.includes(FACTORY_CURSOR_HANDOFF_MARKER) && !body.includes(FACTORY_CURSOR_HANDOFF_HEADING)) {
    return null;
  }
  const match =
    body.match(/Selected source issue:\s*#(\d+)/i) ||
    body.match(/source_issue\s*[:=]\s*#?(\d+)/i);
  return match ? toPositiveIssueNumber(match[1]) : null;
}

/**
 * True when comments already record a recent handoff for this issue.
 *
 * @param {Array<{ body?: string | null, created_at?: string | null }> | null | undefined} comments
 * @param {number} issueNumber
 * @param {{ nowMs?: number, windowMs?: number }} [opts]
 */
export function hasRecentFactoryHandoff(comments, issueNumber, opts = {}) {
  const want = toPositiveIssueNumber(issueNumber);
  if (want == null || !Array.isArray(comments)) return false;
  const nowMs = Number.isFinite(opts.nowMs) ? Number(opts.nowMs) : Date.now();
  const windowMs =
    Number.isFinite(opts.windowMs) && opts.windowMs >= 0
      ? Number(opts.windowMs)
      : FACTORY_HANDOFF_DEDUPE_WINDOW_MS;

  for (const comment of comments) {
    const parsed = parseFactoryHandoffSourceIssue(comment?.body);
    if (parsed !== want) continue;
    const created = comment?.created_at ? Date.parse(String(comment.created_at)) : NaN;
    if (!Number.isFinite(created)) return true;
    if (nowMs - created <= windowMs) return true;
  }
  return false;
}

/**
 * Build the durable machine+human handoff comment body.
 *
 * @param {{
 *   sourceIssue: number,
 *   wakeReason?: string | null,
 *   wakePath?: string | null,
 *   availableSlots?: number | null,
 *   verifiedActiveCount?: number | null,
 *   workflowRunUrl?: string | null,
 *   workflowName?: string | null,
 *   capacityPacket?: string | null,
 * }} opts
 */
export function formatFactoryHandoffComment(opts = {}) {
  const sourceIssue = toPositiveIssueNumber(opts.sourceIssue);
  if (sourceIssue == null) {
    throw new Error('formatFactoryHandoffComment: sourceIssue required');
  }
  const workflowName = emptyToNull(opts.workflowName) || FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME;
  const wakeReason = emptyToNull(opts.wakeReason) || 'unspecified';
  const wakePath = emptyToNull(opts.wakePath) || 'unspecified';
  const runUrl = emptyToNull(opts.workflowRunUrl) || '(run url unavailable)';
  const slots =
    opts.availableSlots == null || !Number.isFinite(Number(opts.availableSlots))
      ? 'n/a'
      : String(Number(opts.availableSlots));
  const active =
    opts.verifiedActiveCount == null || !Number.isFinite(Number(opts.verifiedActiveCount))
      ? 'n/a'
      : String(Number(opts.verifiedActiveCount));
  const capacity = emptyToNull(opts.capacityPacket);

  return `${FACTORY_CURSOR_HANDOFF_MARKER}
# ${FACTORY_CURSOR_HANDOFF_HEADING}

Selected source issue: #${sourceIssue}
Workflow: ${workflowName}
Wake reason: ${wakeReason}
Wake path: ${wakePath}
Verified active Cursor runs: ${active}
Available WIP slots: ${slots}
GitHub Actions run: ${runUrl}

Cursor Automation MODE B must execute exactly this one issue, open one PR, then terminate.
Do not treat stale labels as active WIP. Protected subject mentions alone do not block ordinary work.
${capacity ? `\nCapacity packet:\n\`\`\`\n${capacity.trim()}\n\`\`\`\n` : ''}`;
}

/**
 * @param {{
 *   shouldSucceed: boolean,
 *   sourceIssue?: number | null,
 *   reason: string,
 *   wakeReason?: string | null,
 *   wakePath?: string | null,
 *   preferIssueNumbers?: number[],
 *   availableSlots?: number | null,
 *   verifiedActiveCount?: number | null,
 *   eligibleIssueNumbers?: number[],
 *   suppressReason?: string | null,
 *   workflowName?: string | null,
 *   workflowRunUrl?: string | null,
 *   capacityPacket?: string | null,
 *   repo?: string | null,
 *   generatedAt?: string | null,
 * }} input
 */
export function buildFactoryHandoffPacket(input = {}) {
  const sourceIssue = toPositiveIssueNumber(input.sourceIssue);
  const shouldSucceed = Boolean(input.shouldSucceed) && sourceIssue != null;
  return {
    schema: FACTORY_CURSOR_HANDOFF_SCHEMA,
    workflowName: emptyToNull(input.workflowName) || FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
    generatedAt: emptyToNull(input.generatedAt) || new Date().toISOString(),
    repo: emptyToNull(input.repo),
    shouldSucceed,
    has_handoff: shouldSucceed ? 1 : 0,
    source_issue: shouldSucceed ? sourceIssue : null,
    reason: String(input.reason || (shouldSucceed ? 'eligible_handoff' : 'no_handoff')),
    suppressReason: emptyToNull(input.suppressReason),
    wakeReason: emptyToNull(input.wakeReason),
    wakePath: emptyToNull(input.wakePath),
    preferIssueNumbers: Array.isArray(input.preferIssueNumbers)
      ? input.preferIssueNumbers.map((n) => toPositiveIssueNumber(n)).filter(Boolean)
      : [],
    availableSlots:
      input.availableSlots == null || !Number.isFinite(Number(input.availableSlots))
        ? null
        : Number(input.availableSlots),
    verifiedActiveCount:
      input.verifiedActiveCount == null || !Number.isFinite(Number(input.verifiedActiveCount))
        ? null
        : Number(input.verifiedActiveCount),
    eligibleIssueNumbers: Array.isArray(input.eligibleIssueNumbers)
      ? input.eligibleIssueNumbers.map((n) => toPositiveIssueNumber(n)).filter(Boolean)
      : [],
    workflowRunUrl: emptyToNull(input.workflowRunUrl),
    capacityPacket: emptyToNull(input.capacityPacket),
  };
}

/**
 * Decide whether this handoff workflow run may conclude successfully.
 *
 * Success is reserved for a real single-issue handoff so Cursor Automation
 * MODE B does not wake on empty/duplicate/suppressed runs.
 *
 * @param {{
 *   wakeShouldRun?: boolean,
 *   wakeIgnoreReason?: string | null,
 *   wakeReason?: string | null,
 *   wakePath?: string | null,
 *   preferIssueNumbers?: number[],
 *   activate?: boolean,
 *   targetIssue?: string | number | null,
 *   holdReason?: string | null,
 *   availableSlots?: number | null,
 *   verifiedActiveCount?: number | null,
 *   eligibleIssueNumbers?: number[],
 *   capacityPacket?: string | null,
 *   recentHandoff?: boolean,
 *   workflowRunUrl?: string | null,
 *   repo?: string | null,
 * }} input
 */
export function resolveFactoryHandoffDecision(input = {}) {
  if (!input.wakeShouldRun) {
    return buildFactoryHandoffPacket({
      shouldSucceed: false,
      reason: 'wake_predicate_rejected',
      suppressReason: emptyToNull(input.wakeIgnoreReason) || 'wake_not_eligible',
      wakeReason: input.wakeReason,
      wakePath: input.wakePath,
      preferIssueNumbers: input.preferIssueNumbers,
      availableSlots: input.availableSlots,
      verifiedActiveCount: input.verifiedActiveCount,
      eligibleIssueNumbers: input.eligibleIssueNumbers,
      capacityPacket: input.capacityPacket,
      workflowRunUrl: input.workflowRunUrl,
      repo: input.repo,
    });
  }

  const targetIssue = toPositiveIssueNumber(input.targetIssue);
  if (!input.activate || targetIssue == null) {
    return buildFactoryHandoffPacket({
      shouldSucceed: false,
      reason: 'no_eligible_source_issue',
      suppressReason: emptyToNull(input.holdReason) || 'scan_selected_none',
      wakeReason: input.wakeReason,
      wakePath: input.wakePath,
      preferIssueNumbers: input.preferIssueNumbers,
      availableSlots: input.availableSlots,
      verifiedActiveCount: input.verifiedActiveCount,
      eligibleIssueNumbers: input.eligibleIssueNumbers,
      capacityPacket: input.capacityPacket,
      workflowRunUrl: input.workflowRunUrl,
      repo: input.repo,
    });
  }

  if (input.recentHandoff) {
    return buildFactoryHandoffPacket({
      shouldSucceed: false,
      sourceIssue: targetIssue,
      reason: 'duplicate_handoff_suppressed',
      suppressReason: `recent handoff already recorded for #${targetIssue}`,
      wakeReason: input.wakeReason,
      wakePath: input.wakePath,
      preferIssueNumbers: input.preferIssueNumbers,
      availableSlots: input.availableSlots,
      verifiedActiveCount: input.verifiedActiveCount,
      eligibleIssueNumbers: input.eligibleIssueNumbers,
      capacityPacket: input.capacityPacket,
      workflowRunUrl: input.workflowRunUrl,
      repo: input.repo,
    });
  }

  const slots = Number(input.availableSlots);
  if (Number.isFinite(slots) && slots <= 0) {
    return buildFactoryHandoffPacket({
      shouldSucceed: false,
      sourceIssue: targetIssue,
      reason: 'wip_cap_reached',
      suppressReason: 'verified Cursor WIP cap has no available slots',
      wakeReason: input.wakeReason,
      wakePath: input.wakePath,
      preferIssueNumbers: input.preferIssueNumbers,
      availableSlots: input.availableSlots,
      verifiedActiveCount: input.verifiedActiveCount,
      eligibleIssueNumbers: input.eligibleIssueNumbers,
      capacityPacket: input.capacityPacket,
      workflowRunUrl: input.workflowRunUrl,
      repo: input.repo,
    });
  }

  return buildFactoryHandoffPacket({
    shouldSucceed: true,
    sourceIssue: targetIssue,
    reason: 'eligible_handoff',
    wakeReason: input.wakeReason,
    wakePath: input.wakePath,
    preferIssueNumbers: input.preferIssueNumbers,
    availableSlots: input.availableSlots,
    verifiedActiveCount: input.verifiedActiveCount,
    eligibleIssueNumbers: input.eligibleIssueNumbers,
    capacityPacket: input.capacityPacket,
    workflowRunUrl: input.workflowRunUrl,
    repo: input.repo,
  });
}
