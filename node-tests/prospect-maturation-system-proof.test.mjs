/**
 * Prospect Maturation system-proof tests (#713 / WS2 system gate).
 *
 * Proves synthetic enquiry → proposal readiness walks, blocked gates,
 * draft-only assets, and zero external sends. No DB / messaging runtime.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL,
  assignOperatorFields,
  proveMaturationGateBlocks,
  runProspectMaturationSystemProof,
  seedFreshLeadRescueProspect,
  seedFreshWebsiteRescueProspect,
  toQualificationGateProspect,
  walkLeadRescueMaturationPath,
  walkWebsiteRescueMaturationPath,
} from '../lib/prospects/system-proof.js';
import {
  assertDraftAssetConfigNoSend,
  checkQualificationGate,
  validateActiveProspectRequiredFields,
  validateStageTransition,
} from '../lib/prospects/maturation.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('Prospect maturation system-proof — fresh synthetic seeds (#713)', () => {
  it('Lead Rescue seed starts at new with buyer routing retained and required fields missing', () => {
    const seed = seedFreshLeadRescueProspect();
    assert.equal(seed.id, 'synthetic-pm-sys-713-lr-001');
    assert.equal(seed.reference, 'PM-SYS-LR-001');
    assert.equal(seed.canonical_stage, 'new');
    assert.equal(seed.buyer_need, 'losing-enquiries');
    assert.equal(seed.service_interest, 'lead_rescue');
    assert.equal(seed.product_service_path, 'ai-lead-rescue');
    assert.equal(seed.consent_contact, true);
    assert.equal(validateActiveProspectRequiredFields(seed).valid, false);
    assert.ok(!/sk_live|password\s*[:=]|api[_-]?key\s*[:=]/i.test(JSON.stringify(seed)));
  });

  it('Website Rescue seed starts at new with product context retained', () => {
    const seed = seedFreshWebsiteRescueProspect();
    assert.equal(seed.id, 'synthetic-pm-sys-713-wr-001');
    assert.equal(seed.canonical_stage, 'new');
    assert.equal(seed.buyer_need, 'website-improvement');
    assert.equal(seed.service_interest, 'website_rescue');
    assert.equal(seed.product_service_path, 'website_rescue');
    assert.equal(validateActiveProspectRequiredFields(seed).valid, false);
  });
});

describe('Prospect maturation system-proof — path walks', () => {
  it('Lead Rescue walk reaches proposal_sent with qualification and draft-only assets', () => {
    const walk = walkLeadRescueMaturationPath();
    assert.equal(walk.ok, true, walk.reason);
    assert.equal(walk.prospect.canonical_stage, 'proposal_sent');
    assert.equal(walk.missing_required_at_start.valid, false);
    assert.equal(walk.qualification.qualified, true);
    assert.equal(walk.drafts.acknowledgement_send, true);
    assert.equal(walk.drafts.proposal_handoff_send, true);
    assert.equal(walk.no_send_config.safe, true);
    assert.deepEqual(
      walk.transitions.map((t) => t.to),
      ['qualifying', 'discovery_booked', 'proposal_ready', 'proposal_sent'],
    );
    assert.ok(walk.transitions.every((t) => t.allowed === true));
  });

  it('Website Rescue walk reaches proposal_ready with qualification gate passed', () => {
    const walk = walkWebsiteRescueMaturationPath();
    assert.equal(walk.ok, true, walk.reason);
    assert.equal(walk.prospect.canonical_stage, 'proposal_ready');
    assert.equal(walk.qualification.qualified, true);
    assert.deepEqual(
      walk.transitions.map((t) => t.to),
      ['qualifying', 'discovery_booked', 'proposal_ready'],
    );
  });

  it('cannot advance new → qualifying without owner', () => {
    const seed = seedFreshLeadRescueProspect();
    const blocked = validateStageTransition(seed, 'qualifying');
    assert.equal(blocked.allowed, false);
    assert.match(String(blocked.reason || ''), /Owner must be assigned/i);

    const unlocked = validateStageTransition(assignOperatorFields(seed), 'qualifying');
    assert.equal(unlocked.allowed, true);
  });
});

describe('Prospect maturation system-proof — gate blocks and runner', () => {
  it('fixture-backed gates prove missing fields, overdue, invalid jumps, and WR qualification', () => {
    const gates = proveMaturationGateBlocks();
    assert.equal(gates.missing_owner.validation.valid, false);
    assert.equal(gates.missing_next_action_or_due.validation.valid, false);
    assert.equal(gates.overdue.overdue, true);
    assert.equal(gates.reactivation_due.due, true);
    assert.equal(gates.lost_with_reason.validation.valid, true);
    assert.equal(gates.invalid_jump_new_to_proposal_sent.allowed, false);
    assert.equal(gates.owner_required_before_qualifying.allowed, false);
    assert.equal(gates.closure_reason_required_for_lost.allowed, false);
    assert.equal(gates.qualified_website_rescue.qualification.qualified, true);
  });

  it('organisation_name fixtures adapt to business_name for qualification gate', () => {
    const adapted = toQualificationGateProspect({
      organisation_name: 'Bernard Boutique Hotel',
      email: 'bernard@example-hotel.com',
      product_service_path: 'website_rescue',
      qualification_complete: true,
    });
    assert.equal(adapted.business_name, 'Bernard Boutique Hotel');
    assert.equal(checkQualificationGate(adapted, 'website_rescue').qualified, true);
  });

  it('runs full system-proof with artifact, zero external sends', () => {
    const artifactAbs = path.join(REPO_ROOT, SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL);
    if (existsSync(artifactAbs)) unlinkSync(artifactAbs);

    const report = runProspectMaturationSystemProof({ writeArtifact: true });
    assert.equal(report.ok, true, JSON.stringify({
      lr: report.walk_lead_rescue,
      wr: report.walk_website_rescue,
      gates: report.gate_block_proof,
      no_send: report.no_send_config,
    }));
    assert.equal(report.simulation_only, true);
    assert.equal(report.messaging_runtime_authorized, false);
    assert.deepEqual(report.external_sends_executed, []);
    assert.equal(report.no_send_config.safe, true);
    assert.equal(report.walk_lead_rescue.final_stage, 'proposal_sent');
    assert.equal(report.walk_website_rescue.final_stage, 'proposal_ready');
    assert.equal(report.walk_lead_rescue.buyer_need, 'losing-enquiries');
    assert.equal(report.walk_website_rescue.service_interest, 'website_rescue');
    assert.ok(report.operator_summaries.daily.total >= 8);
    assert.ok(report.operator_summaries.weekly.by_stage);

    assert.equal(existsSync(artifactAbs), true);
    const artifact = JSON.parse(read(SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL));
    assert.equal(artifact.schema, 'corpflow.prospect_maturation_system_proof.v1');
    assert.equal(artifact.ok, true);
    assert.equal(artifact.issue, 713);
    assert.deepEqual(artifact.external_sends_executed, []);
  });
});

describe('Prospect maturation system-proof — docs and secrets hygiene', () => {
  it('system-proof doc exists with sentinels and anti-sidetrack boundaries', () => {
    const rel = 'docs/operations/PROSPECT_MATURATION_SYSTEM_PROOF_V1.md';
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
    const body = read(rel);
    assert.ok(body.includes('<!-- PROSPECT_MATURATION_SYSTEM_PROOF_V1 -->'));
    assert.ok(body.includes('#713'));
    assert.ok(body.includes('proposal_sent'));
    assert.ok(body.includes('external_sends_executed'));
    assert.ok(body.includes('NO SEND') || body.includes('no external send') || body.includes('draft-only'));
    assert.ok(!/sk_live|BEGIN RSA PRIVATE KEY|api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]/i.test(body));
  });

  it('system-proof module does not import messaging senders', () => {
    const src = read('lib/prospects/system-proof.js');
    assert.ok(
      !/from\s+['"][^'"]*(nodemailer|twilio|sendgrid|resend|postmark|mailgun|whatsapp-web)[^'"]*['"]/i.test(
        src,
      ),
    );
    assert.ok(
      !/require\(['"][^'"]*(nodemailer|twilio|sendgrid|resend|postmark|mailgun)[^'"]*['"]\)/i.test(src),
    );
    assert.ok(src.includes("from './maturation.js'"));
    assert.ok(src.includes('external_sends_executed'));
    assert.ok(src.includes('messaging_runtime_authorized: false'));
    assert.equal(assertDraftAssetConfigNoSend().safe, true);
  });
});
