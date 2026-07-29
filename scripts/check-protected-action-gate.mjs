#!/usr/bin/env node
/**
 * CLI gate for protected GitHub Actions (synthetic + production deploy hook).
 *
 * Usage:
 *   node scripts/check-protected-action-gate.mjs \
 *     --action=deploy \
 *     --issue=676 \
 *     --sha=abc123 \
 *     --environment=production \
 *     [--comments-file=path.json] \
 *     [--labels=needs:anton,approval:deploy] \
 *     [--workflow-enabled=true|false] \
 *     [--dry-run]
 *
 * Exit 0 = allowed (or dry-run report). Exit 2 = blocked.
 * Does not deploy, mutate production, send messages, or touch secrets.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  formatGateBlockMessage,
  gateProtectedAction,
  evaluateAgentAutoMergeGate,
} from '../lib/server/protected-action-gates.js';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const eq = raw.indexOf('=');
    if (eq < 0) {
      out[raw.slice(2)] = 'true';
      continue;
    }
    out[raw.slice(2, eq)] = raw.slice(eq + 1);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.mode || 'protected-action';

  if (mode === 'auto-merge') {
    const result = evaluateAgentAutoMergeGate({
      headBranch: args.branch || '',
      labels: String(args.labels || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      cmpAutoMergeEnabled: args['cmp-auto-merge'] === 'true',
      workflowConclusion: args.conclusion || 'success',
    });
    const payload = { mode, ...result };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    if (args['dry-run'] === 'true') process.exit(0);
    process.exit(result.allowed ? 0 : 2);
  }

  /** @type {string[]} */
  let comments = [];
  if (args['comments-file']) {
    const p = path.resolve(String(args['comments-file']));
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (Array.isArray(raw)) {
      comments = raw.map((c) => (typeof c === 'string' ? c : String(c?.body || '')));
    } else if (raw && typeof raw === 'object' && Array.isArray(raw.comments)) {
      comments = raw.comments.map((c) => (typeof c === 'string' ? c : String(c?.body || '')));
    }
  }
  if (args.comment) comments.push(String(args.comment));

  const labels = String(args.labels || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const result = gateProtectedAction({
    action: args.action || 'deploy',
    labels,
    comments,
    issueNumber: args.issue ? Number(args.issue) : null,
    prNumber: args.pr ? Number(args.pr) : null,
    targetSha: args.sha || null,
    environment: args.environment || 'production',
    workflowEnabled: args['workflow-enabled'] === 'true',
  });

  const payload = {
    mode,
    action: args.action || 'deploy',
    allowed: result.allowed,
    blocked: result.blocked,
    reason: result.reason,
    audit: result.audit,
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);

  if (result.blocked) {
    process.stderr.write(
      `${formatGateBlockMessage({ action: args.action || 'deploy', reason: result.reason, audit: result.audit })}\n`,
    );
  }

  if (args['dry-run'] === 'true') process.exit(0);
  process.exit(result.allowed ? 0 : 2);
}

main();
