/**
 * Trigger GitHub Actions via repository_dispatch for CMP sandbox branches.
 * Requires a PAT with `contents: write` (or classic repo scope) stored in Vercel secrets.
 */

import { cfg } from '../../server/runtime-config.js';

/**
 * @param {string} raw
 * @returns {{ owner: string, repo: string } | null}
 */
export function parseGithubRepo(raw) {
  const s = String(raw || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '');
  const parts = s.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
}

/**
 * Fire `repository_dispatch` event_type `cmp_sandbox_start`.
 *
 * @param {{ ticketId: string, baseRef?: string }} opts
 * @returns {Promise<{ ok: boolean, error?: string, actions_url?: string, workflow_url?: string, branch_url?: string, compare_url?: string, branch_name?: string }>}
 */
export async function dispatchCmpSandboxStart(opts) {
  const token = String(
    cfg('CMP_GITHUB_TOKEN', '') ||
      cfg('GH_WORKFLOW_TOKEN', '') ||
      cfg('GITHUB_TOKEN', '') ||
      cfg('GH_TOKEN', ''),
  ).trim();
  const repoRaw = String(
    cfg('GITHUB_REPO', '') ||
      cfg('CMP_GITHUB_REPOSITORY', '') ||
      cfg('GITHUB_REPOSITORY', ''),
  ).trim();
  const { owner, repo } = parseGithubRepo(repoRaw) || { owner: '', repo: '' };

  if (!token || !owner || !repo) {
    const missing = [];
    if (!token) missing.push('token');
    if (!owner || !repo) missing.push('repo');
    return {
      ok: false,
      error:
        `Missing GitHub dispatch config (${missing.join(' + ') || 'token + repo'}). ` +
        'Set CMP_GITHUB_TOKEN (or GH_WORKFLOW_TOKEN / GITHUB_TOKEN / GH_TOKEN) and ' +
        'GITHUB_REPO=owner/repo (or CMP_GITHUB_REPOSITORY / GITHUB_REPOSITORY).',
    };
  }

  const ticketId = String(opts.ticketId || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  if (!ticketId) {
    return { ok: false, error: 'ticketId is required' };
  }

  const branchName = `cmp/${ticketId}`;
  const baseRef = String(opts.baseRef || cfg('CMP_SANDBOX_BASE_REF', '') || 'main')
    .trim()
    .replace(/[^a-zA-Z0-9._/-]/g, '')
    .slice(0, 200) || 'main';

  const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'cmp_sandbox_start',
        client_payload: {
          ticket_id: ticketId,
          base_ref: baseRef,
        },
      }),
    });

    if (res.status === 204) {
      return {
        ok: true,
        branch_name: branchName,
        branch_url: `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branchName)}`.replace(
          '%2F',
          '/',
        ),
        compare_url: `https://github.com/${owner}/${repo}/compare/${encodeURIComponent(baseRef)}...${encodeURIComponent(branchName)}`.replace(
          '%2F',
          '/',
        ),
        actions_url: `https://github.com/${owner}/${repo}/actions?query=${encodeURIComponent(`branch:${branchName}`)}`,
        workflow_url: `https://github.com/${owner}/${repo}/actions/workflows/cmp-branch.yml?query=${encodeURIComponent(
          `branch:${branchName}`,
        )}`,
      };
    }
    const text = await res.text();
    return {
      ok: false,
      error: `GitHub API ${res.status}: ${text.slice(0, 500)}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

function resolveGithubDispatchAuth() {
  const token = String(
    cfg('CMP_GITHUB_TOKEN', '') ||
      cfg('GH_WORKFLOW_TOKEN', '') ||
      cfg('GITHUB_TOKEN', '') ||
      cfg('GH_TOKEN', ''),
  ).trim();
  const repoRaw = String(
    cfg('GITHUB_REPO', '') ||
      cfg('CMP_GITHUB_REPOSITORY', '') ||
      cfg('GITHUB_REPOSITORY', ''),
  ).trim();
  const parsed = parseGithubRepo(repoRaw);
  return { token, owner: parsed?.owner || '', repo: parsed?.repo || '' };
}

async function githubApiJson(url, token) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const text = await res.text();
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

/**
 * Fetch a best-effort summary of sandbox changes for a ticket.
 *
 * Uses GitHub compare API `base...head`, where head is `cmp/{ticketId}`.
 *
 * @param {{ ticketId: string, baseRef?: string }} opts
 * @returns {Promise<{ ok: boolean, error?: string, compare_url?: string, branch_name?: string, commits?: any[], files?: any[] }>}
 */
export async function fetchCmpOverseerSummary(opts) {
  const { token, owner, repo } = resolveGithubDispatchAuth();
  if (!token || !owner || !repo) {
    return {
      ok: false,
      error:
        'Missing GitHub config. Set CMP_GITHUB_TOKEN (or GH_WORKFLOW_TOKEN / GITHUB_TOKEN / GH_TOKEN) and GITHUB_REPO=owner/repo.',
    };
  }

  const ticketId = String(opts.ticketId || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  if (!ticketId) return { ok: false, error: 'ticketId is required' };

  const baseRef = String(opts.baseRef || cfg('CMP_SANDBOX_BASE_REF', '') || 'main')
    .trim()
    .replace(/[^a-zA-Z0-9._/-]/g, '')
    .slice(0, 200) || 'main';
  const branchName = `cmp/${ticketId}`;

  // GitHub REST compare path is ONE path segment: `BASE...HEAD`. Slashes in branch names
  // (e.g. cmp/<ticket_id>) MUST stay percent-encoded (%2F). Decoding to `/` breaks the URL and yields 404.
  const compareBasehead = `${encodeURIComponent(baseRef)}...${encodeURIComponent(branchName)}`;
  const compareApi = `https://api.github.com/repos/${owner}/${repo}/compare/${compareBasehead}`;

  try {
    const data = await githubApiJson(compareApi, token);
    const commits = Array.isArray(data?.commits)
      ? data.commits.slice(0, 50).map((c) => ({
          sha: c?.sha || null,
          html_url: c?.html_url || null,
          message: c?.commit?.message || '',
          author: c?.commit?.author?.name || c?.author?.login || null,
          authored_at: c?.commit?.author?.date || null,
        }))
      : [];
    const files = Array.isArray(data?.files)
      ? data.files.slice(0, 200).map((f) => ({
          filename: f?.filename || null,
          status: f?.status || null,
          additions: f?.additions ?? null,
          deletions: f?.deletions ?? null,
          changes: f?.changes ?? null,
          blob_url: f?.blob_url || null,
          raw_url: f?.raw_url || null,
        }))
      : [];
    return {
      ok: true,
      branch_name: branchName,
      compare_url: data?.html_url || `https://github.com/${owner}/${repo}/compare/${baseRef}...${branchName}`,
      commits,
      files,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let hint = '';
    if (/\b404\b/.test(msg)) {
      hint =
        ' Often: (1) sandbox branch not pushed yet—wait for the cmp-branch workflow, (2) wrong default branch—set CMP_SANDBOX_BASE_REF to your repo default (e.g. main vs master), (3) GITHUB_REPO or token points at a different repo, or (4) token cannot read this repo.';
    }
    return { ok: false, error: msg + hint, branch_name: branchName };
  }
}

/**
 * Normalize ticket id for branch names (same rules as dispatch).
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizeCmpTicketId(raw) {
  return String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

/**
 * GitHub Actions runs + branch presence so tenants and operators can see whether
 * sandbox work is running, failed, or not started.
 *
 * @param {{ ticketId: string, baseRef?: string }} opts
 * @returns {Promise<{
 *   ok: boolean,
 *   error?: string,
 *   github_available?: boolean,
 *   branch_name?: string,
 *   branch_exists?: boolean | null,
 *   base_ref?: string,
 *   actions_filter_url?: string | null,
 *   workflow_filter_url?: string | null,
 *   latest_run?: {
 *     status: string | null,
 *     conclusion: string | null,
 *     name: string | null,
 *     html_url: string | null,
 *     created_at: string | null,
 *     updated_at: string | null,
 *     event: string | null,
 *   } | null,
 *   runs?: Array<Record<string, unknown>>,
 *   summary_line?: string,
 *   needs_attention?: boolean,
 *   stuck_hint?: string | null,
 * }>}
 */
export async function fetchCmpTicketActivity(opts) {
  const { token, owner, repo } = resolveGithubDispatchAuth();
  const ticketId = normalizeCmpTicketId(opts.ticketId || '');
  if (!ticketId) {
    return { ok: false, error: 'ticketId is required' };
  }
  const branchName = `cmp/${ticketId}`;
  const baseRef =
    String(opts.baseRef || cfg('CMP_SANDBOX_BASE_REF', '') || 'main')
      .trim()
      .replace(/[^a-zA-Z0-9._/-]/g, '')
      .slice(0, 200) || 'main';

  const branchQuery = encodeURIComponent(`branch:${branchName}`);
  const actions_filter_url =
    owner && repo
      ? `https://github.com/${owner}/${repo}/actions?query=${branchQuery}`
      : null;
  const workflow_filter_url =
    owner && repo
      ? `https://github.com/${owner}/${repo}/actions/workflows/cmp-branch.yml?query=${branchQuery}`
      : null;

  if (!token || !owner || !repo) {
    return {
      ok: true,
      github_available: false,
      branch_name: branchName,
      base_ref: baseRef,
      actions_filter_url,
      workflow_filter_url,
      workflow_all_runs_url: null,
      diagnostic_workflow_runs: [],
      summary_line:
        'Live automation status is unavailable: this deployment is not connected to GitHub (missing token or repo).',
      needs_attention: false,
      latest_run: null,
      runs: [],
    };
  }

  let branch_exists = null;
  try {
    const brUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branchName)}`;
    const res = await fetch(brUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (res.status === 200) branch_exists = true;
    else if (res.status === 404) branch_exists = false;
  } catch {
    branch_exists = null;
  }

  let runs = [];
  try {
    const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs?branch=${encodeURIComponent(
      branchName,
    )}&per_page=6`;
    const data = await githubApiJson(runsUrl, token);
    runs = Array.isArray(data?.workflow_runs)
      ? data.workflow_runs.map((w) => ({
          status: w?.status || null,
          conclusion: w?.conclusion || null,
          name: w?.name || w?.display_title || null,
          html_url: w?.html_url || null,
          created_at: w?.created_at || null,
          updated_at: w?.updated_at || null,
          event: w?.event || null,
        }))
      : [];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      github_available: true,
      branch_name: branchName,
      branch_exists,
      base_ref: baseRef,
      actions_filter_url,
      workflow_filter_url,
      error: msg,
      summary_line:
        'Could not load GitHub Actions runs (check token scopes: Actions read, and repo access).',
      needs_attention: false,
      latest_run: null,
      runs: [],
      diagnostic_workflow_runs: [],
      workflow_all_runs_url: owner && repo ? `https://github.com/${owner}/${repo}/actions/workflows/cmp-branch.yml` : null,
    };
  }

  /** Recent runs of cmp-branch.yml (any branch) — repository_dispatch runs usually show head_branch=default. */
  let diagnostic_workflow_runs = [];
  try {
    const wfUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/cmp-branch.yml/runs?per_page=8`;
    const wfData = await githubApiJson(wfUrl, token);
    diagnostic_workflow_runs = Array.isArray(wfData?.workflow_runs)
      ? wfData.workflow_runs.map((w) => ({
          status: w?.status || null,
          conclusion: w?.conclusion || null,
          head_branch: w?.head_branch || null,
          html_url: w?.html_url || null,
          created_at: w?.created_at || null,
          event: w?.event || null,
          name: w?.name || null,
        }))
      : [];
  } catch {
    diagnostic_workflow_runs = [];
  }

  const workflow_all_runs_url = `https://github.com/${owner}/${repo}/actions/workflows/cmp-branch.yml`;

  const latest = runs[0] || null;
  const now = Date.now();
  const stuckQueuedMs = 25 * 60 * 1000;
  let stuck_hint = null;
  if (
    latest &&
    (latest.status === 'queued' || latest.status === 'waiting' || latest.status === 'pending')
  ) {
    const t = latest.updated_at ? Date.parse(String(latest.updated_at)) : NaN;
    if (Number.isFinite(t) && now - t > stuckQueuedMs) {
      stuck_hint =
        'The latest run has been queued for a long time — check GitHub Actions, billing, or self-hosted runners.';
    }
  }

  let summary_line = '';
  let needs_attention = false;
  const diag = diagnostic_workflow_runs[0] || null;

  if (branch_exists === false) {
    summary_line =
      'Sandbox branch is not on GitHub yet — the workflow may still be creating it, or sandbox start did not run.';
    if (diag) {
      const hb = diag.head_branch || 'default';
      if (diag.conclusion === 'failure' || diag.conclusion === 'timed_out') {
        needs_attention = true;
        summary_line = `CMP Sandbox Branch workflow last finished with ${diag.conclusion} (GitHub head branch "${hb}"). The sandbox branch was not created — open the failed run for logs.`;
      } else if (diag.status === 'in_progress' || diag.status === 'queued' || diag.status === 'waiting' || diag.status === 'pending') {
        summary_line = `CMP Sandbox Branch workflow is ${diag.status} on "${hb}" — wait for it to push ${branchName}, then refresh.`;
      } else if (diag.status === 'completed' && diag.conclusion === 'success') {
        needs_attention = true;
        summary_line = `Workflow reported success on "${hb}" but branch ${branchName} is missing — check GITHUB_REPO / token repo vs the GitHub UI you are using, or re-run the workflow.`;
      } else {
        summary_line += ` Latest cmp-branch.yml run: ${diag.status}/${diag.conclusion || '—'} on "${hb}".`;
      }
    }
  } else if (!latest) {
    summary_line = branch_exists
      ? 'Branch exists, but no Actions runs found yet — workflow may not have triggered, or work uses another path.'
      : 'No Actions runs on this branch yet — automation may not have started.';
  } else if (
    latest.status === 'in_progress' ||
    latest.status === 'queued' ||
    latest.status === 'waiting' ||
    latest.status === 'pending'
  ) {
    summary_line = 'Automation is running or waiting in GitHub Actions.';
  } else if (latest.status === 'completed' && latest.conclusion === 'success') {
    summary_line = 'Latest GitHub Actions run completed successfully.';
  } else if (
    latest.status === 'completed' &&
    (latest.conclusion === 'failure' || latest.conclusion === 'timed_out')
  ) {
    summary_line =
      'Latest GitHub Actions run failed or timed out — the factory team may need to assist.';
    needs_attention = true;
  } else if (latest.status === 'completed' && latest.conclusion === 'cancelled') {
    summary_line = 'Latest run was cancelled.';
    needs_attention = true;
  } else if (latest.status === 'completed') {
    summary_line = `Latest run completed (${latest.conclusion || 'no conclusion'}).`;
    if (
      latest.conclusion &&
      latest.conclusion !== 'success' &&
      latest.conclusion !== 'skipped' &&
      latest.conclusion !== 'neutral'
    ) {
      needs_attention = true;
    }
  } else {
    summary_line = `Latest workflow status: ${latest.status || 'unknown'}.`;
  }

  return {
    ok: true,
    github_available: true,
    branch_name: branchName,
    branch_exists,
    base_ref: baseRef,
    actions_filter_url,
    workflow_filter_url,
    workflow_all_runs_url,
    diagnostic_workflow_runs,
    latest_run: latest,
    runs,
    summary_line,
    needs_attention,
    stuck_hint,
  };
}

