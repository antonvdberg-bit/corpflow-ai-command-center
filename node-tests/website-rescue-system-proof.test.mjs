import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { toOnboardingHandoff } from '../lib/revenue/commercial-approval.js';
import {
  canStartBuild,
  evaluateAcceptanceReady,
  evaluateOnboardingCompleteness,
  evaluateSharedOnboardingChecklist,
} from '../lib/website-rescue/onboarding-delivery.js';
import {
  SYSTEM_PROOF_COMMERCIAL_FIXTURE_REL,
  SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL,
  buildSystemProofIntake,
  completeOnboardingInputs,
  loadSystemProofCommercialOpportunity,
  proveBuildGateBlocks,
  runWebsiteRescueSystemProof,
  seedOnboardingRecordFromHandoff,
  walkSystemProofDeliveryPath,
} from '../lib/website-rescue/system-proof.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('Website Rescue system-proof — commercial handoff (#716 / #714)', () => {
  it('fresh synthetic commercial opportunity is financially approvable via #714 handoff', () => {
    assert.equal(existsSync(path.join(REPO_ROOT, SYSTEM_PROOF_COMMERCIAL_FIXTURE_REL)), true);
    const commercial = loadSystemProofCommercialOpportunity();
    assert.equal(commercial.id, 'synthetic-ca-wr-sys-716-001');
    assert.equal(commercial.opportunity_ref, 'OPP-SYN-WR-SYS-716-001');
    assert.ok(String(commercial.commercial_notes || '').includes('system-proof'));
    assert.ok(!/sk_live|password\s*[:=]|api[_-]?key\s*[:=]/i.test(JSON.stringify(commercial)));

    const handoff = toOnboardingHandoff(commercial);
    assert.equal(handoff.financially_approved, true);
    assert.equal(handoff.product, 'website-rescue');
    assert.equal(handoff.commercial_product, 'website-rescue');
    assert.equal(handoff.financial_approval_ref, 'FA-SYN-WR-SYS-716-001');
    assert.equal(handoff.protected_actions_executed, false);
    assert.deepEqual(handoff.blockers, []);
  });

  it('system-proof intake covers required Website Rescue capture fields', () => {
    const intake = buildSystemProofIntake();
    const completeness = evaluateOnboardingCompleteness(intake);
    assert.equal(completeness.complete, true, completeness.missing.join(','));
    assert.equal(intake.case_type, 'rebuild');
    assert.equal(intake.tier, 'T3');
    assert.ok(Array.isArray(intake.pages_in_scope) && intake.pages_in_scope.length >= 4);
    assert.ok(intake.domain_hostname);
    assert.ok(intake.hosting_facts_summary);
    assert.ok(intake.brand_assets_status);
    assert.ok(intake.content_ownership);
    assert.ok(intake.enquiry_destination);
    assert.ok(intake.revision_authority);
    assert.ok(intake.maintenance_boundary);
    // Instructional copy may mention "passwords"; forbid actual secret-shaped values.
    assert.ok(!/sk_live|BEGIN (RSA |OPENSSH )?PRIVATE KEY|password\s*[:=]\s*\S+/i.test(JSON.stringify(intake)));
    assert.equal(Object.prototype.hasOwnProperty.call(intake, 'dns_password'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(intake, 'hosting_password'), false);
  });
});

