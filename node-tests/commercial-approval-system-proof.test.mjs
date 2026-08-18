/**
 * Commercial approval system-proof (#714) — independent LR + WR paths.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { toOnboardingHandoff } from '../lib/revenue/commercial-approval.js';
import { canStartBuild as canStartLeadRescueBuild } from '../lib/lead-rescue/onboarding-delivery.js';
import { canStartBuild as canStartWebsiteRescueBuild } from '../lib/website-rescue/onboarding-delivery.js';
import {
  SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL,
  SYSTEM_PROOF_LR_FIXTURE_REL,
  SYSTEM_PROOF_WR_FIXTURE_REL,
  loadSystemProofLeadRescueOpportunity,
  loadSystemProofWebsiteRescueOpportunity,
  proveFinancialApprovalFailClosed,
  runCommercialApprovalSystemProof,
  walkCommercialApprovalPath,
} from '../lib/revenue/commercial-approval-system-proof.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

describe('commercial-approval system-proof fixtures', () => {
  it('Lead Rescue system-proof opportunity is financially approvable', () => {
    assert.equal(existsSync(path.join(REPO_ROOT, SYSTEM_PROOF_LR_FIXTURE_REL)), true);
    const commercial = loadSystemProofLeadRescueOpportunity();
    assert.equal(commercial.opportunity_ref, 'OPP-SYN-LR-SYS-714-001');
    assert.ok(commercial.qualification_summary);
    assert.ok(String(commercial.commercial_notes || '').includes('system-proof'));
    assert.ok(!/sk_live|password\s*[:=]|api[_-]?key\s*[:=]/i.test(JSON.stringify(commercial)));

    const walk = walkCommercialApprovalPath(commercial, { label: 'lr' });
    assert.equal(walk.ok, true, JSON.stringify(walk));
    assert.ok(walk.stages.includes('qualification_complete'));
    assert.ok(walk.stages.includes('financially_approved'));
    assert.equal(walk.handoff.product, 'ai-lead-rescue');
  });

  it('Website Rescue system-proof opportunity is financially approvable', () => {
    assert.equal(existsSync(path.join(REPO_ROOT, SYSTEM_PROOF_WR_FIXTURE_REL)), true);
    const commercial = loadSystemProofWebsiteRescueOpportunity();
    assert.equal(commercial.opportunity_ref, 'OPP-SYN-WR-SYS-714-001');
    const walk = walkCommercialApprovalPath(commercial, { label: 'wr' });
    assert.equal(walk.ok, true, JSON.stringify(walk));
    assert.equal(walk.handoff.product, 'website-rescue');
    assert.equal(walk.handoff.protected_actions_executed, false);
  });
});

describe('commercial-approval system-proof fail-closed', () => {
  it('denies payment-pending, rejected, incomplete, and acceptance-only paths', () => {
    const proof = proveFinancialApprovalFailClosed();
    assert.equal(proof.payment_pending_denied, true);
    assert.equal(proof.rejected_denied, true);
    assert.equal(proof.incomplete_proposal_denied, true);
    assert.equal(proof.acceptance_without_payment_denied, true);
  });
});

describe('commercial-approval system-proof runner', () => {
  it('runs LR + WR packs and writes evidence artifact', () => {
    const artifactAbs = path.join(REPO_ROOT, SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL);
    if (existsSync(artifactAbs)) unlinkSync(artifactAbs);

    const report = runCommercialApprovalSystemProof({ writeArtifact: true });
    assert.equal(report.ok, true, JSON.stringify(report.reason));
    assert.equal(report.payment_collection_executed, false);
    assert.equal(report.bank_action_executed, false);
    assert.deepEqual(report.external_sends_executed, []);
    assert.equal(report.pack_completeness['lead-rescue'].complete, true);
    assert.equal(report.pack_completeness['website-rescue'].complete, true);
    assert.equal(report.paths['lead-rescue'].ok, true);
    assert.equal(report.paths['website-rescue'].ok, true);
    assert.equal(existsSync(artifactAbs), true);

    const saved = JSON.parse(readFileSync(artifactAbs, 'utf8'));
    assert.equal(saved.schema, 'corpflow.commercial_approval_system_proof.v1');
    assert.equal(saved.ok, true);
  });

  it('approved handoffs unlock #715 / #716 financial build gates', () => {
    const lr = loadSystemProofLeadRescueOpportunity();
    const wr = loadSystemProofWebsiteRescueOpportunity();
    const lrHandoff = toOnboardingHandoff(lr);
    const wrHandoff = toOnboardingHandoff(wr);
    assert.equal(lrHandoff.financially_approved, true);
    assert.equal(wrHandoff.financially_approved, true);

    const lrComplete = JSON.parse(
      readFileSync(path.join(REPO_ROOT, 'fixtures/lead-rescue-onboarding/complete.json'), 'utf8')
    );
    lrComplete.financially_approved = lrHandoff.financially_approved;
    assert.equal(canStartLeadRescueBuild(lrComplete).ok, true);

    const wrComplete = JSON.parse(
      readFileSync(
        path.join(REPO_ROOT, 'fixtures/website-rescue-onboarding/one-page-complete.json'),
        'utf8'
      )
    );
    wrComplete.financially_approved = wrHandoff.financially_approved;
    assert.equal(canStartWebsiteRescueBuild(wrComplete).ok, true);
  });
});

describe('commercial-approval system-proof docs', () => {
  const docs = [
    'docs/revenue/COMMERCIAL_APPROVAL_SYSTEM_PROOF_V1.md',
    'docs/revenue/PRODUCT_PACK_COMPLETENESS_CHECKLISTS.md',
    'docs/revenue/templates/DISCOVERY_QUALIFICATION_SUMMARY.md',
    'docs/revenue/templates/COMMERCIAL_STORAGE_AND_LINKING.md',
  ];
  for (const rel of docs) {
    it(`has ${rel}`, () => {
      const text = readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      assert.ok(text.length > 100);
      assert.ok(!/sk_live_|AKIA[0-9A-Z]{16}|BEGIN PRIVATE KEY/.test(text));
    });
  }
});
