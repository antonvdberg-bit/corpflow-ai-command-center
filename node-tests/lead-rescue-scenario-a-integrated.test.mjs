/**
 * #715 WS4 integrated Scenario A — handover/acceptance-ready evidence.
 * Reuses merged #711 composer; does not rebuild unit/system slices.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runScenarioALeadRescue } from '../lib/gtm/integrated-scenarios-711.js';
import {
  OUT_OF_LANE_PROTECTED_GATES,
  SCENARIO_A_INTEGRATED_ARTIFACT_REL,
  SCENARIO_A_INTEGRATED_RUN_ID,
  evaluateScenarioAHandoverEvidence,
  runLeadRescueScenarioAIntegrated,
} from '../lib/lead-rescue/scenario-a-integrated.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('Lead Rescue Scenario A integrated (#715 / #711)', () => {
  it('reuses #711 Scenario A through acceptance_ready without sends', () => {
    const a = runScenarioALeadRescue();
    assert.equal(a.ok, true, JSON.stringify(a.ledger?.filter((x) => !x.ok)));
    assert.equal(a.final_delivery_state, 'acceptance_ready');
    assert.equal(a.messaging_runtime_authorized, false);
    assert.equal(a.production_client_deployment, false);
    assert.deepEqual(a.external_sends_executed, []);
    assert.ok(a.ledger.some((row) => row.step === 'handover_and_support_boundary_evidence' && row.ok));
    assert.ok(a.handover?.handover_sent_at);
    assert.ok(a.support_boundary?.in_scope);
    assert.ok(a.support_boundary?.out_of_scope);
  });

  it('evaluates preview through handover and support-boundary packets', () => {
    const a = runScenarioALeadRescue();
    const evidence = evaluateScenarioAHandoverEvidence(a);
    assert.equal(evidence.ok, true, JSON.stringify(evidence.incomplete || evidence.acceptance));
    for (const packetId of [
      'preview',
      'verification',
      'client_review',
      'acceptance',
      'handover',
      'support_boundary',
    ]) {
      assert.equal(evidence.packets[packetId].ok, true, packetId);
    }
    assert.equal(evidence.messaging.ok, false);
    assert.equal(evidence.handover_synthetic_only, true);
    assert.equal(evidence.record_state, 'acceptance_ready');
  });

  it('writes WS4 integrated artifact with no in-lane blockers', () => {
    const artifactAbs = path.join(REPO_ROOT, SCENARIO_A_INTEGRATED_ARTIFACT_REL);
    if (existsSync(artifactAbs)) unlinkSync(artifactAbs);

    const report = runLeadRescueScenarioAIntegrated({ writeArtifact: true });
    assert.equal(report.ok, true, JSON.stringify(report.remaining_in_lane_blockers));
    assert.equal(report.run_id, SCENARIO_A_INTEGRATED_RUN_ID);
    assert.equal(report.verdict, 'PASS');
    assert.equal(report.issue, 715);
    assert.equal(report.parent, 711);
    assert.equal(report.simulation_only, true);
    assert.deepEqual(report.remaining_in_lane_blockers, []);
    assert.equal(report.exact_remaining_protected_blocker_for_715, null);
    assert.equal(report.scenario_a.final_delivery_state, 'acceptance_ready');
    assert.equal(report.handover_evidence.ok, true);
    assert.deepEqual(report.scenario_a.external_sends_executed, []);
    assert.equal(existsSync(artifactAbs), true);

    const artifact = JSON.parse(read(SCENARIO_A_INTEGRATED_ARTIFACT_REL));
    assert.equal(artifact.schema, 'corpflow.lead_rescue_scenario_a_integrated.v1');
    assert.equal(artifact.ok, true);
    assert.equal(artifact.scenario_a.messaging_runtime_authorized, false);
    assert.ok(!/sk_live|BEGIN (RSA |OPENSSH )?PRIVATE KEY|password\s*[:=]\s*\S+/i.test(JSON.stringify(artifact)));
  });

  it('names messaging runtime and client_production as out-of-lane gates only', () => {
    const ids = OUT_OF_LANE_PROTECTED_GATES.map((g) => g.id);
    assert.ok(ids.includes('messaging_runtime'));
    assert.ok(ids.includes('client_production_deploy'));
    for (const gate of OUT_OF_LANE_PROTECTED_GATES) {
      assert.equal(gate.required_to_close_715, false);
      assert.equal(gate.owner, 'Anton');
    }
  });

  it('canonical doc and config point at the integrated packet without secrets', () => {
    const doc = 'docs/operations/LEAD_RESCUE_SCENARIO_A_INTEGRATED_V1.md';
    assert.equal(existsSync(path.join(REPO_ROOT, doc)), true);
    const body = read(doc);
    assert.ok(body.includes('<!-- LEAD_RESCUE_SCENARIO_A_INTEGRATED_V1 -->'));
    assert.ok(body.includes('#715'));
    assert.ok(body.includes('#711'));
    assert.ok(body.includes('handover'));
    assert.ok(body.includes('messaging_runtime'));
    assert.ok(body.includes('Do not rebuild'));
    assert.ok(!/sk_live|api[_-]?key\s*[:=]/i.test(body));

    const config = JSON.parse(read('config/lead-rescue-onboarding-delivery.v1.json'));
    assert.equal(config.scenario_a_integrated.cli, 'scripts/lead-rescue-scenario-a-integrated.mjs');
    assert.equal(config.scenario_a_integrated.artifact, SCENARIO_A_INTEGRATED_ARTIFACT_REL);
  });

  it('module does not import messaging senders and does not rebuild system-proof', () => {
    const src = read('lib/lead-rescue/scenario-a-integrated.js');
    assert.ok(
      !/from\s+['"][^'"]*(nodemailer|twilio|sendgrid|resend|postmark|mailgun|whatsapp-web)[^'"]*['"]/i.test(
        src,
      ),
    );
    assert.ok(src.includes("from '../gtm/integrated-scenarios-711.js'"));
    assert.ok(src.includes('runScenarioALeadRescue'));
    assert.ok(!src.includes('runLeadRescueSystemProof'));
    assert.ok(src.includes('external_sends_executed'));
  });
});
