/**
 * CI failure → Cursor repair supervisor (no second DB).
 *
 * Detects failed Agent CI on Cursor-created PRs, builds a sanitised failure
 * packet, and follow-ups the same Cursor agent (or one PR-bound repair agent).
 *
 * @see docs/operations/CI_FAILURE_CURSOR_SUPERVISOR_V1.md
 */

import { createHash } from 'node:crypto';

import { buildCursorOriginMetadata, resolveCursorOriginMetadata } from './cursor-origin-metadata.js';
import {
  evaluateActivationCostGate,
  recordActivationUsage,
} from './agent-cost-controls.js';

export const CI_FAILURE_SUPERVISOR_SCHEMA = 'corpflow.ci_failure_cursor_supervisor.v1';

export const DEFAULT_CI_REPAIR_LIMITS = Object.freeze({
  maxAutomaticRepairAttempts: 2,
  cooldownMinutes: 5,
});

export const APPROVED_CI_WORKFLOW_NAMES = Object.freeze(['Agent CI', 'test']);

/** Generic Node runner noise that must not become the sole failure packet. */
const GENERIC_RUNNER_NOISE =
  /MODULE_TYPELESS_PACKAGE_JSON|ExperimentalWarning|DeprecationWarning|npm notice|Force enabling/i;

/**
 * @typedef {{
 *   repo: string,
 *   sourceIssue: number | null,
 *   prNumber: number,
 *   prUrl: string,
 *   branch: string | null,
 *   headSha: string,
 *   currentPrHeadSha: string | null,
 *   workflowName: string,
 *   workflowRunId: string,
 *   workflowRunUrl: string,
 *   failedJob: string | null,
 *   failedStep: string | null,
 *   failingTests: string[],
 *   failingTestFile: string | null,
 *   suite: string | null,
 *   subtest: string | null,
 *   assertionExcerpt: string | null,
 *   errorCategory: string,
 *   logExcerpt: string,
 *   requiredRepair: string,
 *   prohibitedActions: string[],
 *   cursorAgentId: string | null,
 *   cursorRunId: string | null,
 *   failureFingerprint: string,
 * }} CiFailurePacket
 */

/**
 * @param {string} text
 */
export function redactSecrets(text) {
  return String(text || '')
    .replace(/(Authorization:\s*Bearer\s+)[^\s]+/gi, '$1***')
    .replace(/(CURSOR_API_KEY|GITHUB_TOKEN|GH_TOKEN|CRON_SECRET|INFISICAL)[=:]\s*\S+/gi, '$1=***')
    .replace(/\b(sk-[a-zA-Z0-9_-]{8,}|ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,})\b/g, '***');
}

/**
 * @param {{
 *   workflowName?: string,
 *   workflowRunId?: string | number,
 *   headSha?: string,
 *   failedStep?: string | null,
 *   failingTests?: string[],
 *   errorCategory?: string,
 * }} input
 */
