import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getCursorCloudAgentRun,
} from '../lib/server/cursor-cloud-agent-client.js';
import {
  buildCloudAgentsExecutorEvidence,
  buildCloudAgentsWorkStatus,
  buildFactoryCloudAgentsExecutionEnvelope,
  findKnownCloudAgentsExecutorEvidence,
  formatCloudAgentsExecutorEvidence,
  redactCloudAgentsFailure,
  validateCloudAgentCreateResponse,
} from '../lib/server/factory-cloud-agents-executor.js';
import {
  acquireCursorIssueActivationClaim,
} from '../lib/server/cursor-activation-claim.js';
import {
  DISPATCH_LIFECYCLE_LABELS,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';

const request = {
  body: `<!-- corpflow.ai_work_request.v1 {"schema":"corpflow.ai_work_request.v1","work_request_id":"cfai-wr-12345678-1234-4234-9234-123456789abc","source_issue":1062,"origin_controller":"test","requested_at":"2026-08-25T00:00:00.000Z","requested_outcome":"Repair factory transport","status":"REQUESTED","protected_action_required":false} -->`,
  number: 1062,
  title: 'Repair transport',
};

describe('Factory Cloud Agents executor', () => {
  it('polls the documented run endpoint, not durable agent metadata', async () => {
    let requested = '';
    await getCursorCloudAgentRun(
      'test-key',
      'bc-12345678-1234-1234-8234-123456789abc',
      'run-123',
      {
        fetch: async (url) => {
          requested = String(url);
          return new Response(JSON.stringify({ id: 'run-123', status: 'RUNNING' }), {
            status: 200,
          });
        },
      },
    );
    assert.equal(
      requested,
      'https://api.cursor.com/v1/agents/bc-12345678-1234-1234-8234-123456789abc/runs/run-123',
    );
  });

  it('preserves source issue, work request, handoff and protected constraints in a bounded prompt', () => {
    const envelope = buildFactoryCloudAgentsExecutionEnvelope({
      issue: request,
      comments: [],
      handoffRunId: '32800850448',
      repo: 'antonvdberg-bit/corpflow-ai-command-center',
    });
    assert.equal(envelope.source_issue, 1062);
    assert.equal(envelope.work_request_id, 'cfai-wr-12345678-1234-4234-9234-123456789abc');
    assert.match(envelope.create_payload.prompt.text, /Handoff run ID: 32800850448/);
    assert.match(envelope.create_payload.prompt.text, /Do not merge, deploy, change secrets\/env/);
    assert.equal(
      envelope.create_payload.agentId,
      'bc-12345678-1234-4234-9234-123456789abc',
    );
  });

  it('creates a stable work request when the source issue has none', () => {
    const envelope = buildFactoryCloudAgentsExecutionEnvelope({
      issue: { number: 5, title: 'Synthetic packet', body: '' },
      comments: [],
      handoffRunId: '99',
      repo: 'antonvdberg-bit/corpflow-ai-command-center',
    });
    assert.equal(envelope.request_was_created, true);
    assert.match(envelope.work_request_id, /^cfai-wr-/);
  });

  it('does not accept an HTTP-success response without a valid concrete agent identity', () => {
    const result = validateCloudAgentCreateResponse({ agent: {}, run: { id: 'run-test' } });
    assert.deepEqual(result.ok, false);
    const envelope = buildFactoryCloudAgentsExecutionEnvelope({
      issue: request,
      comments: [],
      handoffRunId: '1',
      repo: 'antonvdberg-bit/corpflow-ai-command-center',
    });
    assert.equal(buildCloudAgentsWorkStatus(envelope, { apiResult: {} }).status, 'BLOCKED');
  });

  it('maps a valid create response to IN_PROGRESS with known agent/run IDs', () => {
    const apiResult = {
      agent: { id: 'bc-12345678-1234-1234-8234-123456789abc' },
      run: { id: 'run-123456', agentId: 'bc-12345678-1234-1234-8234-123456789abc' },
    };
    const validated = validateCloudAgentCreateResponse(apiResult);
    assert.equal(validated.ok, true);
    const envelope = buildFactoryCloudAgentsExecutionEnvelope({
      issue: request,
      comments: [],
      handoffRunId: '1',
      repo: 'antonvdberg-bit/corpflow-ai-command-center',
    });
    const status = buildCloudAgentsWorkStatus(envelope, { apiResult });
    assert.equal(status.status, 'IN_PROGRESS');
    assert.equal(status.cursor_agent_id, validated.details.agentId);
  });

  it('poll discovery accepts only correlated Cloud Agents evidence', () => {
    const comment = formatCloudAgentsExecutorEvidence({
      source_issue: 1062,
      work_request_id: 'cfai-wr-12345678-1234-4234-9234-123456789abc',
      handoff_run_id: '1',
      cursor_agent_id: 'bc-12345678-1234-1234-1234-123456789abc',
      status: 'IN_PROGRESS',
    });
    assert.equal(
      findKnownCloudAgentsExecutorEvidence([{ body: 'Cursor agent ID: bc-unrelated' }, { body: comment }], 1062)
        ?.cursor_agent_id,
      'bc-12345678-1234-1234-1234-123456789abc',
    );
  });

  it('redacts secret-shaped failures and preserves a bounded blocked record', () => {
    const blocker = redactCloudAgentsFailure(new Error('Bearer abc.def secret sk-12345678'));
    assert.doesNotMatch(blocker, /abc\.def|sk-12345678/);
    assert.equal(
      buildCloudAgentsExecutorEvidence({ source_issue: 1, status: 'BLOCKED', blocker }).status,
      'BLOCKED',
    );
  });

  it('claims before API without assigning IN_PROGRESS until a valid agent is returned', async () => {
    const labelCalls = [];
    const fetch = async (url, init) => {
      if (String(url).endsWith('/labels?per_page=100')) {
        return new Response(
          JSON.stringify(DISPATCH_LIFECYCLE_LABELS.map((name) => ({ name }))),
          { status: 200 },
        );
      }
      if (String(url).includes('/labels') && init?.method === 'POST') {
        labelCalls.push(JSON.parse(String(init.body)).labels);
      }
      return new Response(JSON.stringify({}), { status: 200 });
    };
    const result = await acquireCursorIssueActivationClaim({
      token: 'test',
      repo: 'owner/repo',
      issueNumber: 9,
      labels: ['dispatch:cursor-ready'],
      comments: [],
      markInProgress: false,
      fetch,
    });
    assert.equal(result.decision, 'CLAIM_ACQUIRED');
    assert.deepEqual(labelCalls[0], ['dispatch:cursor-claimed']);
  });
});
