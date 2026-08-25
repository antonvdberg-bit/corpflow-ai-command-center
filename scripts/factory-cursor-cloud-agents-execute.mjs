#!/usr/bin/env node
/**
 * Factory Handoff Cloud Agents API v1 executor (#1062).
 *
 * Default is dry-run / dormant. Live create only when
 * FACTORY_CURSOR_EXECUTOR=cloud_agents_v1 (the later approved live switch).
 *
 * Usage:
 *   node scripts/factory-cursor-cloud-agents-execute.mjs --dry-run
 *   FACTORY_CURSOR_EXECUTOR=cloud_agents_v1 node scripts/factory-cursor-cloud-agents-execute.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

import { postGitHubIssueComment, redactSecretsFromText } from '../lib/server/cursor-ops-status.js';
import {
  FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
  FACTORY_CURSOR_EXECUTOR_DRY_RUN,
  resolveFactoryCursorExecutorMode,
  runFactoryCloudAgentsExecutor,
} from '../lib/server/factory-cursor-cloud-agents-executor.js';

const DEFAULT_REPO = 'antonvdberg-bit/corpflow-ai-command-center';
const DEFAULT_HANDOFF = 'factory-cursor-handoff.json';
const DEFAULT_OUT = 'factory-cursor-cloud-agents-execution.json';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    outPath:
      argv.find((a) => a.startsWith('--out='))?.slice('--out='.length) ||
      process.env.FACTORY_CLOUD_AGENTS_OUT_PATH ||
      DEFAULT_OUT,
    handoffPath:
      argv.find((a) => a.startsWith('--handoff='))?.slice('--handoff='.length) ||
      process.env.FACTORY_HANDOFF_OUT_PATH ||
      DEFAULT_HANDOFF,
  };
}

/**
 * @param {string[]} lines
 */
function appendOutput(lines) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) {
    for (const line of lines) console.log(`output:${line}`);
    return;
  }
  fs.appendFileSync(out, `${lines.join('\n')}\n`);
}

/**
 * @param {string} token
 * @param {string} repo
 * @param {number} issueNumber
 */
async function fetchIssue(token, repo, issueNumber) {
  const res = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub get issue HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

/**
 * @param {string} token
 * @param {string} repo
 * @param {number} issueNumber
 */
async function listComments(token, repo, issueNumber) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(30000),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub list comments HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text);
  return Array.isArray(json) ? json : [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const resolved = resolveFactoryCursorExecutorMode(process.env, { dryRun: args.dryRun });
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || DEFAULT_REPO).trim();
  const handoffPath = path.resolve(args.handoffPath);
  const handoff = fs.existsSync(handoffPath)
    ? JSON.parse(fs.readFileSync(handoffPath, 'utf8'))
    : {};
  const sourceIssue = Number(
    process.env.SOURCE_ISSUE || handoff.source_issue || process.env.FACTORY_HANDOFF_SOURCE_ISSUE || 0,
  );
  if (!Number.isInteger(sourceIssue) || sourceIssue < 1) {
    throw new Error('source_issue is required');
  }

  const dryRun =
    args.dryRun ||
    resolved.mode === FACTORY_CURSOR_EXECUTOR_DRY_RUN ||
    resolved.mode !== FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1;

  /** @type {{ title?: string, body?: string, html_url?: string, labels?: unknown }} */
  let issue = {};
  /** @type {Array<{ body?: string | null, created_at?: string | null }>} */
  let comments = [];
  if (token && !dryRun) {
    issue = await fetchIssue(token, repo, sourceIssue);
    comments = await listComments(token, repo, sourceIssue);
  } else if (token) {
    try {
      issue = await fetchIssue(token, repo, sourceIssue);
      comments = await listComments(token, repo, sourceIssue);
    } catch {
      issue = {};
      comments = [];
    }
  }

  const result = await runFactoryCloudAgentsExecutor({
    sourceIssue,
    handoffRunId: process.env.GITHUB_RUN_ID || handoff.workflowRunUrl || null,
    repository: repo,
    requestedOutcome: issue.title || null,
    issueTitle: issue.title || null,
    issueBody: issue.body || null,
    issueUrl: issue.html_url || null,
    labels: issue.labels,
    comments,
    mode: dryRun ? FACTORY_CURSOR_EXECUTOR_DRY_RUN : FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
    dryRun,
    cursorApiKey: process.env.CURSOR_API_KEY,
    githubToken: token,
    wakeProofWebhookEnabled: resolved.wakeProofWebhookEnabled,
    cloudAgentsLiveEnabled: resolved.cloudAgentsLiveEnabled,
    nowIso: new Date().toISOString(),
    postComment:
      token && !dryRun
        ? (issueNumber, body) =>
            postGitHubIssueComment(issueNumber, body, { token, repoFullName: repo })
        : undefined,
  });

  const outPath = path.resolve(args.outPath);
  const serialized = redactSecretsFromText(JSON.stringify(result, null, 2));
  fs.writeFileSync(outPath, `${serialized}\n`);

  appendOutput([
    `ok=${result.ok ? '1' : '0'}`,
    `status=${result.evidence?.status || ''}`,
    `cursor_agent_id=${result.evidence?.cursor_agent_id || ''}`,
    `dry_run=${result.evidence?.dry_run ? '1' : '0'}`,
    `reason=${result.evidence?.reason || ''}`,
  ]);

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        skipped: Boolean(result.skipped),
        status: result.evidence?.status || null,
        reason: result.evidence?.reason || null,
        cursor_agent_id: result.evidence?.cursor_agent_id || null,
        dry_run: Boolean(result.evidence?.dry_run),
        outPath,
      },
      null,
      2,
    ),
  );

  if (!dryRun && !result.ok && !result.skipped) {
    console.error(
      `Cloud Agents API v1 execution failed (${result.evidence?.reason || 'unknown'}) — fail closed`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(redactSecretsFromText(err instanceof Error ? err.stack || err.message : String(err)));
  process.exit(1);
});
