import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  assertDedicatedDockerHost,
  assertNoHostDockerInternal,
  assertNoPrimaryDockerSocket,
  assertOfficialHealthEndpoint,
  assertSingleConcurrency,
  auditOpenHandsCompose,
} from '../lib/openhands/compose-static-audit.js';

const good = fs.readFileSync('node-tests/fixtures/openhands/good-compose-snippet.yaml', 'utf8');
const bad = fs.readFileSync('node-tests/fixtures/openhands/bad-compose-snippet.yaml', 'utf8');
const liveCompose = fs.readFileSync('ops/openhands/compose.yaml', 'utf8');

describe('openhands compose static audit — good fixture', () => {
  it('passes every isolation-era assertion', () => {
    assert.equal(assertNoPrimaryDockerSocket(good).ok, true);
    assert.equal(assertNoHostDockerInternal(good).ok, true);
    assert.equal(assertOfficialHealthEndpoint(good).ok, true);
    assert.equal(assertSingleConcurrency(good).ok, true);
    assert.equal(assertDedicatedDockerHost(good).ok, true);
  });

  it('passes the aggregate audit with no findings', () => {
    const result = auditOpenHandsCompose(good);
    assert.equal(result.ok, true, JSON.stringify(result.findings));
  });
});

describe('openhands compose static audit — bad fixture', () => {
  it('flags primary /var/run/docker.sock', () => {
    assert.equal(assertNoPrimaryDockerSocket(bad).ok, false);
  });

  it('flags host.docker.internal', () => {
    assert.equal(assertNoHostDockerInternal(bad).ok, false);
  });

  it('flags missing /health and concurrency > 1', () => {
    assert.equal(assertOfficialHealthEndpoint(bad).ok, false);
    assert.equal(assertSingleConcurrency(bad).ok, false);
  });

  it('fails the aggregate audit with multiple findings', () => {
    const result = auditOpenHandsCompose(bad);
    assert.equal(result.ok, false);
    assert.ok(result.findings.length >= 5, JSON.stringify(result.findings));
  });
});

describe('openhands compose static audit — live ops/openhands/compose.yaml', () => {
  it('forbids primary docker.sock and host.docker.internal on active lines', () => {
    assert.equal(assertNoPrimaryDockerSocket(liveCompose).ok, true, 'primary sock must be absent from active lines');
    assert.equal(assertNoHostDockerInternal(liveCompose).ok, true);
  });

  it('uses official /health and concurrency 1', () => {
    assert.equal(assertOfficialHealthEndpoint(liveCompose).ok, true);
    assert.equal(assertSingleConcurrency(liveCompose).ok, true);
  });

  it('passes the full aggregate audit', () => {
    const result = auditOpenHandsCompose(liveCompose);
    assert.equal(result.ok, true, JSON.stringify(result.findings));
  });
});
