import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  detectCompletionSignals,
  detectProtectedGateFromText,
  routeReviewOwner,
} from '../lib/server/operator-review-handoff.js';

describe('operator-review-handoff environment gates', () => {
  it('does not route Anton for CorpFlowAI test doctrine text that mentions production', () => {
    const blob = `
      CorpFlowAI-hosted surfaces are test environments.
      Do not trigger a false approval:production gate.
      No deployment into any client-owned production environment is authorised.
      Publish to corpflow_test after merge.
    `.toLowerCase();
    assert.equal(detectProtectedGateFromText(blob), null);

    const signals = detectCompletionSignals({
      issue: {
        number: 679,
        title: 'Treat CorpFlowAI-hosted tenant surfaces as test environments',
        body: blob,
      },
    });
    assert.equal(signals.protectedGate, null);
    const route = routeReviewOwner(signals);
    assert.equal(route.antonRequired, false);
  });

  it('does not route Anton for normal Lux corpflow_test publish wording', () => {
    const signals = detectCompletionSignals({
      issue: {
        number: 680,
        title: 'Lux CTA update',
        body: 'Publish to lux.corpflowai.com after merge. Live validate. Vercel production channel serves the test environment.',
      },
    });
    assert.equal(signals.protectedGate, null);
    assert.equal(routeReviewOwner(signals).antonRequired, false);
  });

  it('routes Anton for explicit client_production requests', () => {
    const signals = detectCompletionSignals({
      issue: {
        number: 682,
        title: 'Client production cutover',
        body: 'Deploy into the client-owned production environment. Requires client_production approval.',
      },
    });
    assert.equal(signals.protectedGate, 'production');
    const route = routeReviewOwner(signals);
    assert.equal(route.antonRequired, true);
    assert.match(String(route.antonReason || ''), /production/i);
  });
});
