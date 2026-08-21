/**
 * Factory pilot 1/3 (#1026) — isolated repo-only proof fixture.
 *
 * FIRST PR STATE IS INTENTIONALLY RED.
 * `factory-pilot-1.status.json` starts at phase `intentional-red` while the
 * bounded-correction assertion requires `corrected-green`. Do not fix that
 * mismatch in the opening commit. Agent CI must record this one isolated
 * AssertionError, then the existing CI failure Cursor supervisor must return
 * to the same workstream and change only the fixture phase.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const FIXTURE_REL = 'node-tests/factory-pilot-1.status.json';
const FIXTURE_PATH = path.join(REPO_ROOT, FIXTURE_REL);
const EVIDENCE_REL = 'docs/operations/FACTORY_PILOT_1_SCHEDULED_PICKUP_PROOF.md';
const ALLOWED_PHASES = new Set(['intentional-red', 'corrected-green']);

function readPilotFixture() {
  const raw = readFileSync(FIXTURE_PATH, 'utf8');
  return JSON.parse(raw);
}

describe('Factory pilot 1/3 scheduled pickup + bounded CI correction (#1026)', () => {
  it('keeps an isolated repo-only proof fixture named for factory pilot 1', () => {
    assert.equal(existsSync(FIXTURE_PATH), true, `${FIXTURE_REL} must exist`);
    assert.equal(existsSync(path.join(REPO_ROOT, EVIDENCE_REL)), true, `${EVIDENCE_REL} must exist`);

    const fixture = readPilotFixture();
    assert.equal(fixture.schema, 'corpflow.factory_pilot_1.v1');
    assert.equal(fixture.pilot, 'factory-pilot-1');
    assert.equal(fixture.sourceIssue, 1026);
    assert.equal(fixture.controllerIssue, 1023);
    assert.equal(fixture.protectedAction, false);
    assert.equal(ALLOWED_PHASES.has(fixture.phase), true, `phase must stay ${[...ALLOWED_PHASES].join(' | ')}`);

    const testRel = path.relative(REPO_ROOT, __filename).replaceAll('\\', '/');
    assert.equal(testRel, 'node-tests/factory-pilot-1-scheduled-pickup.test.mjs');
  });

  it('records corrected-green after the bounded CI repair (intentional first-PR red)', () => {
    const fixture = readPilotFixture();
    assert.equal(
      fixture.phase,
      'corrected-green',
      'CI supervisor must change factory-pilot-1.status.json phase from intentional-red to corrected-green only',
    );
  });
});
