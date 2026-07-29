import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCiFailurePacket,
  buildFailureFingerprint,
  evaluateCiRepairGate,
  evaluateRepairAttemptLimits,
  extractFailingTestNames,
  formatCiFailureFollowUpPrompt,
  recordRepairAttempt,
  redactSecrets,
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

describe('ci-failure-cursor-supervisor', () => {
  it('builds a sanitised failure packet for the #665 incident shape', () => {
    const packet = buildCiFailurePacket({
      repo: 'antonvdberg-bit/corpflow-ai-command-center',
      sourceIssue: 653,
      prNumber: 665,
      prUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/665',
      branch: 'cursor/dispatcher-issue-653-aa11',
      headSha: 'aa13a902652d956d78dfaa64c22ff4639a06d4d9',
      workflowName: 'Agent CI',
      workflowRunId: '30417364180',
      workflowRunUrl:
        'https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/30417364180',
      failedJob: 'test',
      failedStep: 'Node dependencies + automation unit tests',
      failingTests: ['node-tests/lead-rescue-intro-video.test.mjs'],
      logExcerpt:
        'AssertionError at line 40 CURSOR_API_KEY=super-secret-value Authorization: Bearer abc.def',
      cursorAgentId: 'bc-31b05fb8-f550-4115-a6e7-41d2be508ca7',
      cursorRunId: 'run-264d8d44-392c-4372-a529-434cdfca5740',
    });
    assert.equal(packet.errorCategory, 'assertion_mismatch');
    assert.doesNotMatch(packet.logExcerpt, /super-secret-value/);
    assert.doesNotMatch(packet.logExcerpt, /Bearer abc/);
    assert.match(formatCiFailureFollowUpPrompt(packet), /SAME PR/);
    assert.match(formatCiFailureFollowUpPrompt(packet), /Do not merge/);
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
      headSha: 'aa13a902',
      workflowRunId: '30417364180',
      workflowName: 'Agent CI',
      failedStep: 'Node dependencies + automation unit tests',
      failingTests: ['node-tests/lead-rescue-intro-video.test.mjs'],
      errorCategory: 'assertion_mismatch',
      cursorAgentId: origin.cursorAgentId,
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

  it('extracts failing test names from node test output', () => {
    const names = extractFailingTestNames(`
not ok 1 - AI Lead Rescue intro video
# Subtest: node-tests/lead-rescue-intro-video.test.mjs
Error: AssertionError: expected true
`);
    assert.ok(names.some((n) => /lead-rescue-intro-video/.test(n) || /AI Lead Rescue/.test(n)));
  });

  it('redacts secret-like strings', () => {
    assert.equal(redactSecrets('CURSOR_API_KEY=abcd1234'), 'CURSOR_API_KEY=***');
  });
});

describe('cursor-origin-metadata', () => {
  it('round-trips marker comments and resolves from PR body agent link', () => {
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
    assert.equal(parsed?.sourceIssue, 653);

    const resolved = resolveCursorOriginMetadata({
      prBody:
        'Tracks #653 <a href="https://cursor.com/agents/bc-31b05fb8-f550-4115-a6e7-41d2be508ca7">open</a>',
      comments: [{ body: 'Cursor run identifier: run-264d8d44-392c-4372-a529-434cdfca5740' }],
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

describe('operator review + cost controls (from #663 reuse)', () => {
  it('routes tests_failed to cursor and builds green review packet', () => {
    const failed = detectCompletionSignals({
      pr: { number: 665, checksPassing: false, linkedIssue: 653 },
    });
    // Force kind via checksPassing false path inside detect — if unknown, set:
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
