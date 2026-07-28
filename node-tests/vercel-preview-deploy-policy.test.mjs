import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveVercelPreviewDeployDecision } from '../lib/server/vercel-preview-deploy-policy.js';

test('production and main always build', () => {
  assert.equal(resolveVercelPreviewDeployDecision({ vercelEnv: 'production', gitRef: 'feat/x' }).build, true);
  assert.equal(resolveVercelPreviewDeployDecision({ vercelEnv: 'preview', gitRef: 'main' }).build, true);
});

test('ordinary cursor branches remain skipped (PR #635 doctrine)', () => {
  const d = resolveVercelPreviewDeployDecision({
    vercelEnv: 'preview',
    gitRef: 'cursor/lux-missing-page-content-5e86',
    commitMessage: 'feat: something',
  });
  assert.equal(d.build, false);
  assert.equal(d.reason, 'non_production_preview_skipped');
});

test('cipc-desk workstream branches are allowlisted', () => {
  const d = resolveVercelPreviewDeployDecision({
    vercelEnv: 'preview',
    gitRef: 'cursor/cipc-desk-first-visible-slice-029b',
  });
  assert.equal(d.build, true);
  assert.equal(d.reason, 'cipc_desk_preview_allowlist');
});

test('commit message [allow-vercel-preview] opts in without widening default allowlist', () => {
  const d = resolveVercelPreviewDeployDecision({
    vercelEnv: 'preview',
    gitRef: 'cursor/some-other-branch',
    commitMessage: 'chore: verify layout [allow-vercel-preview]',
  });
  assert.equal(d.build, true);
  assert.equal(d.reason, 'commit_message_opt_in');
});
