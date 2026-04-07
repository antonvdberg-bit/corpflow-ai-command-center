/**
 * Factory-only: create or reuse a GitHub pull request for a branch.
 *
 * Route: POST /api/factory/github/pr-create
 *
 * Auth: factory master (admin session cookie or Bearer MASTER_ADMIN_KEY / x-session-token).
 *
 * This endpoint exists so "factory creates PRs" is a platform capability, not a Cursor-only workflow.
 */

import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { emitLogicFailure, emitTelemetry } from '../cmp/_lib/telemetry.js';
import { cfg } from './runtime-config.js';
import { parseGithubRepo } from '../cmp/_lib/github-dispatch.js';

export function safeBranchName(raw) {
  return String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9._/-]/g, '-')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .slice(0, 200);
}

export function safeBaseRef(raw) {
  return String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9._/-]/g, '')
    .slice(0, 200);
}

async function githubJson(url, token, { method = 'GET', body = null } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, text, json };
}

async function ensureHeadRefExists({ owner, repo, token, head, base }) {
  // If head already exists, nothing to do.
  const check = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(head)}`,
    token,
  );
  if (check.status === 200) return { ok: true, created: false };
  if (check.status !== 404) return { ok: false, status: check.status, error: 'head_ref_check_failed' };

  // Resolve base SHA.
  const baseRef = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(base)}`,
    token,
  );
  const sha = baseRef?.json && typeof baseRef.json === 'object' ? baseRef.json?.object?.sha : null;
  if (!baseRef.ok || typeof sha !== 'string' || !sha) {
    return { ok: false, status: baseRef.status, error: 'base_ref_not_found' };
  }

  // Create head ref at base SHA.
  const create = await githubJson(`https://api.github.com/repos/${owner}/${repo}/git/refs`, token, {
    method: 'POST',
    body: { ref: `refs/heads/${head}`, sha },
  });
  if (!create.ok) return { ok: false, status: create.status, error: 'head_ref_create_failed', detail: create.text.slice(0, 300) };
  return { ok: true, created: true };
}

async function findExistingPullRequest({ owner, repo, token, headFull, base }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${encodeURIComponent(headFull)}&base=${encodeURIComponent(base)}`;
  const res = await githubJson(url, token);
  if (!res.ok) return { ok: false, status: res.status, error: 'pr_list_failed', detail: res.text.slice(0, 300) };
  const arr = Array.isArray(res.json) ? res.json : [];
  const pr = arr[0] || null;
  if (!pr) return { ok: true, found: false, pr: null };
  return { ok: true, found: true, pr };
}

async function createPullRequest({ owner, repo, token, head, base, title, body, draft }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  const res = await githubJson(url, token, {
    method: 'POST',
    body: { head, base, title, body, draft: Boolean(draft) },
  });
  if (!res.ok) return { ok: false, status: res.status, error: 'pr_create_failed', detail: res.text.slice(0, 400) };
  return { ok: true, pr: res.json };
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default async function factoryGithubPrCreateHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : null;
  if (!body) return res.status(400).json({ error: 'Missing JSON body' });

  const repoRaw = String(cfg('CMP_GITHUB_REPOSITORY', '') || cfg('GITHUB_REPO', '') || cfg('GITHUB_REPOSITORY', '')).trim();
  const token = String(cfg('CMP_GITHUB_TOKEN', '') || cfg('GH_WORKFLOW_TOKEN', '') || cfg('GITHUB_TOKEN', '') || cfg('GH_TOKEN', '')).trim();
  const parsed = parseGithubRepo(repoRaw);
  if (!parsed || !parsed.owner || !parsed.repo) {
    return res.status(503).json({ error: 'GITHUB_REPO_MISSING', hint: 'Set GITHUB_REPO=owner/repo (or CMP_GITHUB_REPOSITORY).' });
  }
  if (!token) {
    return res.status(503).json({ error: 'CMP_GITHUB_TOKEN_MISSING', hint: 'Set CMP_GITHUB_TOKEN with PR + contents access.' });
  }

  const base = safeBaseRef(body.base || body.base_ref || cfg('CMP_SANDBOX_BASE_REF', '') || 'main') || 'main';
  const head = safeBranchName(body.head || body.head_ref || body.branch || '');
  const title = String(body.title || '').trim() || `Factory PR: ${head || 'change'}`;
  const prBody = String(body.body || '').trim() || 'Created by CorpFlow Factory.';
  const draft = body.draft !== false; // default true

  if (!head) return res.status(400).json({ error: 'head is required', hint: 'Provide head branch name (e.g. fix/my-change).' });
  if (head === base) return res.status(400).json({ error: 'head must differ from base' });

  const { owner, repo } = parsed;
  const headFull = `${owner}:${head}`;

  try {
    const exists = await ensureHeadRefExists({ owner, repo, token, head, base });
    if (!exists.ok) {
      emitLogicFailure({
        source: 'api/factory/github/pr-create:ensure-head',
        severity: 'error',
        error: new Error(`${exists.error} (HTTP ${exists.status || 'n/a'})`),
        meta: { owner, repo, head, base },
      });
      return res.status(502).json({ error: 'GITHUB_HEAD_REF_FAILED', detail: exists.error, status: exists.status || null });
    }

    const existing = await findExistingPullRequest({ owner, repo, token, headFull, base });
    if (existing.ok && existing.found && existing.pr) {
      const pr = existing.pr;
      emitTelemetry({
        event_type: 'factory_pr_reused',
        cmp: { ticket_id: String(body.ticket_id || 'n/a'), action: 'factory/github/pr-create' },
        payload: { repo: `${owner}/${repo}`, base, head, pr_number: pr.number || null },
      });
      return res.status(200).json({
        ok: true,
        reused: true,
        repo: `${owner}/${repo}`,
        base,
        head,
        pr_number: pr.number || null,
        pr_url: pr.html_url || null,
        pr_state: pr.state || null,
        draft: Boolean(pr.draft),
      });
    }
    if (!existing.ok) {
      // Continue to create; if this is an API permission issue, create will fail with clearer error.
    }

    const created = await createPullRequest({
      owner,
      repo,
      token,
      head,
      base,
      title,
      body: prBody,
      draft,
    });
    if (!created.ok || !created.pr) {
      emitLogicFailure({
        source: 'api/factory/github/pr-create:create-pr',
        severity: 'error',
        error: new Error(`${created.error} (HTTP ${created.status || 'n/a'})`),
        meta: { owner, repo, head, base },
      });
      return res.status(502).json({ error: 'GITHUB_PR_CREATE_FAILED', detail: created.detail || created.error, status: created.status || null });
    }
    const pr = created.pr;
    emitTelemetry({
      event_type: 'factory_pr_created',
      cmp: { ticket_id: String(body.ticket_id || 'n/a'), action: 'factory/github/pr-create' },
      payload: { repo: `${owner}/${repo}`, base, head, pr_number: pr.number || null },
    });
    return res.status(201).json({
      ok: true,
      reused: false,
      repo: `${owner}/${repo}`,
      base,
      head,
      pr_number: pr.number || null,
      pr_url: pr.html_url || null,
      pr_state: pr.state || null,
      draft: Boolean(pr.draft),
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/factory/github/pr-create:unhandled',
      severity: 'fatal',
      error: e,
      meta: { owner, repo, head, base },
    });
    return res.status(500).json({ error: 'factory_pr_create_failed' });
  }
}

