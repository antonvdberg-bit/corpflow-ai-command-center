import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CORPFLOW_TEST_EVIDENCE_SEQUENCE,
  evaluateDeliveryEvidencePacket,
  isVercelPreviewRequired,
  shouldFlagMissingVercelPreview,
} from '../lib/server/corpflow-test-evidence-policy.js';

describe('corpflow_test evidence policy #973', () => {
  it('does not require Vercel preview for corpflow_test runtime work', () => {
    assert.equal(isVercelPreviewRequired('corpflow_test', 'runtime'), false);
    assert.equal(isVercelPreviewRequired('test', 'runtime'), false);
    assert.equal(shouldFlagMissingVercelPreview('test'), false);
    assert.equal(shouldFlagMissingVercelPreview('corpflow_test'), false);
    assert.equal(shouldFlagMissingVercelPreview('local'), false);
    assert.equal(shouldFlagMissingVercelPreview('client_production'), false);
  });

  it('keeps preview required only for explicit preview-sandbox runtime work', () => {
    assert.equal(isVercelPreviewRequired('preview', 'runtime'), true);
    assert.equal(shouldFlagMissingVercelPreview('preview'), true);
    assert.equal(isVercelPreviewRequired('preview', 'docs'), false);
  });

  it('AFTER: corpflow_test runtime packet completes with live test URL and no preview URL', () => {
    const result = evaluateDeliveryEvidencePacket({
      environment: 'corpflow_test',
      workKind: 'runtime',
      previewUrl: '',
      liveTestUrl: 'https://lux.corpflowai.com/change',
      deterministicTestsPassed: true,
    });
    assert.equal(result.preview_required, false);
    assert.equal(result.live_test_url_required, true);
    assert.equal(result.complete, true);
    assert.equal(result.verdict, 'COMPLETE');
    assert.equal(result.reason, 'corpflow_test_live_verified_without_preview');
    assert.equal(result.evidence_sequence, CORPFLOW_TEST_EVIDENCE_SEQUENCE);
  });

  it('corpflow_test runtime packet without live test URL is incomplete even if preview exists', () => {
    const result = evaluateDeliveryEvidencePacket({
      environment: 'test',
      workKind: 'runtime',
      previewUrl: 'https://example-preview.vercel.app',
      liveTestUrl: '',
    });
    assert.equal(result.preview_required, false);
    assert.equal(result.complete, false);
    assert.equal(result.verdict, 'INCOMPLETE');
    assert.equal(result.reason, 'corpflow_test_live_url_required');
  });

  it('docs/config-only packets complete without inventing a runtime URL', () => {
    const result = evaluateDeliveryEvidencePacket({
      environment: 'local',
      workKind: 'docs',
      previewUrl: '',
      liveTestUrl: '',
      deterministicTestsPassed: true,
    });
    assert.equal(result.preview_required, false);
    assert.equal(result.live_test_url_required, false);
    assert.equal(result.complete, true);
    assert.equal(result.reason, 'docs_or_config_deterministic_evidence');
  });

  it('client_production remains fail-closed without exact authorization', () => {
    const result = evaluateDeliveryEvidencePacket({
      environment: 'client_production',
      workKind: 'client_production_release',
      previewUrl: 'https://example-preview.vercel.app',
      liveTestUrl: 'https://lux.corpflowai.com/',
      liveClientProductionUrl: '',
      clientProductionAuthorized: false,
    });
    assert.equal(result.client_production_fail_closed, true);
    assert.equal(result.preview_required, false);
    assert.equal(result.complete, false);
    assert.equal(result.verdict, 'FAIL_CLOSED');
    assert.equal(result.reason, 'client_production_authorization_required');
  });

  it('preview evidence does not satisfy an authorized client_production release', () => {
    const result = evaluateDeliveryEvidencePacket({
      environment: 'production',
      workKind: 'client_production_release',
      previewUrl: 'https://example-preview.vercel.app',
      liveClientProductionUrl: '',
      clientProductionAuthorized: true,
    });
    assert.equal(result.verdict, 'FAIL_CLOSED');
    assert.equal(result.reason, 'preview_does_not_satisfy_client_production');
  });

  it('authorized client_production with live client URL completes', () => {
    const result = evaluateDeliveryEvidencePacket({
      environment: 'client_production',
      workKind: 'runtime',
      liveClientProductionUrl: 'https://client.example.invalid/',
      clientProductionAuthorized: true,
    });
    assert.equal(result.complete, true);
    assert.equal(result.reason, 'client_production_authorized_and_live_verified');
  });
});
