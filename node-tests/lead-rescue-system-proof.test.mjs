import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { toOnboardingHandoff } from '../lib/revenue/commercial-approval.js';
import {
  canStartBuild,
  canUseMessagingRuntime,
  evaluateAcceptanceReady,
  evaluateOnboardingCompleteness,
  evaluateSharedOnboardingChecklist,
} from '../lib/lead-rescue/onboarding-delivery.js';
import {
  SYSTEM_PROOF_COMMERCIAL_FIXTURE_REL,
  SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL,
  buildSystemProofIntake,
  completeOnboardingInputs,
  loadSystemProofCommercialOpportunity,
  proveBuildGateBlocks,
  runLeadRescueSystemProof,
  seedOnboardingRecordFromHandoff,
  walkSystemProofDeliveryPath,
} from '../lib/lead-rescue/system-proof.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('Lead Rescue system-proof — commercial handoff (#715 / #714)', () => {
  it('fresh synthetic commercial opportunity is financially approvable via #714 handoff', () => {
    assert.equal(existsSync(path.join(REPO_ROOT, SYSTEM_PROOF_COMMERCIAL_FIXTURE_REL)), true);
    const commercial = loadSystemProofCommercialOpportunity();
    assert.equal(commercial.id, 'synthetic-ca-lr-sys-715-001');
    assert.equal(commercial.opportunity_ref, 'OPP-SYN-LR-SYS-715-001');
    assert.ok(String(commercial.commercial_notes || '').includes('system-proof'));
    assert.ok(!/sk_live|password\s*[:=]|api[_-]?key\s*[:=]/i.test(JSON.stringify(commercial)));

    const handoff = toOnboardingHandoff(commercial);
    assert.equal(handoff.financially_approved, true);
    assert.equal(handoff.product, 'ai-lead-rescue');
    assert.equal(handoff.commercial_product, 'lead-rescue');
    assert.equal(handoff.financial_approval_ref, 'FA-SYN-LR-SYS-715-001');
    assert.equal(handoff.protected_actions_executed, false);
    assert.deepEqual(handoff.blockers, []);
  });

  it('system-proof intake covers required Lead Rescue capture fields', () => {
    const intake = buildSystemProofIntake();
    const completeness = evaluateOnboardingCompleteness(intake);
    assert.equal(completeness.complete, true, completeness.missing.join(','));
    assert.ok(Array.isArray(intake.enquiry_sources) && intake.enquiry_sources.length >= 1);
    assert.ok(intake.primary_leaky_source);
    assert.ok(intake.enquiry_sources.includes(intake.primary_leaky_source));
    assert.ok(intake.current_process_summary);
    assert.ok(Array.isArray(intake.users_operators) && intake.users_operators.length >= 1);
    assert.ok(Array.isArray(intake.lead_stages) && intake.lead_stages.length >= 3);
    assert.ok(intake.escalation_rules);
    assert.ok(intake.approved_response_rules);
    assert.ok(Array.isArray(intake.test_scenarios) && intake.test_scenarios.length >= 1);
    assert.ok(intake.reporting_requirements);
    assert.ok(intake.named_approver);
    assert.ok(Array.isArray(intake.client_responsibilities) && intake.client_responsibilities.length >= 1);
    assert.ok(Array.isArray(intake.exclusions) && intake.exclusions.length >= 1);
    assert.ok(Array.isArray(intake.acceptance_measures) && intake.acceptance_measures.length >= 1);
    assert.ok(intake.review_cadence);
    assert.ok(!/sk_live|BEGIN (RSA |OPENSSH )?PRIVATE KEY|password\s*[:=]\s*\S+/i.test(JSON.stringify(intake)));
  });
});

describe('Lead Rescue system-proof — path approved_to_onboard → acceptance_ready', () => {
  it('runs full synthetic path with client-review loop, handover, support boundary', () => {
    const artifactAbs = path.join(REPO_ROOT, SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL);
    if (existsSync(artifactAbs)) unlinkSync(artifactAbs);

    const report = runLeadRescueSystemProof({ writeArtifact: true });
    assert.equal(report.ok, true, JSON.stringify(report.delivery || report.reason));
    assert.equal(report.handoff.financially_approved, true);
    assert.equal(report.onboarding.build_ok_after_inputs, true);
    assert.equal(report.delivery.final_state, 'acceptance_ready');
    assert.equal(report.delivery.acceptance_ready.ok, true);
    assert.equal(report.final_record.messaging_runtime_authorized, false);
    assert.equal(report.final_record.allow_real_client_sends, false);
    assert.deepEqual(report.external_sends_executed, []);
    assert.ok(report.final_record.evidence_packet_ids.includes('preview'));
    assert.ok(report.final_record.evidence_packet_ids.includes('verification'));
    assert.ok(report.final_record.evidence_packet_ids.includes('client_review'));
    assert.ok(report.final_record.evidence_packet_ids.includes('handover'));
    assert.ok(report.final_record.evidence_packet_ids.includes('support_boundary'));
    assert.ok(report.final_record.support_boundary?.in_scope);
    assert.ok(report.final_record.handover?.monitoring_window);

    const states = report.delivery.transitions.map((t) => t.to);
    for (const required of [
      'onboarding_in_progress',
      'onboarding_complete',
      'build_started',
      'preview_evidence',
      'verification_evidence',
      'client_review',
      'accepted',
      'handover_complete',
      'acceptance_ready',
    ]) {
      assert.ok(states.includes(required), `missing transition to ${required}`);
    }

    assert.equal(existsSync(artifactAbs), true);
    const artifact = JSON.parse(read(SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL));
    assert.equal(artifact.schema, 'corpflow.lead_rescue_system_proof.v1');
    assert.equal(artifact.ok, true);
    assert.equal(artifact.simulation_only, true);
    assert.equal(artifact.messaging_runtime_authorized, false);
  });

  it('seeded handoff without shared checklist cannot start build; complete inputs unlock it', () => {
    const handoff = toOnboardingHandoff(loadSystemProofCommercialOpportunity());
    let record = seedOnboardingRecordFromHandoff(handoff);
    assert.equal(record.delivery_state, 'approved_to_onboard');
    assert.equal(record.financially_approved, true);
    // Intake is complete but shared checklist incomplete — canStartBuild only checks intake + FA.
    // Build gate for Lead Rescue is FA + intake + blocked_inputs (shared checklist is operator discipline).
    assert.equal(evaluateOnboardingCompleteness(record.intake).complete, true);
    assert.equal(evaluateSharedOnboardingChecklist(record).complete, false);
    assert.equal(canStartBuild(record).ok, true);

    record = completeOnboardingInputs(record);
    assert.equal(evaluateSharedOnboardingChecklist(record).complete, true);
    assert.equal(canStartBuild(record).ok, true);
    assert.equal(canUseMessagingRuntime(record).ok, false);

    const walk = walkSystemProofDeliveryPath(record, { includeClientReviewLoop: true });
    assert.equal(walk.ok, true, walk.reason);
    assert.equal(evaluateAcceptanceReady(walk.record).ok, true);
    assert.equal(walk.messaging.ok, false);
  });
});

