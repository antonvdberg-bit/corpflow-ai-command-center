/**
 * Completion-to-review handoff — operator decision packets and routing.
 *
 * Detects PR/commit/completion signals and routes routine corrections to
 * Cursor/Codex; Anton only for protected gates.
 *
 * @see docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md
 * @see docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md
 */

import {
  textForbidsClientProduction,
  textRequestsClientProduction,
} from './environment-classification.js';

export const OPERATOR_REVIEW_HANDOFF_SCHEMA = 'corpflow.operator_review_handoff.v1';

/** @typedef {'cursor' | 'codex' | 'anton' | 'none'} ReviewRouteOwner */

/** @typedef {'implementation_complete' | 'pr_opened' | 'tests_failed' | 'client_ready' | 'blocked_gate' | 'unknown'} CompletionKind */

/**
 * @typedef {{
 *   kind: CompletionKind,
 *   issueNumber: number | null,
 *   prNumber: number | null,
 *   prUrl: string | null,
 *   branch: string | null,
 *   commitSha: string | null,
 *   protectedGate: string | null,
 *   testsPassing: boolean | null,
 *   clientReady: boolean,
 *   evidencePresent: boolean,
 *   notes: string | null,
 * }} CompletionSignals
 */

/**
 * @typedef {{
 *   schema: string,
 *   issueNumber: number | null,
 *   prNumber: number | null,
 *   title: string,
 *   businessOutcome: string,
 *   evidenceSummary: string,
 *   recommendedAction: string,
 *   routeOwner: ReviewRouteOwner,
 *   antonRequired: boolean,
 *   antonReason: string | null,
 *   routineCorrection: boolean,
 *   checklist: string[],
 * }} OperatorDecisionPacket
 */

export const PROTECTED_GATES_ANTON_ONLY = Object.freeze([
  /** client_production only — not CorpFlowAI-hosted corpflow_test publish */
  'production',
  'client_production',
  'database',
  'secrets',
  'payment',
  'messaging',
  'outreach',
  'paid_tool',
  'pricing',
  'launch',
  'merge',
]);

/**
 * @param {unknown} value
 */
