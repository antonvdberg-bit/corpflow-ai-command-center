/**
 * #1038 — Grok 4.6 bounded factory pilot.
 *
 * Proves the repo-only evaluator:
 * - keeps Grok as an executor/reviewer model inside Cursor
 * - fails closed on a second-dispatcher / spend packet
 * - accepts the corrected executor-only packet
 * - compares existing GitHub evidence without a duplicate paid run
 * - returns only an allowed recommendation verdict
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME } from '../lib/server/factory-cursor-handoff.js';
import {
  CONTROL_PLANE_OWNERSHIP,
  GROK_46_FACTORY_PILOT_MODEL_ID,
  GROK_46_FACTORY_PILOT_SCHEMA,
  GROK_46_FACTORY_PILOT_SOURCE_ISSUE,
  GROK_46_PILOT_VERDICT_NO_ADVANTAGE,
  GROK_46_PILOT_VERDICT_PASS,
  evaluateComparisonSnapshot,
  evaluateGrok46PilotPacket,
  evaluateIntentionalSyntheticFailure,
  evaluateSyntheticFailureCorrection,
  formatGrok46BlockedVerdict,
  isAllowedGrok46PilotVerdict,
  resolveGrok46PilotVerdict,
  runGrok46FactoryPilot,
} from '../lib/server/grok-46-factory-pilot.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'config/grok-46-factory-pilot.v1.json');
const DOC_PATH = path.join(REPO_ROOT, 'docs/operations/GROK_46_FACTORY_PILOT_V1.md');
const ADR_PATH = path.join(REPO_ROOT, 'docs/decisions/20260822-grok-46-factory-pilot.md');
const HANDOFF_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/factory-cursor-handoff.yml',
);

function readJson(relPath) {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, relPath), 'utf8'));
}

function fixtureEvidence(overrides = {}) {
  const cfg = readJson('config/grok-46-factory-pilot.v1.json');
  return {
    packet: cfg.packet,
    intentionalFailurePacket: cfg.intentional_failure_packet,
    correctedPacket: cfg.corrected_packet,
    comparison: cfg.comparison,
    selfVerificationCompleted: true,
    controlPlaneReviewCompleted: true,
    humanRepromptRequired: false,
    operatorInterventionRequired: false,
    onDemandSpendEnabled: false,
    planUpgrade: false,
    secondDispatcherCreated: false,
    ...overrides,
  };
}

describe('Grok 4.6 bounded factory pilot (#1038)', () => {
  const cfg = readJson('config/grok-46-factory-pilot.v1.json');
  const doc = readFileSync(DOC_PATH, 'utf8');
  const adr = readFileSync(ADR_PATH, 'utf8');
  const handoffYaml = readFileSync(HANDOFF_WORKFLOW_PATH, 'utf8');

  it('keeps the existing Handoff wake path and does not add a parallel executor', () => {
    assert.equal(FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME, 'CorpFlowAI Cursor Factory Handoff');
    assert.match(handoffYaml, /^name:\s*CorpFlowAI Cursor Factory Handoff\s*$/m);
    assert.equal(CONTROL_PLANE_OWNERSHIP.wakePath, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
    assert.equal(CONTROL_PLANE_OWNERSHIP.modelRole, 'executor_reviewer_inside_cursor');
    assert.doesNotMatch(handoffYaml, /Grok Bot/);
  });

  it('loads the v1 fixture for issue #1038 and the observed Grok 4.6 model id', () => {
    assert.equal(cfg.schema, GROK_46_FACTORY_PILOT_SCHEMA);
    assert.equal(cfg.source_issue, GROK_46_FACTORY_PILOT_SOURCE_ISSUE);
    assert.equal(cfg.this_run.model_id, GROK_46_FACTORY_PILOT_MODEL_ID);
    assert.equal(cfg.packet.launchMechanism, 'existing_factory_automation');
    assert.equal(cfg.comparison.duplicatePaidRunRequested, false);
  });

  it('proof A/B/C: accepts the executor-only factory packet', () => {
    const accepted = evaluateGrok46PilotPacket(cfg.packet);
    assert.equal(accepted.ok, true);
    assert.equal(accepted.blockedReason, null);
  });

  it('proof D: intentional second-dispatcher / spend packet fails closed', () => {
    const failed = evaluateIntentionalSyntheticFailure(cfg.intentional_failure_packet);
    assert.equal(failed.ok, true);
    assert.match(String(failed.blockedReason), /forbidden|protected|parallel|wake path/i);
    const leaked = evaluateGrok46PilotPacket(cfg.intentional_failure_packet);
    assert.equal(leaked.ok, false);
  });

  it('proof E: corrected executor-only packet passes after the synthetic failure', () => {
    const correction = evaluateSyntheticFailureCorrection(
      cfg.intentional_failure_packet,
      cfg.corrected_packet,
    );
    assert.equal(correction.ok, true);
    assert.match(correction.detail, /failed closed/i);
  });

  it('proof F: comparison uses existing GitHub evidence and refuses a duplicate paid rerun', () => {
    const ok = evaluateComparisonSnapshot(cfg.comparison);
    assert.equal(ok.ok, true);
    assert.equal(ok.duplicatePaidRunRequested, false);
    assert.ok(ok.githubCaseCount >= 4);
    assert.match(String(ok.comparisonGap), /Composer/i);

    const refused = evaluateComparisonSnapshot({
      duplicatePaidRunRequested: true,
      cases: cfg.comparison.cases,
    });
    assert.equal(refused.ok, false);
  });

  it('proof G/H: fixture evidence resolves to the selective-use PASS verdict', () => {
    const verdict = resolveGrok46PilotVerdict(fixtureEvidence());
    assert.equal(verdict, GROK_46_PILOT_VERDICT_PASS);
    assert.equal(isAllowedGrok46PilotVerdict(verdict), true);
    assert.equal(cfg.recommendation, GROK_46_PILOT_VERDICT_PASS);
  });

  it('returns NO ADVANTAGE when fitness is incomplete but guardrails hold', () => {
    const verdict = resolveGrok46PilotVerdict(
      fixtureEvidence({
        selfVerificationCompleted: false,
        controlPlaneReviewCompleted: false,
      }),
    );
    assert.equal(verdict, GROK_46_PILOT_VERDICT_NO_ADVANTAGE);
  });

  it('blocks recommendation when a protected action appears', () => {
    const verdict = resolveGrok46PilotVerdict(
      fixtureEvidence({
        packet: {
          ...cfg.packet,
          actions: [...cfg.packet.actions, 'production_deploy'],
        },
      }),
    );
    assert.equal(verdict, formatGrok46BlockedVerdict('protected or out-of-scope action production_deploy'));
  });

  it('runs proofs A–H against the fixture and requires the canonical docs', () => {
    const report = runGrok46FactoryPilot(fixtureEvidence());
    assert.equal(report.schema, GROK_46_FACTORY_PILOT_SCHEMA);
    assert.equal(report.sourceIssue, 1038);
    assert.equal(report.allProofsPassed, true);
    assert.deepEqual(
      report.proofs.map((proof) => proof.id),
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    );
    assert.equal(report.verdict, GROK_46_PILOT_VERDICT_PASS);
    assert.match(doc, /GROK 4.6 PILOT PASS/);
    assert.match(doc, /#1038/);
    assert.match(doc, /NO IMPLEMENTATION AUTHORIZED for Grok Bot/);
    assert.match(adr, /#1038/);
    assert.match(adr, /executor\/reviewer model inside Cursor/);
  });
});
