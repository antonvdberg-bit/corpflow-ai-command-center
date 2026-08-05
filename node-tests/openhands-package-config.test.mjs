import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  assertNoProductionEnv,
  auditOpenHandsCompose,
} from '../lib/openhands/compose-static-audit.js';
import {
  AGENT_SERVER_IMAGE,
  APP_IMAGE,
  BIND_HOST,
  BIND_PORT,
  COMPOSE_PROJECT,
  CONTROL_CPUS,
  CONTROL_MEM_LIMIT,
  FORBIDDEN_ENV_NAMES,
  FORBIDDEN_MOUNT_PREFIXES,
  HEALTH_PATH,
  MAX_CONCURRENT_TASKS,
  PRIMARY_DOCKER_SOCKET_PATH,
  SANDBOX_ADDITIONAL_NETWORK,
  SANDBOX_LOCAL_RUNTIME_URL,
  referencesHostDockerInternal,
  referencesPrimaryDockerSocket,
  isForbiddenLatestTag,
  isLoopbackBind,
} from '../lib/openhands/package-policy.js';

const composePath = 'ops/openhands/compose.yaml';
const envExamplePath = 'ops/openhands/.env.example';

const composeText = fs.readFileSync(composePath, 'utf8');
const envExampleText = fs.readFileSync(envExamplePath, 'utf8');