function str(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * Detect an active protected gate from issue/PR text without false positives
 * from CorpFlowAI test-environment doctrine or prohibition lists.
 *
 * @param {string} blob lowercased combined text
 * @returns {string | null}
 */
export function detectProtectedGateFromText(blob) {
  const text = String(blob || '').toLowerCase();
  if (!text) return null;

  if (textRequestsClientProduction(text)) {
    return 'production';
  }

  for (const gate of PROTECTED_GATES_ANTON_ONLY) {
    if (gate === 'merge' || gate === 'production' || gate === 'client_production') continue;
    // Require active request phrasing; skip prohibition-only mentions.
    const active = new RegExp(
      `(?:requires?|need(?:s)?|approval for|protected gate[:\\s]+)\\s*${gate}\\b|\\b${gate}\\b[^.\\n]{0,40}(?:approval|required|gate)`,
      'i',
    );
    const forbidden = new RegExp(
      `no(?:t)?\\s+(?:.*\\b)?${gate}\\b|without[^.\\n]{0,40}${gate}\\b|${gate}\\b[^.\\n]{0,60}without anton`,
      'i',
    );
    if (active.test(text) && !forbidden.test(text)) {
      return gate;
    }
  }

  // Bare "production" is not enough when the packet forbids client production
  // or classifies CorpFlowAI hosts as corpflow_test.
  if (
    !textForbidsClientProduction(text) &&
    /(?:requires?|need(?:s)?|approval for|protected gate[:\s]+)\s*production\b/.test(text)
  ) {
    return 'production';
  }

  return null;
}

/**
 * Infer completion signals from run record, PR metadata, and issue body.
 *
 * @param {{
 *   run?: { issueNumber?: number | null, prNumber?: number | null, prUrl?: string | null, branch?: string | null, phase?: string, notes?: string | null },
 *   pr?: { number?: number | null, url?: string | null, merged?: boolean, checksPassing?: boolean | null, linkedIssue?: number | null },
 *   issue?: { number?: number, body?: string | null, title?: string | null },
 *   comments?: Array<{ body?: string | null }>,
 * }} input
 * @returns {CompletionSignals}
 */
export function detectCompletionSignals(input = {}) {
  const run = input.run || {};
  const pr = input.pr || {};
  const issue = input.issue || {};
  const comments = Array.isArray(input.comments) ? input.comments : [];
  const blob = [
    str(issue.body),
    str(issue.title),
    ...comments.map((c) => str(c.body)),
  ]
    .join('\n')
    .toLowerCase();

  let protectedGate = detectProtectedGateFromText(blob);

  const clientReady =
    /client[- ]ready|ready for (client|stakeholder)|implementation complete/i.test(blob) ||
    comments.some((c) => /CURSOR IMPLEMENTATION COMPLETE/i.test(str(c.body)));

  const testsPassing =
    pr.checksPassing === true ? true : pr.checksPassing === false ? false : null;

  let kind = /** @type {CompletionKind} */ ('unknown');
  if (run.phase === 'complete' || pr.merged) {
    kind = 'implementation_complete';
  } else if (run.prNumber || pr.number) {
    kind = pr.checksPassing === false ? 'tests_failed' : 'pr_opened';
  } else if (clientReady) {
    kind = 'client_ready';
  } else if (protectedGate) {
    kind = 'blocked_gate';
  }

  return {
    kind,
    issueNumber:
      run.issueNumber != null
        ? Number(run.issueNumber)
        : issue.number != null
          ? Number(issue.number)
          : null,
    prNumber: run.prNumber ?? (pr.number != null ? Number(pr.number) : null),
    prUrl: str(run.prUrl) || str(pr.url) || null,
    branch: str(run.branch) || null,
    commitSha: null,
    protectedGate,
    testsPassing,
    clientReady,
    evidencePresent: /evidence|delivery reality|smoke|verification/i.test(blob),
    notes: str(run.notes) || null,
  };
}

/**
 * Route review to the correct executor.
 *
 * @param {CompletionSignals} signals
 * @param {{ workTypes?: string[] }} [classification]
 */
export function routeReviewOwner(signals, classification = {}) {
  const workTypes = Array.isArray(classification.workTypes) ? classification.workTypes : [];

  if (signals.protectedGate && PROTECTED_GATES_ANTON_ONLY.includes(signals.protectedGate)) {
    return {
      routeOwner: /** @type {ReviewRouteOwner} */ ('anton'),
      antonRequired: true,
      antonReason: `Protected gate: ${signals.protectedGate}`,
      routineCorrection: false,
    };
  }

  if (signals.kind === 'client_ready' && !signals.evidencePresent) {
    return {
      routeOwner: 'cursor',
      antonRequired: false,
      antonReason: null,
      routineCorrection: true,
    };
  }

  if (signals.kind === 'tests_failed') {
    return {
      routeOwner: 'cursor',
      antonRequired: false,
      antonReason: null,
      routineCorrection: true,
    };
  }

  if (
    signals.kind === 'implementation_complete' ||
    signals.kind === 'pr_opened'
  ) {
    if (workTypes.includes('research') || workTypes.includes('documentation')) {
      return {
        routeOwner: 'codex',
        antonRequired: false,
        antonReason: null,
        routineCorrection: true,
      };
    }
    return {
      routeOwner: 'cursor',
      antonRequired: false,
      antonReason: null,
      routineCorrection: true,
    };
  }

  if (signals.clientReady && signals.evidencePresent) {
    return {
      routeOwner: 'anton',
      antonRequired: true,
      antonReason: 'Client-ready with evidence — merge/protected review',
      routineCorrection: false,
    };
  }

  return {
    routeOwner: 'none',
    antonRequired: false,
    antonReason: null,
    routineCorrection: false,
  };
}

/**
 * @param {CompletionSignals} signals
 * @param {{ title?: string, businessOutcome?: string, classification?: { workTypes?: string[] } }} [ctx]
 */
export function buildOperatorDecisionPacket(signals, ctx = {}) {
  const routing = routeReviewOwner(signals, ctx.classification || {});
  const issueNum = signals.issueNumber;
  const prNum = signals.prNumber;

  const checklist = [
    signals.evidencePresent ? 'Evidence attached or referenced' : 'MISSING: verification evidence',
    signals.testsPassing === true
      ? 'CI/tests passing'
      : signals.testsPassing === false
        ? 'FAIL: tests/build — route to Cursor fix'
        : 'Confirm CI status',
    signals.clientReady ? 'Client-ready signal detected' : 'Confirm buyer-facing readiness',
    routing.antonRequired ? `Anton required: ${routing.antonReason}` : 'Routine — executor self-review OK',
  ];

  let recommendedAction = 'No action';
  if (routing.routeOwner === 'cursor') {
    recommendedAction =
      signals.kind === 'tests_failed'
        ? 'Cursor: fix failing tests and push; re-post progress update.'
        : 'Cursor: self-review against scope; post CURSOR IMPLEMENTATION COMPLETE when ready.';
  } else if (routing.routeOwner === 'codex') {
    recommendedAction = 'Codex: research/review memo or ADR-lite; return packet to Operator Bridge #249.';
  } else if (routing.routeOwner === 'anton') {
    recommendedAction = `Anton: protected decision — ${routing.antonReason}. Review PR and merge gate.`;
  }

  return {
    schema: OPERATOR_REVIEW_HANDOFF_SCHEMA,
    issueNumber: issueNum,
    prNumber: prNum,
    title: str(ctx.title) || `Review handoff issue #${issueNum ?? '?'}`,
    businessOutcome: str(ctx.businessOutcome) || 'Delivery packet disposition',
    evidenceSummary: signals.evidencePresent ? 'Evidence referenced in issue/PR' : 'No evidence markers found',
    recommendedAction,
    routeOwner: routing.routeOwner,
    antonRequired: routing.antonRequired,
    antonReason: routing.antonReason,
    routineCorrection: routing.routineCorrection,
    checklist,
  };
}

/**
 * @param {OperatorDecisionPacket} packet
 */
export function formatOperatorDecisionPacketMarkdown(packet) {
  const lines = [
    '## Operator decision packet',
    '',
    `**Issue:** #${packet.issueNumber ?? '?'}`,
    `**PR:** ${packet.prNumber ? `#${packet.prNumber}` : 'none'}`,
    `**Route:** ${packet.routeOwner}`,
    `**Anton required:** ${packet.antonRequired ? `Yes — ${packet.antonReason}` : 'No'}`,
    '',
    `**Business outcome:** ${packet.businessOutcome}`,
    '',
    '### Checklist',
    ...packet.checklist.map((c) => `- ${c}`),
    '',
    `**Recommended action:** ${packet.recommendedAction}`,
    '',
    `**Evidence:** ${packet.evidenceSummary}`,
  ];
  return lines.join('\n');
}
