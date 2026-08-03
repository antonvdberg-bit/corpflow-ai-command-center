import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  canStartBuild,
  canUseMessagingRuntime,
  createEmptyLeadRescueIntake,
  evaluateAcceptanceReady,
  evaluateEvidencePacket,
  evaluateOnboardingCompleteness,
  evaluateSharedOnboardingChecklist,
  isAllowedDeliveryTransition,
  listDeliveryStates,
  listDeliveryTransitions,
  loadLeadRescueOnboardingDeliveryConfig,
  resetLeadRescueOnboardingDeliveryConfigCache,
  transitionDeliveryState,
} from '../lib/lead-rescue/onboarding-delivery.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

function exists(rel) {
  return existsSync(path.join(REPO_ROOT, rel));
}

const DOC_FILES = [
  'docs/operations/LEAD_RESCUE_ONBOARDING_AND_DELIVERY_V1.md',
  'docs/operations/templates/lead-rescue-onboarding-intake.md',
  'docs/operations/templates/lead-rescue-delivery-issue.md',
  'config/lead-rescue-onboarding-delivery.v1.json',
];

const FIXTURES = {
  complete: 'fixtures/lead-rescue-onboarding/complete.json',
  incomplete: 'fixtures/lead-rescue-onboarding/incomplete.json',
  blocked: 'fixtures/lead-rescue-onboarding/blocked-input.json',
  acceptanceReady: 'fixtures/lead-rescue-onboarding/acceptance-ready.json',
};

describe('Lead Rescue onboarding/delivery — checklist/template completeness (#715)', () => {
  it('config and docs exist with sentinels and required sections', () => {
    for (const rel of DOC_FILES) {
      assert.equal(exists(rel), true, `missing ${rel}`);
      assert.ok(read(rel).length > 200, `${rel} too short`);
    }
    const canonical = read('docs/operations/LEAD_RESCUE_ONBOARDING_AND_DELIVERY_V1.md');
    assert.ok(canonical.includes('<!-- LEAD_RESCUE_ONBOARDING_AND_DELIVERY_V1 -->'));
    assert.ok(canonical.includes('#715'));
    assert.ok(canonical.includes('financially_approved'));
    assert.ok(canonical.includes('messaging_runtime'));
    assert.ok(canonical.includes('enquiry sources') || canonical.includes('enquiry_sources'));
    assert.ok(canonical.includes('escalation'));
    assert.ok(canonical.includes('acceptance'));
    assert.ok(canonical.includes('support boundary') || canonical.includes('support_boundary'));
    assert.ok(!/sk_live|api[_-]?key\s*[:=]/i.test(canonical));
  });

  it('intake template captures required Lead Rescue fields', () => {
    const tpl = read('docs/operations/templates/lead-rescue-onboarding-intake.md');
    const config = loadLeadRescueOnboardingDeliveryConfig();
    for (const field of config.lead_rescue_intake_fields) {
      assert.ok(tpl.includes(field.id), `intake template missing field ${field.id}`);
    }
    assert.ok(tpl.includes('shared.financial_approval'));
    assert.ok(tpl.includes('Do **not** collect passwords') || tpl.includes('passwords'));
  });

  it('delivery issue template covers state model and evidence packets', () => {
    const tpl = read('docs/operations/templates/lead-rescue-delivery-issue.md');
    const config = loadLeadRescueOnboardingDeliveryConfig();
    for (const state of config.delivery_states) {
      assert.ok(tpl.includes(state), `delivery issue template missing state ${state}`);
    }
    for (const packet of config.evidence_packets) {
      assert.ok(
        tpl.toLowerCase().includes(String(packet.id).replace('_', ' ')) ||
          tpl.includes(packet.id),
        `delivery issue template missing evidence packet ${packet.id}`,
      );
    }
    assert.ok(tpl.includes('Messaging runtime'));
    assert.ok(tpl.includes('#721') || tpl.includes('Prospect'));
    assert.ok(tpl.includes('#714') || tpl.includes('payment'));
  });

  it('config contract lists shared checklist, intake fields, transitions, messaging gate', () => {
    resetLeadRescueOnboardingDeliveryConfigCache();
    const config = loadLeadRescueOnboardingDeliveryConfig();
    assert.equal(config.schema, 'corpflow.lead_rescue_onboarding_delivery.v1');
    assert.equal(config.issue, 715);
    assert.ok(config.shared_onboarding_checklist.length >= 6);
    assert.ok(config.lead_rescue_intake_fields.length >= 15);
    assert.ok(config.delivery_states.includes('acceptance_ready'));
    assert.ok(config.delivery_transitions.length >= 10);
    assert.equal(config.messaging_runtime_gate.default, false);
    assert.ok(config.build_start_blockers.includes('MISSING_FINANCIAL_APPROVAL'));
    assert.ok(config.build_start_blockers.includes('MISSING_REQUIRED_CLIENT_INPUTS'));
  });
});