export function buildFailureFingerprint(input = {}) {
  const parts = [
    String(input.workflowName || ''),
    String(input.workflowRunId || ''),
    String(input.headSha || '').slice(0, 40),
    String(input.failedStep || ''),
    ...(Array.isArray(input.failingTests) ? input.failingTests : []),
    String(input.errorCategory || ''),
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}

/**
 * Strip generic runner warnings when real test failure context exists.
 * @param {string} logText
 */
export function stripGenericRunnerNoise(logText) {
  return String(logText || '')
    .split('\n')
    .filter((line) => !GENERIC_RUNNER_NOISE.test(line))
    .join('\n');
}

/**
 * Extract meaningful node:test / assertion failure context.
 * Prefer real test failures over runner-warning-only packets.
 *
 * @param {string} logText
 * @returns {{
 *   failingTests: string[],
 *   failingTestFile: string | null,
 *   suite: string | null,
 *   subtest: string | null,
 *   assertionExcerpt: string | null,
 *   logExcerpt: string,
 * }}
 */
export function extractMeaningfulFailureContext(logText) {
  const raw = String(logText || '');
  const cleaned = stripGenericRunnerNoise(raw);
  const text = cleaned.trim() ? cleaned : raw;

  /** @type {string[]} */
  const failingTests = [];
  let failingTestFile = null;
  let suite = null;
  let subtest = null;
  let assertionExcerpt = null;

  for (const m of text.matchAll(/(node-tests\/[\w./-]+\.test\.mjs)(?::(\d+))?/g)) {
    if (!failingTestFile) failingTestFile = m[1];
    const label = m[2] ? `${m[1]}:${m[2]}` : m[1];
    if (!failingTests.includes(label)) failingTests.push(label);
  }

  // Prefer the failing TAP block around "not ok N - …" (avoid "dispatch not ok" prose).
  const tapFailSimple = [...text.matchAll(/not ok (\d+) - ([^\n]+)/g)];
  const primaryTap = tapFailSimple.find((m) =>
    /lead-rescue|AssertionError|intro video|metadata|places a native/i.test(
      m[0] + text.slice(m.index, (m.index || 0) + 800),
    ),
  ) || tapFailSimple[tapFailSimple.length - 1];

  if (primaryTap) {
    const start = primaryTap.index ?? 0;
    const window = text.slice(Math.max(0, start - 400), start + 1200);
    const suiteFromWindow = window.match(/#\s*Subtest:\s*([^\n]+)/);
    if (suiteFromWindow) suite = suiteFromWindow[1].trim().slice(0, 200);
    subtest = primaryTap[2].trim().slice(0, 200);
    if (!failingTests.includes(subtest)) failingTests.unshift(subtest);

    const fileInWindow = window.match(/(node-tests\/[\w./-]+\.test\.mjs)(?::(\d+))?/);
    if (fileInWindow) {
      failingTestFile = fileInWindow[1];
      const label = fileInWindow[2] ? `${fileInWindow[1]}:${fileInWindow[2]}` : fileInWindow[1];
      if (!failingTests.includes(label)) failingTests.push(label);
    }

    const assertInWindow = window.match(
      /AssertionError[\s\S]{0,400}?(?:\n\s*at [^\n]+)?(?:\n\s*at [^\n]+)?/i,
    );
    if (assertInWindow) {
      assertionExcerpt = redactSecrets(assertInWindow[0]).trim().slice(0, 600);
    }
  }

  if (!suite) {
    const suiteMatch = text.match(/#\s*Subtest:\s*(.+)/i);
    if (suiteMatch) suite = suiteMatch[1].trim().slice(0, 200);
  }

  if (!assertionExcerpt) {
    const assertBlock = text.match(
      /AssertionError[\s\S]{0,400}?(?:\n\s*at [^\n]+)?(?:\n\s*at [^\n]+)?/i,
    );
    const errLine = text.match(/Error:\s*([^\n]*(?:AssertionError|expected|ERR_ASSERTION)[^\n]*)/i);
    if (assertBlock) {
      assertionExcerpt = redactSecrets(assertBlock[0]).trim().slice(0, 600);
    } else if (errLine) {
      assertionExcerpt = redactSecrets(errLine[0]).trim().slice(0, 600);
    }
  }

  // Prefer lines around TAP failure / AssertionError for the packet excerpt.
  const lines = text.split('\n');
  const focusIdx = lines.findIndex(
    (l) =>
      /not ok \d+ -/.test(l) ||
      /AssertionError|ERR_ASSERTION/.test(l) ||
      /node-tests\/lead-rescue-intro-video\.test\.mjs/.test(l),
  );
  let excerptLines;
  if (focusIdx >= 0) {
    excerptLines = lines.slice(Math.max(0, focusIdx - 5), focusIdx + 25);
  } else {
    excerptLines = lines.filter((l) => !GENERIC_RUNNER_NOISE.test(l)).slice(0, 40);
  }
  let logExcerpt = redactSecrets(excerptLines.join('\n')).trim().slice(0, 2500);

  // If we only have runner noise and no test signal, keep a short redacted raw slice but mark empty tests.
  const hasRealFailure =
    Boolean(failingTestFile) ||
    Boolean(assertionExcerpt) ||
    failingTests.length > 0 ||
    /not ok \d+ -|AssertionError|ERR_ASSERTION/i.test(text);

  if (!hasRealFailure && GENERIC_RUNNER_NOISE.test(raw) && !/not ok \d+ -|AssertionError/i.test(raw)) {
    logExcerpt = '';
  }

  if (failingTestFile && !failingTests.some((t) => t.includes(failingTestFile))) {
    failingTests.unshift(failingTestFile);
  }

  return {
    failingTests: failingTests.slice(0, 12),
    failingTestFile,
    suite,
    subtest,
    assertionExcerpt,
    logExcerpt,
  };
}

/**
 * @param {string} logText
 * @deprecated Prefer extractMeaningfulFailureContext
 */
export function extractFailingTestNames(logText) {
  return extractMeaningfulFailureContext(logText).failingTests;
}

/**
 * @param {string} logText
 * @param {string[]} failingTests
 */
export function classifyCiErrorCategory(logText, failingTests = []) {
  const text = String(logText || '');
  if (/AssertionError|ERR_ASSERTION/i.test(text)) return 'assertion_mismatch';
  if (/Cannot find module|MODULE_NOT_FOUND/i.test(text)) return 'missing_module';
  if (/TypeError|ReferenceError|SyntaxError/i.test(text)) return 'runtime_error';
  if (/eslint|lint/i.test(text)) return 'lint_failure';
  if (/npm audit/i.test(text)) return 'audit_failure';
  if (failingTests.length) return 'test_failure';
  return 'ci_failure';
}

/**
 * Suppress obsolete failure follow-ups (head advanced, later green, closed PR/issue).
 *
 * @param {{
 *   failedHeadSha?: string | null,
 *   currentPrHeadSha?: string | null,
 *   prState?: string | null,
 *   prMerged?: boolean,
 *   sourceIssueState?: string | null,
 *   laterAgentCiRuns?: Array<{ id?: string|number, conclusion?: string, headSha?: string, createdAt?: string }>,
 *   workflowRunId?: string | null,
 * }} input
 */
export function evaluateObsoleteFailureSuppression(input = {}) {
  const prState = String(input.prState || 'open').toLowerCase();
  if (input.prMerged === true || prState === 'closed' || prState === 'merged') {
    return { suppress: true, reason: 'pr_closed_or_merged' };
  }

  const failedSha = normalizeSha(input.failedHeadSha);
  const currentSha = normalizeSha(input.currentPrHeadSha);
  if (failedSha && currentSha && failedSha !== currentSha) {
    return {
      suppress: true,
      reason: 'obsolete_head_advanced',
      failedHeadSha: failedSha,
      currentPrHeadSha: currentSha,
    };
  }

  const later = Array.isArray(input.laterAgentCiRuns) ? input.laterAgentCiRuns : [];
  const failedRunId = String(input.workflowRunId || '');
  const laterGreen = later.find((run) => {
    const conclusion = String(run.conclusion || '').toLowerCase();
    if (conclusion !== 'success') return false;
    const id = String(run.id || '');
    if (failedRunId && id && id === failedRunId) return false;
    const runSha = normalizeSha(run.headSha);
    if (failedSha && runSha && runSha === failedSha) return false;
    return true;
  });
  if (laterGreen) {
    return {
      suppress: true,
      reason: 'later_ci_green',
      laterRunId: String(laterGreen.id || ''),
      laterHeadSha: normalizeSha(laterGreen.headSha),
    };
  }

  const issueState = String(input.sourceIssueState || 'open').toLowerCase();
  if (issueState === 'closed' || issueState === 'completed') {
    return { suppress: true, reason: 'source_issue_closed' };
  }

  return { suppress: false, reason: 'current' };
}

/**
 * @param {Record<string, unknown>} input
 * @returns {CiFailurePacket}
 */
export function buildCiFailurePacket(input = {}) {
  const extracted =
    input.failingTestFile || input.assertionExcerpt || input.suite
      ? {
          failingTests: Array.isArray(input.failingTests) ? input.failingTests.map(String) : [],
          failingTestFile: emptyToNull(input.failingTestFile),
          suite: emptyToNull(input.suite),
          subtest: emptyToNull(input.subtest),
          assertionExcerpt: emptyToNull(input.assertionExcerpt),
          logExcerpt: redactSecrets(String(input.logExcerpt || '')).slice(0, 2500),
        }
      : extractMeaningfulFailureContext(String(input.logExcerpt || ''));

  const failingTests = (
    Array.isArray(input.failingTests) && input.failingTests.length
      ? input.failingTests.map((t) => String(t).slice(0, 200))
      : extracted.failingTests
  ).slice(0, 12);

  const logExcerpt = extracted.logExcerpt || redactSecrets(String(input.logExcerpt || '')).slice(0, 2500);
  const errorCategory =
    emptyToNull(input.errorCategory) || classifyCiErrorCategory(logExcerpt, failingTests);
  const headSha = String(input.headSha || '').trim();
  const workflowRunId = String(input.workflowRunId || '').trim();
  const fingerprint =
    emptyToNull(input.failureFingerprint) ||
    buildFailureFingerprint({
      workflowName: input.workflowName,
      workflowRunId,
      headSha,
      failedStep: input.failedStep,
      failingTests,
      errorCategory,
    });

  return {
    repo: String(input.repo || 'antonvdberg-bit/corpflow-ai-command-center'),
    sourceIssue: toPositiveInt(input.sourceIssue),
    prNumber: toPositiveInt(input.prNumber) || 0,
    prUrl: String(input.prUrl || ''),
    branch: emptyToNull(input.branch),
    headSha,
    currentPrHeadSha: emptyToNull(input.currentPrHeadSha),
    workflowName: String(input.workflowName || 'Agent CI'),
    workflowRunId,
    workflowRunUrl: String(input.workflowRunUrl || ''),
    failedJob: emptyToNull(input.failedJob),
    failedStep: emptyToNull(input.failedStep),
    failingTests,
    failingTestFile: emptyToNull(input.failingTestFile) || extracted.failingTestFile,
    suite: emptyToNull(input.suite) || extracted.suite,
    subtest: emptyToNull(input.subtest) || extracted.subtest,
    assertionExcerpt: emptyToNull(input.assertionExcerpt) || extracted.assertionExcerpt,
    errorCategory,
    logExcerpt,
    requiredRepair: String(
      input.requiredRepair ||
        'Reproduce the failing tests, repair the smallest correct implementation or test while preserving the true invariant, push to the same PR branch, and re-run tests.',
    ),
    prohibitedActions: Array.isArray(input.prohibitedActions)
      ? input.prohibitedActions.map(String)
      : [
          'Do not merge',
          'Do not deploy production',
          'Do not change secrets or env values',
          'Do not change DB/schema',
          'Do not open a replacement PR',
          'Do not activate payment/messaging/outreach',
        ],
    cursorAgentId: emptyToNull(input.cursorAgentId),
    cursorRunId: emptyToNull(input.cursorRunId),
    failureFingerprint: fingerprint,
  };
}

/**
 * @param {CiFailurePacket} packet
 */
export function formatCiFailureFollowUpPrompt(packet) {
  const p = buildCiFailurePacket(packet);
  return `CI FAILURE — AUTOMATIC REPAIR FOLLOW-UP (same PR branch)

Repository: ${p.repo}
Source issue: ${p.sourceIssue != null ? `#${p.sourceIssue}` : 'unknown'}
PR: #${p.prNumber} ${p.prUrl}
Branch: ${p.branch || 'unknown'}
Failed head SHA: ${p.headSha}
Current PR head SHA: ${p.currentPrHeadSha || 'n/a'}
Cursor agent: ${p.cursorAgentId || 'unknown'}
Prior Cursor run: ${p.cursorRunId || 'unknown'}

Failed workflow: ${p.workflowName}
Workflow run: ${p.workflowRunId} ${p.workflowRunUrl}
Failed job: ${p.failedJob || 'unknown'}
Failed step: ${p.failedStep || 'unknown'}
Failing test file: ${p.failingTestFile || 'unknown'}
Suite: ${p.suite || 'unknown'}
Subtest: ${p.subtest || 'unknown'}
Failing tests: ${p.failingTests.length ? p.failingTests.join('; ') : 'see log excerpt'}
Assertion/error: ${p.assertionExcerpt || 'see log excerpt'}
Error category: ${p.errorCategory}

Required:
1. Reproduce the failing test(s) locally against the failed head when diagnosing.
2. Diagnose the smallest exact defect.
3. Repair implementation and/or test while preserving the true invariant.
4. Add/update a regression assertion if needed.
5. Push the repair commit to the SAME branch (${p.branch || 'current PR branch'}).
6. Keep the SAME PR (#${p.prNumber}) — do not open another PR.
7. Re-run the focused tests and report the new commit SHA + CI expectation.

Prohibited:
${p.prohibitedActions.map((a) => `- ${a}`).join('\n')}

Sanitised log excerpt:
\`\`\`
${p.logExcerpt || '(none)'}
\`\`\`
`;
}

/**
 * Decide whether supervisor should act on a failure event (pre-obsolete checks).
 *
 * @param {{
 *   workflowConclusion: string,
 *   workflowName: string,
 *   prState?: string,
 *   origin: ReturnType<typeof resolveCursorOriginMetadata>,
 * }} input
 */
export function evaluateCiRepairGate(input) {
  const conclusion = String(input.workflowConclusion || '').toLowerCase();
  if (conclusion !== 'failure') {
    return { allow: false, reason: 'workflow_not_failure' };
  }
  const workflowName = String(input.workflowName || '');
  if (
    !APPROVED_CI_WORKFLOW_NAMES.some((n) => n.toLowerCase() === workflowName.toLowerCase()) &&
    workflowName.toLowerCase() !== 'agent ci'
  ) {
    if (!/agent\s*ci/i.test(workflowName) && workflowName !== 'test') {
      return { allow: false, reason: 'workflow_not_approved' };
    }
  }
  const prState = String(input.prState || 'open').toLowerCase();
  if (prState !== 'open') return { allow: false, reason: 'pr_not_open' };

  const origin = input.origin || buildCursorOriginMetadata({});
  if (!origin.cursorAgentId && !origin.cursorRunId) {
    return { allow: false, reason: 'missing_cursor_origin' };
  }

  return { allow: true, reason: 'eligible', origin };
}

/**
 * @param {{
 *   packet: CiFailurePacket,
 *   origin: ReturnType<typeof resolveCursorOriginMetadata>,
 *   repairState?: Record<string, unknown>,
 *   costState?: unknown,
 *   maxAttempts?: number,
 *   cooldownMinutes?: number,
 *   nowIso?: string,
 * }} input
 */
export function evaluateRepairAttemptLimits(input) {
  const maxAttempts = input.maxAttempts ?? DEFAULT_CI_REPAIR_LIMITS.maxAutomaticRepairAttempts;
  const cooldownMinutes = input.cooldownMinutes ?? DEFAULT_CI_REPAIR_LIMITS.cooldownMinutes;
  const prKey = String(input.packet.prNumber);
  const state = input.repairState && typeof input.repairState === 'object' ? input.repairState : {};
  const attemptsByPr = state.attemptsByPr && typeof state.attemptsByPr === 'object' ? state.attemptsByPr : {};
  const fingerprintsSent = Array.isArray(state.fingerprintsSent) ? state.fingerprintsSent : [];
  const lastSentAtByPr =
    state.lastSentAtByPr && typeof state.lastSentAtByPr === 'object' ? state.lastSentAtByPr : {};
  const attempts = Number(attemptsByPr[prKey] || input.origin.followUpAttemptCount || 0);

  if (fingerprintsSent.includes(input.packet.failureFingerprint)) {
    return { allow: false, reason: 'duplicate_fingerprint', attempts };
  }
  if (attempts >= maxAttempts) {
    return { allow: false, reason: 'max_attempts_exhausted', attempts, escalate: true };
  }
  const lastSent = lastSentAtByPr[prKey] ? Date.parse(String(lastSentAtByPr[prKey])) : NaN;
  const now = Date.parse(input.nowIso || new Date().toISOString());
  if (Number.isFinite(lastSent) && now - lastSent < cooldownMinutes * 60_000) {
    return { allow: false, reason: 'cooldown_active', attempts };
  }

  if (input.costState) {
    const gate = evaluateActivationCostGate(
      {
        provider: 'cursor',
        dedupeKey: `ci-repair:pr:${prKey}:${input.packet.failureFingerprint}`,
        objectRef: `pr:${prKey}`,
        category: 'ci-repair',
        issueNumber: input.origin.sourceIssue,
      },
      input.costState,
      [],
      {
        maxConcurrentCursor: 2,
        maxConcurrentCodex: 1,
        maxCursorActivationsPerDay: 12,
        maxCodexTriggersPerDay: 6,
        duplicateWindowHours: 24,
      },
    );
    if (!gate.allowed) {
      return {
        allow: false,
        reason: `cost_gate:${gate.errors[0] || 'blocked'}`,
        attempts,
        escalate: /daily/i.test(String(gate.errors[0] || '')),
      };
    }
  }

  return { allow: true, reason: 'attempt_allowed', attempts };
}

/**
 * @param {Record<string, unknown>} state
 * @param {CiFailurePacket} packet
 * @param {{ followUpRunId?: string | null, agentId?: string | null, nowIso?: string }} meta
 */
export function recordRepairAttempt(state, packet, meta = {}) {
  const next = {
    schema: CI_FAILURE_SUPERVISOR_SCHEMA,
    attemptsByPr: { ...(state.attemptsByPr || {}) },
    fingerprintsSent: [...(Array.isArray(state.fingerprintsSent) ? state.fingerprintsSent : [])],
    lastSentAtByPr: { ...(state.lastSentAtByPr || {}) },
    activeRepairAgentByPr: { ...(state.activeRepairAgentByPr || {}) },
    lastWorkflowRunIds: [...(Array.isArray(state.lastWorkflowRunIds) ? state.lastWorkflowRunIds : [])],
  };
  const prKey = String(packet.prNumber);
  next.attemptsByPr[prKey] = Number(next.attemptsByPr[prKey] || 0) + 1;
  if (!next.fingerprintsSent.includes(packet.failureFingerprint)) {
    next.fingerprintsSent.push(packet.failureFingerprint);
  }
  next.lastSentAtByPr[prKey] = meta.nowIso || new Date().toISOString();
  if (meta.agentId) next.activeRepairAgentByPr[prKey] = String(meta.agentId);
  if (packet.workflowRunId && !next.lastWorkflowRunIds.includes(packet.workflowRunId)) {
    next.lastWorkflowRunIds.push(packet.workflowRunId);
  }
  return next;
}

/**
 * @param {{
 *   apiKey: string,
 *   packet: CiFailurePacket,
 *   preferFollowUp?: boolean,
 *   fetch?: typeof fetch,
 * }} input
 */
export async function dispatchCiRepairToCursor(input) {
  const packet = buildCiFailurePacket(input.packet);
  const prompt = formatCiFailureFollowUpPrompt(packet);
  // #1249: a failed run is a durable review stop. Do not create a follow-up
  // or replacement agent and do not silently escalate its model or spend.
  return {
    mode: 'review_required',
    ok: false,
    reviewRequired: true,
    agentId: packet.cursorAgentId,
    runId: null,
    prompt,
  };
}

/**
 * @param {CiFailurePacket} packet
 * @param {{ attempts: number, reason: string }} meta
 */
export function formatCiRepairEscalationComment(packet, meta) {
  const p = buildCiFailurePacket(packet);
  return `CI REPAIR ESCALATION — ANTON ACTION REQUIRED

PR: #${p.prNumber} ${p.prUrl}
Source issue: ${p.sourceIssue != null ? `#${p.sourceIssue}` : 'n/a'}
Failed head SHA: ${p.headSha}
Workflow run: ${p.workflowRunId} ${p.workflowRunUrl}
Failed step: ${p.failedStep || 'n/a'}
Failing test file: ${p.failingTestFile || 'n/a'}
Failing tests: ${p.failingTests.join('; ') || 'n/a'}
Error category: ${p.errorCategory}
Automatic repair attempts: ${meta.attempts}
Stop reason: ${meta.reason}

Anton action: review the PR, decide merge/close/manual repair, or raise the repair attempt limit after confirming this is not an infinite loop.
Do not expect another automatic Cursor follow-up until the head SHA or fingerprint changes with a reset.
`;
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
 * @param {unknown} value
 * @returns {number | null}
 */
function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeSha(value) {
  const s = value == null ? '' : String(value).trim().toLowerCase();
  if (!s) return null;
  return s.length >= 7 ? s.slice(0, 40) : s;
}

export { resolveCursorOriginMetadata, recordActivationUsage };
