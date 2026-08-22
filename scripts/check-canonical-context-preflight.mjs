#!/usr/bin/env node

import fs from 'node:fs';

const ACTIVATION_CUTOFF = new Date('2026-08-10T06:19:00Z');
const createdAtRaw = String(process.env.PR_CREATED_AT || '').trim();
const prBody = String(process.env.PR_BODY || '');

if (createdAtRaw) {
  const createdAt = new Date(createdAtRaw);
  if (!Number.isNaN(createdAt.valueOf()) && createdAt < ACTIVATION_CUTOFF) {
    console.log(`Canonical Context Preflight: grandfathered PR created ${createdAt.toISOString()}`);
    process.exit(0);
  }
}

const realityPath = 'docs/operations/CORPFLOWAI_CURRENT_DELIVERY_REALITY.md';
if (!fs.existsSync(realityPath)) {
  console.error(`Canonical Context Preflight FAIL: missing ${realityPath}`);
  process.exit(1);
}

const reality = fs.readFileSync(realityPath, 'utf8');
const versionMatch = reality.match(/Operating model version:\*\*\s*`([^`]+)`/i);
if (!versionMatch) {
  console.error('Canonical Context Preflight FAIL: unable to resolve current operating model version');
  process.exit(1);
}
const currentVersion = versionMatch[1].trim();

const required = {
  pass: /Canonical Context Preflight:\s*PASS/i,
  refreshed: /GitHub state refreshed:\s*YES/i,
  source: /Source item:\s*(#\d+|PR\s*#\d+|n\/a|direct operator (?:policy )?(?:change|request))/i,
};

for (const [name, re] of Object.entries(required)) {
  if (!re.test(prBody)) {
    console.error(`Canonical Context Preflight FAIL: missing/invalid ${name} acknowledgement`);
    process.exit(1);
  }
}

const version = prBody.match(/Operating model version:\s*([^\n\r]+)/i)?.[1]?.trim().replace(/^`|`$/g, '');
if (!version) {
  console.error('Canonical Context Preflight FAIL: missing Operating model version');
  process.exit(1);
}
if (version !== currentVersion) {
  console.error(`Canonical Context Preflight FAIL: stale operating model version ${version}; current is ${currentVersion}`);
  process.exit(1);
}

const environment = prBody.match(/Environment:\s*([^\n\r]+)/i)?.[1]?.trim().toLowerCase();
const allowed = new Set(['corpflow_test', 'client_production', 'local', 'n/a']);
if (!environment || !allowed.has(environment)) {
  console.error(`Canonical Context Preflight FAIL: Environment must be one of ${[...allowed].join(', ')}`);
  process.exit(1);
}

if (/\.corpflowai\.com\b/i.test(prBody) && environment === 'client_production') {
  console.error('Canonical Context Preflight FAIL: CorpFlowAI-hosted URL classified as client_production');
  process.exit(1);
}

console.log('Canonical Context Preflight PASS');
console.log(`Operating model version: ${currentVersion}`);
console.log(`Environment: ${environment}`);
