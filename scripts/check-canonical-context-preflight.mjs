#!/usr/bin/env node

import fs from 'node:fs';

const ACTIVATION_CUTOFF = new Date('2026-08-10T06:19:00Z');
const ALLOWED_ENVIRONMENTS = new Set(['corpflow_test', 'client_production', 'local', 'n/a']);
const createdAtRaw = String(process.env.PR_CREATED_AT || '').trim();
const prBody = String(process.env.PR_BODY || '');
const prNumber = String(process.env.PR_NUMBER || '').trim();

function resolveAcknowledgedEnvironment(body) {
  const matches = [...String(body).matchAll(/Environment:\s*([^\n\r]+)/gi)].map((match) =>
    match[1].trim().toLowerCase(),
  );
  const explicit = matches.find((value) => ALLOWED_ENVIRONMENTS.has(value));
  if (explicit) return { value: explicit, source: 'explicit' };

  // CorpFlowAI-hosted review/staging URLs are never client-production surfaces.
  if (/https?:\/\/[^\s)\]]+\.corpflowai\.com\b/i.test(body)) {
    return { value: 'corpflow_test', source: 'inferred from CorpFlowAI-hosted URL' };
  }

  // Context-only/docs-only PRs can safely remain unclassified.
  return { value: 'n/a', source: 'default' };
}

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

// The workflow itself is the PASS acknowledgement and runs on fresh PR events.
// Do not require authors/agents to type self-attestations such as
// "Canonical Context Preflight: PASS" or "GitHub state refreshed: YES".
const source =
  prBody.match(/Source item:\s*(#\d+|PR\s*#\d+|n\/a|direct operator (?:policy )?(?:change|request))/i)?.[1]?.trim() ||
  (prNumber ? `PR #${prNumber}` : 'n/a');

const declaredVersion = prBody
  .match(/Operating model version:\s*([^\n\r]+)/i)?.[1]
  ?.trim()
  .replace(/^`|`$/g, '');

if (declaredVersion && declaredVersion !== currentVersion) {
  console.error(
    `Canonical Context Preflight FAIL: stale operating model version ${declaredVersion}; current is ${currentVersion}`,
  );
  process.exit(1);
}

const environment = resolveAcknowledgedEnvironment(prBody);

if (/\.corpflowai\.com\b/i.test(prBody) && environment.value === 'client_production') {
  console.error('Canonical Context Preflight FAIL: CorpFlowAI-hosted URL classified as client_production');
  process.exit(1);
}

console.log('Canonical Context Preflight PASS');
console.log(`Operating model version: ${currentVersion}${declaredVersion ? ' (declared)' : ' (current repo)'}`);
console.log(`Source item: ${source}`);
console.log(`Environment: ${environment.value} (${environment.source})`);
