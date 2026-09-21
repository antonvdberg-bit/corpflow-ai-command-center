#!/usr/bin/env node
/**
 * Read-only Cursor usage → Langfuse backfill.
 *
 * This script only reads GitHub comments and the Cursor usage endpoint. It
 * never starts an agent/run, changes GitHub state, or records prompts.
 *
 * Example:
 *   node scripts/cursor-agent-economic-backfill.mjs --issue=1196 --issue=551
 */

import {
  emitProductionCursorTrace,
} from '../lib/server/langfuse-production-observability.js';
import {
  getCursorCloudAgentUsage,
} from '../lib/server/cursor-cloud-agent-client.js';
import {
  parseCloudAgentsExecutorEvidence,
} from '../lib/server/factory-cloud-agents-executor.js';

const repo = String(
  process.env.GITHUB_REPOSITORY || 'antonvdberg-bit/corpflow-ai-command-center',
).trim();
const [owner, repoName] = repo.split('/');
const githubApi = 'https://api.github.com';

function issuesFromArgs(argv) {
  return argv
    .filter((arg) => arg.startsWith('--issue='))
    .map((arg) => Number(arg.slice('--issue='.length)))
    .filter((issue) => Number.isInteger(issue) && issue > 0);
}

async function github(path) {
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  if (!token) throw new Error('GITHUB_TOKEN / GH_TOKEN missing');
  const response = await fetch(`${githubApi}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  return response.json();
}

async function commentsForIssue(issue) {
  return github(`/repos/${owner}/${repoName}/issues/${issue}/comments?per_page=100`);
}

function latestEvidence(comments, issue) {
  for (const comment of [...comments].reverse()) {
    const evidence = parseCloudAgentsExecutorEvidence(comment?.body);
    if (
      evidence &&
      evidence.source_issue === issue &&
      evidence.cursor_agent_id &&
      evidence.cursor_run_id &&
      ['IN_PROGRESS', 'COMPLETED'].includes(evidence.status)
    ) {
      return evidence;
    }
  }
  return null;
}

async function main() {
  const issues = issuesFromArgs(process.argv.slice(2));
  if (issues.length === 0) throw new Error('Provide at least one --issue=N');
  const apiKey = String(process.env.CURSOR_API_KEY || '').trim();
  if (!apiKey) throw new Error('CURSOR_API_KEY missing');

  const results = [];
  for (const issue of [...new Set(issues)]) {
    const evidence = latestEvidence(await commentsForIssue(issue), issue);
    if (!evidence) {
      results.push({ issue, ok: false, reason: 'NO_KNOWN_CURSOR_RUN_EVIDENCE' });
      continue;
    }
    try {
      const usage = await getCursorCloudAgentUsage(
        apiKey,
        evidence.cursor_agent_id,
        evidence.cursor_run_id,
      );
      const emitted = await emitProductionCursorTrace({
        agentId: evidence.cursor_agent_id,
        runId: evidence.cursor_run_id,
        sourceIssue: issue,
        modelSelection: evidence.model_selection,
        usage,
        status: evidence.status,
        outcomeRef: evidence.pr_number ? `github-pr-${evidence.pr_number}` : null,
      });
      results.push({
        issue,
        cursor_agent_id: evidence.cursor_agent_id,
        cursor_run_id: evidence.cursor_run_id,
        ok: Boolean(emitted.ok),
        reason: emitted.reason || null,
        trace_id: emitted.trace_id || null,
        content_redacted: emitted.content_redacted === true,
        cost: 'UNKNOWN unless provider reports a cash amount',
      });
    } catch {
      results.push({
        issue,
        cursor_agent_id: evidence.cursor_agent_id,
        cursor_run_id: evidence.cursor_run_id,
        ok: false,
        reason: 'CURSOR_USAGE_OR_LANGFUSE_FAILED',
        content_redacted: true,
      });
    }
  }
  console.log(JSON.stringify({ schema: 'corpflow.cursor_economic_backfill.v1', results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
