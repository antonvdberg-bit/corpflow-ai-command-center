/**
 * #766 controlled-pilot readiness package — packaging + freshness harness.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

const PACKAGE_DOC = path.join(
  REPO_ROOT,
  'docs/execution/CONTROLLED_PILOT_TEST_READINESS_766_V1.md',
);
const ARTIFACT_DIR = path.join(REPO_ROOT, 'artifacts/controlled-pilot-766');
const DEFECT_PATH = path.join(ARTIFACT_DIR, 'defect-register.json');
const PACKET_C_PATH = path.join(ARTIFACT_DIR, 'packet-c-evidence-slots.json');
const SCRIPT = path.join(REPO_ROOT, 'scripts/controlled-pilot-rehearsal-766.mjs');

describe('#766 controlled-pilot readiness package', () => {
  it('ships operator package doc with Packets A–D and NOT READY blocker', () => {
    assert.equal(existsSync(PACKAGE_DOC), true);
    const doc = readFileSync(PACKAGE_DOC, 'utf8');
    assert.ok(doc.includes('CONTROLLED_PILOT_TEST_READINESS_766_V1'));
    assert.ok(doc.includes('Packet A'));
    assert.ok(doc.includes('Packet B'));
    assert.ok(doc.includes('Packet C'));
    assert.ok(doc.includes('Packet D'));
    assert.ok(doc.includes('NOT READY'));
    assert.ok(doc.includes('D766-001'));
    assert.ok(doc.includes('gtm-integrated-scenarios-711'));
    assert.ok(!doc.includes('AUTHORIZATION TO MERGE'));
  });

  it('ships defect register with one exact release blocker', () => {
    const reg = JSON.parse(readFileSync(DEFECT_PATH, 'utf8'));
    assert.equal(reg.exact_blocker_id, 'D766-001');
    assert.equal(reg.final_verdict, 'NOT READY');
    const blocker = reg.defects.find((d) => d.id === 'D766-001');
    assert.ok(blocker);
    assert.equal(blocker.class, 'release_blocker');
    assert.equal(blocker.blocks_controlled_client_pilot, true);
  });

  it('keeps Packet C evidence slots empty (operator-owned)', () => {
    const slots = JSON.parse(readFileSync(PACKET_C_PATH, 'utf8'));
    assert.equal(slots.status, 'AWAITING_OPERATOR');
    assert.equal(slots.standard_erpnext_sufficient_for_first_controlled_pilot, null);
    for (const step of slots.chain) {
      assert.equal(step.ok, null);
    }
  });

  it('freshness rehearsal reuses #711 composer and writes latest-rehearsal.json', () => {
    execFileSync(process.execPath, [SCRIPT], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const latestPath = path.join(ARTIFACT_DIR, 'latest-rehearsal.json');
    assert.equal(existsSync(latestPath), true);
    const report = JSON.parse(readFileSync(latestPath, 'utf8'));
    assert.equal(report.schema, 'corpflow.controlled_pilot_766.rehearsal.v1');
    assert.equal(report.integrated.ok, true);
    assert.deepEqual(report.integrated.external_sends_executed, []);
    assert.equal(report.no_send_checks.external_sends_empty, true);
    assert.equal(report.controlled_client_pilot_verdict, 'NOT READY');
    assert.ok(String(report.exact_blocker).includes('D766-001'));
    assert.equal(report.packet_c_status, 'AWAITING_OPERATOR');
    assert.equal(report.reused_composer, 'lib/gtm/integrated-scenarios-711.js');
  });

  it('does not import messaging senders in rehearsal script', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    assert.ok(
      !/from\s+['"][^'"]*(nodemailer|twilio|sendgrid|resend|postmark|mailgun|whatsapp-web)[^'"]*['"]/i.test(
        src,
      ),
    );
    assert.ok(src.includes('runIntegratedScenarios711'));
  });
});
