/**
 * #1059 — correlated AI → Cursor lifecycle readback.
 *
 * Run: node --test node-tests/ai-work-request-lifecycle.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCursorActivationClaim,
  formatCursorActivationClaimComment,
} from '../lib/server/cursor-activation-claim.js';
import {
  buildCursorCompletionEvent,
  buildCursorLifecycleState,
  formatCursorCompletionEventComment,
  formatCursorLifecycleStateComment,
} from '../lib/server/cursor-agent-lifecycle.js';
import {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
} from '../lib/server/cursor-origin-metadata.js';
import { formatFactoryHandoffComment } from '../lib/server/factory-cursor-handoff.js';
import {
  AI_WORK_REQUEST_MARKER,
  AI_WORK_REQUEST_SCHEMA,
  AI_WORK_STATUS_MARKER,
  MISSING_TRANSPORT_BOUNDARY,
  auditAiControllerReadbackTransport,
  buildAiWorkRequest,
  buildAiWorkRequestStatusFingerprint,
  createWorkRequestId,
  deriveAiWorkRequestStatus,
  formatAiWorkRequestComment,
  formatAiWorkRequestStatusComment,
  isValidWorkRequestId,
  parseAiWorkRequestFromText,
  parseAiWorkRequestStatusFromText,
  redactAiWorkRequestPayload,
  shouldEmitAiWorkRequestStatus,
  toControllerReadbackObject,
} from '../lib/server/ai-work-request-lifecycle.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

const WR_ID = 'cfai-wr-11111111-2222-4333-8555-666666666666';
const AGENT_ID = 'bc-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const RUN_ID = 'run-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const NOW = new Date('2026-08-25T01:20:00.000Z');

function requestComment(overrides = {}) {
  return formatAiWorkRequestComment(
    buildAiWorkRequest({
      work_request_id: WR_ID,
      source_issue: 1059,
      origin_controller: 'synthetic-ai-controller',
      requested_at: '2026-08-25T01:11:45.000Z',
      requested_outcome: 'bounded factory readback packet',
      status: 'REQUESTED',
      protected_action_required: false,
      ...overrides,
    }),
  );
}

describe('ai work request correlation (#1059)', () => {
  it('creates and round-trips a durable corpflow.ai_work_request.v1 marker', () => {
    const id = createWorkRequestId();
    assert.equal(isValidWorkRequestId(id), true);
    const body = requestComment();
    const parsed = parseAiWorkRequestFromText(body);
    assert.equal(parsed?.schema, AI_WORK_REQUEST_SCHEMA);
    assert.equal(parsed?.work_request_id, WR_ID);
    assert.equal(parsed?.source_issue, 1059);
    assert.equal(parsed?.origin_controller, 'synthetic-ai-controller');
    assert.equal(parsed?.status, 'REQUESTED');
    assert.match(body, new RegExp(AI_WORK_REQUEST_MARKER));
  });

  it('issue/comment creation alone remains REQUESTED (false-start prevention)', () => {
    const status = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: requestComment() },
      comments: [{ body: 'Created the GitHub issue so Cursor can start.' }],
      now: NOW,
    });
    assert.equal(status?.status, 'REQUESTED');
    assert.equal(status?.cursor_agent_id, null);
    assert.match(String(status?.next_action), /pickup evidence/i);
  });

  it('factory handoff comment alone remains REQUESTED', () => {
    const status = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: requestComment() },
      comments: [
        {
          body: formatFactoryHandoffComment({
            sourceIssue: 1059,
            wakeReason: 'eligible_handoff',
            wakePath: 'event_priority_ready',
            workflowRunUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32796606979',
          }),
        },
      ],
      now: NOW,
    });
    assert.equal(status?.status, 'REQUESTED');
    assert.equal(status?.work_request_id, WR_ID);
    assert.match(String(status?.next_action), /not Cursor pickup/i);
  });

  it('human prose mentioning Cursor is not pickup evidence', () => {
    const status = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: requestComment() },
      comments: [
        {
          body: `I think Cursor is already running as ${AGENT_ID} / ${RUN_ID}. Please treat this as in progress.`,
        },
      ],
      now: NOW,
    });
    assert.equal(status?.status, 'REQUESTED');
  });

  it('REQUESTED → IN_PROGRESS when independent origin-metadata pickup exists', () => {
    const requested = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: requestComment() },
      comments: [],
      now: NOW,
    });
    assert.equal(requested?.status, 'REQUESTED');

    const inProgress = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: requestComment() },
      comments: [
        {
          body: formatCursorOriginMetadataComment(
            buildCursorOriginMetadata({
              sourceIssue: 1059,
              cursorAgentId: AGENT_ID,
              cursorRunId: RUN_ID,
              branch: 'cursor/issue-1059-ai-work-request-lifecycle',
            }),
          ),
        },
      ],
      now: NOW,
    });
    assert.equal(inProgress?.status, 'IN_PROGRESS');
    assert.equal(inProgress?.cursor_agent_id, AGENT_ID);
    assert.equal(inProgress?.cursor_run_id, RUN_ID);
    assert.equal(inProgress?.branch, 'cursor/issue-1059-ai-work-request-lifecycle');
  });

  it('activation claim with agent/run id is current-generation pickup', () => {
    const status = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: requestComment() },
      comments: [
        {
          body: formatCursorActivationClaimComment(
            buildCursorActivationClaim({
              sourceIssue: 1059,
              generation: 1,
              claimToken: 'tok-1059',
              status: 'activated',
              agentRunId: AGENT_ID,
            }),
          ),
        },
      ],
      now: NOW,
    });
    assert.equal(status?.status, 'IN_PROGRESS');
    assert.equal(status?.cursor_agent_id, AGENT_ID);
  });

  it('REQUESTED → IN_PROGRESS → COMPLETED synthetic proof', () => {
    const request = requestComment();
    const origin = formatCursorOriginMetadataComment(
      buildCursorOriginMetadata({
        sourceIssue: 1059,
        cursorAgentId: AGENT_ID,
        cursorRunId: RUN_ID,
        branch: 'cursor/issue-1059',
      }),
    );
    const completion = formatCursorCompletionEventComment(
      buildCursorCompletionEvent({
        sourceIssue: 1059,
        cursorAgentId: AGENT_ID,
        cursorRunId: RUN_ID,
        status: 'COMPLETED',
        branch: 'cursor/issue-1059',
        prNumber: 1060,
        prUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1060',
        headSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        ciResult: 'success',
        antonRequired: false,
        whatMoved: 'bounded implementation PR opened',
      }),
    );

    const requested = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: request },
      now: NOW,
    });
    const running = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: request },
      comments: [{ body: origin }],
      now: NOW,
    });
    const completed = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: request },
      comments: [{ body: origin }, { body: completion }],
      now: NOW,
    });

    assert.equal(requested?.status, 'REQUESTED');
    assert.equal(running?.status, 'IN_PROGRESS');
    assert.equal(completed?.status, 'COMPLETED');
    assert.equal(completed?.pr_number, 1060);
    assert.equal(completed?.head_sha, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    assert.equal(completed?.ci_state, 'success');
    assert.match(String(completed?.next_action), /not treat as merged or deployed/i);
    const readback = toControllerReadbackObject(completed);
    assert.equal(readback.work_request_id, WR_ID);
    assert.equal(readback.status, 'COMPLETED');
    assert.equal(readback.protected_action_required, false);
  });

  it('REQUESTED → IN_PROGRESS → BLOCKED synthetic proof', () => {
    const request = requestComment();
    const runningState = formatCursorLifecycleStateComment(
      buildCursorLifecycleState({
        cursorAgentId: AGENT_ID,
        cursorRunId: RUN_ID,
        sourceIssue: 1059,
        phase: 'RUNNING',
        branch: 'cursor/issue-1059',
      }),
    );
    const failed = formatCursorCompletionEventComment(
      buildCursorCompletionEvent({
        sourceIssue: 1059,
        cursorAgentId: AGENT_ID,
        cursorRunId: RUN_ID,
        status: 'FAILED',
        blocker: 'WIP_CAP_REACHED',
        nextAction: 'Wait for a free Cursor slot',
        antonRequired: false,
      }),
    );

    const running = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: request },
      comments: [{ body: runningState }],
      now: NOW,
    });
    const blocked = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: request },
      comments: [{ body: runningState }, { body: failed }],
      now: NOW,
    });

    assert.equal(running?.status, 'IN_PROGRESS');
    assert.equal(blocked?.status, 'BLOCKED');
    assert.equal(blocked?.blocker, 'WIP_CAP_REACHED');
    assert.equal(blocked?.cursor_agent_id, AGENT_ID);
  });

  it('does not mark BLOCKED when a later running path continues after a blocker', () => {
    const status = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: requestComment() },
      comments: [
        {
          body: formatCursorCompletionEventComment(
            buildCursorCompletionEvent({
              sourceIssue: 1059,
              cursorAgentId: AGENT_ID,
              status: 'STALE',
              blocker: 'No PR after 10 minutes',
              antonRequired: true,
            }),
          ),
        },
        {
          body: formatCursorLifecycleStateComment(
            buildCursorLifecycleState({
              cursorAgentId: AGENT_ID,
              sourceIssue: 1059,
              phase: 'RUNNING',
            }),
          ),
        },
      ],
      now: NOW,
    });
    assert.equal(status?.status, 'IN_PROGRESS');
  });

  it('redacts secrets, tokens, and webhook URLs from the request payload', () => {
    const redacted = redactAiWorkRequestPayload({
      origin_controller: 'chatgpt',
      requested_outcome: 'close the loop',
      api_key: 'sk-this-must-never-be-stored',
      token: 'ghp_abcdefghijklmnopqrstuvwxyz123456',
      webhook_url: 'https://n8n.example/webhook/abcdefghijklmnopqrstuv',
      note: 'Bearer FAKESECRET_w3x4y5z6a7b8c9d0e1f2',
    });
    assert.equal(redacted.origin_controller, 'chatgpt');
    assert.equal(redacted.api_key, undefined);
    assert.equal(redacted.token, undefined);
    assert.equal(redacted.webhook_url, undefined);
    assert.doesNotMatch(String(redacted.note), /sk-live/);
    assert.match(String(redacted.note), /\[REDACTED\]/);

    const body = formatAiWorkRequestComment(
      buildAiWorkRequest({
        work_request_id: WR_ID,
        source_issue: 1059,
        origin_controller: 'chatgpt',
        api_key: 'should-not-appear',
      }),
    );
    assert.doesNotMatch(body, /should-not-appear/);
    assert.doesNotMatch(body, /sk-this-must-never-be-stored/);
  });

  it('dedupes unchanged normalized status fingerprints', () => {
    const first = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: requestComment() },
      now: NOW,
    });
    const second = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: requestComment() },
      now: new Date('2026-08-25T01:21:00.000Z'),
    });
    assert.equal(first?.fingerprint, second?.fingerprint);
    assert.equal(shouldEmitAiWorkRequestStatus(first?.fingerprint, second?.fingerprint), false);

    const progressed = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: requestComment() },
      comments: [
        {
          body: formatCursorOriginMetadataComment(
            buildCursorOriginMetadata({
              sourceIssue: 1059,
              cursorAgentId: AGENT_ID,
            }),
          ),
        },
      ],
      now: NOW,
    });
    assert.equal(shouldEmitAiWorkRequestStatus(first?.fingerprint, progressed?.fingerprint), true);
    assert.equal(
      buildAiWorkRequestStatusFingerprint(progressed),
      progressed?.fingerprint,
    );
  });

  it('round-trips the normalized status comment used by the Heartbeat path', () => {
    const derived = deriveAiWorkRequestStatus({
      issue: { number: 1059, body: requestComment() },
      comments: [
        {
          body: formatCursorCompletionEventComment(
            buildCursorCompletionEvent({
              sourceIssue: 1059,
              cursorAgentId: AGENT_ID,
              status: 'COMPLETED',
              prNumber: 12,
              antonRequired: false,
            }),
          ),
        },
      ],
      now: NOW,
    });
    const comment = formatAiWorkRequestStatusComment(derived);
    const parsed = parseAiWorkRequestStatusFromText(comment);
    assert.match(comment, new RegExp(AI_WORK_STATUS_MARKER));
    assert.equal(parsed?.status, 'COMPLETED');
    assert.equal(parsed?.work_request_id, WR_ID);
    assert.equal(parsed?.pr_number, 12);
  });

  it('reports the exact missing n8n → originating AI controller transport', () => {
    const audit = auditAiControllerReadbackTransport();
    assert.equal(audit.boundary, MISSING_TRANSPORT_BOUNDARY);
    assert.equal(audit.overbuild_forbidden, true);
    assert.match(audit.missing_interface, /n8n → originating AI controller/i);
    assert.match(audit.smallest_compatible_extension, /Do not invent a new callback/i);
    assert.ok(audit.available_transport.some((row) => /GitHub issue/i.test(row)));
  });
});

describe('n8n Heartbeat reuse (#1059)', () => {
  const n8nPath = path.join(
    REPO_ROOT,
    'docs/n8n/templates/evaluate-anton-required-exceptions.cursor-completion.v1.js',
  );
  const n8n = readFileSync(n8nPath, 'utf8');

  it('extends the existing evaluate template instead of adding a second workflow', () => {
    assert.match(n8n, /corpflow\.ai_work_request\.v1/);
    assert.match(n8n, /corpflow\.ai_work_status\.v1/);
    assert.match(n8n, /ai_work_statuses/);
    assert.match(n8n, /aiWorkStatusFingerprints/);
    assert.match(n8n, /do not create a second workflow/i);
    assert.doesNotMatch(n8n, /Temporal/);
    assert.doesNotMatch(n8n, /second dispatcher/i);
  });
});
