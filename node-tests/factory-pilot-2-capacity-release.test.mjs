/**
 * Factory pilot 2/3 (#1027) — isolated repo-only proof that capacity release
 * selected the next eligible item. Always-green; no app/runtime change.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const FIXTURE_REL = 'node-tests/factory-pilot-2.status.json';
const FIXTURE_PATH = path.join(REPO_ROOT, FIXTURE_REL);
const EVIDENCE_REL = 'docs/operations/FACTORY_PILOT_2_CAPACITY_RELEASE_PROOF.md';

function readPilotFixture() {
  const raw = readFileSync(FIXTURE_PATH, 'utf8');
  return JSON.parse(raw);
}

describe('Factory pilot 2/3 capacity release -> next eligible item (#1027)', () => {
  it('keeps an isolated repo-only proof fixture named for factory pilot 2', () => {
    assert.equal(existsSync(FIXTURE_PATH), true, `${FIXTURE_REL} must exist`);
    assert.equal(existsSync(path.join(REPO_ROOT, EVIDENCE_REL)), true, `${EVIDENCE_REL} must exist`);

    const fixture = readPilotFixture();
    assert.equal(fixture.schema, 'corpflow.factory_pilot_2.v1');
    assert.equal(fixture.pilot, 'factory-pilot-2');
    assert.equal(fixture.sourceIssue, 1027);
    assert.equal(fixture.controllerIssue, 1023);
    assert.equal(fixture.protectedAction, false);

    const testRel = path.relative(REPO_ROOT, __filename).replaceAll('\\', '/');
    assert.equal(testRel, 'node-tests/factory-pilot-2-capacity-release.test.mjs');
  });

  it('records that this issue was picked after pilot 1 released genuine Cursor WIP', () => {
    const fixture = readPilotFixture();
    assert.equal(fixture.pickedAfterCapacityRelease, true);
    assert.equal(fixture.priorPilotIssue, 1026);
    assert.equal(fixture.priorPilotPr, 1030);
    assert.equal(fixture.priorPilotTerminalState, 'operator-review');
    assert.equal(fixture.wakeReason, 'execution_unpaused');
    assert.equal(fixture.wakePath, 'event_execution_unpaused');
    assert.equal(fixture.handoffRunId, '32465439603');
    assert.equal(fixture.handoffWorkflow, 'CorpFlowAI Cursor Factory Handoff');
    assert.equal(fixture.pausedSiblingIssue, 1028);
  });

  it('keeps durable evidence of the capacity-release pickup path', () => {
    const evidence = readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), 'utf8');
    assert.match(evidence, /#1027/);
    assert.match(evidence, /#1026/);
    assert.match(evidence, /#1030/);
    assert.match(evidence, /execution_unpaused/);
    assert.match(evidence, /event_execution_unpaused/);
    assert.match(evidence, /32465439603/);
    assert.match(evidence, /operator-review/);
    assert.match(evidence, /#1028/);
    assert.match(evidence, /PILOT 2 READY FOR REVIEW/);
  });
});
