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

  const compareApi = `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(baseRef)}...${encodeURIComponent(
    branchName,
  )}`.replace('%2F', '/');

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
    return { ok: false, error: msg, branch_name: branchName };
  }
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