describe('openhands package config — ops/openhands/compose.yaml on disk', () => {
  it('pins the app image exactly as package-policy expects', () => {
    assert.match(composeText, new RegExp(`image:\\s*${APP_IMAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.equal(isForbiddenLatestTag(APP_IMAGE), false);
  });

  it('pins the agent-server (sandbox) image exactly as package-policy expects', () => {
    const [repo, tag] = AGENT_SERVER_IMAGE.split(':');
    assert.match(composeText, new RegExp(`AGENT_SERVER_IMAGE_REPOSITORY:\\s*${repo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(composeText, new RegExp(`AGENT_SERVER_IMAGE_TAG:\\s*["']?${tag}["']?`));
    assert.equal(isForbiddenLatestTag(AGENT_SERVER_IMAGE), false);
  });

  it('never uses a latest/floating tag anywhere in the file', () => {
    assert.doesNotMatch(composeText, /:\s*["']?latest["']?/i);
    assert.doesNotMatch(composeText, /:\s*["']?nightly["']?/i);
  });

  it('publishes the app port on loopback only', () => {
    const expected = `${BIND_HOST}:${BIND_PORT}:${BIND_PORT}`;
    assert.match(composeText, new RegExp(expected.replace(/\./g, '\\.')));
    assert.equal(isLoopbackBind(expected), true);
    assert.doesNotMatch(composeText, /"0\.0\.0\.0:\d+:\d+"/);
  });

  it('sets the control-plane memory and CPU limits from package-policy', () => {
    assert.match(composeText, new RegExp(`mem_limit:\\s*${CONTROL_MEM_LIMIT}`));
    assert.match(composeText, new RegExp(`cpus:\\s*["']?${CONTROL_CPUS}["']?`));
  });

  it('sets a pids_limit', () => {
    assert.match(composeText, /pids_limit:\s*\d+/);
  });

  it('never runs privileged and never uses host networking', () => {
    assert.doesNotMatch(composeText, /^\s*privileged:\s*true\s*$/m);
    assert.doesNotMatch(composeText, /^\s*network_mode:\s*["']?host["']?\s*$/m);
  });

  it('declares healthcheck against official /health', () => {
    assert.match(composeText, /^\s*healthcheck:\s*$/m);
    assert.match(composeText, new RegExp(`${BIND_HOST}:${BIND_PORT}${HEALTH_PATH}`));
  });

  it('declares a restart policy', () => {
    assert.match(composeText, /^\s*restart:\s*unless-stopped\s*$/m);
  });

  it('bounds log size and file count', () => {
    assert.match(composeText, /max-size:\s*["']?\S+/);
    assert.match(composeText, /max-file:\s*["']?\d+/);
  });

  it('forbids primary host Docker socket on active lines', () => {
    assert.equal(referencesPrimaryDockerSocket(composeText), false);
    assert.doesNotMatch(
      composeText
        .split(/\r?\n/)
        .filter((l) => l.trim() && !l.trim().startsWith('#'))
        .join('\n'),
      new RegExp(PRIMARY_DOCKER_SOCKET_PATH.replace(/\./g, '\\.')),
    );
  });

  it('forbids host.docker.internal on active lines', () => {
    assert.equal(referencesHostDockerInternal(composeText), false);
  });

  it('overrides SANDBOX_LOCAL_RUNTIME_URL to dedicated-network DNS (no host-gateway)', () => {
    assert.equal(SANDBOX_LOCAL_RUNTIME_URL, 'http://corpflowai-openhands-app:3000');
    assert.equal(SANDBOX_ADDITIONAL_NETWORK, 'corpflowai-openhands-net');
    assert.match(
      composeText,
      new RegExp(
        `SANDBOX_LOCAL_RUNTIME_URL:\\s*"${SANDBOX_LOCAL_RUNTIME_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`,
      ),
    );
    assert.match(
      composeText,
      new RegExp(`SANDBOX_ADDITIONAL_NETWORKS:\\s*'\\["${SANDBOX_ADDITIONAL_NETWORK}"\\]'`),
    );
  });

  it('pins concurrency to one', () => {
    assert.equal(MAX_CONCURRENT_TASKS, 1);
    assert.match(composeText, /MAX_CONCURRENT_CONVERSATIONS:\s*["']?1["']?/);
  });

  it('uses dedicated DOCKER_HOST / OPENHANDS_DOCKER_SOCK', () => {
    assert.match(composeText, /DOCKER_HOST:\s*unix:\/\//);
    assert.match(composeText, /OPENHANDS_DOCKER_SOCK/);
    assert.match(composeText, /openhands-docker\/docker\.sock/);
  });

  it('never references CorpFlowAI production secrets or Postgres as an actual env assignment', () => {
    const result = assertNoProductionEnv(composeText);
    assert.equal(result.ok, true, JSON.stringify(result.findings));
  });

  it('does not assign any FORBIDDEN_ENV_NAMES entry as a real key', () => {
    for (const name of FORBIDDEN_ENV_NAMES) {
      assert.doesNotMatch(
        composeText,
        new RegExp(`^\\s*${name}\\s*[:=]`, 'm'),
        `compose.yaml unexpectedly assigns forbidden env name "${name}"`,
      );
    }
  });

  it('uses the named compose project, not the default/anonymous name', () => {
    assert.match(composeText, new RegExp(`^name:\\s*${COMPOSE_PROJECT}\\s*$`, 'm'));
  });

  it('does not bind-mount forbidden broad host paths', () => {
    const bindMountLines = composeText
      .split(/\r?\n/)
      .filter((l) => {
        const t = l.trim();
        if (!t || t.startsWith('#')) return false;
        return /^\s*-\s*\/[^$:{][^:]*:/.test(l);
      });
    for (const line of bindMountLines) {
      const hostPath = line.trim().replace(/^-\s*/, '').split(':')[0];
      for (const prefix of FORBIDDEN_MOUNT_PREFIXES) {
        assert.notEqual(hostPath, prefix, `forbidden bind mount: ${hostPath}`);
      }
    }
  });

  it('passes the full static audit', () => {
    const result = auditOpenHandsCompose(composeText);
    assert.equal(result.ok, true, JSON.stringify(result.findings));
  });
});

describe('openhands package config — ops/openhands/.env.example on disk', () => {
  it('exists and contains only placeholder values, never real secrets', () => {
    assert.ok(envExampleText.length > 0);
    assert.ok(
      /<REPLACE_ME_|<ENTER_DIRECTLY_IN_APPROVED_SECRET_STORE>/.test(envExampleText),
      'expected secret placeholders',
    );
  });

  it('never references a forbidden production/secret env name as an assigned value', () => {
    for (const name of FORBIDDEN_ENV_NAMES) {
      assert.doesNotMatch(
        envExampleText,
        new RegExp(`^${name}=`, 'm'),
        `.env.example unexpectedly assigns forbidden env name "${name}"`,
      );
    }
  });

  it('documents the monthly cost ceiling matching package-policy', () => {
    assert.match(envExampleText, /OPENHANDS_MONTHLY_COST_CEILING_USD=25/);
  });

  it('documents dedicated docker socket paths and forbids primary sock assignment', () => {
    assert.match(envExampleText, /OPENHANDS_DOCKER_SOCK=/);
    assert.match(envExampleText, /OPENHANDS_DOCKER_HOST=/);
    const active = envExampleText
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .join('\n');
    assert.doesNotMatch(active, /\/var\/run\/docker\.sock/);
  });
});