describe('Lead Rescue system-proof — gate block proofs', () => {
  it('missing financial approval or required inputs blocks build; messaging stays gated', () => {
    const handoff = toOnboardingHandoff(loadSystemProofCommercialOpportunity());
    const ready = completeOnboardingInputs(seedOnboardingRecordFromHandoff(handoff));
    const proof = proveBuildGateBlocks(ready);

    assert.equal(proof.missing_financial_approval.can_start_build.ok, false);
    assert.equal(
      proof.missing_financial_approval.can_start_build.reason,
      'MISSING_FINANCIAL_APPROVAL',
    );
    assert.equal(proof.missing_financial_approval.transition.ok, false);
    assert.equal(
      proof.missing_financial_approval.transition.gate_reason,
      'MISSING_FINANCIAL_APPROVAL',
    );

    assert.equal(proof.missing_required_client_inputs.can_start_build.ok, false);
    assert.equal(
      proof.missing_required_client_inputs.can_start_build.reason,
      'MISSING_REQUIRED_CLIENT_INPUTS',
    );
    assert.equal(proof.missing_required_client_inputs.transition.ok, false);

    assert.equal(proof.blocked_client_inputs.can_start_build.ok, false);
    assert.equal(proof.blocked_client_inputs.can_start_build.reason, 'BLOCKED_CLIENT_INPUTS');

    assert.equal(proof.messaging_runtime_gate.unauthorized.ok, false);
    assert.equal(
      proof.messaging_runtime_gate.unauthorized.reason,
      'MESSAGING_RUNTIME_NOT_AUTHORIZED',
    );
  });

  it('acceptance ready rejects when real client sends would be allowed on synthetic path', () => {
    const handoff = toOnboardingHandoff(loadSystemProofCommercialOpportunity());
    const ready = completeOnboardingInputs(seedOnboardingRecordFromHandoff(handoff));
    const walk = walkSystemProofDeliveryPath(ready, { includeClientReviewLoop: false });
    assert.equal(walk.ok, true);
    const poisoned = {
      ...walk.record,
      messaging_runtime_authorized: true,
      allow_real_client_sends: true,
    };
    const acceptance = evaluateAcceptanceReady(poisoned);
    assert.equal(acceptance.ok, false);
    assert.equal(acceptance.reason, 'REAL_MESSAGING_NOT_ALLOWED_IN_SYNTHETIC_PATH');
  });
});

describe('Lead Rescue system-proof — docs and secrets hygiene', () => {
  it('system-proof doc exists with sentinels and anti-sidetrack boundaries', () => {
    const rel = 'docs/operations/LEAD_RESCUE_SYSTEM_PROOF_V1.md';
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
    const body = read(rel);
    assert.ok(body.includes('<!-- LEAD_RESCUE_SYSTEM_PROOF_V1 -->'));
    assert.ok(body.includes('#715'));
    assert.ok(body.includes('#714'));
    assert.ok(body.includes('financially_approved'));
    assert.ok(body.includes('acceptance_ready'));
    assert.ok(body.includes('messaging'));
    assert.ok(!/sk_live|BEGIN RSA PRIVATE KEY|api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]/i.test(body));
  });

  it('system-proof module does not import messaging senders', () => {
    const src = read('lib/lead-rescue/system-proof.js');
    assert.ok(!/from\s+['"][^'"]*(nodemailer|twilio|sendgrid|resend|postmark|mailgun|whatsapp-web)[^'"]*['"]/i.test(src));
    assert.ok(!/require\(['"][^'"]*(nodemailer|twilio|sendgrid|resend|postmark|mailgun)[^'"]*['"]\)/i.test(src));
    assert.ok(src.includes("from '../revenue/commercial-approval.js'"));
    assert.ok(src.includes("from './onboarding-delivery.js'"));
    assert.ok(src.includes('messaging_runtime_authorized: false'));
    assert.ok(src.includes('external_sends_executed'));
  });
});
