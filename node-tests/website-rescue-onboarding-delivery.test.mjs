import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  canSimulateDeployApproval,
  canSimulateDnsCutover,
  canStartBuild,
  createEmptyWebsiteRescueIntake,
  evaluateAcceptanceReady,
  evaluateEvidencePacket,
  evaluateOnboardingCompleteness,
  evaluateSharedOnboardingChecklist,
  isAllowedDeliveryTransition,
  listCaseTypes,
  listDeliveryStates,
  listDeliveryTransitions,
  loadWebsiteRescueOnboardingDeliveryConfig,
  resetWebsiteRescueOnboardingDeliveryConfigCache,
  transitionDeliveryState,
} from '../lib/website-rescue/onboarding-delivery.js';

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
  'docs/operations/WEBSITE_RESCUE_ONBOARDING_AND_DELIVERY_V1.md',
  'docs/operations/templates/website-rescue-onboarding-intake.md',
  'docs/operations/templates/website-rescue-delivery-issue.md',
  'config/website-rescue-onboarding-delivery.v1.json',
];

const FIXTURES = {
  onePage: 'fixtures/website-rescue-onboarding/one-page-complete.json',
  upgrade: 'fixtures/website-rescue-onboarding/upgrade-complete.json',
  rebuild: 'fixtures/website-rescue-onboarding/rebuild-complete.json',
  smallCatalogue: 'fixtures/website-rescue-onboarding/small-catalogue-complete.json',
  incomplete: 'fixtures/website-rescue-onboarding/incomplete.json',
  blockedContent: 'fixtures/website-rescue-onboarding/blocked-content-assets.json',
  blockedAccess: 'fixtures/website-rescue-onboarding/blocked-access.json',
  acceptanceReady: 'fixtures/website-rescue-onboarding/acceptance-ready.json',
};

