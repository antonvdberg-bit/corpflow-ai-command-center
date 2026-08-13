import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  detectAntonProtectedGateFromText,
  detectCompletionSignals,
  routeReviewOwner,
} from '../lib/server/operator-review-handoff.js';

describe('operator-review-handoff / environment gates (#679)', () => {
  it('does not treat bare production / corpflow_test doctrine as Anton production gate', () => {
    const blob = `
Treat all CorpFlowAI-hosted tenant surfaces as test environments.
client's own live production operation is separate.
corpflow_test publish is not client_production.
No production deploy without Anton approval.
`;
    assert.equal(detectAntonProtectedGateFromText(blob.toLowerCase()), null);
  });

  it('detects explicit client_production as Anton production gate', () => {
    assert.equal(
      detectAntonProtectedGateFromText(
        'requires anton client_production approval before cutover'.toLowerCase(),
      ),
      'production',
    );
  });

  it('bare secrets/messaging/payment subject mentions do not route to Anton (#896)', () => {
    assert.equal(
      detectAntonProtectedGateFromText(
        'do not expose secrets. no schema changes. test payment flow without making a payment. prepare email but do not send. mentions messaging only.'.toLowerCase(),
      ),
      null,
    );
  });

  it('affirmative schema migration routes to Anton database gate', () => {
    assert.equal(
      detectAntonProtectedGateFromText(
        'run prisma migrate to alter postgres schema and backfill rows. real db/schema change.'.toLowerCase(),
      ),
      'database',
    );
  });

  it('completion signals for #679-like text do not route to Anton for production', () => {
    const signals = detectCompletionSignals({
      issue: {
        number: 679,
        title: 'Treat CorpFlowAI-hosted surfaces as test',
        body: 'corpflow_test vs future client production. No production deploy. Live verify lux.',
      },
    });
    assert.notEqual(signals.protectedGate, 'production');
    const route = routeReviewOwner(signals, { workTypes: ['documentation'] });
    assert.equal(route.antonRequired, false);
  });
});
