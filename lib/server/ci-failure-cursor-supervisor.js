/**
 * CI failure → Cursor repair supervisor (no second DB).
 *
 * Detects failed Agent CI on Cursor-created PRs, builds a sanitised failure
 * packet, and follow-ups the same Cursor agent (or one PR-bound repair agent).
 *
 * @see docs/operations/CI_FAILURE_CURSOR_SUPERVISOR_V1.md
 */

import { createHash } from 'node:crypto';

import {
  createCursorAgentFollowUpRun,
  createCursorRepairAgentForPr,
  extractCursorGitDetails,
} from './cursor-cloud-agent-client.js';
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

/**
 * @typedef {{
 *   repo: string,
 *   sourceIssue: number | null,
 *   prNumber: number,
 *   prUrl: string,
 *   branch: string | null,
 *   headSha: string,
 *   workflowName: string,
 *   workflowRunId: string,
 *   workflowRunUrl: string,
 *   failedJob: string | null,
 *   failedStep: string | null,
 *   failingTests: string[],
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
 * @param {string} logText
 */
export function extractFailingTestNames(logText) {
  const text = String(logText || '');
  const names = new Set();
  for (const m of text.matchAll(/not ok \d+ - ([^\n]+)/g)) {
    names.add(m[1].trim());
  }
  for (const m of text.matchAll(/Error:\s*([^\n]+)/g)) {
    if (/assert|expected|fail/i.test(m[1])) names.add(m[1].trim().slice(0, 160));
  }
  for (const m of text.matchAll(/(node-tests\/[\w./-]+\.test\.mjs)/g)) {
    names.add(m[1]);
  }
  return [...names].slice(0, 12);
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
 * @param {Record<string, unknown>} input
 * @returns {CiFailurePacket}
 */
export function buildCiFailurePacket(input = {}) {
  const logExcerpt = redactSecrets(String(input.logExcerpt || '')).slice(0, 2500);
  const failingTests = Array.isArray(input.failingTests)
    ? input.failingTests.map((t) => String(t).slice(0, 200)).slice(0, 12)
    : extractFailingTestNames(logExcerpt);
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
    workflowName: String(input.workflowName || 'Agent CI'),
    workflowRunId,
    workflowRunUrl: String(input.workflowRunUrl || ''),
    failedJob: emptyToNull(input.failedJob),
    failedStep: emptyToNull(input.failedStep),
    failingTests,
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
Head SHA (failed): ${p.headSha}
Cursor agent: ${p.cursorAgentId || 'unknown'}
Prior Cursor run: ${p.cursorRunId || 'unknown'}

Failed workflow: ${p.workflowName}
Workflow run: ${p.workflowRunId} ${p.workflowRunUrl}
Failed job: ${p.failedJob || 'unknown'}
Failed step: ${p.failedStep || 'unknown'}
Failing tests: ${p.failingTests.length ? p.failingTests.join('; ') : 'see log excerpt'}
Error category: ${p.errorCategory}

Required:
1. Reproduce the failing test(s) locally.
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
 * Decide whether supervisor should act.
 *
 * @param {{
 *   workflowConclusion: string,
 *   workflowName: string,
 *   prState?: string,
 *   prDraft?: boolean,
 *   origin: ReturnType<typeof resolveCursorOriginMetadata>,
 *   repairState?: { attemptsByPr?: Record<string, number>, fingerprintsSent?: string[], lastSentAtByPr?: Record<string, string>, activeRepairAgentByPr?: Record<string, string> },
 *   costState?: unknown,
 *   costLimits?: unknown,
 *   nowIso?: string,
 *   maxAttempts?: number,
 *   cooldownMinutes?: number,
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
    // Allow exact Agent CI; also allow if name contains Agent CI
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
  const preferFollowUp = input.preferFollowUp !== false;

  if (preferFollowUp && packet.cursorAgentId) {
    try {
      const result = await createCursorAgentFollowUpRun(
        input.apiKey,
        packet.cursorAgentId,
        { text: prompt, mode: 'agent' },
        { fetch: input.fetch },
      );
      const details = extractCursorGitDetails(result);
      return {
        mode: 'follow_up',
        ok: true,
        agentId: packet.cursorAgentId,
        runId: details.runId,
        raw: result,
        prompt,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Fall through to PR-bound repair agent when follow-up is rejected.
      if (!/HTTP 4\d\d/i.test(message) && !/archiv|inactive|not accept/i.test(message)) {
        throw err;
      }
    }
  }

  if (!packet.prUrl) {
    throw new Error('Cannot create repair agent without prUrl');
  }
  const result = await createCursorRepairAgentForPr(
    input.apiKey,
    {
      promptText: prompt,
      prUrl: packet.prUrl,
      name: `ci-repair-pr-${packet.prNumber}`.slice(0, 100),
    },
    { fetch: input.fetch },
  );
  const details = extractCursorGitDetails(result);
  return {
    mode: 'new_repair_agent',
    ok: true,
    agentId: details.agentId,
    runId: details.runId,
    raw: result,
    prompt,
  };
}

/**
 * Escalation packet when automatic repair is exhausted.
 * @param {CiFailurePacket} packet
 * @param {{ attempts: number, reason: string }} meta
 */
export function formatCiRepairEscalationComment(packet, meta) {
  const p = buildCiFailurePacket(packet);
  return `CI REPAIR ESCALATION — ANTON ACTION REQUIRED

PR: #${p.prNumber} ${p.prUrl}
Source issue: ${p.sourceIssue != null ? `#${p.sourceIssue}` : 'n/a'}
Head SHA: ${p.headSha}
Workflow run: ${p.workflowRunId} ${p.workflowRunUrl}
Failed step: ${p.failedStep || 'n/a'}
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

export { resolveCursorOriginMetadata, recordActivationUsage };
