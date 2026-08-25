#!/usr/bin/env node
/**
 * Publish durable evidence only after the native Cursor wake webhook accepts.
 * This is intentionally not an executor and does not call Cursor.
 */
import fs from 'node:fs';

import {
  FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
  formatFactoryHandoffComment,
} from '../lib/server/factory-cursor-handoff.js';
import { postGitHubIssueComment } from '../lib/server/cursor-ops-status.js';

const planPath = process.env.FACTORY_HANDOFF_OUT_PATH || 'factory-cursor-handoff.json';
const token = String(process.env.GITHUB_TOKEN || '').trim();
const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
const runId = String(process.env.GITHUB_RUN_ID || '').trim();
const serverUrl = String(process.env.GITHUB_SERVER_URL || 'https://github.com').replace(/\/$/, '');

if (!token || !repo || !runId) {
  throw new Error('GITHUB_TOKEN, GITHUB_REPOSITORY, and GITHUB_RUN_ID are required');
}

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const sourceIssue = Number(plan.source_issue || 0);
if (!plan.shouldSucceed || !Number.isInteger(sourceIssue) || sourceIssue < 1) {
  throw new Error('No successful handoff is available to publish');
}

const workflowRunUrl = `${serverUrl}/${repo}/actions/runs/${runId}`;
const comment = formatFactoryHandoffComment({
  sourceIssue,
  wakeReason: plan.wakeReason,
  wakePath: plan.wakePath,
  availableSlots: plan.availableSlots,
  verifiedActiveCount: plan.verifiedActiveCount,
  workflowRunUrl,
  workflowName: FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
  handoffRunId: runId,
  handedOffAt: new Date().toISOString(),
  capacityPacket: plan.capacityPacket,
});

await postGitHubIssueComment(sourceIssue, comment, {
  token,
  repoFullName: repo,
});
console.log(`Published successful Cursor handoff and receipt for issue #${sourceIssue}`);
