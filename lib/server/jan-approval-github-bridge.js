/**
 * Bounded GitHub bridge for the Jan approval surface.
 * It intentionally exposes only fixed read paths and one decision-comment
 * write path; callers cannot supply arbitrary GitHub URLs or comment bodies.
 */
import crypto from 'crypto';

import { RARE_EXCLUSIVE_TARGET_REPO, normalizeSha, str } from './jan-approval-control.js';

const API_ROOT = 'https://api.github.com';
const MAX_FILE_CONTEXT_REQUESTS = 5;

function headers(token, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function assertRepo(repo) {
  if (str(repo) !== RARE_EXCLUSIVE_TARGET_REPO) throw new Error('REPO_NOT_ALLOWLISTED');
}

function assertPrNumber(number) {
  const value = Number(number);
  if (!Number.isInteger(value) || value < 1) throw new Error('INVALID_TARGET');
  return value;
}

async function getJson(fetchFn, path, token) {
  const response = await fetchFn(`${API_ROOT}${path}`, { headers: headers(token), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`GITHUB_READ_FAILED_${response.status}`);
  return response.json();
}

export function createEvidenceHash(evidence) {
  const canonical = JSON.stringify(evidence);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export async function fetchBoundedJanReviewPackage({ repo, prNumber, token = '', fetchFn = globalThis.fetch, contextPaths = [] }) {
  assertRepo(repo);
  const number = assertPrNumber(prNumber);
  if (!Array.isArray(contextPaths) || contextPaths.length > MAX_FILE_CONTEXT_REQUESTS) {
    throw new Error('TOO_MANY_CONTEXT_FILES');
  }
  const base = `/repos/${repo}`;
  const pr = await getJson(fetchFn, `${base}/pulls/${number}`, token);
  const [files, issueComments, reviewComments, checkRuns, workflowRuns] = await Promise.all([
    getJson(fetchFn, `${base}/pulls/${number}/files?per_page=100`, token),
    getJson(fetchFn, `${base}/issues/${number}/comments?per_page=100`, token),
    getJson(fetchFn, `${base}/pulls/${number}/comments?per_page=100`, token),
    getJson(fetchFn, `${base}/commits/${pr.head.sha}/check-runs?per_page=100`, token),
    getJson(fetchFn, `${base}/actions/runs?head_sha=${encodeURIComponent(pr.head.sha)}&per_page=30`, token),
  ]);
  const diffResponse = await fetchFn(`${API_ROOT}${base}/pulls/${number}`, {
    headers: headers(token, 'application/vnd.github.v3.diff'),
    signal: AbortSignal.timeout(20000),
  });
  if (!diffResponse.ok) throw new Error(`GITHUB_DIFF_FAILED_${diffResponse.status}`);
  const fullDiff = await diffResponse.text();
  const selectedFiles = await Promise.all(
    contextPaths.map(async (path) => {
      const allowed = files.some((file) => file.filename === path);
      if (!allowed) throw new Error('CONTEXT_PATH_NOT_CHANGED');
      return getJson(fetchFn, `${base}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(pr.head.sha)}`, token);
    }),
  );
  const evidence = {
    repository: repo,
    pr_number: number,
    pr_metadata: {
      title: pr.title,
      url: pr.html_url,
      state: pr.state,
      draft: Boolean(pr.draft),
      mergeable: pr.mergeable,
      mergeable_state: pr.mergeable_state,
      base_sha: pr.base?.sha || '',
      head_sha: pr.head?.sha || '',
      branch_protection: pr.base?.repo?.owner ? 'available_via_repository_policy' : 'unavailable',
    },
    changed_files: files,
    full_diff: fullDiff,
    selected_file_context: selectedFiles.map((file) => ({
      path: file.path,
      sha: file.sha,
      encoding: file.encoding,
      content: file.content,
    })),
    issue_comments: issueComments,
    review_comments: reviewComments,
    required_checks: checkRuns.check_runs || [],
    workflow_runs: workflowRuns.workflow_runs || [],
    prior_review_decisions: [...issueComments, ...reviewComments]
      .filter((comment) => String(comment.body || '').includes('corpflow.jan_durable_decision'))
      .map((comment) => ({ id: comment.id, url: comment.html_url, body: comment.body })),
    current_blocker_release_state: { issue_35_separate_and_required: true },
  };
  return {
    evidence,
    manifest: {
      algorithm: 'sha256',
      hash: createEvidenceHash(evidence),
      canonical: JSON.stringify(evidence),
      repository: repo,
      pr_number: number,
      base_sha: normalizeSha(evidence.pr_metadata.base_sha),
      head_sha: normalizeSha(evidence.pr_metadata.head_sha),
    },
  };
}

export async function readBoundedCurrentHead({ repo, prNumber, token = '', fetchFn = globalThis.fetch }) {
  assertRepo(repo);
  const number = assertPrNumber(prNumber);
  const pr = await getJson(fetchFn, `/repos/${repo}/pulls/${number}`, token);
  const headSha = normalizeSha(pr?.head?.sha);
  const baseSha = normalizeSha(pr?.base?.sha);
  if (!headSha || !baseSha) throw new Error('GITHUB_PR_SHA_MISSING');
  return { repo, prNumber: number, headSha, baseSha };
}

export function isAllowedJanBridgeEndpoint(method, path) {
  const normalizedMethod = str(method).toUpperCase();
  const normalizedPath = str(path);
  return (
    (normalizedMethod === 'GET' && /^\/api\/factory\/jan-approval(?:\/evidence)?$/.test(normalizedPath)) ||
    (normalizedMethod === 'POST' && normalizedPath === '/api/factory/jan-approval/decision')
  );
}
