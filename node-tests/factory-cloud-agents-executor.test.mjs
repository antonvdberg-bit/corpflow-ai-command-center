import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getCursorCloudAgentRun,
  createCursorCloudAgent,
  formatCursorApiErrorDetail,
  buildCursorAgentCreatePayload,
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
  formatCursorRequeueComment,
} from '../lib/server/cursor-activation-claim.js';
import {
  formatAiWorkRequestComment,
} from '../lib/server/ai-work-request-lifecycle.js';
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

  it('mints a new work request after CURSOR REQUEUE instead of reusing Generation 1', () => {
    const gen1Id = 'cfai-wr-cf3af4df-7d1d-4d8b-886f-59783672d31c';
    const envelope = buildFactoryCloudAgentsExecutionEnvelope({
      issue: { number: 1004, title: 'Operating Workspace Commercial summary', body: '' },
      comments: [
        {
          created_at: '2026-08-26T04:00:34Z',
          body: formatAiWorkRequestComment({
            work_request_id: gen1Id,
            source_issue: 1004,
            origin_controller: 'factory_handoff',
            requested_outcome: 'Operating Workspace Commercial summary',
            requested_at: '2026-08-26T04:00:34.582Z',
            status: 'REQUESTED',
            protected_action_required: false,
          }),
        },
        {
          created_at: '2026-08-27T00:07:34Z',
          author: 'antonvdberg-bit',
          author_association: 'OWNER',
          body: 'CURSOR REQUEUE — current-main integration repair required.',
        },
        {
          created_at: '2026-08-27T02:10:41Z',
          body: formatCursorRequeueComment({
            sourceIssue: 1004,
            generation: 2,
            reason: 'current-main integration repair required',
            requeuedAt: '2026-08-27T02:10:39.293Z',
          }),
        },
      ],
      handoffRunId: '33032441088',
      repo: 'antonvdberg-bit/corpflow-ai-command-center',
    });
    assert.equal(envelope.request_was_created, true);
    assert.notEqual(envelope.work_request_id, gen1Id);
    assert.match(envelope.work_request_id, /^cfai-wr-/);
    assert.equal(
      envelope.create_payload.agentId,
      envelope.work_request_id.replace(/^cfai-wr-/i, 'bc-'),
    );
    assert.notEqual(
      envelope.create_payload.agentId,
      'bc-cf3af4df-7d1d-4d8b-886f-59783672d31c',
    );
  });

  it('reuses a current-generation work request after CURSOR REQUEUE', () => {
    const gen2Id = 'cfai-wr-aaaaaaaa-1116-4116-8116-111611161116';
    const envelope = buildFactoryCloudAgentsExecutionEnvelope({
      issue: { number: 1004, title: 'Operating Workspace Commercial summary', body: '' },
      comments: [
        {
          created_at: '2026-08-26T04:00:34Z',
          body: formatAiWorkRequestComment({
            work_request_id: 'cfai-wr-cf3af4df-7d1d-4d8b-886f-59783672d31c',
            source_issue: 1004,
            origin_controller: 'factory_handoff',
            requested_outcome: 'Operating Workspace Commercial summary',
            status: 'REQUESTED',
            protected_action_required: false,
          }),
        },
        {
          created_at: '2026-08-27T02:10:41Z',
          body: formatCursorRequeueComment({
            sourceIssue: 1004,
            generation: 2,
            reason: 'current-main integration repair required',
            requeuedAt: '2026-08-27T02:10:39.293Z',
          }),
        },
        {
          created_at: '2026-08-27T02:12:00Z',
          body: formatAiWorkRequestComment({
            work_request_id: gen2Id,
            source_issue: 1004,
            origin_controller: 'factory_handoff',
            requested_outcome: 'Operating Workspace Commercial summary',
            status: 'REQUESTED',
            protected_action_required: false,
          }),
        },
      ],
      handoffRunId: '33032441088',
      repo: 'antonvdberg-bit/corpflow-ai-command-center',
    });
    assert.equal(envelope.request_was_created, false);
    assert.equal(envelope.work_request_id, gen2Id);
    assert.equal(envelope.create_payload.agentId, 'bc-aaaaaaaa-1116-4116-8116-111611161116');
  });

  it('stringifies object-shaped Cursor API errors instead of [object Object]', async () => {
    assert.match(
      formatCursorApiErrorDetail({ error: { code: 'conflict', message: 'agent already exists' } }),
      /agent already exists/,
    );
    await assert.rejects(
      () =>
        createCursorCloudAgent(
          'test-key',
          buildCursorAgentCreatePayload({
            objectRef: 'issue:1004',
            executorPrompt: 'bounded packet',
          }),
          {
            fetch: async () =>
              new Response(JSON.stringify({ error: { message: 'agent already exists' } }), {
                status: 409,
              }),
          },
        ),
      /HTTP 409: \{"message":"agent already exists"\}/,
    );
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
