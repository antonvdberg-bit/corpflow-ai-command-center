import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CURSOR_EXECUTION_TIER_CONTRACTS,
  formatCursorExecutionTierEvidence,
  resolveCursorExecutionModelSelection,
  resolveCursorExecutionTier,
} from '../lib/server/cursor-execution-tier.js';
import { createCursorCloudAgent } from '../lib/server/cursor-cloud-agent-client.js';

const ISSUE = 1249;
const REPO = 'antonvdberg-bit/corpflow-ai-command-center';

describe('Cursor execution tier policy (#1249)', () => {
  it('resolves an omitted tier to the only safe default: LOW', () => {
    const resolved = resolveCursorExecutionTier();
    assert.equal(resolved.tier, 'low');
    assert.deepEqual(resolved.contract, CURSOR_EXECUTION_TIER_CONTRACTS.low);
  });

  it('resolves a LOW selection from live machine variants without display names', () => {
    const selection = resolveCursorExecutionModelSelection({
      items: [{
        id: 'gpt-5.6-renamed',
        displayName: 'Completely stale UI name',
        variants: [
          { params: [{ id: 'effort', value: 'medium' }, { id: 'fast', value: 'true' }] },
          { params: [{ id: 'effort', value: 'medium' }, { id: 'fast', value: 'false' }] },
        ],
      }],
    });
    assert.deepEqual(selection.model, {
      id: 'gpt-5.6-renamed',
      params: [{ id: 'effort', value: 'medium' }, { id: 'fast', value: 'false' }],
    });
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
      author: 'github-actions',
      body: formatCursorExecutionTierEvidence({
        source_issue: ISSUE,
        tier: 'medium',
        controller_justification: 'The source issue requires bounded cross-file reasoning.',
      }),
    }];
    assert.equal(resolveCursorExecutionTier({ tier: 'medium', sourceIssue: ISSUE, comments }).tier, 'medium');
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
    assert.throws(
      () => resolveCursorExecutionTier({ tier: 'high', sourceIssue: ISSUE, comments }),
      /CURSOR_EXECUTION_TIER_HIGH_AUTHORIZATION_REQUIRED/,
    );
  });

  it('permits an explicitly authorized HIGH behavior contract', () => {
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
    assert.deepEqual(resolved.contract, CURSOR_EXECUTION_TIER_CONTRACTS.high);
  });

  it('refuses an API create request that lacks an explicit model', async () => {
    await assert.rejects(
      () => createCursorCloudAgent('test-key', { prompt: { text: 'test' } }),
      /requires one live catalogue-resolved explicit model selection/,
    );
  });

  it('rejects an arbitrary caller-created model payload', async () => {
    await assert.rejects(
      () =>
        createCursorCloudAgent('test-key', {
          prompt: { text: 'test' },
          model: { id: 'not-an-approved-model', params: [] },
        }),
      /requires one live catalogue-resolved explicit model selection/,
    );
  });

  it('fails closed instead of escalating LOW when no compliant variant exists', () => {
    assert.throws(
      () =>
        resolveCursorExecutionModelSelection({
          items: [{ id: 'gpt-5.6-renamed', variants: [{ params: [{ id: 'effort', value: 'high' }] }] }],
        }),
      /CURSOR_EXECUTION_TIER_NO_COMPLIANT_LOW_MODEL_SELECTION/,
    );
  });
});
