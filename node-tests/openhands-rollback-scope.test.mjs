import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  assertNoBroadPruneCommands,
  assertRequiresDedicatedDockerHost,
  assertRollbackAllowlistPresent,
  auditOpenHandsRollbackScripts,
} from '../lib/openhands/rollback-scope.js';
import {
  FORBIDDEN_ROLLBACK_COMMAND_PATTERNS,
  ROLLBACK_ALLOWED_CONTAINERS,
  ROLLBACK_ALLOWED_NETWORKS,
  ROLLBACK_ALLOWED_VOLUMES,
} from '../lib/openhands/package-policy.js';

const rollback = fs.readFileSync('scripts/ops/openhands/rollback.sh', 'utf8');
const uninstall = fs.readFileSync('scripts/ops/openhands/uninstall.sh', 'utf8');
const common = fs.readFileSync('scripts/ops/openhands/lib/common.sh', 'utf8');

describe('openhands rollback scope — allowlists', () => {
  it('exports the expected container/network/volume allowlists', () => {
    assert.deepEqual([...ROLLBACK_ALLOWED_CONTAINERS], ['corpflowai-openhands-app']);
    assert.deepEqual([...ROLLBACK_ALLOWED_NETWORKS], ['corpflowai-openhands-net']);
    assert.ok(ROLLBACK_ALLOWED_VOLUMES.includes('corpflowai-openhands-state'));
    assert.ok(ROLLBACK_ALLOWED_VOLUMES.includes('corpflowai-openhands-workspace'));
  });

  it('rollback.sh and uninstall.sh declare the allowlisted names', () => {
    assert.equal(assertRollbackAllowlistPresent(rollback).ok, true, JSON.stringify(assertRollbackAllowlistPresent(rollback).findings));
    assert.equal(assertRollbackAllowlistPresent(uninstall).ok, true, JSON.stringify(assertRollbackAllowlistPresent(uninstall).findings));
    assert.equal(assertRollbackAllowlistPresent(common).ok, true, JSON.stringify(assertRollbackAllowlistPresent(common).findings));
  });
});

describe('openhands rollback scope — no broad prune', () => {
  it('lists forbidden prune patterns', () => {
    assert.ok(FORBIDDEN_ROLLBACK_COMMAND_PATTERNS.includes('docker system prune'));
  });

  it('rollback.sh and uninstall.sh never invoke broad prune commands', () => {
    assert.equal(assertNoBroadPruneCommands(rollback).ok, true, JSON.stringify(assertNoBroadPruneCommands(rollback).findings));
    assert.equal(assertNoBroadPruneCommands(uninstall).ok, true, JSON.stringify(assertNoBroadPruneCommands(uninstall).findings));
  });

  it('flags a synthetic bad script that runs docker system prune', () => {
    const bad = '#!/bin/bash\ndocker system prune -af\n';
    assert.equal(assertNoBroadPruneCommands(bad).ok, false);
  });
});

describe('openhands rollback scope — dedicated Docker host', () => {
  it('rollback and uninstall force dedicated isolation context', () => {
    assert.equal(assertRequiresDedicatedDockerHost(rollback).ok, true, JSON.stringify(assertRequiresDedicatedDockerHost(rollback).findings));
    assert.equal(assertRequiresDedicatedDockerHost(uninstall).ok, true, JSON.stringify(assertRequiresDedicatedDockerHost(uninstall).findings));
  });
});

describe('openhands rollback scope — aggregate audit', () => {
  it('passes for the live scripts', () => {
    const result = auditOpenHandsRollbackScripts({
      'rollback.sh': rollback,
      'uninstall.sh': uninstall,
      'common.sh': common,
    });
    assert.equal(result.ok, true, JSON.stringify(result.findings));
  });
});
