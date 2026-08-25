/**
 * #1062 — Factory Handoff Cloud Agents API v1 sole-executor adapter.
 *
 * Proves the replacement is implemented behind Factory Handoff, stays dormant
 * by default, and never emits IN_PROGRESS without a validated agent identity.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCursorActivationClaim,
  formatCursorActivationClaimComment,
} from '../lib/server/cursor-activation-claim.js';
import { extractValidatedCursorAgentIdentity } from '../lib/server/cursor-cloud-agent-client.js';
import {
  formatAiWorkRequestComment,
  formatAiWorkRequestStatusComment,
} from '../lib/server/ai-work-request-lifecycle.js';
import { formatCursorOriginMetadataComment } from '../lib/server/cursor-origin-metadata.js';
import {
  FACTORY_CLOUD_AGENT_ENVELOPE_MARKER,
  FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
  FACTORY_CURSOR_EXECUTOR_DRY_RUN,
  FACTORY_CURSOR_EXECUTOR_WAKE_PROOF_V2,
  assertSoleFactoryCursorExecutor,
  buildFactoryCloudAgentCreatePayload,
  buildFactoryCloudAgentEnvelope,
  collectKnownCorrelatedCursorAgentIds,
  mapFactoryCloudAgentCreateResult,
  mapPolledCursorAgentToFactoryLifecycle,
  parseFactoryCloudAgentEnvelopeFromText,
  pollKnownFactoryCursorAgent,
  redactFactoryExecutorText,
  resolveFactoryCursorExecutorMode,
  runFactoryCloudAgentsExecutor,
  shouldPollKnownCursorAgent,
} from '../lib/server/factory-cursor-cloud-agents-executor.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const HANDOFF_YAML = path.join(REPO_ROOT, '.github/workflows/factory-cursor-handoff.yml');
const LEGACY_YAML = path.join(REPO_ROOT, '.github/workflows/factory-dispatcher-activate.yml');
const LIFECYCLE_YAML = path.join(REPO_ROOT, '.github/workflows/cursor-agent-lifecycle-status.yml');
const RECONCILE_YAML = path.join(REPO_ROOT, '.github/workflows/factory-queue-reconcile.yml');

const AGENT_ID = 'bc-0123456789abcdef01234567';
const RUN_ID = 'run-0123456789abcdef01234567';
const WORK_REQUEST_ID = 'cfai-wr-01234567-89ab-4cde-8f01-23456789abcd';

function v1CreateResponse(overrides = {}) {
  return {
    agent: {
      id: AGENT_ID,
      url: `https://cursor.com/agents/${AGENT_ID}`,
      latestRunId: RUN_ID,
      ...overrides.agent,
    },
    run: {
      id: RUN_ID,
      agentId: AGENT_ID,
      status: 'CREATING',
      ...overrides.run,
    },
  };
}

function originComment(sourceIssue = 1062) {
  return formatCursorOriginMetadataComment({
    sourceIssue,
    activationWorkflowRunId: '32800850448',
    cursorAgentId: AGENT_ID,
    cursorRunId: RUN_ID,
  });
}

describe('Cloud Agents API v1 identity validation (#1062)', () => {
  it('accepts the documented v1 create response with agent + run', () => {
    const identity = extractValidatedCursorAgentIdentity(v1CreateResponse());
    assert.equal(identity.ok, true);
    assert.equal(identity.agentId, AGENT_ID);
    assert.equal(identity.runId, RUN_ID);
  });

  it('rejects HTTP-shaped success without a bc- agent id', () => {
    const identity = extractValidatedCursorAgentIdentity({
      ok: true,
      message: 'accepted',
    });
    assert.equal(identity.ok, false);
    assert.equal(identity.reason, 'missing_or_invalid_agent_identity');
  });

  it('rejects malformed ids', () => {
    const identity = extractValidatedCursorAgentIdentity({
      agent: { id: 'agent-not-a-bc-id' },
      run: { id: 'nope' },
    });
    assert.equal(identity.ok, false);
  });
});

describe('Factory executor mode and sole-executor invariant (#1062)', () => {
  it('defaults to Wake Proof v2 and does not enable Cloud Agents live', () => {
    const resolved = resolveFactoryCursorExecutorMode({});
    assert.equal(resolved.mode, FACTORY_CURSOR_EXECUTOR_WAKE_PROOF_V2);
    assert.equal(resolved.wakeProofWebhookEnabled, true);
    assert.equal(resolved.cloudAgentsLiveEnabled, false);
  });

  it('enables Cloud Agents v1 only for the exact live-switch value', () => {
    const resolved = resolveFactoryCursorExecutorMode({
      FACTORY_CURSOR_EXECUTOR: 'cloud_agents_v1',
    });
    assert.equal(resolved.mode, FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1);
    assert.equal(resolved.wakeProofWebhookEnabled, false);
    assert.equal(resolved.cloudAgentsLiveEnabled, true);
  });

  it('dry-run requires no live credential and does not enable either live path', () => {
    const resolved = resolveFactoryCursorExecutorMode({}, { dryRun: true });
    assert.equal(resolved.mode, FACTORY_CURSOR_EXECUTOR_DRY_RUN);
    assert.equal(resolved.wakeProofWebhookEnabled, false);
    assert.equal(resolved.cloudAgentsLiveEnabled, false);
  });

  it('blocks competing live executors', () => {
    const competing = assertSoleFactoryCursorExecutor({
      executorMode: FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
      wakeProofWebhookEnabled: true,
      cloudAgentsLiveEnabled: true,
    });
    assert.equal(competing.ok, false);
    assert.equal(competing.reason, 'competing_production_executors');
  });

  it('allows the current Wake Proof-only live posture', () => {
    const ok = assertSoleFactoryCursorExecutor({
      executorMode: FACTORY_CURSOR_EXECUTOR_WAKE_PROOF_V2,
      wakeProofWebhookEnabled: true,
      cloudAgentsLiveEnabled: false,
    });
    assert.equal(ok.ok, true);
  });
});

describe('correlated Cloud Agents v1 envelope (#1062)', () => {
  it('embeds source_issue, work_request_id, handoff_run_id, repo, outcome, and constraints', () => {
    const { envelope, payload } = buildFactoryCloudAgentCreatePayload({
      sourceIssue: 1062,
      workRequestId: WORK_REQUEST_ID,
      handoffRunId: '32800850448',
      requestedOutcome: 'Replace Wake Proof with Cloud Agents API v1',
      issueTitle: 'P0 Factory: replace Cursor Automation wake',
      issueBody: 'Implement the Cursor Cloud Agents API v1 replacement.',
    });
    assert.equal(envelope.source_issue, 1062);
    assert.equal(envelope.work_request_id, WORK_REQUEST_ID);
    assert.equal(envelope.handoff_run_id, '32800850448');
    assert.equal(envelope.repository, 'antonvdberg-bit/corpflow-ai-command-center');
    assert.match(payload.prompt.text, new RegExp(FACTORY_CLOUD_AGENT_ENVELOPE_MARKER));
    assert.match(payload.prompt.text, /source_issue":1062/);
    assert.match(payload.prompt.text, /work_request_id":"cfai-wr-/);
    assert.match(payload.prompt.text, /Do not merge this PR/);
    assert.equal(payload.autoCreatePR, true);
    assert.match(payload.name, /^factory-issue:1062/);
    const parsed = parseFactoryCloudAgentEnvelopeFromText(payload.prompt.text);
    assert.equal(parsed?.source_issue, 1062);
    assert.equal(parsed?.work_request_id, WORK_REQUEST_ID);
  });

  it('redacts secret-like strings from evidence', () => {
    const redacted = redactFactoryExecutorText('Bearer sk-live-examplevalue99 and ghp_abcdefghijklmnopqrstuvwxyz123456');
    assert.doesNotMatch(redacted, /sk-live-examplevalue99/);
    assert.doesNotMatch(redacted, /ghp_[A-Za-z0-9]+/);
    assert.match(redacted, /\[REDACTED\]/);
  });
});

describe('claim-before-API and no IN_PROGRESS without identity (#1062)', () => {
  it('dry-run does not call the API and stays REQUESTED', async () => {
    let createCalls = 0;
    const result = await runFactoryCloudAgentsExecutor({
      sourceIssue: 1062,
      handoffRunId: '32800850448',
      workRequestId: WORK_REQUEST_ID,
      dryRun: true,
      createAgent: async () => {
        createCalls += 1;
        throw new Error('should not call Cursor API in dry-run');
      },
    });
    assert.equal(createCalls, 0);
    assert.equal(result.ok, true);
    assert.equal(result.evidence.status, 'REQUESTED');
    assert.equal(result.evidence.cursor_agent_id, null);
    assert.equal(result.evidence.dry_run, true);
    assert.equal(result.evidence.work_request_id, WORK_REQUEST_ID);
  });

  it('blocks competing live executors before claim or create', async () => {
    let createCalls = 0;
    const result = await runFactoryCloudAgentsExecutor({
      sourceIssue: 1062,
      mode: FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
      cursorApiKey: 'test-key',
      wakeProofWebhookEnabled: true,
      cloudAgentsLiveEnabled: true,
      acquireClaim: async () => {
        throw new Error('should not claim when executors compete');
      },
      createAgent: async () => {
        createCalls += 1;
        return v1CreateResponse();
      },
    });
    assert.equal(createCalls, 0);
    assert.equal(result.ok, false);
    assert.equal(result.evidence.status, 'BLOCKED');
    assert.equal(result.evidence.reason, 'competing_production_executors');
    assert.notEqual(result.evidence.status, 'IN_PROGRESS');
  });

  it('acquires the claim before calling Cloud Agents create', async () => {
    const order = [];
    const result = await runFactoryCloudAgentsExecutor({
      sourceIssue: 1062,
      mode: FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
      cursorApiKey: 'test-key',
      wakeProofWebhookEnabled: false,
      cloudAgentsLiveEnabled: true,
      acquireClaim: async () => {
        order.push('claim');
        return {
          ok: true,
          decision: 'CLAIM_ACQUIRED',
          claim: buildCursorActivationClaim({
            sourceIssue: 1062,
            generation: 1,
            claimToken: 'tok-1062',
            status: 'pending',
          }),
        };
      },
      createAgent: async () => {
        order.push('create');
        return v1CreateResponse();
      },
    });
    assert.deepEqual(order, ['claim', 'create']);
    assert.equal(result.evidence.status, 'IN_PROGRESS');
  });

  it('duplicate active claim skips API create', async () => {
    let createCalls = 0;
    const comments = [
      {
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 1062,
            generation: 1,
            claimToken: 'already-claimed',
            status: 'pending',
          }),
        ),
      },
    ];
    const result = await runFactoryCloudAgentsExecutor({
      sourceIssue: 1062,
      mode: FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
      cursorApiKey: 'key-not-used',
      comments,
      labels: ['dispatch:cursor-claimed'],
      wakeProofWebhookEnabled: false,
      cloudAgentsLiveEnabled: true,
      createAgent: async () => {
        createCalls += 1;
        return v1CreateResponse();
      },
    });
    assert.equal(createCalls, 0);
    assert.equal(result.skipped, true);
    assert.notEqual(result.evidence.status, 'IN_PROGRESS');
  });

  it('successful create with identity maps to IN_PROGRESS and posts correlated evidence', async () => {
    const posted = [];
    const result = await runFactoryCloudAgentsExecutor({
      sourceIssue: 1062,
      handoffRunId: '32800850448',
      workRequestId: WORK_REQUEST_ID,
      mode: FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
      cursorApiKey: 'test-key',
      githubToken: 'test-token',
      wakeProofWebhookEnabled: false,
      cloudAgentsLiveEnabled: true,
      nowIso: '2026-08-25T02:18:00.000Z',
      acquireClaim: async () => ({
        ok: true,
        decision: 'CLAIM_ACQUIRED',
        claim: buildCursorActivationClaim({
          sourceIssue: 1062,
          generation: 1,
          claimToken: 'tok-1062',
          status: 'pending',
        }),
      }),
      createAgent: async (_key, payload) => {
        assert.match(payload.prompt.text, /work_request_id":"cfai-wr-/);
        assert.match(payload.prompt.text, /Selected source issue|#1062|issue #1062/i);
        return v1CreateResponse();
      },
      postComment: async (_issue, body) => {
        posted.push(body);
        return { ok: true };
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.evidence.status, 'IN_PROGRESS');
    assert.equal(result.evidence.cursor_agent_id, AGENT_ID);
    assert.equal(result.evidence.cursor_run_id, RUN_ID);
    assert.equal(result.evidence.started_at, '2026-08-25T02:18:00.000Z');
    assert.equal(result.evidence.should_release_wip, false);
    assert.ok(posted.some((body) => body.includes('CURSOR ORIGIN METADATA')));
    assert.ok(posted.some((body) => body.includes('IN_PROGRESS') && body.includes(AGENT_ID)));
  });

  it('API rejection without identity is NOT_RECEIVED and releases the claim', async () => {
    let released = false;
    const result = await runFactoryCloudAgentsExecutor({
      sourceIssue: 1062,
      mode: FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
      cursorApiKey: 'test-key',
      wakeProofWebhookEnabled: false,
      cloudAgentsLiveEnabled: true,
      acquireClaim: async () => ({
        ok: true,
        decision: 'CLAIM_ACQUIRED',
        claim: buildCursorActivationClaim({
          sourceIssue: 1062,
          generation: 1,
          claimToken: 'tok-1062',
          status: 'pending',
        }),
      }),
      createAgent: async () => {
        throw new Error('Cursor Cloud API HTTP 401: unauthorized');
      },
      releaseClaim: async () => {
        released = true;
        return { ok: true };
      },
    });
    assert.equal(result.ok, false);
    assert.equal(released, true);
    assert.equal(result.evidence.status, 'NOT_RECEIVED');
    assert.equal(result.evidence.cursor_agent_id, null);
    assert.equal(result.evidence.should_release_wip, true);
  });

  it('HTTP 200 with no agent id is NOT_RECEIVED, not IN_PROGRESS', () => {
    const mapped = mapFactoryCloudAgentCreateResult({
      apiResult: { message: 'queued' },
    });
    assert.equal(mapped.workStatus, 'NOT_RECEIVED');
    assert.equal(mapped.identity, null);
  });

  it('entitlement-style rejection is BLOCKED, not silently retried', () => {
    const mapped = mapFactoryCloudAgentCreateResult({
      error: new Error('Cursor Cloud API HTTP 402: plan upgrade required'),
    });
    assert.equal(mapped.workStatus, 'BLOCKED');
    assert.equal(mapped.reason, 'cursor_api_entitlement_rejected');
  });

  it('missing CURSOR_API_KEY fail-closes without calling create', async () => {
    let createCalls = 0;
    const result = await runFactoryCloudAgentsExecutor({
      sourceIssue: 1062,
      mode: FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
      wakeProofWebhookEnabled: false,
      cloudAgentsLiveEnabled: true,
      acquireClaim: async () => {
        throw new Error('should not claim without a key');
      },
      createAgent: async () => {
        createCalls += 1;
        return v1CreateResponse();
      },
    });
    assert.equal(createCalls, 0);
    assert.equal(result.ok, false);
    assert.equal(result.evidence.reason, 'cursor_api_key_missing');
    assert.match(result.evidence.blocker, /CURSOR_API_KEY/);
    assert.doesNotMatch(result.evidence.blocker || '', /sk-|ghp_/);
  });
});

describe('polling known correlated agent IDs (#1062)', () => {
  it('collects only correlated origin/status/claim ids', () => {
    const comments = [
      { body: originComment(1062) },
      { body: 'Unrelated Automation worker bc-aaaaaaaaaaaaaaaaaaaaaaaa mentioned in chatter' },
    ];
    const ids = collectKnownCorrelatedCursorAgentIds(comments, 1062);
    assert.deepEqual(ids, [AGENT_ID]);
  });

  it('refuses to poll an uncorrelated Automation worker id', () => {
    const gate = shouldPollKnownCursorAgent({
      agentId: 'bc-aaaaaaaaaaaaaaaaaaaaaaaa',
      comments: [{ body: originComment(1062) }],
      sourceIssue: 1062,
    });
    assert.equal(gate.poll, false);
    assert.equal(gate.reason, 'uncorrelated_agent_id');
  });

  it('polls a known correlated id and maps RUNNING to IN_PROGRESS without WIP release', async () => {
    const result = await pollKnownFactoryCursorAgent({
      apiKey: 'test-key',
      agentId: AGENT_ID,
      sourceIssue: 1062,
      comments: [{ body: originComment(1062) }],
      getAgent: async () => v1CreateResponse({ run: { id: RUN_ID, status: 'RUNNING' } }),
    });
    assert.equal(result.polled, true);
    assert.equal(result.mapping.workStatus, 'IN_PROGRESS');
    assert.equal(result.mapping.shouldReleaseWip, false);
  });

  it('maps terminal failure to BLOCKED and releases WIP', () => {
    const mapped = mapPolledCursorAgentToFactoryLifecycle(
      v1CreateResponse({ run: { id: RUN_ID, status: 'ERROR' } }),
    );
    assert.equal(mapped.workStatus, 'BLOCKED');
    assert.equal(mapped.shouldReleaseWip, true);
  });

  it('review-ready completed PR consumes zero execution WIP', () => {
    const mapped = mapPolledCursorAgentToFactoryLifecycle(
      v1CreateResponse({
        agent: {
          id: AGENT_ID,
          target: { prUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1063' },
        },
        run: { id: RUN_ID, status: 'FINISHED' },
      }),
      { hasPr: true },
    );
    assert.equal(mapped.workStatus, 'COMPLETED');
    assert.equal(mapped.shouldReleaseWip, true);
    assert.equal(mapped.reason, 'review_ready_zero_execution_wip');
  });

  it('does not treat COMPLETED as merged or deployed', () => {
    const mapped = mapPolledCursorAgentToFactoryLifecycle(
      v1CreateResponse({ run: { id: RUN_ID, status: 'COMPLETED' } }),
      { hasPr: true },
    );
    assert.equal(mapped.completed, true);
    assert.notEqual(mapped.reason, 'merged');
    assert.notEqual(mapped.reason, 'deployed');
  });
});

describe('protected-action preservation and secret redaction (#1062)', () => {
  it('keeps protected-action constraints in the create envelope', () => {
    const envelope = buildFactoryCloudAgentEnvelope({
      sourceIssue: 1062,
      protectedActionRequired: true,
    });
    assert.equal(envelope.protected_action_required, true);
    assert.match(envelope.protected_action_constraints, /Do not merge/);
    assert.match(envelope.protected_action_constraints, /env\/secrets/);
  });

  it('does not copy secret values into status comments', () => {
    const body = formatAiWorkRequestStatusComment({
      work_request_id: WORK_REQUEST_ID,
      source_issue: 1062,
      status: 'IN_PROGRESS',
      cursor_agent_id: AGENT_ID,
      cursor_run_id: RUN_ID,
      blocker: redactFactoryExecutorText('Bearer super-secret-token-value'),
    });
    assert.doesNotMatch(body, /super-secret-token-value/);
    assert.match(body, /IN_PROGRESS/);
  });

  it('work-request comments stay REQUESTED until independent pickup evidence exists', () => {
    const request = formatAiWorkRequestComment({
      work_request_id: WORK_REQUEST_ID,
      source_issue: 1062,
      origin_controller: 'corpflow.factory_cursor_handoff',
      requested_outcome: 'Replace wake transport',
      status: 'REQUESTED',
    });
    assert.match(request, /Status: REQUESTED/);
    assert.doesNotMatch(request, /IN_PROGRESS/);
  });
});

describe('Factory Handoff workflow keeps Cloud Agents v1 dormant (#1062)', () => {
  const yaml = readFileSync(HANDOFF_YAML, 'utf8');
  const legacyYaml = readFileSync(LEGACY_YAML, 'utf8');
  const lifecycleYaml = readFileSync(LIFECYCLE_YAML, 'utf8');
  const reconcileYaml = readFileSync(RECONCILE_YAML, 'utf8');

  it('keeps the exact Handoff display name', () => {
    assert.match(yaml, /^name:\s*CorpFlowAI Cursor Factory Handoff\s*$/m);
  });

  it('gates Cloud Agents v1 behind executor_mode == cloud_agents_v1', () => {
    assert.match(yaml, /node scripts\/factory-cursor-cloud-agents-execute\.mjs/);
    assert.match(
      yaml,
      /if: steps\.handoff\.outputs\.has_handoff == '1' && steps\.handoff\.outputs\.source_issue != '' && steps\.handoff\.outputs\.executor_mode == 'cloud_agents_v1'/,
    );
  });

  it('publishes Handoff selection without PENDING receipt before Cloud Agents create', () => {
    assert.match(yaml, /Publish Factory Handoff selection for Cloud Agents v1/);
    assert.match(yaml, /FACTORY_HANDOFF_INCLUDE_RECEIPT: "0"/);
    const selectIdx = yaml.indexOf('Publish Factory Handoff selection for Cloud Agents v1');
    const executeIdx = yaml.indexOf('Execute via Cursor Cloud Agents API v1');
    const pendingIdx = yaml.indexOf('Publish successful handoff and pending Cursor receipt');
    assert.ok(selectIdx > 0 && executeIdx > selectIdx);
    assert.ok(pendingIdx > executeIdx);
    const pendingBlock = yaml.slice(pendingIdx, pendingIdx + 600);
    assert.match(pendingBlock, /executor_mode != 'cloud_agents_v1'/);
  });

  it('keeps Wake Proof webhook on the default non-cloud_agents_v1 path', () => {
    assert.match(yaml, /Wake Cursor Factory v2 webhook/);
    assert.match(
      yaml,
      /if: steps\.handoff\.outputs\.has_handoff == '1' && steps\.handoff\.outputs\.source_issue != '' && steps\.handoff\.outputs\.executor_mode != 'cloud_agents_v1'/,
    );
  });

  it('does not enable both live executors in the same step condition', () => {
    assert.match(yaml, /executor_mode == 'cloud_agents_v1'/);
    assert.match(yaml, /executor_mode != 'cloud_agents_v1'/);
    assert.doesNotMatch(
      yaml,
      /executor_mode == 'cloud_agents_v1'[\s\S]{0,200}CURSOR_FACTORY_WAKE_WEBHOOK_URL/,
    );
  });

  it('does not auto-launch the legacy diagnostic API dispatcher', () => {
    assert.match(legacyYaml, /LEGACY \/ DIAGNOSTIC \/ NOT PRODUCTION EXECUTION/);
    assert.doesNotMatch(
      lifecycleYaml,
      /uses:\s*\.\/\.github\/workflows\/factory-dispatcher-activate\.yml/,
    );
    assert.doesNotMatch(
      reconcileYaml,
      /uses:\s*\.\/\.github\/workflows\/factory-dispatcher-activate\.yml/,
    );
  });
});

describe('synthetic end-to-end dry-run CLI (#1062)', () => {
  it('runs without CURSOR_API_KEY and writes REQUESTED evidence', () => {
    const result = spawnSync(
      process.execPath,
      [
        'scripts/factory-cursor-cloud-agents-execute.mjs',
        '--dry-run',
        '--out=/tmp/factory-cursor-cloud-agents-execution.json',
      ],
      {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          SOURCE_ISSUE: '1062',
          CURSOR_API_KEY: '',
          FACTORY_CURSOR_EXECUTOR: '',
        },
      },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const evidence = JSON.parse(readFileSync('/tmp/factory-cursor-cloud-agents-execution.json', 'utf8'));
    assert.equal(evidence.evidence.dry_run, true);
    assert.equal(evidence.evidence.status, 'REQUESTED');
    assert.equal(evidence.evidence.cursor_agent_id, null);
    assert.doesNotMatch(JSON.stringify(evidence), /CURSOR_API_KEY\s*=\s*\S+/);
  });
});
