#!/usr/bin/env node
/**
 * Plain-English summary of recent GitHub Actions runs — for people who don't live in the Actions UI.
 *
 * Usage (from repo root):
 *   npm run ci:report
 *
 * Auth (pick one):
 *   1) Install GitHub CLI and log in once: https://cli.github.com/  →  gh auth login
 *   2) Or set a read-only token:  PowerShell:  $env:GITHUB_TOKEN="ghp_..."
 *      Token needs at least:  Contents: Read, Actions: Read  (classic PAT) or fine-grained "Actions read".
 *
 * This does not talk to Vercel. Deployments are a separate website (vercel.com).
 */

import { execSync } from 'node:child_process';

const LIMIT = Number(process.env.CI_REPORT_LIMIT || '12', 10) || 12;

function box(title) {
  console.log('');
  console.log('─'.repeat(Math.min(72, title.length + 8)));
  console.log(`  ${title}`);
  console.log('─'.repeat(Math.min(72, title.length + 8)));
}

function explainStatus(conclusion, status) {
  if (status === 'in_progress' || status === 'queued') return 'Still running — wait a minute and run this again.';
  if (conclusion === 'success') return 'All steps that matter for this workflow finished OK.';
  if (conclusion === 'failure') return 'Something in this workflow failed. Open the link below and click the red step to read the error.';
  if (conclusion === 'cancelled') return 'This run was cancelled (manual stop or superseded).';
  if (conclusion === 'skipped') return 'This run was skipped (rules said not to run it).';
  if (conclusion === 'timed_out') return 'The run hit a time limit.';
  return `State: ${status || '?'} / ${conclusion || 'no conclusion yet'}`;
}

function detectRepoSlug() {
  const fromEnv = String(process.env.GITHUB_REPOSITORY || '').trim();
  if (fromEnv.includes('/')) {
    const [owner, repo] = fromEnv.split('/');
    return { owner, repo: repo.replace(/\.git$/, '') };
  }
  try {
    const url = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const ssh = url.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/i);
    if (ssh) return { owner: ssh[1], repo: ssh[2] };
    const https = url.match(/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?\/?$/i);
    if (https) return { owner: https[1], repo: https[2] };
  } catch {
    /* no git */
  }
  return null;
}

function tryGhReport(slug) {
  const { owner, repo } = slug;
  const repoFlag = `--repo ${owner}/${repo}`;
  try {
    execSync('gh --version', { stdio: 'pipe' });
  } catch {
    return null;
  }
  const fields =
    'databaseId,workflowName,displayTitle,status,conclusion,url,headBranch,createdAt,event';
  const raw = execSync(`gh run list ${repoFlag} --limit ${LIMIT} --json ${fields}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const rows = JSON.parse(raw || '[]');
  return { source: 'GitHub CLI (gh)', rows, viaGh: true };
}

function ghFailedJobNames(slug, runId) {
  const { owner, repo } = slug;
  try {
    const out = execSync(
      `gh api repos/${owner}/${repo}/actions/runs/${runId}/jobs --jq ".jobs[] | select(.conclusion==\\"failure\\") | .name"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const names = out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    return names.length ? `        Failing jobs: ${names.join(', ')}` : '';
  } catch {
    return '';
  }
}

async function apiReport(slug, token) {
  const { owner, repo } = slug;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'corpflow-ci-friendly-report',
  };
  const u = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=${LIMIT}`;
  const res = await fetch(u, { headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = JSON.parse(text);
  const rows = (data.workflow_runs || []).map((r) => ({
    databaseId: r.id,
    workflowName: r.name || '(workflow)',
    displayTitle: r.display_title || r.head_commit?.message?.split('\n')[0] || '(no title)',
    status: r.status,
    conclusion: r.conclusion,
    url: r.html_url,
    headBranch: r.head_branch,
    createdAt: r.created_at,
    event: r.event,
  }));
  return { source: 'GitHub API (GITHUB_TOKEN)', rows, viaGh: false };
}

async function fetchFailedJobHint(slug, token, runId) {
  const { owner, repo } = slug;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'corpflow-ci-friendly-report',
  };
  const u = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs?per_page=30`;
  const res = await fetch(u, { headers });
  if (!res.ok) return '';
  const data = await res.json();
  const bad = (data.jobs || []).filter((j) => j.conclusion === 'failure');
  if (!bad.length) return '';
  return `        Failing jobs: ${bad.map((j) => j.name).join(', ')}`;
}

async function main() {
  box('What is this?');
  console.log(
    'This prints your latest GitHub Actions runs in normal language.\n' +
      'It does NOT deploy your site and does NOT replace the Vercel dashboard.',
  );

  const slug = detectRepoSlug();
  if (!slug) {
    console.error('\nCould not detect GitHub owner/repo. Set GITHUB_REPOSITORY=owner/repo or run inside a git clone.\n');
    process.exit(1);
  }

  console.log(`\nRepository: ${slug.owner}/${slug.repo}`);

  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();

  let pack = tryGhReport(slug);
  if (!pack && token) {
    try {
      pack = await apiReport(slug, token);
    } catch (e) {
      console.error('\n', e.message || e);
      pack = null;
    }
  }

  if (!pack) {
    box('Setup needed');
    console.log(
      'Install and log in:\n' +
        '  https://cli.github.com/   then   gh auth login\n' +
        'Or set a read-only token, then:\n' +
        '  PowerShell:  $env:GITHUB_TOKEN="(paste token)"\n' +
        '  npm run ci:report\n',
    );
    process.exit(2);
  }

  box(`Recent runs (via ${pack.source})`);

  if (!pack.rows.length) {
    console.log('No runs returned. If the repo is new or private, check auth.');
  }

  for (const r of pack.rows) {
    const when = r.createdAt ? new Date(r.createdAt).toLocaleString() : '';
    const line = explainStatus(r.conclusion, r.status);
    const icon =
      r.conclusion === 'success' ? '[ OK ]' : r.conclusion === 'failure' ? '[FAIL]' : '[ .. ]';

    console.log('');
    console.log(`${icon}  ${r.workflowName || 'Workflow'}`);
    console.log(`     ${line}`);
    console.log(`     Branch: ${r.headBranch || '?'}  |  Event: ${r.event || '?'}  |  ${when}`);
    console.log(`     ${r.displayTitle || ''}`);
    console.log(`     Open: ${r.url}`);

    if (r.conclusion === 'failure' && r.databaseId) {
      let hint = '';
      if (pack.viaGh) hint = ghFailedJobNames(slug, r.databaseId);
      else if (token) hint = await fetchFailedJobHint(slug, token, r.databaseId);
      if (hint) console.log(hint);
    }
  }

  box('How this maps to “is my site updated?”');
  console.log(
    [
      '• GitHub “green” = automated checks passed. It is not the same as Vercel.',
      '• Vercel = separate tab: https://vercel.com  →  your project  →  Deployments.',
      '• Your live domain should match the latest Production deployment commit there.',
      '• If Actions is red: open the failed run link above → click the red step → scroll to the bottom for the real error.',
    ].join('\n'),
  );
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
