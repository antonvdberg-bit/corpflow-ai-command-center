/**
 * #926 / #716 WS5 integrated Scenario B — handover/acceptance-ready evidence.
 * Reuses merged #711 composer; does not rebuild unit/system slices.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runScenarioBWebsiteRescue } from '../lib/gtm/integrated-scenarios-711.js';
import {
  OUT_OF_LANE_PROTECTED_GATES,
  SCENARIO_B_INTEGRATED_ARTIFACT_REL,
  SCENARIO_B_INTEGRATED_RUN_ID,
  evaluateScenarioBHandoverEvidence,
  extractFailClosedGates,
  runWebsiteRescueScenarioBIntegrated,
} from '../lib/website-rescue/scenario-b-integrated.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('Website Rescue Scenario B integrated (#926 / #716 / #711)', () => {
  it('reuses #711 Scenario B through acceptance_ready with simulated DNS/deploy only', () => {
    const b = runScenarioBWebsiteRescue();
    assert.equal(b.ok, true, JSON.stringify(b.ledger?.filter((x) => !x.ok)));
    assert.equal(b.final_delivery_state, 'acceptance_ready');
    assert.equal(b.real_dns_cutover_executed, false);
    assert.equal(b.real_client_production_deploy, false);
    assert.deepEqual(b.external_sends_executed, []);
    assert.ok(b.ledger.some((row) => row.step === 'handover_and_maintenance_boundary_evidence' && row.ok));
    assert.ok(b.handover?.handover_sent_at);
    assert.ok(b.maintenance_boundary?.in_scope);
    assert.ok(b.maintenance_boundary?.out_of_scope);
  });

  it('evaluates preview through handover and maintenance-boundary packets', () => {
    const b = runScenarioBWebsiteRescue();
    const evidence = evaluateScenarioBHandoverEvidence(b);
    assert.equal(evidence.ok, true, JSON.stringify(evidence.incomplete || evidence.acceptance));
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
      assert.equal(evidence.packets[packetId].ok, true, packetId);
    }
    assert.equal(evidence.handover_synthetic_only, true);
    assert.equal(evidence.deploy_approval_simulation_only, true);
    assert.equal(evidence.dns_cutover_simulation_only, true);
    assert.equal(evidence.real_dns_cutover_executed, false);
    assert.equal(evidence.real_client_production_deploy, false);
    assert.equal(evidence.record_state, 'acceptance_ready');
  });

  it('keeps missing financial approval, content/assets, and approved access fail-closed', () => {
    const b = runScenarioBWebsiteRescue();
    const gates = extractFailClosedGates(b);
    assert.equal(gates.ok, true);
    assert.equal(gates.missing_financial_approval_blocks, true);
    assert.equal(gates.missing_content_assets_access_blocks, true);
    assert.ok(b.ledger.some((row) => row.step === 'gate_financial_approval_missing' && row.ok));
    assert.ok(b.ledger.some((row) => row.step === 'gate_content_assets_access_blocks' && row.ok));
  });

  it('writes WS5 integrated artifact with no in-lane blockers', () => {
    const artifactAbs = path.join(REPO_ROOT, SCENARIO_B_INTEGRATED_ARTIFACT_REL);
    if (existsSync(artifactAbs)) unlinkSync(artifactAbs);

    const report = runWebsiteRescueScenarioBIntegrated({ writeArtifact: true });
    assert.equal(report.ok, true, JSON.stringify(report.remaining_in_lane_blockers));
    assert.equal(report.run_id, SCENARIO_B_INTEGRATED_RUN_ID);
    assert.equal(report.verdict, 'PASS');
    assert.equal(report.final_verdict, 'WEBSITE RESCUE SCENARIO B INTEGRATED READY FOR REVIEW');
    assert.equal(report.issue, 926);
    assert.equal(report.parent, 716);
    assert.equal(report.programme, 711);
    assert.equal(report.simulation_only, true);
    assert.deepEqual(report.remaining_in_lane_blockers, []);
    assert.equal(report.exact_remaining_protected_blocker_for_926, null);
    assert.equal(report.scenario_b.final_delivery_state, 'acceptance_ready');
    assert.equal(report.handover_evidence.ok, true);
    assert.deepEqual(report.scenario_b.external_sends_executed, []);
    assert.equal(report.scenario_b.real_dns_cutover_executed, false);
    assert.equal(report.scenario_b.real_client_production_deploy, false);
    assert.equal(existsSync(artifactAbs), true);

    const artifact = JSON.parse(read(SCENARIO_B_INTEGRATED_ARTIFACT_REL));
    assert.equal(artifact.schema, 'corpflow.website_rescue_scenario_b_integrated.v1');
    assert.equal(artifact.ok, true);
    assert.equal(artifact.scenario_b.real_dns_cutover_executed, false);
    assert.ok(!/sk_live|BEGIN (RSA |OPENSSH )?PRIVATE KEY|password\s*[:=]\s*\S+/i.test(JSON.stringify(artifact)));
  });

  it('names real DNS, client_production, and external sends as out-of-lane gates only', () => {
    const ids = OUT_OF_LANE_PROTECTED_GATES.map((g) => g.id);
    assert.ok(ids.includes('real_dns_domain_action'));
    assert.ok(ids.includes('client_production_deploy'));
    assert.ok(ids.includes('external_sends'));
    for (const gate of OUT_OF_LANE_PROTECTED_GATES) {
      assert.equal(gate.required_to_close_926, false);
      assert.equal(gate.required_to_close_716, false);
      assert.equal(gate.owner, 'Anton');
    }
  });

  it('canonical doc and config point at the integrated packet without secrets', () => {
    const doc = 'docs/operations/WEBSITE_RESCUE_SCENARIO_B_INTEGRATED_V1.md';
    assert.equal(existsSync(path.join(REPO_ROOT, doc)), true);
    const body = read(doc);
    assert.ok(body.includes('<!-- WEBSITE_RESCUE_SCENARIO_B_INTEGRATED_V1 -->'));
    assert.ok(body.includes('#926'));
    assert.ok(body.includes('#716'));
    assert.ok(body.includes('#711'));
    assert.ok(body.includes('handover'));
    assert.ok(body.includes('Do not rebuild'));
    assert.ok(!/sk_live|api[_-]?key\s*[:=]/i.test(body));

    const config = JSON.parse(read('config/website-rescue-onboarding-delivery.v1.json'));
    assert.equal(config.scenario_b_integrated.cli, 'scripts/website-rescue-scenario-b-integrated.mjs');
    assert.equal(config.scenario_b_integrated.artifact, SCENARIO_B_INTEGRATED_ARTIFACT_REL);
  });

  it('module does not import senders and does not rebuild system-proof', () => {
    const src = read('lib/website-rescue/scenario-b-integrated.js');
    assert.ok(
      !/from\s+['"][^'"]*(nodemailer|twilio|sendgrid|resend|postmark|mailgun|whatsapp-web)[^'"]*['"]/i.test(
        src,
      ),
    );
    assert.ok(src.includes("from '../gtm/integrated-scenarios-711.js'"));
    assert.ok(src.includes('runScenarioBWebsiteRescue'));
    assert.ok(!src.includes('runWebsiteRescueSystemProof'));
    assert.ok(src.includes('external_sends_executed'));
  });
});
