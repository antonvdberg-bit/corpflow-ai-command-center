import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CURSOR_EXECUTION_TIER_MODELS,
  formatCursorExecutionTierEvidence,
  resolveCursorExecutionTier,
} from '../lib/server/cursor-execution-tier.js';
import { buildFactoryCloudAgentsExecutionEnvelope } from '../lib/server/factory-cloud-agents-executor.js';
import { createCursorCloudAgent } from '../lib/server/cursor-cloud-agent-client.js';

const ISSUE = 1249;
const REPO = 'antonvdberg-bit/corpflow-ai-command-center';

function envelope(comments = []) {
  return buildFactoryCloudAgentsExecutionEnvelope({
    sourceIssue: ISSUE,
    issue: { number: ISSUE, title: 'Bounded control repair', body: '' },
    comments,
    handoffRunId: '123',
    repo: REPO,
  });
}

describe('Cursor execution tier policy (#1249)', () => {
  it('resolves an omitted tier to the only safe default: LOW', () => {
    const resolved = resolveCursorExecutionTier();
    assert.equal(resolved.tier, 'low');
    assert.deepEqual(resolved.model, CURSOR_EXECUTION_TIER_MODELS.low);
  });

  it('fails closed for an unknown tier instead of using a configured default model', () => {
    assert.throws(
      () => resolveCursorExecutionTier({ tier: 'ultra' }),
      /CURSOR_EXECUTION_TIER_INVALID/,
    );
  });

  it('requires durable controller justification before MEDIUM resolves', () => {
    assert.throws(
      () => resolveCursorExecutionTier({ tier: 'medium', sourceIssue: ISSUE, comments: [] }),
      /CURSOR_EXECUTION_TIER_MEDIUM_JUSTIFICATION_REQUIRED/,
    );
    const comments = [{
      author: 'github-actions[bot]',
      body: formatCursorExecutionTierEvidence({
        source_issue: ISSUE,
        tier: 'medium',
        controller_justification: 'The source issue requires bounded cross-file reasoning.',
      }),
    }];
    assert.equal(envelope(comments).execution_tier, 'medium');
  });

  it('fails closed for HIGH without an explicit durable authorization', () => {
    const comments = [{
      author: 'antonvdberg-bit',
      body: formatCursorExecutionTierEvidence({
        source_issue: ISSUE,
        tier: 'high',
        controller_justification: 'Exception requested for a high-complexity source issue.',
      }),
    }];
    assert.throws(() => envelope(comments), /CURSOR_EXECUTION_TIER_HIGH_AUTHORIZATION_REQUIRED/);
  });

  it('maps an explicitly authorized HIGH exception to its single model selection', () => {
    const comments = [{
      author: 'antonvdberg-bit',
      body: formatCursorExecutionTierEvidence({
        source_issue: ISSUE,
        tier: 'high',
        controller_justification: 'An explicitly approved exception requires high reasoning.',
        authorization: 'approved',
      }),
    }];
    const resolved = resolveCursorExecutionTier({ sourceIssue: ISSUE, comments });
    assert.equal(resolved.tier, 'high');
    assert.deepEqual(resolved.model, CURSOR_EXECUTION_TIER_MODELS.high);
  });

  it('places exactly one explicit approved model selection in every factory create payload', () => {
    const payload = envelope().create_payload;
    assert.deepEqual(payload.model, CURSOR_EXECUTION_TIER_MODELS.low);
    assert.equal(Object.keys(payload).filter((key) => key === 'model').length, 1);
    assert.equal(Array.isArray(payload.model), false);
  });

  it('refuses an API create request that lacks an explicit model', async () => {
    await assert.rejects(
      () => createCursorCloudAgent('test-key', { prompt: { text: 'test' } }),
      /requires one explicit model selection/,
    );
  });
});
