import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  inferBusinessEnvironment,
  isClientProductionEnvironment,
  isCorpflowTestEnvironment,
  normalizeBusinessEnvironment,
  textForbidsClientProduction,
  textRequestsClientProduction,
} from '../lib/server/environment-classification.js';

describe('environment-classification', () => {
  it('normalizes aliases', () => {
    assert.equal(normalizeBusinessEnvironment('test'), 'corpflow_test');
    assert.equal(normalizeBusinessEnvironment('production'), 'client_production');
    assert.equal(normalizeBusinessEnvironment('corpflow_test'), 'corpflow_test');
  });

  it('recognizes corpflow_test vs client_production helpers', () => {
    assert.equal(isCorpflowTestEnvironment('corpflow_test'), true);
    assert.equal(isCorpflowTestEnvironment('test'), true);
    assert.equal(isClientProductionEnvironment('client_production'), true);
    assert.equal(isClientProductionEnvironment('production'), true);
    assert.equal(isClientProductionEnvironment('corpflow_test'), false);
  });

  it('forbids client production when doctrine or prohibition text is present', () => {
    assert.equal(
      textForbidsClientProduction(
        'corpflowai-hosted tenant surfaces are test environments. no deployment into any client-owned production.',
      ),
      true,
    );
    assert.equal(
      textRequestsClientProduction(
        'publish to corpflowai test environment. do not trigger approval:production.',
      ),
      false,
    );
  });

  it('requests client production only for explicit client production language', () => {
    assert.equal(
      textRequestsClientProduction(
        'deploy into the client-owned production environment. requires client_production approval.',
      ),
      true,
    );
    assert.equal(
      textRequestsClientProduction(
        'update lux.corpflowai.com after merge. vercel production channel is corpflow_test.',
      ),
      false,
    );
  });

  it('infers corpflow_test for tenant hosts and client_production for gated cutovers', () => {
    assert.equal(
      inferBusinessEnvironment({
        blob: 'lux homepage on lux.corpflowai.com',
        systemBoundary: 'tenant',
        protectedGate: 'none',
        workTypes: ['ui'],
      }),
      'corpflow_test',
    );
    assert.equal(
      inferBusinessEnvironment({
        blob: 'deploy into client-owned production luxemaurice.com requires client_production approval',
        systemBoundary: 'tenant',
        protectedGate: 'production',
        workTypes: ['deployment'],
      }),
      'client_production',
    );
  });
});
