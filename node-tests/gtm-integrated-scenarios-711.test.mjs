/**
 * #711 integrated scenario composer tests — final-main evidence harness.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  INTEGRATED_ARTIFACT_DIR_REL,
  INTEGRATED_RUN_ID,
  SCENARIO_A_IDS,
  SCENARIO_B_IDS,
  runIntegratedScenarios711,
  runMarketPathRegression,
  runScenarioALeadRescue,
  runScenarioBWebsiteRescue,
} from '../lib/gtm/integrated-scenarios-711.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

describe('#711 integrated scenarios — market + A + B', () => {
  it('market-path regression keeps single buyer-need mapping and rejects contradictions', () => {
    const market = runMarketPathRegression();
    assert.equal(market.ok, true);
    assert.equal(market.buyer_need_option_count, 5);
    assert.equal(market.contradiction_rejected, true);
    assert.equal(market.automatic_external_action, false);
    assert.equal(market.lead_rescue_map.service_interest, 'lead_rescue');
    assert.equal(market.website_rescue_map.service_interest, 'website_rescue');
  });

  it('Scenario A reaches acceptance_ready with fresh IDs and no sends', () => {
    const a = runScenarioALeadRescue();
    assert.equal(a.ok, true, JSON.stringify(a.ledger?.filter((x) => !x.ok)));
    assert.equal(a.ids.enquiry_ref, SCENARIO_A_IDS.enquiry_ref);
    assert.equal(a.final_delivery_state, 'acceptance_ready');
    assert.deepEqual(a.external_sends_executed, []);
    assert.equal(a.messaging_runtime_authorized, false);
    assert.ok(a.ledger.every((row) => row.ok === true));
    assert.ok(a.handover?.handover_sent_at);
    assert.ok(a.support_boundary?.in_scope);
    assert.ok(a.ledger.some((row) => row.step === 'handover_and_support_boundary_evidence' && row.ok));
  });

  it('Scenario B reaches acceptance_ready with simulated DNS/deploy only', () => {
    const b = runScenarioBWebsiteRescue();
    assert.equal(b.ok, true, JSON.stringify(b.ledger?.filter((x) => !x.ok)));
    assert.equal(b.ids.enquiry_ref, SCENARIO_B_IDS.enquiry_ref);
    assert.equal(b.final_delivery_state, 'acceptance_ready');
    assert.equal(b.real_dns_cutover_executed, false);
    assert.equal(b.real_client_production_deploy, false);
    assert.deepEqual(b.external_sends_executed, []);
  });

  it('combined runner writes artifacts and returns READY FOR CONTROLLED CLIENT PILOT', () => {
    const report = runIntegratedScenarios711({
      writeArtifact: true,
      finalMainSha: 'ce496c0a983341b25f2022a21bef5989360abf3a',
    });
    assert.equal(report.ok, true);
    assert.equal(report.run_id, INTEGRATED_RUN_ID);
    assert.equal(report.final_verdict, 'READY FOR CONTROLLED CLIENT PILOT');
    assert.deepEqual(report.defects, []);
    assert.equal(existsSync(path.join(REPO_ROOT, INTEGRATED_ARTIFACT_DIR_REL, 'latest-run.json')), true);
    const latest = JSON.parse(
      readFileSync(path.join(REPO_ROOT, INTEGRATED_ARTIFACT_DIR_REL, 'latest-run.json'), 'utf8'),
    );
    assert.equal(latest.ok, true);
    assert.equal(latest.scenario_a.ok, true);
    assert.equal(latest.scenario_b.ok, true);
  });

  it('composer does not import messaging senders', () => {
    const src = readFileSync(path.join(REPO_ROOT, 'lib/gtm/integrated-scenarios-711.js'), 'utf8');
    assert.ok(
      !/from\s+['"][^'"]*(nodemailer|twilio|sendgrid|resend|postmark|mailgun|whatsapp-web)[^'"]*['"]/i.test(
        src,
      ),
    );
    assert.ok(src.includes('external_sends_executed'));
    assert.ok(src.includes('messaging_runtime_authorized: false'));
  });
});