describe('Website Rescue onboarding/delivery — checklist/template completeness (#716)', () => {
  it('config and docs exist with sentinels and required sections', () => {
    for (const rel of DOC_FILES) {
      assert.equal(exists(rel), true, `missing ${rel}`);
      assert.ok(read(rel).length > 200, `${rel} too short`);
    }
    const canonical = read('docs/operations/WEBSITE_RESCUE_ONBOARDING_AND_DELIVERY_V1.md');
    assert.ok(canonical.includes('<!-- WEBSITE_RESCUE_ONBOARDING_AND_DELIVERY_V1 -->'));
    assert.ok(canonical.includes('#716'));
    assert.ok(canonical.includes('financially_approved'));
    assert.ok(canonical.includes('content_assets_ready'));
    assert.ok(canonical.includes('approved_access_confirmed'));
    assert.ok(canonical.includes('deploy_approval_simulated'));
    assert.ok(canonical.includes('dns_cutover'));
    assert.ok(canonical.includes('maintenance'));
    assert.ok(canonical.includes('upgrade'));
    assert.ok(canonical.includes('rebuild'));
    assert.ok(canonical.includes('one_page') || canonical.includes('one-page'));
    assert.ok(canonical.includes('small_catalogue') || canonical.includes('catalogue'));
    assert.ok(!/sk_live|api[_-]?key\s*[:=]|password\s*[:=]\s*['\"][^'\"]+['\"]/i.test(canonical));
  });

  it('intake template captures required Website Rescue fields', () => {
    const tpl = read('docs/operations/templates/website-rescue-onboarding-intake.md');
    const config = loadWebsiteRescueOnboardingDeliveryConfig();
    for (const field of config.website_rescue_intake_fields) {
      assert.ok(tpl.includes(field.id), `intake template missing field ${field.id}`);
    }
    assert.ok(tpl.includes('shared.financial_approval'));
    assert.ok(tpl.includes('content_assets_ready'));
    assert.ok(tpl.includes('approved_access_confirmed'));
    assert.ok(tpl.includes('Do **not** collect passwords') || tpl.includes('passwords'));
    assert.ok(tpl.includes('approved secret channel'));
  });

  it('delivery issue template covers state model and evidence packets', () => {
    const tpl = read('docs/operations/templates/website-rescue-delivery-issue.md');
    const config = loadWebsiteRescueOnboardingDeliveryConfig();
    for (const state of config.delivery_states) {
      assert.ok(tpl.includes(state), `delivery issue template missing state ${state}`);
    }
    for (const packet of config.evidence_packets) {
      assert.ok(
        tpl.toLowerCase().includes(String(packet.id).replace(/_/g, ' ')) ||
          tpl.includes(packet.id),
        `delivery issue template missing evidence packet ${packet.id}`,
      );
    }
    assert.ok(tpl.includes('Deploy approval') || tpl.includes('deploy_approval'));
    assert.ok(tpl.includes('DNS') || tpl.includes('dns_cutover'));
    assert.ok(tpl.includes('#714') || tpl.includes('payment'));
    assert.ok(tpl.includes('#721') || tpl.includes('Prospect'));
  });

  it('config contract lists shared checklist, intake fields, transitions, cutover gates', () => {
    resetWebsiteRescueOnboardingDeliveryConfigCache();
    const config = loadWebsiteRescueOnboardingDeliveryConfig();
    assert.equal(config.schema, 'corpflow.website_rescue_onboarding_delivery.v1');
    assert.equal(config.issue, 716);
    assert.ok(config.shared_onboarding_checklist.length >= 6);
    assert.ok(config.website_rescue_intake_fields.length >= 15);
    assert.ok(config.delivery_states.includes('acceptance_ready'));
    assert.ok(config.delivery_states.includes('deploy_approved_simulated'));
    assert.ok(config.delivery_states.includes('dns_cutover_gated'));
    assert.ok(config.delivery_transitions.length >= 10);
    assert.ok(config.build_start_blockers.includes('MISSING_FINANCIAL_APPROVAL'));
    assert.ok(config.build_start_blockers.includes('MISSING_CONTENT_OR_ASSETS'));
    assert.ok(config.build_start_blockers.includes('MISSING_APPROVED_ACCESS'));
    assert.ok(config.cutover_blockers.includes('DEPLOY_APPROVAL_NOT_SIMULATED'));
    assert.ok(config.cutover_blockers.includes('DNS_CUTOVER_NOT_AUTHORIZED'));
    assert.deepEqual(listCaseTypes(), ['upgrade', 'rebuild', 'one_page', 'small_catalogue']);
  });
});

describe('Website Rescue onboarding/delivery — synthetic case records (#716)', () => {
  for (const [label, rel] of [
    ['one_page', FIXTURES.onePage],
    ['upgrade', FIXTURES.upgrade],
    ['rebuild', FIXTURES.rebuild],
    ['small_catalogue', FIXTURES.smallCatalogue],
  ]) {
    it(`${label} fixture is intake-complete and can start build`, () => {
      const record = readJson(rel);
      assert.equal(record.intake.case_type, label);
      const completeness = evaluateOnboardingCompleteness(record.intake);
      assert.equal(completeness.complete, true, completeness.missing.join(','));
      const shared = evaluateSharedOnboardingChecklist(record);
      assert.equal(shared.complete, true, shared.missing.join(','));
      const gate = canStartBuild(record);
      assert.equal(gate.ok, true, gate.reason);
      assert.equal(canSimulateDeployApproval(record).ok, false);
    });
  }

  it('incomplete fixture fails completeness and blocks build', () => {
    const record = readJson(FIXTURES.incomplete);
    const completeness = evaluateOnboardingCompleteness(record.intake);
    assert.equal(completeness.complete, false);
    assert.ok(completeness.missing.includes('working_email'));
    assert.ok(completeness.missing.includes('pages_in_scope'));
    assert.ok(completeness.missing.includes('enquiry_destination'));
    assert.ok(completeness.missing.includes('brand_assets_status_pending'));
    const gate = canStartBuild(record);
    assert.equal(gate.ok, false);
    assert.equal(gate.reason, 'MISSING_REQUIRED_CLIENT_INPUTS');
  });

  it('blocked content/assets fixture blocks build', () => {
    const record = readJson(FIXTURES.blockedContent);
    const completeness = evaluateOnboardingCompleteness(record.intake);
    assert.equal(completeness.complete, true, completeness.missing.join(','));
    const gate = canStartBuild(record);
    assert.equal(gate.ok, false);
    assert.ok(
      gate.reason === 'BLOCKED_CLIENT_INPUTS' || gate.reason === 'MISSING_CONTENT_OR_ASSETS',
      gate.reason,
    );
  });

  it('blocked access fixture blocks build even when content ready', () => {
    const record = readJson(FIXTURES.blockedAccess);
    assert.equal(record.content_assets_ready, true);
    assert.equal(record.approved_access_confirmed, false);
    const gate = canStartBuild(record);
    assert.equal(gate.ok, false);
    assert.ok(
      gate.reason === 'BLOCKED_CLIENT_INPUTS' || gate.reason === 'MISSING_APPROVED_ACCESS',
      gate.reason,
    );
  });

  it('missing financial approval prevents build start', () => {
    const record = readJson(FIXTURES.onePage);
    record.financially_approved = false;
    const gate = canStartBuild(record);
    assert.equal(gate.ok, false);
    assert.equal(gate.reason, 'MISSING_FINANCIAL_APPROVAL');

    delete record.financially_approved;
    const gate2 = canStartBuild(record);
    assert.equal(gate2.ok, false);
    assert.equal(gate2.reason, 'MISSING_FINANCIAL_APPROVAL');
  });

  it('missing content/assets alone prevents build start', () => {
    const record = readJson(FIXTURES.onePage);
    record.content_assets_ready = false;
    record.blocked_inputs = [];
    const gate = canStartBuild(record);
    assert.equal(gate.ok, false);
    assert.equal(gate.reason, 'MISSING_CONTENT_OR_ASSETS');
  });

  it('missing approved access alone prevents build start', () => {
    const record = readJson(FIXTURES.onePage);
    record.approved_access_confirmed = false;
    record.blocked_inputs = [];
    const gate = canStartBuild(record);
    assert.equal(gate.ok, false);
    assert.equal(gate.reason, 'MISSING_APPROVED_ACCESS');
  });

  it('forbidden credential fields in intake block build', () => {
    const record = readJson(FIXTURES.onePage);
    record.intake.dns_password = 'should-never-be-here';
    const gate = canStartBuild(record);
    assert.equal(gate.ok, false);
    assert.equal(gate.reason, 'BLOCKED_CLIENT_INPUTS');
    assert.ok(gate.blocked.includes('forbidden_field:dns_password'));
  });

  it('acceptance-ready fixture has all evidence packets without real cutover', () => {
    const record = readJson(FIXTURES.acceptanceReady);
    assert.equal(record.real_dns_cutover_executed, false);
    assert.equal(record.real_client_production_deploy, false);
    assert.equal(record.deploy_approval_simulated, true);
    assert.equal(record.dns_cutover_authorized_simulated, true);
    const ready = evaluateAcceptanceReady(record);
    assert.equal(ready.ok, true, JSON.stringify(ready.incomplete || ready.reason));
    for (const packetId of [
      'preview',
      'revision',
      'deploy_approval',
      'dns_cutover',
      'live_validation',
      'acceptance',
      'handover',
      'maintenance_boundary',
    ]) {
      assert.equal(evaluateEvidencePacket(record, packetId).ok, true, packetId);
    }
  });
});

describe('Website Rescue onboarding/delivery — state transitions (#716)', () => {
  it('lists a connected state graph from approved_to_onboard to acceptance_ready', () => {
    const states = listDeliveryStates();
    const transitions = listDeliveryTransitions();
    assert.ok(states.includes('approved_to_onboard'));
    assert.ok(states.includes('acceptance_ready'));
    assert.ok(states.includes('revision_cycle'));
    assert.ok(states.includes('deploy_approval_pending'));
    assert.ok(transitions.some((t) => t.from === 'approved_to_onboard' && t.to === 'onboarding_in_progress'));
    assert.ok(isAllowedDeliveryTransition('build_started', 'preview_evidence'));
    assert.equal(isAllowedDeliveryTransition('approved_to_onboard', 'acceptance_ready'), false);
  });

  it('walks synthetic rebuild record through build/cutover simulation to acceptance_ready', () => {
    let record = readJson(FIXTURES.rebuild);
    record.delivery_state = 'approved_to_onboard';

    const pathStates = [
      'onboarding_in_progress',
      'onboarding_complete',
      'build_started',
      'preview_evidence',
      'revision_cycle',
      'deploy_approval_pending',
      'deploy_approved_simulated',
      'dns_cutover_gated',
      'live_validation_simulated',
      'accepted',
      'handover_complete',
      'acceptance_ready',
    ];

    for (const next of pathStates) {
      if (next === 'deploy_approved_simulated') {
        record.deploy_approval_simulated = true;
      }
      if (next === 'live_validation_simulated') {
        record.dns_cutover_authorized_simulated = true;
      }
      if (next === 'preview_evidence') {
        record.evidence = readJson(FIXTURES.acceptanceReady).evidence;
      }
      const result = transitionDeliveryState(record, next);
      assert.equal(result.ok, true, `${record.delivery_state} -> ${next}: ${result.reason}`);
      record = result.record;
    }

    assert.equal(record.delivery_state, 'acceptance_ready');
    assert.equal(record.real_dns_cutover_executed, false);
    assert.equal(evaluateAcceptanceReady(record).ok, true);
  });

  it('walks one-page path without DNS-in-scope still reaches acceptance_ready', () => {
    let record = readJson(FIXTURES.onePage);
    record.delivery_state = 'approved_to_onboard';
    record.dns_cutover_in_scope = false;

    const pathStates = [
      'onboarding_in_progress',
      'onboarding_complete',
      'build_started',
      'preview_evidence',
      'deploy_approval_pending',
      'deploy_approved_simulated',
      'dns_cutover_gated',
      'live_validation_simulated',
      'accepted',
      'handover_complete',
      'acceptance_ready',
    ];

    for (const next of pathStates) {
      if (next === 'deploy_approved_simulated') {
        record.deploy_approval_simulated = true;
      }
      if (next === 'preview_evidence') {
        // Adapt acceptance evidence for no DNS-in-scope case
        const evidence = structuredClone(readJson(FIXTURES.acceptanceReady).evidence);
        evidence.dns_cutover = {
          in_scope: false,
          authorization_status: 'not_required',
          simulation_only: true,
          operator_note: 'DNS cutover not in scope for one-page rescue.',
        };
        record.evidence = evidence;
      }
      const result = transitionDeliveryState(record, next);
      assert.equal(result.ok, true, `${record.delivery_state} -> ${next}: ${result.reason}`);
      record = result.record;
    }

    assert.equal(canSimulateDnsCutover(record).ok, true);
    assert.equal(evaluateAcceptanceReady(record).ok, true);
  });

  it('refuses build_started when financial approval missing', () => {
    const record = readJson(FIXTURES.onePage);
    record.delivery_state = 'onboarding_complete';
    record.financially_approved = false;
    const result = transitionDeliveryState(record, 'build_started');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'BUILD_GATE_BLOCKED');
    assert.equal(result.gate.reason, 'MISSING_FINANCIAL_APPROVAL');
  });

  it('refuses build_started when content/assets missing', () => {
    const record = readJson(FIXTURES.onePage);
    record.delivery_state = 'onboarding_complete';
    record.content_assets_ready = false;
    record.blocked_inputs = [];
    const result = transitionDeliveryState(record, 'build_started');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'BUILD_GATE_BLOCKED');
    assert.equal(result.gate.reason, 'MISSING_CONTENT_OR_ASSETS');
  });

  it('refuses build_started when approved access missing', () => {
    const record = readJson(FIXTURES.onePage);
    record.delivery_state = 'onboarding_complete';
    record.approved_access_confirmed = false;
    record.blocked_inputs = [];
    const result = transitionDeliveryState(record, 'build_started');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'BUILD_GATE_BLOCKED');
    assert.equal(result.gate.reason, 'MISSING_APPROVED_ACCESS');
  });

  it('refuses deploy_approved_simulated without deploy_approval_simulated', () => {
    const record = readJson(FIXTURES.onePage);
    record.delivery_state = 'deploy_approval_pending';
    record.deploy_approval_simulated = false;
    const result = transitionDeliveryState(record, 'deploy_approved_simulated');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'CUTOVER_GATE_BLOCKED');
    assert.equal(result.gate.reason, 'DEPLOY_APPROVAL_NOT_SIMULATED');
  });

  it('refuses live_validation_simulated when DNS cutover in scope but not authorized', () => {
    const record = readJson(FIXTURES.rebuild);
    record.delivery_state = 'dns_cutover_gated';
    record.dns_cutover_in_scope = true;
    record.dns_cutover_authorized_simulated = false;
    const result = transitionDeliveryState(record, 'live_validation_simulated');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'CUTOVER_GATE_BLOCKED');
    assert.equal(result.gate.reason, 'DNS_CUTOVER_NOT_AUTHORIZED');
  });

  it('refuses onboarding_complete while blocked inputs remain', () => {
    const record = readJson(FIXTURES.blockedContent);
    record.delivery_state = 'onboarding_in_progress';
    const result = transitionDeliveryState(record, 'onboarding_complete');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'BLOCKED_CLIENT_INPUTS');
  });

  it('empty intake helper seeds defaults but is not build-ready', () => {
    const intake = createEmptyWebsiteRescueIntake('small_catalogue');
    assert.equal(intake.case_type, 'small_catalogue');
    assert.ok(Array.isArray(intake.pages_in_scope) && intake.pages_in_scope.length >= 1);
    assert.ok(Array.isArray(intake.exclusions) && intake.exclusions.length >= 1);
    const completeness = evaluateOnboardingCompleteness(intake);
    assert.equal(completeness.complete, false);
    assert.equal(
      canStartBuild({
        financially_approved: true,
        content_assets_ready: true,
        approved_access_confirmed: true,
        intake,
        blocked_inputs: [],
      }).ok,
      false,
    );
  });

  it('acceptance path rejects real cutover flags', () => {
    const record = readJson(FIXTURES.acceptanceReady);
    record.real_dns_cutover_executed = true;
    const ready = evaluateAcceptanceReady(record);
    assert.equal(ready.ok, false);
    assert.equal(ready.reason, 'REAL_CUTOVER_NOT_ALLOWED_IN_SYNTHETIC_PATH');
  });
});
