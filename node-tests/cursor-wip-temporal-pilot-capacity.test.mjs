/**
 * #1249 supersedes the former 3+2 capacity allowance.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveCursorDispatchWipLimits } from '../lib/server/cursor-issue-dispatch-lifecycle.js';

describe('Cursor spend control capacity (#1249)', () => {
  it('keeps exactly one active implementation lane even when Temporal is marked active', () => {
    const limits = { maxActiveCursorImplementationIssues: 1 };
    assert.equal(
      resolveCursorDispatchWipLimits({ wipLimits: limits }).maxActiveCursorImplementationIssues,
      1,
    );
  });
});
