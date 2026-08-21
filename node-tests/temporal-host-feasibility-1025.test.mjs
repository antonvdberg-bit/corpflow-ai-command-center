/**
 * Deterministic #1025 Temporal host-feasibility invariants.
 * Does not SSH, install Temporal, or print secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

const EVIDENCE = 'docs/operations/TEMPORAL_HOST_FEASIBILITY_EVIDENCE_1025.md';
const RUNBOOK = 'docs/runbooks/TEMPORAL_SELF_HOSTED_POC_PREFLIGHT.md';
const SCRIPT = 'scripts/ops/temporal/inspect-host-capacity.sh';
const COMPOSE = 'ops/temporal/compose.example.yml';
const README = 'ops/temporal/README.md';
const ADR = 'docs/decisions/20260821-temporal-self-hosted-poc-stop.md';

test('#1025 evidence packet files exist', () => {
  for (const rel of [EVIDENCE, RUNBOOK, SCRIPT, COMPOSE, README, ADR]) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, rel);
  }
});

test('#1025 evidence records HOST_MISMATCH stop gate and does not claim POC pass', () => {
  const doc = read(EVIDENCE);
  assert.ok(doc.includes('<!-- TEMPORAL_HOST_FEASIBILITY_EVIDENCE_1025 -->'));
  assert.ok(doc.includes('#1025'));
  assert.ok(doc.includes('STOP — EXISTING SERVER CAPACITY NOT PROVEN'));
  assert.ok(doc.includes('HOST_MISMATCH'));
  assert.ok(doc.includes('NO — SEPARATE SMALL SERVER/VM RECOMMENDED'));
  assert.ok(doc.includes('Hetzner CX32'));
  assert.ok(doc.includes('bc-c95becc6-3cc5-468d-93dd-ca3389ada0e3'));
  assert.ok(doc.includes('FAIL — EXISTING SERVER CAPACITY NOT PROVEN'));
  assert.ok(doc.includes('This is **not** `SELF-HOSTED TEMPORAL POC PASS'));
  assert.doesNotMatch(doc, /docker compose up/);
});

test('#1025 preflight runbook stays read-only', () => {
  const doc = read(RUNBOOK);
  assert.ok(doc.includes('read-only'));
  assert.ok(doc.includes('inspect-host-capacity.sh'));
  assert.ok(doc.includes('Does **not** install Temporal'));
  assert.ok(doc.includes('no `docker compose up`'));
  assert.doesNotMatch(doc, /apt-get install/);
});

test('#1025 inspect script is read-only and never prints env values', () => {
  const script = read(SCRIPT);
  assert.ok(script.includes('READ-ONLY'));
  assert.ok(script.includes('docker stats --no-stream'));
  assert.ok(script.includes('HOST_MISMATCH'));
  assert.doesNotMatch(script, /docker compose up/);
  assert.doesNotMatch(script, /apt-get/);
  assert.doesNotMatch(script, /printenv/);
  assert.doesNotMatch(script, /POSTGRES_URL/);
});

test('#1025 compose scaffold is loopback-only with dedicated Postgres and limits', () => {
  const compose = read(COMPOSE);
  const active = compose
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');
  assert.ok(compose.includes('EXAMPLE ONLY'));
  assert.ok(compose.includes('127.0.0.1:7233:7233'));
  assert.ok(compose.includes('127.0.0.1:8233:8080'));
  assert.ok(compose.includes('postgres:16.6-alpine'));
  assert.ok(compose.includes('temporalio/auto-setup:1.27.2'));
  assert.ok(compose.includes('mem_limit:'));
  assert.ok(compose.includes('corpflowai-temporal-pgdata'));
  assert.doesNotMatch(active, /0\.0\.0\.0/);
  assert.doesNotMatch(active, /POSTGRES_URL/);
  assert.doesNotMatch(compose, /:\s*["']?latest["']?/i);
  assert.doesNotMatch(active, /elasticsearch/i);
});
