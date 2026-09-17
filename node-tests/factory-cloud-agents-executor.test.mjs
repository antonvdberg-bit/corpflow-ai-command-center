import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluatePolicyModelAvailability,
  getCursorCloudAgentRun,
  summarizeCursorModelCatalog,
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

function compactPacket(extra = '') {
  return `## CURRENT CURSOR PACKET — v1
value_class: cost_reduction
expected_outcome: Harden one control.
context_budget: S
execution_budget: max_runs=1; max_retries=0; max_follow_ups=0
stop_condition: Stop after focused verification.
${extra}`;
}

const request = {
  body: compactPacket(),
  number: 1062,
  title: 'Repair transport',
};

describe('Factory Cloud Agents executor', () => {
  it('accepts the exact listed Terra Medium reasoning variant from the live catalogue shape', () => {
    const availability = evaluatePolicyModelAvailability(
      {
        items: [
          {
            id: 'gpt-5.6-terra',
            displayName: 'GPT-5.6 Terra Medium',
            aliases: ['gpt-5.6-terra-medium'],
            parameters: [{
              id: 'reasoning',
              values: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }],
            }],
            variants: [{ params: [{ id: 'reasoning', value: 'medium' }, { id: 'fast', value: 'false' }] }],
          },
        ],
      },
      { id: 'gpt-5.6-terra', params: [{ id: 'reasoning', value: 'medium' }, { id: 'fast', value: 'false' }] },
    );
    assert.equal(availability.available, true);
    assert.equal(availability.reason, 'matching_variant');
  });

  it('does not treat the UI display-name-shaped identifier as a Cloud Agents API ID', () => {
    const catalog = {
      items: [{ id: 'gpt-5.6-terra', displayName: 'GPT-5.6 Terra Medium' }],
    };
    const availability = evaluatePolicyModelAvailability(
      catalog,
      { id: 'gpt-5.6-terra-medium', params: [] },
    );
    assert.equal(availability.available, false);
    assert.equal(availability.reason, 'model_id_missing');
  });

  it('keeps parameterized or unknown catalogue selections fail-closed', () => {
    const parameterized = evaluatePolicyModelAvailability(
      { items: [{ id: 'gpt-5.6-terra' }] },
      { id: 'gpt-5.6-terra', params: [{ id: 'fast', value: 'true' }] },
    );
    assert.equal(parameterized.available, false);
    assert.equal(parameterized.reason, 'params_not_available');

    const missing = evaluatePolicyModelAvailability(
      { items: [] },
      { id: 'gpt-5.6-terra', params: [] },
    );
    assert.equal(missing.available, false);
    assert.equal(missing.reason, 'model_id_missing');
  });

  it('captures only bounded, requested-model metadata for a catalogue failure receipt', () => {
    const summary = summarizeCursorModelCatalog({
      items: [
        {
          id: 'gpt-5.6-terra',
          displayName: 'GPT-5.6 Terra Medium',
          aliases: ['gpt-5.6-terra-medium'],
          parameters: [{ id: 'fast', values: [{ value: 'true' }] }],
          variants: [{ params: [{ id: 'reasoning', value: 'medium' }] }],
          unexpectedSensitiveField: 'must-not-be-captured',
        },
      ],
    }, 'gpt-5.6-terra');
    assert.deepEqual(summary, {
      itemCount: 1,
      requestedItem: {
        id: 'gpt-5.6-terra',
        displayName: 'GPT-5.6 Terra Medium',
        aliases: ['gpt-5.6-terra-medium'],
        parameterIds: ['fast'],
        variantCount: 1,
        variantParams: ['reasoning=medium'],
      },
      items: [{ id: 'gpt-5.6-terra', displayName: 'GPT-5.6 Terra Medium' }],
    });
  });

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
      issue: { number: 5, title: 'Synthetic packet', body: compactPacket() },
      comments: [],
      handoffRunId: '99',
      repo: 'antonvdberg-bit/corpflow-ai-command-center',
    });
    assert.equal(envelope.request_was_created, true);
    assert.match(envelope.work_request_id, /^cfai-wr-/);
  });

  it('injects only the compact validated packet from a large issue body', () => {
    const historical = 'HISTORICAL SECRET-LIKE TEXT MUST NOT REACH THE PROMPT '.repeat(500);
    const envelope = buildFactoryCloudAgentsExecutionEnvelope({
      issue: { number: 6, title: 'Large history', body: `${compactPacket()}\n### Historical references\n${historical}` },
      comments: [],
      handoffRunId: '99',
      repo: 'antonvdberg-bit/corpflow-ai-command-center',
    });
    assert.match(envelope.create_payload.prompt.text, /CURRENT CURSOR PACKET/);
    assert.doesNotMatch(envelope.create_payload.prompt.text, /HISTORICAL SECRET-LIKE TEXT/);
    assert.equal(envelope.packet_validation.frugal_metadata.context_budget, 'S');
  });

  for (const [name, body, reason] of [
    ['missing packet', 'ordinary issue history', 'current_packet_missing'],
    ['controller reference', `${compactPacket()}\nNOT A CURSOR EXECUTION PACKET`, 'controller_or_reference_issue'],
    ['duplicate packet', `${compactPacket()}\n## CURRENT CURSOR PACKET\n${compactPacket()}`, 'current_packet_ambiguous'],
    ['oversized packet', `${compactPacket()}\n${'x'.repeat(12001)}`, 'current_packet_oversized'],
    ['missing frugal metadata', '## CURRENT CURSOR PACKET\nvalue_class: cost_reduction', 'frugal_metadata_missing'],
  ]) {
    it(`rejects ${name} before an API payload is created`, () => {
      assert.throws(
        () => buildFactoryCloudAgentsExecutionEnvelope({
          issue: { number: 7, title: name, body },
          comments: [],
          handoffRunId: '99',
          repo: 'antonvdberg-bit/corpflow-ai-command-center',
        }),
        new RegExp(reason),
      );
    });
  }

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
