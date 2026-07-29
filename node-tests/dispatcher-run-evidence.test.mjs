import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDispatcherRunFinishedEvidence,
  buildDispatcherRunStartedEvidence,
  classifyMissingDispatcherRunEvidence,
} from '../lib/server/dispatcher-run-evidence.js';

describe('dispatcher-run-evidence', () => {
  it('builds started evidence without secrets', () => {
    const e = buildDispatcherRunStartedEvidence({
      runId: '30419999999',
      runUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/30419999999',
      eventName: 'workflow_dispatch',
      mode: 'cursor_live',
      headSha: '8e2b4197d6c9036c006f22f6439b684d79c4e2f4',
      targetIssue: '',
      liveEnabledConfigured: true,
      liveEnabledTruthy: true,
    });
    assert.equal(e.phase, 'started');
    assert.match(e.markdown, /DISPATCHER RUN STARTED/);
    assert.match(e.markdown, /30419999999/);
    assert.match(e.markdown, /target_issue input: \(blank\)/);
    assert.doesNotMatch(e.markdown, /sk-|ghp_|CURSOR_API_KEY=/i);
  });

  it('builds finished evidence with cursor run id fields', () => {
    const e = buildDispatcherRunFinishedEvidence({
      runId: '30419999999',
      mode: 'cursor_live',
      eventName: 'workflow_dispatch',
      activationStatus: 'started',
      selectedIssue: 653,
      cursorRunId: 'bc-test-run-id',
      cursorApiAttempted: true,
      readyIssues: [653, 654, 658, 661],
      eligibleIssues: [653, 658, 661],
    });
    assert.equal(e.selected_issue, '653');
    assert.equal(e.cursor_run_id, 'bc-test-run-id');
    assert.equal(e.cursor_api_attempted, true);
    assert.match(e.markdown, /Cursor API attempted: yes/);
    assert.match(e.markdown, /Cursor run ID: bc-test-run-id/);
  });

  it('classifies missing post-merge / missing manual run', () => {
    const missing = classifyMissingDispatcherRunEvidence({
      mergeCommitAt: '2026-07-29T01:38:22Z',
      latestDispatcherRunCreatedAt: '2026-07-28T23:07:23Z',
      claimedManualTriggerAt: '2026-07-29T01:50:00Z',
      nowIso: '2026-07-29T02:10:00Z',
    });
    assert.equal(missing.category, 'no_run_after_merge');
    assert.equal(missing.anton_action_required, true);

    const manual = classifyMissingDispatcherRunEvidence({
      mergeCommitAt: '2026-07-28T10:00:00Z',
      latestDispatcherRunCreatedAt: '2026-07-28T23:07:23Z',
      claimedManualTriggerAt: '2026-07-29T01:50:00Z',
      nowIso: '2026-07-29T02:10:00Z',
    });
    assert.equal(manual.category, 'manual_trigger_left_no_run');
    assert.equal(manual.anton_action_required, true);
  });

  it('classifies the concrete #661 post-#662 gap as no_run_after_merge', () => {
    // Evidence captured 2026-07-29: #662 merged 01:38:22Z; latest Factory dispatcher
    // activate run is still schedule 30406962357 at 23:07:23Z previous day.
    const gap = classifyMissingDispatcherRunEvidence({
      mergeCommitAt: '2026-07-29T01:38:22Z',
      latestDispatcherRunCreatedAt: '2026-07-28T23:07:23Z',
      claimedManualTriggerAt: '2026-07-29T01:58:08Z',
      nowIso: '2026-07-29T02:16:00Z',
    });
    assert.equal(gap.category, 'no_run_after_merge');
    assert.match(gap.message, /post-merge/i);
  });
});
