import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  SANDBOX_ADDITIONAL_NETWORK,
  SANDBOX_MEM_LIMIT,
  SANDBOX_NANO_CPUS,
  SANDBOX_PIDS_LIMIT,
  SANDBOX_SPAWN_OVERRIDE_IN_CONTAINER,
  SANDBOX_SPAWN_OVERRIDE_REL,
  SANDBOX_WEBHOOK_BASE,
} from '../lib/openhands/package-policy.js';
import {
  auditDynamicSandboxInspect,
  auditSandboxSpawnOverride,
} from '../lib/openhands/sandbox-spawn-policy.js';

const overridePath = 'ops/openhands/runtime-overrides/docker_sandbox_service.py';
const composePath = 'ops/openhands/compose.yaml';
const overrideText = fs.readFileSync(overridePath, 'utf8');
const composeText = fs.readFileSync(composePath, 'utf8');

describe('openhands dynamic sandbox spawn override', () => {
  it('ships the Option D override file', () => {
    assert.ok(fs.existsSync(overridePath));
    assert.match(overrideText, /CORPFLOWAI BOUNDARY OVERRIDE/);
  });

  it('compose bind-mounts the override over the upstream spawn module', () => {
    assert.match(
      composeText,
      new RegExp(
        `${SANDBOX_SPAWN_OVERRIDE_REL.replace(/\./g, '\\.')}:\\s*${SANDBOX_SPAWN_OVERRIDE_IN_CONTAINER.replace(/\//g, '\\/')}:ro`,
      ),
    );
  });

  it('compose sets CORPFLOWAI sandbox boundary env (not unread V0 knobs)', () => {
    assert.match(composeText, /CORPFLOWAI_SANDBOX_NETWORK:\s*"corpflowai-openhands-net"/);
    assert.match(
      composeText,
      new RegExp(
        `CORPFLOWAI_SANDBOX_WEBHOOK_BASE:\\s*"${SANDBOX_WEBHOOK_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`,
      ),
    );
    assert.match(composeText, new RegExp(`CORPFLOWAI_SANDBOX_MEM_LIMIT:\\s*"${SANDBOX_MEM_LIMIT}"`));
    assert.match(
      composeText,
      new RegExp(`CORPFLOWAI_SANDBOX_NANO_CPUS:\\s*"${SANDBOX_NANO_CPUS}"`),
    );
    assert.match(
      composeText,
      new RegExp(`CORPFLOWAI_SANDBOX_PIDS_LIMIT:\\s*"${SANDBOX_PIDS_LIMIT}"`),
    );
    assert.match(composeText, /SANDBOX_STARTUP_GRACE_SECONDS:\s*"120"/);
    // Dead V0 knobs must not be presented as if they work
    const active = composeText
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .join('\n');
    assert.doesNotMatch(active, /SANDBOX_ADDITIONAL_NETWORKS\s*:/);
    assert.doesNotMatch(active, /SANDBOX_LOCAL_RUNTIME_URL\s*:/);
  });

  it('passes auditSandboxSpawnOverride (dynamic path constraints)', () => {
    const result = auditSandboxSpawnOverride(overrideText);
    assert.equal(result.ok, true, JSON.stringify(result.findings));
  });

  it('fails audit when ExtraHosts host-gateway default is restored', () => {
    const bad = overrideText.replace(
      'default_factory=dict',
      "default_factory=lambda: {'host.docker.internal': 'host-gateway'}",
    );
    const result = auditSandboxSpawnOverride(bad);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => /host-gateway/i.test(f)));
  });

  it('fails audit when containers.run uses network_mode instead of named network', () => {
    const bad = overrideText.replace(
      'network=CORPFLOWAI_SANDBOX_NETWORK,',
      'network_mode=None,',
    );
    const result = auditSandboxSpawnOverride(bad);
    assert.equal(result.ok, false);
  });
});

describe('openhands dynamic sandbox inspect audit', () => {
  const goodInspect = {
    HostConfig: {
      NetworkMode: SANDBOX_ADDITIONAL_NETWORK,
      ExtraHosts: [],
      PortBindings: {},
      Memory: 512 * 1024 * 1024,
      NanoCpus: SANDBOX_NANO_CPUS,
      PidsLimit: SANDBOX_PIDS_LIMIT,
    },
    NetworkSettings: {
      Networks: { [SANDBOX_ADDITIONAL_NETWORK]: { NetworkID: 'x' } },
    },
    Mounts: [{ Type: 'volume', Name: 'corpflowai-openhands-workspace' }],
  };

  it('passes a compliant dynamic sandbox inspect', () => {
    const result = auditDynamicSandboxInspect(goodInspect);
    assert.equal(result.ok, true, JSON.stringify(result.findings));
  });

  it('fails default bridge networking', () => {
    const bad = structuredClone(goodInspect);
    bad.HostConfig.NetworkMode = 'bridge';
    bad.NetworkSettings.Networks = { bridge: {} };
    const result = auditDynamicSandboxInspect(bad);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => /bridge/i.test(f)));
  });

  it('fails host.docker.internal / host-gateway ExtraHosts', () => {
    const bad = structuredClone(goodInspect);
    bad.HostConfig.ExtraHosts = ['host.docker.internal:host-gateway'];
    const result = auditDynamicSandboxInspect(bad);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => /ExtraHosts|host-gateway/i.test(f)));
  });

  it('fails published host ports', () => {
    const bad = structuredClone(goodInspect);
    bad.HostConfig.PortBindings = { '8000/tcp': [{ HostPort: '49152' }] };
    const result = auditDynamicSandboxInspect(bad);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => /published host ports/i.test(f)));
  });

  it('fails missing cgroup/resource limits', () => {
    const bad = structuredClone(goodInspect);
    bad.HostConfig.Memory = 0;
    bad.HostConfig.NanoCpus = 0;
    bad.HostConfig.PidsLimit = 0;
    const result = auditDynamicSandboxInspect(bad);
    assert.equal(result.ok, false);
    assert.ok(result.findings.length >= 3);
  });

  it('fails unexpected mounts of docker.sock', () => {
    const bad = structuredClone(goodInspect);
    bad.Mounts.push({ Type: 'bind', Source: '/var/run/docker.sock' });
    const result = auditDynamicSandboxInspect(bad);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => /docker\.sock/i.test(f)));
  });
});
