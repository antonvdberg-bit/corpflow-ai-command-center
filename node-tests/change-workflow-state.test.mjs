import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deriveWorkflowState } from '../lib/cmp/_lib/change-workflow-state.js';

test('deriveWorkflowState: Closed row yields published even if client_view stuck in_review', () => {
  const consoleJson = {
    client_view: {
      workflow_state: 'in_review',
      automation: { preview_url: 'https://x.vercel.app', dispatch_ok: true },
      preview_review: { decision: 'approve' },
    },
    promotion: { pr_number: 1, merged: false },
  };
  const wf = deriveWorkflowState({
    status: 'Closed',
    stage: 'Closed',
    consoleJson,
  });
  assert.equal(wf, 'published');
});

test('deriveWorkflowState: hard_close closure stays closed', () => {
  const wf = deriveWorkflowState({
    status: 'Closed',
    stage: 'Closed',
    consoleJson: {
      client_view: {
        workflow_state: 'closed',
        closure: { kind: 'hard_close' },
      },
    },
  });
  assert.equal(wf, 'closed');
});