describe('Lead Rescue onboarding/delivery — synthetic records (#715)', () => {
  it('complete fixture is intake-complete and can start build', () => {
    const record = readJson(FIXTURES.complete);
    const completeness = evaluateOnboardingCompleteness(record.intake);
    assert.equal(completeness.complete, true, completeness.missing.join(','));
    const shared = evaluateSharedOnboardingChecklist(record);
    assert.equal(shared.complete, true, shared.missing.join(','));
    const gate = canStartBuild(record);
    assert.equal(gate.ok, true);
    assert.equal(canUseMessagingRuntime(record).ok, false);
  });

  it('incomplete fixture fails completeness and blocks build', () => {
    const record = readJson(FIXTURES.incomplete);
    const completeness = evaluateOnboardingCompleteness(record.intake);
    assert.equal(completeness.complete, false);
    assert.ok(completeness.missing.includes('working_email'));
    assert.ok(completeness.missing.includes('users_operators'));
    assert.ok(completeness.missing.includes('escalation_rules'));
    const gate = canStartBuild(record);
    assert.equal(gate.ok, false);
    assert.equal(gate.reason, 'MISSING_REQUIRED_CLIENT_INPUTS');
  });

  it('blocked-input fixture blocks build even when intake fields are filled', () => {
    const record = readJson(FIXTURES.blocked);
    const completeness = evaluateOnboardingCompleteness(record.intake);
    assert.equal(completeness.complete, true, completeness.missing.join(','));
    const gate = canStartBuild(record);
    assert.equal(gate.ok, false);
    assert.equal(gate.reason, 'BLOCKED_CLIENT_INPUTS');
    assert.ok(gate.blocked.includes('primary_leaky_source_access_pending'));
  });

  it('missing financial approval prevents build start', () => {
    const record = readJson(FIXTURES.complete);
    record.financially_approved = false;
    const gate = canStartBuild(record);
    assert.equal(gate.ok, false);
    assert.equal(gate.reason, 'MISSING_FINANCIAL_APPROVAL');

    delete record.financially_approved;
    const gate2 = canStartBuild(record);
    assert.equal(gate2.ok, false);
    assert.equal(gate2.reason, 'MISSING_FINANCIAL_APPROVAL');
  });

  it('acceptance-ready fixture has all evidence packets without messaging runtime', () => {
    const record = readJson(FIXTURES.acceptanceReady);
    assert.equal(record.messaging_runtime_authorized, false);
    assert.equal(record.allow_real_client_sends, false);
    const ready = evaluateAcceptanceReady(record);
    assert.equal(ready.ok, true, JSON.stringify(ready.incomplete || ready.reason));
    for (const packetId of [
      'preview',
      'verification',
      'client_review',
      'acceptance',
      'handover',
      'support_boundary',
    ]) {
      assert.equal(evaluateEvidencePacket(record, packetId).ok, true, packetId);
    }
  });
});

describe('Lead Rescue onboarding/delivery — state transitions (#715)', () => {
  it('lists a connected state graph from approved_to_onboard to acceptance_ready', () => {
    const states = listDeliveryStates();
    const transitions = listDeliveryTransitions();
    assert.ok(states.includes('approved_to_onboard'));
    assert.ok(states.includes('acceptance_ready'));
    assert.ok(transitions.some((t) => t.from === 'approved_to_onboard' && t.to === 'onboarding_in_progress'));
    assert.ok(isAllowedDeliveryTransition('build_started', 'preview_evidence'));
    assert.equal(isAllowedDeliveryTransition('approved_to_onboard', 'acceptance_ready'), false);
  });

  it('walks synthetic complete record through build to acceptance_ready', () => {
    let record = readJson(FIXTURES.complete);
    record.delivery_state = 'approved_to_onboard';

    const pathStates = [
      'onboarding_in_progress',
      'onboarding_complete',
      'build_started',
      'preview_evidence',
      'verification_evidence',
      'client_review',
      'accepted',
      'handover_complete',
      'acceptance_ready',
    ];

    for (const next of pathStates) {
      const result = transitionDeliveryState(record, next);
      assert.equal(result.ok, true, `${record.delivery_state} -> ${next}: ${result.reason}`);
      record = result.record;
      if (next === 'preview_evidence') {
        record.evidence = readJson(FIXTURES.acceptanceReady).evidence;
      }
    }

    assert.equal(record.delivery_state, 'acceptance_ready');
    assert.equal(canUseMessagingRuntime(record).ok, false);
    assert.equal(evaluateAcceptanceReady(record).ok, true);
  });

  it('refuses build_started when financial approval missing', () => {
    const record = readJson(FIXTURES.complete);
    record.delivery_state = 'onboarding_complete';
    record.financially_approved = false;
    const result = transitionDeliveryState(record, 'build_started');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'BUILD_GATE_BLOCKED');
    assert.equal(result.gate.reason, 'MISSING_FINANCIAL_APPROVAL');
  });

  it('refuses build_started when required inputs incomplete', () => {
    const record = readJson(FIXTURES.incomplete);
    record.delivery_state = 'onboarding_complete';
    // Force state even though incomplete — transition into build must still fail gate.
    const result = transitionDeliveryState(record, 'build_started');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'BUILD_GATE_BLOCKED');
    assert.equal(result.gate.reason, 'MISSING_REQUIRED_CLIENT_INPUTS');
  });

  it('refuses onboarding_complete while blocked inputs remain', () => {
    const record = readJson(FIXTURES.blocked);
    record.delivery_state = 'onboarding_in_progress';
    const result = transitionDeliveryState(record, 'onboarding_complete');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'BLOCKED_CLIENT_INPUTS');
  });

  it('empty intake helper seeds defaults but is not build-ready', () => {
    const intake = createEmptyLeadRescueIntake();
    assert.ok(Array.isArray(intake.lead_stages) && intake.lead_stages.length >= 3);
    assert.ok(Array.isArray(intake.exclusions) && intake.exclusions.length >= 1);
    const completeness = evaluateOnboardingCompleteness(intake);
    assert.equal(completeness.complete, false);
    assert.equal(
      canStartBuild({ financially_approved: true, intake, blocked_inputs: [] }).ok,
      false,
    );
  });
});
