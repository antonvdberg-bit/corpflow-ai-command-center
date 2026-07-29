import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCiFailurePacket,
  buildFailureFingerprint,
  evaluateCiRepairGate,
  evaluateObsoleteFailureSuppression,
  evaluateRepairAttemptLimits,
  extractFailingTestNames,
  extractMeaningfulFailureContext,
  formatCiFailureFollowUpPrompt,
  recordRepairAttempt,
  redactSecrets,
  stripGenericRunnerNoise,
} from '../lib/server/ci-failure-cursor-supervisor.js';
import {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
  parseCursorOriginMetadataFromText,
  resolveCursorOriginMetadata,
} from '../lib/server/cursor-origin-metadata.js';
import {
  createCursorAgentFollowUpRun,
  extractCursorAgentIdFromText,
  extractCursorGitDetails,
} from '../lib/server/cursor-cloud-agent-client.js';
import {
  DISPATCH_LABEL_CLAIMED,
  DISPATCH_LABEL_CI_REPAIR,
  ensureDispatchLifecycleLabels,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import { evaluateActivationCostGate, normalizeCostUsageState } from '../lib/server/agent-cost-controls.js';
import {
  detectCompletionSignals,
  buildOperatorDecisionPacket,
} from '../lib/server/operator-review-handoff.js';

const FAILED_SHA = 'aa13a902652d956d78dfaa64c22ff4639a06d4d9';
const REPAIRED_SHA = 'b7f6e006aa1aea81fe119b0524430d54c7f14981';

const SAMPLE_NODE_TEST_LOG = `
(node:123) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file is not specified
# Subtest: AI Lead Rescue intro video
    # Subtest: places a native metadata-only player on the AI Lead Rescue landing after the hero
    not ok 2 - places a native metadata-only player on the AI Lead Rescue landing after the hero
      ---
      duration_ms: 1.2
      location: '/workspace/node-tests/lead-rescue-intro-video.test.mjs:37:3'
      failureType: 'testCodeFailure'
      error: |-
        AssertionError [ERR_ASSERTION]: Expected values to be strictly equal
      code: 'ERR_ASSERTION'
      name: 'AssertionError'
      stack: |-
        TestContext.<anonymous> (file:///workspace/node-tests/lead-rescue-intro-video.test.mjs:40:12)
      ...
not ok 1 - AI Lead Rescue intro video
`;

describe('ci-failure-cursor-supervisor hardening (#667)', () => {
  it('builds a sanitised failure packet for the #665 incident shape', () => {
    const packet = buildCiFailurePacket({
      repo: 'antonvdberg-bit/corpflow-ai-command-center',
      sourceIssue: 653,
      prNumber: 665,
      prUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/665',
      branch: 'cursor/dispatcher-issue-653-aa11',
      headSha: FAILED_SHA,
      currentPrHeadSha: REPAIRED_SHA,
      workflowName: 'Agent CI',
      workflowRunId: '30417364180',
      workflowRunUrl:
        'https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/30417364180',
      failedJob: 'test',
      failedStep: 'Node dependencies + automation unit tests',
      logExcerpt: SAMPLE_NODE_TEST_LOG + ' CURSOR_API_KEY=super-secret-value Authorization: Bearer abc.def',
      cursorAgentId: 'bc-31b05fb8-f550-4115-a6e7-41d2be508ca7',
      cursorRunId: 'run-264d8d44-392c-4372-a529-434cdfca5740',
    });
    assert.equal(packet.headSha, FAILED_SHA);
    assert.equal(packet.currentPrHeadSha, REPAIRED_SHA);
    assert.equal(packet.failingTestFile, 'node-tests/lead-rescue-intro-video.test.mjs');
    assert.match(packet.assertionExcerpt || '', /AssertionError/);
    assert.equal(packet.errorCategory, 'assertion_mismatch');
    assert.doesNotMatch(packet.logExcerpt, /super-secret-value/);
    assert.doesNotMatch(packet.logExcerpt, /Bearer abc/);
    assert.doesNotMatch(packet.logExcerpt, /MODULE_TYPELESS_PACKAGE_JSON/);
    assert.match(formatCiFailureFollowUpPrompt(packet), /Failed head SHA: aa13a902/);
    assert.match(formatCiFailureFollowUpPrompt(packet), /lead-rescue-intro-video/);
  });

  it('suppresses obsolete failure when PR head advanced (repaired-head mismatch)', () => {
    const result = evaluateObsoleteFailureSuppression({
      failedHeadSha: FAILED_SHA,
      currentPrHeadSha: REPAIRED_SHA,
      prState: 'open',
      workflowRunId: '30417364180',
    });
    assert.equal(result.suppress, true);
    assert.equal(result.reason, 'obsolete_head_advanced');
  });

  it('suppresses when a later Agent CI run is green', () => {
    const result = evaluateObsoleteFailureSuppression({
      failedHeadSha: FAILED_SHA,
      currentPrHeadSha: FAILED_SHA,
      prState: 'open',
      workflowRunId: '30417364180',
      laterAgentCiRuns: [
        {
          id: '30419947823',
          conclusion: 'success',
          headSha: REPAIRED_SHA,
          createdAt: '2026-07-29T03:34:44Z',
        },
      ],
    });
    assert.equal(result.suppress, true);
    assert.equal(result.reason, 'later_ci_green');
  });

  it('suppresses when PR is closed/merged or source issue is closed', () => {
    assert.equal(
      evaluateObsoleteFailureSuppression({ prState: 'closed', failedHeadSha: FAILED_SHA }).reason,
      'pr_closed_or_merged',
    );
    assert.equal(
      evaluateObsoleteFailureSuppression({
        prState: 'open',
        prMerged: true,
        failedHeadSha: FAILED_SHA,
      }).reason,
      'pr_closed_or_merged',
    );
    assert.equal(
      evaluateObsoleteFailureSuppression({
        prState: 'open',
        failedHeadSha: FAILED_SHA,
        currentPrHeadSha: FAILED_SHA,
        sourceIssueState: 'closed',
      }).reason,
      'source_issue_closed',
    );
  });

  it('does not suppress a current failure on the same head with no later green', () => {
    const result = evaluateObsoleteFailureSuppression({
      failedHeadSha: FAILED_SHA,
      currentPrHeadSha: FAILED_SHA,
      prState: 'open',
      sourceIssueState: 'open',
      workflowRunId: '30417364180',
      laterAgentCiRuns: [],
    });
    assert.equal(result.suppress, false);
    assert.equal(result.reason, 'current');
  });

  it('extracts meaningful failing test file, suite/subtest, and assertion — not runner warnings only', () => {
    const ctx = extractMeaningfulFailureContext(SAMPLE_NODE_TEST_LOG);
    assert.equal(ctx.failingTestFile, 'node-tests/lead-rescue-intro-video.test.mjs');
    assert.match(ctx.suite || '', /AI Lead Rescue intro video|places a native/);
    assert.match(ctx.assertionExcerpt || '', /AssertionError|ERR_ASSERTION/);
    assert.ok(ctx.failingTests.some((t) => /lead-rescue-intro-video|places a native/.test(t)));
    assert.doesNotMatch(ctx.logExcerpt, /MODULE_TYPELESS_PACKAGE_JSON/);

    const noiseOnly = extractMeaningfulFailureContext(
      '(node:1) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file\n',
    );
    assert.equal(noiseOnly.failingTestFile, null);
    assert.equal(noiseOnly.logExcerpt, '');
    assert.equal(stripGenericRunnerNoise('warn MODULE_TYPELESS_PACKAGE_JSON\nok').includes('ok'), true);
  });

  it('dedupes identical fingerprints and escalates after max attempts', () => {
    const origin = buildCursorOriginMetadata({
      sourceIssue: 653,
      cursorAgentId: 'bc-31b05fb8-f550-4115-a6e7-41d2be508ca7',
      cursorRunId: 'run-264d8d44-392c-4372-a529-434cdfca5740',
      followUpAttemptCount: 0,
    });
    const packet = buildCiFailurePacket({
      prNumber: 665,
      headSha: FAILED_SHA,
      workflowRunId: '30417364180',
      workflowName: 'Agent CI',
      failedStep: 'Node dependencies + automation unit tests',
      failingTests: ['node-tests/lead-rescue-intro-video.test.mjs'],
      errorCategory: 'assertion_mismatch',
      cursorAgentId: origin.cursorAgentId,
      cursorRunId: origin.cursorRunId,
    });
    const gate = evaluateCiRepairGate({
      workflowConclusion: 'failure',
      workflowName: 'Agent CI',
      prState: 'open',
      origin,
    });
    assert.equal(gate.allow, true);

    let state = recordRepairAttempt({}, packet, { agentId: origin.cursorAgentId });
    const dup = evaluateRepairAttemptLimits({ packet, origin, repairState: state });
    assert.equal(dup.allow, false);
    assert.equal(dup.reason, 'duplicate_fingerprint');

    const packet2 = buildCiFailurePacket({
      ...packet,
      workflowRunId: '30417364181',
      headSha: 'aa13a902b',
      failureFingerprint: buildFailureFingerprint({
        workflowName: 'Agent CI',
        workflowRunId: '30417364181',
        headSha: 'aa13a902b',
        failedStep: packet.failedStep,
        failingTests: packet.failingTests,
        errorCategory: packet.errorCategory,
      }),
    });
    state = recordRepairAttempt(state, packet2, {});
    const packet3 = buildCiFailurePacket({
      ...packet,
      workflowRunId: '30417364182',
      headSha: 'aa13a902c',
      failureFingerprint: 'ffffffffffffffffffffffff',
    });
    const exhausted = evaluateRepairAttemptLimits({
      packet: packet3,
      origin: { ...origin, followUpAttemptCount: 2 },
      repairState: { ...state, attemptsByPr: { '665': 2 }, fingerprintsSent: state.fingerprintsSent },
      maxAttempts: 2,
    });
    assert.equal(exhausted.allow, false);
    assert.equal(exhausted.escalate, true);
  });

  it('extractFailingTestNames remains compatible', () => {
    const names = extractFailingTestNames(SAMPLE_NODE_TEST_LOG);
    assert.ok(names.some((n) => /lead-rescue-intro-video|AI Lead Rescue/.test(n)));
  });

  it('redacts secret-like strings', () => {
    assert.equal(redactSecrets('CURSOR_API_KEY=abcd1234'), 'CURSOR_API_KEY=***');
  });
});

describe('cursor-origin-metadata', () => {
  it('round-trips marker comments and recovers Cursor run ID as well as agent ID', () => {
    const meta = buildCursorOriginMetadata({
      sourceIssue: 653,
      cursorAgentId: 'bc-31b05fb8-f550-4115-a6e7-41d2be508ca7',
      cursorRunId: 'run-264d8d44-392c-4372-a529-434cdfca5740',
      activationWorkflowRunId: '30417073566',
      prNumber: 665,
      branch: 'cursor/dispatcher-issue-653-aa11',
    });
    const comment = formatCursorOriginMetadataComment(meta);
    const parsed = parseCursorOriginMetadataFromText(comment);
    assert.equal(parsed?.cursorAgentId, meta.cursorAgentId);
    assert.equal(parsed?.cursorRunId, meta.cursorRunId);
    assert.equal(parsed?.sourceIssue, 653);

    const resolved = resolveCursorOriginMetadata({
      prBody:
        'Tracks #653 <a href="https://cursor.com/agents/bc-31b05fb8-f550-4115-a6e7-41d2be508ca7">open</a>',
      comments: [
        {
          body: 'CURSOR DISPATCH ACTIVATED\n\nCursor run identifier: run-264d8d44-392c-4372-a529-434cdfca5740\n',
        },
      ],
      prNumber: 665,
    });
    assert.equal(resolved.cursorAgentId, 'bc-31b05fb8-f550-4115-a6e7-41d2be508ca7');
    assert.equal(resolved.cursorRunId, 'run-264d8d44-392c-4372-a529-434cdfca5740');
    assert.equal(resolved.sourceIssue, 653);
  });
});

describe('cursor follow-up client', () => {
  it('POSTs /v1/agents/{id}/runs for follow-up', async () => {
    /** @type {string[]} */
    const urls = [];
    const result = await createCursorAgentFollowUpRun(
      'test-key',
      'bc-31b05fb8-f550-4115-a6e7-41d2be508ca7',
      { text: 'fix CI' },
      {
        fetch: async (url, init) => {
          urls.push(String(url));
          assert.equal(init.method, 'POST');
          const body = JSON.parse(String(init.body));
          assert.equal(body.prompt.text, 'fix CI');
          return {
            ok: true,
            status: 200,
            async text() {
              return JSON.stringify({
                id: 'run-followup-1',
                agentId: 'bc-31b05fb8-f550-4115-a6e7-41d2be508ca7',
                status: 'CREATING',
              });
            },
          };
        },
      },
    );
    assert.match(urls[0], /\/v1\/agents\/bc-31b05fb8-f550-4115-a6e7-41d2be508ca7\/runs$/);
    assert.equal(extractCursorGitDetails(result).runId, 'run-followup-1');
    assert.equal(
      extractCursorAgentIdFromText('see bc-31b05fb8-f550-4115-a6e7-41d2be508ca7'),
      'bc-31b05fb8-f550-4115-a6e7-41d2be508ca7',
    );
  });
});

describe('lifecycle label ensure', () => {
  it('auto-creates missing claim labels', async () => {
    const existing = new Set(['dispatch:cursor-ready']);
    const created = [];
    const fetchFn = async (url, init = {}) => {
      const u = String(url);
      if (u.includes('/labels') && (!init.method || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify([...existing].map((name) => ({ name })));
          },
        };
      }
      if (u.endsWith('/labels') && init.method === 'POST') {
        const body = JSON.parse(String(init.body));
        existing.add(body.name);
        created.push(body.name);
        return { ok: true, status: 201, async text() { return JSON.stringify(body); } };
      }
      throw new Error(`unexpected ${init.method} ${u}`);
    };
    const result = await ensureDispatchLifecycleLabels('tok', 'o/r', fetchFn);
    assert.ok(created.includes(DISPATCH_LABEL_CLAIMED));
    assert.ok(created.includes(DISPATCH_LABEL_CI_REPAIR));
    assert.equal(result.ok, true);
  });
});