/**
 * Optional n8n (or other) webhook after sandbox dispatch — for operator visibility.
 *
 * @param {Record<string, unknown>} payload
 * @returns {Promise<void>}
 */
export async function notifyCmpAutomationWebhook(payload) {
  const url = String(cfg('N8N_CMP_WEBHOOK_URL', '')).trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'cmp_sandbox_dispatch',
        ...payload,
      }),
    });
  } catch {
    /* non-fatal */
  }
}

/**
 * Find an open PR for `cmp/{ticketId}` -> baseRef (default main).
 *
 * @param {{ ticketId: string, baseRef?: string }} opts
 * @returns {Promise<{ ok: boolean, error?: string, pr_number?: number|null, pr_url?: string|null, pr_state?: string|null, pr_mergeable?: boolean|null, head_sha?: string|null }>}
 */
export async function fetchCmpPullRequest(opts) {
  const { token, owner, repo } = resolveGithubDispatchAuth();
  if (!token || !owner || !repo) {
    return {
      ok: false,
      error:
        'Missing GitHub config. Set CMP_GITHUB_TOKEN (or GH_WORKFLOW_TOKEN / GITHUB_TOKEN / GH_TOKEN) and GITHUB_REPO=owner/repo.',
    };
  }
  const ticketId = String(opts.ticketId || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  if (!ticketId) return { ok: false, error: 'ticketId is required' };
  const baseRef = String(opts.baseRef || cfg('CMP_SANDBOX_BASE_REF', '') || 'main')
    .trim()
    .replace(/[^a-zA-Z0-9._/-]/g, '')
    .slice(0, 200) || 'main';

  const head = `${owner}:cmp/${ticketId}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${encodeURIComponent(head)}&base=${encodeURIComponent(baseRef)}`;
  try {
    const arr = await githubApiJson(url, token);
    const pr = Array.isArray(arr) && arr[0] ? arr[0] : null;
    if (!pr) return { ok: true, pr_number: null, pr_url: null, pr_state: null, pr_mergeable: null, head_sha: null };
    return {
      ok: true,
      pr_number: typeof pr.number === 'number' ? pr.number : null,
      pr_url: pr.html_url || null,
      pr_state: pr.state || null,
      pr_mergeable: pr.mergeable ?? null,
      head_sha: pr?.head?.sha || null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * Merge a PR by number (best-effort).
 *
 * @param {{ prNumber: number, mergeMethod?: 'merge'|'squash'|'rebase' }} opts
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function mergeCmpPullRequest(opts) {
  const { token, owner, repo } = resolveGithubDispatchAuth();
  if (!token || !owner || !repo) {
    return {
      ok: false,
      error:
        'Missing GitHub config. Set CMP_GITHUB_TOKEN (or GH_WORKFLOW_TOKEN / GITHUB_TOKEN / GH_TOKEN) and GITHUB_REPO=owner/repo.',
    };
  }
  const prNumber = Number(opts.prNumber);
  if (!Number.isFinite(prNumber) || prNumber <= 0) return { ok: false, error: 'prNumber is required' };
  const method = opts.mergeMethod === 'rebase' || opts.mergeMethod === 'squash' ? opts.mergeMethod : 'merge';
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ merge_method: method }),
    });
    const text = await res.text();
    if (res.status >= 200 && res.status < 300) return { ok: true };
    return { ok: false, error: `GitHub API ${res.status}: ${text.slice(0, 500)}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
