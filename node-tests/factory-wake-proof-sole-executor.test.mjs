/**
 * #1062 — one selected Factory executor, with Wake Proof retained until
 * an explicit Cloud Agents v1 cutover.
 *
 * Proves:
 * - CorpFlowAI Cursor Factory Handoff keeps MODE B name + production triggers
 * - factory-dispatcher-activate.yml cannot auto-launch from schedule, labels,
 *   comments, or capacity workflow_call
 * - lifecycle/WIP release wakes Handoff, not the legacy API dispatcher
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME } from '../lib/server/factory-cursor-handoff.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github/workflows');
const HANDOFF_PATH = path.join(WORKFLOWS_DIR, 'factory-cursor-handoff.yml');
const LEGACY_PATH = path.join(WORKFLOWS_DIR, 'factory-dispatcher-activate.yml');
const LIFECYCLE_PATH = path.join(WORKFLOWS_DIR, 'cursor-agent-lifecycle-status.yml');
const RECONCILE_PATH = path.join(WORKFLOWS_DIR, 'factory-queue-reconcile.yml');

/**
 * YAML `on:` mapping body (until the next top-level key).
 * @param {string} yaml
 */
function extractOnBlock(yaml) {
  const match = yaml.match(/^on:\n([\s\S]*?)\n(?=[A-Za-z])/m);
  assert.ok(match, 'workflow must have a top-level on: block');
  return match[1];
}

/**
 * Top-level keys immediately under `on:` (two-space indent).
 * @param {string} onBlock
 */
function onTriggerKeys(onBlock) {
  return [...onBlock.matchAll(/^  ([A-Za-z_]+):/gm)].map((m) => m[1]);
}

describe('Wake Proof sole production executor (#930)', () => {
  const handoffYaml = readFileSync(HANDOFF_PATH, 'utf8');
  const legacyYaml = readFileSync(LEGACY_PATH, 'utf8');
  const lifecycleYaml = readFileSync(LIFECYCLE_PATH, 'utf8');
  const reconcileYaml = readFileSync(RECONCILE_PATH, 'utf8');

  it('keeps the exact Handoff display name required by Cursor Automation MODE B', () => {
    assert.match(handoffYaml, /^name:\s*CorpFlowAI Cursor Factory Handoff\s*$/m);
    assert.equal(FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME, 'CorpFlowAI Cursor Factory Handoff');
  });

  it('retains Handoff production triggers and enforces one cutover-gated executor', () => {
    const keys = onTriggerKeys(extractOnBlock(handoffYaml));
    assert.deepEqual(
      [...keys].sort(),
      ['issue_comment', 'issues', 'workflow_call', 'workflow_dispatch'].sort(),
    );
    assert.match(handoffYaml, /dispatch:cursor-ready/);
    assert.match(handoffYaml, /execution:paused/);
    assert.match(handoffYaml, /OPERATOR GATE AUTHORIZATION/);
    assert.match(handoffYaml, /CURSOR REQUEUE/);
    assert.match(handoffYaml, /capacity_released/);
    assert.doesNotMatch(handoffYaml, /^\s*schedule:/m);
    assert.doesNotMatch(handoffYaml, /^\s*cron:/m);
    assert.match(handoffYaml, /node scripts\/factory-cursor-handoff\.mjs/);
    assert.match(handoffYaml, /Validate sole executor selection/);
    assert.match(handoffYaml, /wake_proof_v2\|cloud_agents_v1/);
    assert.match(
      handoffYaml,
      /Wake Cursor Factory v2 webhook[\s\S]*vars\.CURSOR_FACTORY_EXECUTOR == 'wake_proof_v2'/,
    );
    assert.match(
      handoffYaml,
      /Create correlated Cursor Cloud Agent v1[\s\S]*vars\.CURSOR_FACTORY_EXECUTOR == 'cloud_agents_v1'/,
    );
    assert.match(handoffYaml, /node scripts\/factory-cloud-agents-executor\.mjs/);
  });

  it('marks the API dispatcher LEGACY / DIAGNOSTIC / NOT PRODUCTION EXECUTION', () => {
    assert.match(legacyYaml, /^name:\s*LEGACY Factory dispatcher activate \(diagnostic - not production execution\)\s*$/m);
    assert.match(legacyYaml, /LEGACY \/ DIAGNOSTIC \/ NOT PRODUCTION EXECUTION/);
    assert.match(legacyYaml, /NOT the production Cursor executor/i);
  });

  it('removes all automatic execution triggers from the legacy API dispatcher', () => {
    const onBlock = extractOnBlock(legacyYaml);
    const keys = onTriggerKeys(onBlock);
    assert.deepEqual(keys, ['workflow_dispatch']);
    assert.doesNotMatch(onBlock, /^\s*schedule:/m);
    assert.doesNotMatch(onBlock, /^\s*cron:/m);
    assert.doesNotMatch(onBlock, /^\s*issues:/m);
    assert.doesNotMatch(onBlock, /^\s*issue_comment:/m);
    assert.doesNotMatch(onBlock, /^\s*workflow_call:/m);
    assert.match(legacyYaml, /if:\s*github\.event_name == 'workflow_dispatch'/);
  });

  it('does not let lifecycle/WIP release call the legacy API dispatcher', () => {
    assert.doesNotMatch(
      lifecycleYaml,
      /uses:\s*\.\/\.github\/workflows\/factory-dispatcher-activate\.yml/,
    );
    assert.match(
      lifecycleYaml,
      /uses:\s*\.\/\.github\/workflows\/factory-cursor-handoff\.yml/,
    );
    assert.match(lifecycleYaml, /^\s*wake_factory_handoff:/m);
    assert.doesNotMatch(lifecycleYaml, /^  wake_dispatcher:/m);
    assert.match(lifecycleYaml, /needs\.poll\.outputs\.wake_dispatcher == 'true'/);
  });

  it('whole-queue reconciler (#1023) calls Handoff, not the legacy API dispatcher', () => {
    assert.match(reconcileYaml, /^name:\s*CorpFlowAI Factory Queue Reconcile\s*$/m);
    assert.match(
      reconcileYaml,
      /uses:\s*\.\/\.github\/workflows\/factory-cursor-handoff\.yml/,
    );
    assert.doesNotMatch(
      reconcileYaml,
      /uses:\s*\.\/\.github\/workflows\/factory-dispatcher-activate\.yml/,
    );
    assert.match(reconcileYaml, /cron:\s*"\*\/10 \* \* \* \*"/);
    assert.doesNotMatch(reconcileYaml, /CURSOR_FACTORY_WAKE_WEBHOOK/);
  });

  it('ensures no other workflow automatically uses the legacy API dispatcher', () => {
    const files = readdirSync(WORKFLOWS_DIR).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
    const callers = [];
    for (const name of files) {
      const text = readFileSync(path.join(WORKFLOWS_DIR, name), 'utf8');
      if (text.includes('uses: ./.github/workflows/factory-dispatcher-activate.yml')) {
        callers.push(name);
      }
    }
    assert.deepEqual(callers, [], `legacy dispatcher reusable workflow still called by: ${callers.join(', ')}`);
  });
});