describe('operator review + cost controls', () => {
  it('routes tests_failed to cursor and builds green review packet', () => {
    const failed = detectCompletionSignals({
      pr: { number: 665, checksPassing: false, linkedIssue: 653 },
    });
    failed.testsPassing = false;
    failed.kind = 'tests_failed';
    failed.issueNumber = 653;
    failed.prNumber = 665;
    const packet = buildOperatorDecisionPacket(failed, { title: 'Lead Rescue' });
    assert.equal(packet.routeOwner, 'cursor');

    const green = detectCompletionSignals({
      pr: { number: 665, checksPassing: true, linkedIssue: 653 },
    });
    green.testsPassing = true;
    green.kind = 'implementation_complete';
    green.issueNumber = 653;
    green.prNumber = 665;
    green.evidencePresent = true;
    const review = buildOperatorDecisionPacket(green, {
      title: 'Lead Rescue',
      businessOutcome: 'CI green',
    });
    assert.ok(review.schema);
  });

  it('cost gate blocks duplicate activations', () => {
    const state = normalizeCostUsageState({
      cursorActivations: 1,
      entries: [
        {
          provider: 'cursor',
          dedupeKey: 'ci-repair:pr:665:abc',
          objectRef: 'pr:665',
          category: 'ci-repair',
          activatedAt: new Date().toISOString(),
          issueNumber: 653,
        },
      ],
    });
    const gate = evaluateActivationCostGate(
      {
        provider: 'cursor',
        dedupeKey: 'ci-repair:pr:665:abc',
        objectRef: 'pr:665',
        category: 'ci-repair',
        issueNumber: 653,
      },
      state,
      [],
    );
    assert.equal(gate.allowed, false);
  });
});
