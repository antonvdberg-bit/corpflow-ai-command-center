import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCursorControlRecord,
  canReleaseNextCursorPacket,
  parseCursorControlQuery,
} from '../lib/server/cursor-control-api.js';
import {
  sanitizeCursorRunStreamEvent,
  streamCursorCloudAgentRun,
} from '../lib/server/cursor-cloud-agent-client.js';

const executorComment = (overrides = {}) =>
  `<!-- corpflow.factory_cloud_agents_executor.v1 ${JSON.stringify({
    source_issue: 1358,
    cursor_agent_id: 'bc-1358',
    cursor_run_id: 'run-1358',
    status: 'COMPLETED',
    branch: 'cursor/example',
    pr_number: 1400,
    pr_url: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1400',
    head_sha: 'abc123',
    ci_state: 'success',
    final_verdict: 'PASS',
    ...overrides,
  })} -->`;

describe('cursor-control-api', () => {
  it('resolves a governed run from durable GitHub evidence', () => {
    const record = buildCursorControlRecord({
      issueNumber: 1358,
      title: 'COO visibility',
      comments: [
        { body: executorComment() },
        {
          body: '<!-- corpflow.cursor_lifecycle_state.v1 ' +
            JSON.stringify({
              cursorAgentId: 'bc-1358',
              cursorRunId: 'run-1358',
              sourceIssue: 1358,
              phase: 'COMPLETED',
              finalResult: 'PASS — evidence observed in GitHub PR and checks.',
              finalVerdict: 'PASS',
            }) +
            ' -->',
        },
      ],
    });
    assert.equal(record.issue_number, 1358);
    assert.equal(record.cursor_run_id, 'run-1358');
    assert.equal(record.final_verdict, 'PASS');
    assert.equal(record.terminal_result_captured, true);
    assert.equal(record.next_packet_release, true);
    assert.equal(record.evidence_source, 'github_comment');
  });

  it('does not release the next packet for COMPLETED_UNVERIFIED', () => {
    assert.equal(
      canReleaseNextCursorPacket({
        cursor_agent_id: 'bc-1358',
        cursor_run_id: 'run-1358',
        final_verdict: 'COMPLETED_UNVERIFIED',
        terminal_result_captured: true,
      }),
      false,
    );
  });

  it('accepts issue, agent/run, or list selectors without accepting arbitrary params', () => {
    assert.equal(parseCursorControlQuery({ issue: '1358' }).ok, true);
    assert.equal(parseCursorControlQuery({ agent_id: 'bc-1', run_id: 'run-1' }).ok, true);
    assert.equal(parseCursorControlQuery({ limit: '25' }).ok, true);
    assert.equal(parseCursorControlQuery({ secret: 'nope' }).ok, false);
  });

  it('captures concise SSE progress and drops transcript fields', async () => {
    const events = [];
    const fetch = async () => ({
      ok: true,
      status: 200,
      body: (async function* () {
        yield new TextEncoder().encode(
          'data: {"type":"progress","status":"RUNNING","message":"checking PR","transcript":"hidden"}\n\n',
        );
        yield new TextEncoder().encode(
          'data: {"type":"result","result":"PASS — evidence observed","reasoning":"hidden"}\n\n',
        );
      })(),
    });
    await streamCursorCloudAgentRun('sk-test', 'bc-1', 'run-1', {
      fetch,
      onEvent: (event) => events.push(event),
    });
    assert.deepEqual(events, [
      { type: 'progress', status: 'RUNNING', message: 'checking PR' },
      { type: 'result', result: 'PASS — evidence observed' },
    ]);
    assert.equal('reasoning' in sanitizeCursorRunStreamEvent({ reasoning: 'hidden' }), false);
  });
});
