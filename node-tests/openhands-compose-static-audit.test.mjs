import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  assertHealthcheck,
  assertLoggingLimits,
  assertLoopbackOnlyPorts,
  assertNoHostNetworkOnApp,
  assertNoLatestTags,
  assertNoPrivileged,
  assertNoProductionEnv,
  assertResourceLimitsPresent,
  assertRestartPolicy,
  auditOpenHandsCompose,
} from '../lib/openhands/compose-static-audit.js';

const goodCompose = fs.readFileSync(
  'node-tests/fixtures/openhands/good-compose-snippet.yaml',
  'utf8',
);
const badCompose = fs.readFileSync(
  'node-tests/fixtures/openhands/bad-compose-snippet.yaml',
  'utf8',
);

describe('openhands compose static audit — good fixture', () => {
  it('passes every individual assertion', () => {
    assert.equal(assertNoLatestTags(goodCompose).ok, true);
    assert.equal(assertLoopbackOnlyPorts(goodCompose).ok, true);
    assert.equal(assertResourceLimitsPresent(goodCompose).ok, true);
    assert.equal(assertNoPrivileged(goodCompose).ok, true);
    assert.equal(assertNoHostNetworkOnApp(goodCompose).ok, true);
    assert.equal(assertNoProductionEnv(goodCompose).ok, true);
    assert.equal(assertRestartPolicy(goodCompose).ok, true);
    assert.equal(assertHealthcheck(goodCompose).ok, true);
    assert.equal(assertLoggingLimits(goodCompose).ok, true);
  });

  it('passes the aggregate audit with no findings', () => {
    const result = auditOpenHandsCompose(goodCompose);
    assert.equal(result.ok, true);
    assert.deepEqual(result.findings, []);
  });
});

describe('openhands compose static audit — bad fixture', () => {
  it('flags the unpinned "latest" tag', () => {
    const result = assertNoLatestTags(badCompose);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => f.includes('latest')));
  });

  it('flags the non-loopback 0.0.0.0 bind', () => {
    const result = assertLoopbackOnlyPorts(badCompose);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => f.includes('0.0.0.0:3000:3000')));
  });

  it('flags privileged: true', () => {
    const result = assertNoPrivileged(badCompose);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => f.includes('privileged')));
  });

  it('flags network_mode: host on the app service', () => {
    const result = assertNoHostNetworkOnApp(badCompose);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => f.includes('network_mode: host')));
  });

  it('flags the missing resource limits', () => {
    const result = assertResourceLimitsPresent(badCompose);
    assert.equal(result.ok, false);
    assert.ok(result.findings.length >= 2); // missing mem_limit AND cpus
  });

  it('flags the missing restart policy', () => {
    const result = assertRestartPolicy(badCompose);
    assert.equal(result.ok, false);
  });

  it('flags the missing healthcheck', () => {
    const result = assertHealthcheck(badCompose);
    assert.equal(result.ok, false);
  });

  it('flags the missing bounded logging', () => {
    const result = assertLoggingLimits(badCompose);
    assert.equal(result.ok, false);
  });

  it('flags the POSTGRES_URL production env reference', () => {
    const result = assertNoProductionEnv(badCompose);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => f.includes('POSTGRES_URL')));
  });

  it('fails the aggregate audit with multiple findings', () => {
    const result = auditOpenHandsCompose(badCompose);
    assert.equal(result.ok, false);
    assert.ok(result.findings.length >= 6);
  });
});

describe('openhands compose static audit — accepts a parsed object too', () => {
  it('does not throw when given a plain object instead of text', () => {
    const result = auditOpenHandsCompose({ services: { app: { image: 'x:1.0' } } });
    assert.equal(typeof result.ok, 'boolean');
    assert.ok(Array.isArray(result.findings));
  });
});