describe('Website Rescue system-proof — path approved_to_onboard → acceptance_ready', () => {
  it('runs full synthetic path with revision, deploy/DNS simulation, handover', () => {
    const artifactAbs = path.join(REPO_ROOT, SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL);
    if (existsSync(artifactAbs)) unlinkSync(artifactAbs);

    const report = runWebsiteRescueSystemProof({ writeArtifact: true });
    assert.equal(report.ok, true, JSON.stringify(report.delivery || report.reason));
    assert.equal(report.handoff.financially_approved, true);
    assert.equal(report.onboarding.build_ok_after_inputs, true);
    assert.equal(report.delivery.final_state, 'acceptance_ready');
    assert.equal(report.delivery.acceptance_ready.ok, true);
    assert.equal(report.final_record.real_dns_cutover_executed, false);
    assert.equal(report.final_record.real_client_production_deploy, false);
    assert.equal(report.final_record.deploy_approval_simulated, true);
    assert.equal(report.final_record.dns_cutover_authorized_simulated, true);
    assert.ok(report.final_record.evidence_packet_ids.includes('preview'));
    assert.ok(report.final_record.evidence_packet_ids.includes('handover'));
    assert.ok(report.final_record.evidence_packet_ids.includes('maintenance_boundary'));

    const states = report.delivery.transitions.map((t) => t.to);
    for (const required of [
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
    ]) {
      assert.ok(states.includes(required), `missing transition to ${required}`);
    }

    assert.equal(existsSync(artifactAbs), true);
    const artifact = JSON.parse(read(SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL));
    assert.equal(artifact.schema, 'corpflow.website_rescue_system_proof.v1');
    assert.equal(artifact.ok, true);
    assert.equal(artifact.simulation_only, true);
  });

  it('seeded handoff without content/access cannot start build; complete inputs unlock it', () => {
    const handoff = toOnboardingHandoff(loadSystemProofCommercialOpportunity());
    let record = seedOnboardingRecordFromHandoff(handoff);
    assert.equal(record.delivery_state, 'approved_to_onboard');
    assert.equal(record.financially_approved, true);
    assert.equal(canStartBuild(record).ok, false);
    assert.ok(
      ['MISSING_CONTENT_OR_ASSETS', 'MISSING_APPROVED_ACCESS'].includes(canStartBuild(record).reason),
    );

    record = completeOnboardingInputs(record);
    assert.equal(evaluateSharedOnboardingChecklist(record).complete, true);
    assert.equal(canStartBuild(record).ok, true);

    const walk = walkSystemProofDeliveryPath(record, { includeRevisionCycle: true });
    assert.equal(walk.ok, true, walk.reason);
    assert.equal(evaluateAcceptanceReady(walk.record).ok, true);
  });
});

describe('Website Rescue system-proof — gate block proofs', () => {
  it('missing financial approval, content/assets, or approved access blocks build/cutover progression', () => {
    const handoff = toOnboardingHandoff(loadSystemProofCommercialOpportunity());
    const ready = completeOnboardingInputs(seedOnboardingRecordFromHandoff(handoff));
    const proof = proveBuildGateBlocks(ready);

    assert.equal(proof.missing_financial_approval.can_start_build.ok, false);
    assert.equal(
      proof.missing_financial_approval.can_start_build.reason,
      'MISSING_FINANCIAL_APPROVAL',
    );
    assert.equal(proof.missing_financial_approval.transition.ok, false);
    assert.equal(proof.missing_financial_approval.transition.gate_reason, 'MISSING_FINANCIAL_APPROVAL');

    assert.equal(proof.missing_content_or_assets.can_start_build.ok, false);
    assert.equal(
      proof.missing_content_or_assets.can_start_build.reason,
      'MISSING_CONTENT_OR_ASSETS',
    );
    assert.equal(proof.missing_content_or_assets.transition.gate_reason, 'MISSING_CONTENT_OR_ASSETS');

    assert.equal(proof.missing_approved_access.can_start_build.ok, false);
    assert.equal(proof.missing_approved_access.can_start_build.reason, 'MISSING_APPROVED_ACCESS');
    assert.equal(proof.missing_approved_access.transition.gate_reason, 'MISSING_APPROVED_ACCESS');
  });
});

describe('Website Rescue system-proof — docs and secrets hygiene', () => {
  it('system-proof doc exists with sentinels and anti-sidetrack boundaries', () => {
    const rel = 'docs/operations/WEBSITE_RESCUE_SYSTEM_PROOF_V1.md';
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
    const body = read(rel);
    assert.ok(body.includes('<!-- WEBSITE_RESCUE_SYSTEM_PROOF_V1 -->'));
    assert.ok(body.includes('#716'));
    assert.ok(body.includes('#714'));
    assert.ok(body.includes('financially_approved'));
    assert.ok(body.includes('acceptance_ready'));
    assert.ok(body.includes('simulation'));
    assert.ok(body.includes('No DNS') || body.includes('no DNS') || body.includes('simulated'));
    assert.ok(!/sk_live|BEGIN RSA PRIVATE KEY|api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]/i.test(body));
  });
});
