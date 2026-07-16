import assert from 'node:assert/strict';
import test from 'node:test';

import {
  forwardAutomationEnvelope,
  isAutomationForwardSuppressedForTests,
} from '../lib/automation/forward.js';

test('automation forward suppression detects test runtimes', () => {
  assert.equal(isAutomationForwardSuppressedForTests({ NODE_ENV: 'test' }), true);
  assert.equal(isAutomationForwardSuppressedForTests({ NODE_TEST_CONTEXT: 'child-v8' }), true);
  assert.equal(isAutomationForwardSuppressedForTests({ NODE_ENV: 'production' }), false);
});

test('node test runner never calls the configured automation endpoint', async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.CORPFLOW_AUTOMATION_FORWARD_URL;
  let fetchCalls = 0;

  process.env.CORPFLOW_AUTOMATION_FORWARD_URL =
    'https://example.invalid/automation-forward-must-not-run';
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('fetch must not run from unit tests');
  };

  try {
    assert.equal(isAutomationForwardSuppressedForTests(), true);
    await forwardAutomationEnvelope({
      schema: 'corpflow.automation.envelope.v1',
      id: 'test-event',
      event_type: 'test.event',
      payload: {},
    });
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl == null) {
      delete process.env.CORPFLOW_AUTOMATION_FORWARD_URL;
    } else {
      process.env.CORPFLOW_AUTOMATION_FORWARD_URL = previousUrl;
    }
  }
});
