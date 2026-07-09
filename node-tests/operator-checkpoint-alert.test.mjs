import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ALLOWED_OPERATOR_CHECKPOINT_KINDS,
  OPERATOR_CHECKPOINT_KINDS,
  formatOperatorCheckpointMessage,
  isOperatorCheckpointAlertPathConfigured,
  notifyOperatorCheckpoint,
} from '../lib/server/operator-checkpoint-alert.js';

describe('operator-checkpoint-alert', () => {
  it('formats the canonical checkpoint message', () => {
    const text = formatOperatorCheckpointMessage({
      kind: OPERATOR_CHECKPOINT_KINDS.CLIENT_APPROVAL_NEEDED,
      whatNeedsApproval: 'Client preview decision on ticket abc123',
      link: 'https://lux.corpflowai.com/change?ticket=abc123',
      risk: 'Delivery stalls until client approves.',
    });

    assert.match(text, /^CorpFlowAI checkpoint:/);
    assert.match(text, /What needs approval: Client preview decision on ticket abc123/);
    assert.match(text, /Link: https:\/\/lux\.corpflowai\.com\/change\?ticket=abc123/);
    assert.match(text, /Risk: Delivery stalls until client approves\./);
    assert.match(text, /Required answer: APPROVE \/ HOLD \/ FIX/);
  });

  it('allows only the four checkpoint kinds', () => {
    assert.equal(ALLOWED_OPERATOR_CHECKPOINT_KINDS.size, 4);
    assert.ok(ALLOWED_OPERATOR_CHECKPOINT_KINDS.has('production_validation_failure'));
    assert.ok(ALLOWED_OPERATOR_CHECKPOINT_KINDS.has('client_approval_needed'));
    assert.ok(ALLOWED_OPERATOR_CHECKPOINT_KINDS.has('production_approval_needed'));
    assert.ok(ALLOWED_OPERATOR_CHECKPOINT_KINDS.has('external_email_client_send_approval_needed'));
  });

  it('notifyOperatorCheckpoint is a no-op when n8n forward URL is unset', async () => {
    const prev = process.env.CORPFLOW_AUTOMATION_FORWARD_URL;
    delete process.env.CORPFLOW_AUTOMATION_FORWARD_URL;
    try {
      assert.equal(isOperatorCheckpointAlertPathConfigured(), false);
      const sent = await notifyOperatorCheckpoint({
        kind: OPERATOR_CHECKPOINT_KINDS.PRODUCTION_APPROVAL_NEEDED,
        whatNeedsApproval: 'Promote merge after client approval',
        link: 'https://lux.corpflowai.com/change?ticket=t1',
      });
      assert.equal(sent, false);
    } finally {
      if (prev != null) process.env.CORPFLOW_AUTOMATION_FORWARD_URL = prev;
    }
  });

  it('rejects unknown checkpoint kinds', async () => {
    const sent = await notifyOperatorCheckpoint({
      kind: 'random_monitor_noise',
      whatNeedsApproval: 'Should not send',
      link: 'https://example.com',
    });
    assert.equal(sent, false);
  });
});
