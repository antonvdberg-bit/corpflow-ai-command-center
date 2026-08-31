/**
 * #1249 supersedes the former 3+2 capacity allowance.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CURSOR_WIP_MAX_SLOTS,
  CURSOR_WIP_TEMPORAL_EXTRA_SLOTS,
  CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS,
  evaluateCursorWipCapacity,
  resolveEffectiveCursorWipMaxSlots,
} from '../lib/server/cursor-wip-control.js';

describe('Cursor spend control capacity (#1249)', () => {
  it('keeps exactly one active implementation lane even when Temporal is marked active', () => {
    assert.equal(CURSOR_WIP_MAX_SLOTS, 1);
    assert.equal(CURSOR_WIP_TEMPORAL_EXTRA_SLOTS, 0);
    assert.equal(CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS, 1);
    assert.equal(
      resolveEffectiveCursorWipMaxSlots({
        env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
      }),
      1,
    );
    const capacity = evaluateCursorWipCapacity({
      trackedIssues: [],
      readyIssues: [],
      env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
    });
    assert.equal(capacity.maxSlots, 1);
  });
});
