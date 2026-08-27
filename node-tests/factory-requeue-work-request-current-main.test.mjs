import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatCursorApiErrorDetail,
} from '../lib/server/cursor-cloud-agent-client.js';
import {
  buildFactoryCloudAgentsExecutionEnvelope,
} from '../lib/server/factory-cloud-agents-executor.js';
import {
  formatAiWorkRequestComment,
} from '../lib/server/ai-work-request-lifecycle.js';

const REPO = 'antonvdberg-bit/corpflow-ai-command-center';
const ISSUE = 1127;
const GEN1_WORK_REQUEST = 'cfai-wr-ae81c507-4f8d-4be6-a4e6-3de682b5c651';
const GEN3_WORK_REQUEST = 'cfai-wr-67c94885-124a-4a89-93f3-84ff364615e3';

function requestComment(workRequestId, createdAt) {
  return {
    created_at: createdAt,
    author: 'github-actions[bot]',
    body: formatAiWorkRequestComment({
      work_request_id: workRequestId,
      source_issue: ISSUE,
      origin_controller: 'factory_handoff',
      requested_at: createdAt,
      requested_outcome: 'Lead Rescue + Website Rescue buyer-path current-main repair',
      status: 'REQUESTED',
      protected_action_required: false,
    }),
  };
}

function requeueComment(createdAt = '2026-08-27T06:58:05.634Z') {
  return {
    created_at: createdAt,
    author: 'antonvdberg-bit',
    author_association: 'OWNER',
    body: 'CURSOR REQUEUE — CURRENT-MAIN REPAIR\n\nExplicit new attempt authorized. Prior activation must not resume.',
  };
}

function buildEnvelope(comments) {
  return buildFactoryCloudAgentsExecutionEnvelope({
    sourceIssue: ISSUE,
    issue: {
      number: ISSUE,
      title: 'P0 Revenue acceptance — Lead Rescue + Website Rescue buyer-path current-main verification',
      body: 'No schema, env/secrets, payment, send, or public launch.',
    },
    comments,
    handoffRunId: '33047796505',
    repo: REPO,
  });
}

describe('Cloud Agents work-request identity after CURSOR REQUEUE', () => {
  it('does not reuse a retired generation work_request_id', () => {
    const envelope = buildEnvelope([
      requestComment(GEN1_WORK_REQUEST, '2026-08-27T02:58:00.731Z'),
      requeueComment(),
    ]);

    assert.equal(envelope.request_was_created, true);
    assert.notEqual(envelope.work_request_id, GEN1_WORK_REQUEST);
    assert.notEqual(
      envelope.create_payload.agentId,
      GEN1_WORK_REQUEST.replace(/^cfai-wr-/i, 'bc-'),
    );
    assert.match(envelope.work_request_id, /^cfai-wr-/);
    assert.equal(
      envelope.create_payload.agentId,
      envelope.work_request_id.replace(/^cfai-wr-/i, 'bc-'),
    );
  });

  it('reuses a request created inside the current generation', () => {
    const envelope = buildEnvelope([
      requestComment(GEN1_WORK_REQUEST, '2026-08-27T02:58:00.731Z'),
      requeueComment('2026-08-27T06:58:05.634Z'),
      requestComment(GEN3_WORK_REQUEST, '2026-08-27T06:58:07.000Z'),
    ]);

    assert.equal(envelope.request_was_created, false);
    assert.equal(envelope.work_request_id, GEN3_WORK_REQUEST);
    assert.equal(
      envelope.create_payload.agentId,
      GEN3_WORK_REQUEST.replace(/^cfai-wr-/i, 'bc-'),
    );
  });

  it('renders structured Cursor API errors instead of [object Object]', () => {
    assert.equal(
      formatCursorApiErrorDetail({ error: { code: 'agent_exists', retryable: false } }, ''),
      '{"code":"agent_exists","retryable":false}',
    );
  });
});
