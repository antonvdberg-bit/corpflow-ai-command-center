import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCompletionReceipt,
  mapForgeResultToDisposition,
  normalizeCompletionReceipt,
  selectLatestAuthoritativeReceipt,
  validateCompletionReceipt,
} from '../lib/server/completion-receipt.js';
import { classifyCursorTerminalOutcome } from '../lib/server/cursor-agent-lifecycle.js';
import { buildForgeCompletionReceipt } from '../lib/forge/task-contracts.js';

const forgeEvidence = {
  contract_name: 'FORGE_VALIDATE_PACKET',
  allowed_files: ['packet.json'],
  deterministic_verifier: 'packet-schema',
  result_artifact: 'PASS',
};

test('explicit CODE_CHANGE evidence becomes VERIFIED_COMPLETE without business validation', () => {
  assert.deepEqual(
    classifyCursorTerminalOutcome({
      executionKind: 'CODE_CHANGE',
      prNumber: 12,
      prUrl: 'https://github.com/example/repo/pull/12',
      headSha: 'abc123',
      ciResult: 'success',
    }),
    { verdict: 'VERIFIED_COMPLETE', reason: 'verified_pr_sha_and_checks' },
  );
});

test('explicit code blocker becomes VERIFIED_BLOCKED', () => {
  assert.equal(
    classifyCursorTerminalOutcome({
      executionKind: 'CODE_CHANGE',
      verifiedBlocker: 'required source file is absent',
    }).verdict,
    'VERIFIED_BLOCKED',
  );
});

test('receipt validation does not require ERP fields for non-business work', () => {
  const result = validateCompletionReceipt(buildCompletionReceipt({
    source_issue: 1358,
    executor: 'CURSOR',
    executor_run_id: 'run-code',
    execution_kind: 'DOCUMENTATION',
    transport_status: 'COMPLETED',
    disposition: 'VERIFIED_COMPLETE',
    evidence_summary: 'changed files and checks recorded',
    protected_actions_not_taken: ['merge', 'deploy'],
    kind_evidence: {
      files: ['docs/example.md'],
      checks: 'focused test passed',
    },
  }));
  assert.equal(result.ok, true);
});

test('Forge PASS and deferred resource share the universal disposition map', () => {
  assert.equal(mapForgeResultToDisposition('PASS'), 'VERIFIED_COMPLETE');
  assert.equal(mapForgeResultToDisposition('DEFERRED_RESOURCE'), 'VERIFIED_BLOCKED');
  assert.equal(buildForgeCompletionReceipt({
    sourceIssue: 1358,
    executorRunId: 'forge-1',
    contractName: 'FORGE_VALIDATE_PACKET',
    allowedFiles: ['packet.json'],
    verifier: 'packet-schema',
    result: 'PASS',
    artifactRef: 'artifact://fixture',
  }).disposition, 'VERIFIED_COMPLETE');
});

test('malformed receipt is normalized from observed facts without replay', () => {
  const normalized = normalizeCompletionReceipt({
    source_issue: 1358,
    executor: 'CURSOR',
    executor_run_id: 'run-normalize',
    execution_kind: 'READ_ONLY_VERIFICATION',
    transport_status: 'COMPLETED',
    disposition: 'VERIFIED_COMPLETE',
    evidence_summary: 'target absent and absence satisfies stop condition',
    protected_actions_not_taken: ['mutation'],
    kind_evidence: {
      source: 'GitHub',
      targets: ['#1428'],
      findings: 'PRIVATE_WBS_READ_BLOCKED',
    },
  });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.normalized, true);
});

test('latest valid receipt supersedes an earlier UNKNOWN receipt', () => {
  const unknown = buildCompletionReceipt({
    source_issue: 1,
    executor: 'CURSOR',
    executor_run_id: 'run-unknown',
    execution_kind: 'CODE_CHANGE',
    transport_status: 'COMPLETED',
    disposition: 'UNKNOWN',
    evidence_summary: 'provider completed without usable artifact',
    protected_actions_not_taken: [],
    kind_evidence: { verified_blocker: 'provider evidence unavailable' },
  });
  const complete = buildCompletionReceipt({
    ...unknown,
    executor_run_id: 'run-complete',
    disposition: 'VERIFIED_COMPLETE',
    evidence_summary: 'PR and checks verified',
    kind_evidence: { branch: 'feat/x', pr_number: 1, head_sha: 'sha' },
  });
  assert.equal(selectLatestAuthoritativeReceipt([unknown, complete]).disposition, 'VERIFIED_COMPLETE');
});
