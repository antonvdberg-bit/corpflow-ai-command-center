import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  fetchBoundedJanReviewPackage,
  isAllowedJanBridgeEndpoint,
  readBoundedCurrentHead,
} from '../lib/server/jan-approval-github-bridge.js';
import { RARE_EXCLUSIVE_TARGET_REPO } from '../lib/server/jan-approval-control.js';

const SHA = 'b7c3e1a0f4d29c8e6a1b5d7f0c3e9a12d4f6b8c0';
const BASE_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function mockResponse(body, { ok = true, status = 200, json = true } = {}) {
  return {
    ok,
    status,
    async json() {
      return json ? body : null;
    },
    async text() {
      return json ? JSON.stringify(body) : body;
    },
  };
}

function githubFixtureFetch(url, options = {}) {
  const path = String(url);
  if (options.headers?.Accept === 'application/vnd.github.v3.diff') return mockResponse('diff --git a/a.js b/a.js', { json: false });
  if (path.includes('/pulls/34/files')) return Promise.resolve(mockResponse([{ filename: 'a.js', status: 'modified' }]));
  if (path.includes('/issues/34/comments')) return Promise.resolve(mockResponse([{ id: 1, body: 'review context' }]));
  if (path.includes('/pulls/34/comments')) return Promise.resolve(mockResponse([{ id: 2, body: 'inline context' }]));
  if (path.includes('/check-runs')) return Promise.resolve(mockResponse({ check_runs: [{ name: 'test', conclusion: 'success' }] }));
  if (path.includes('/actions/runs')) return Promise.resolve(mockResponse({ workflow_runs: [{ html_url: 'https://example.test/run' }] }));
  if (path.includes('/contents/a.js')) return Promise.resolve(mockResponse({ path: 'a.js', sha: SHA, encoding: 'base64', content: 'YQ==' }));
  if (path.includes('/pulls/34')) {
    return Promise.resolve(
      mockResponse({
        title: 'Review target',
        html_url: 'https://github.com/example/pr/34',
        state: 'open',
        draft: false,
        mergeable: true,
        mergeable_state: 'clean',
        base: { sha: BASE_SHA, repo: { owner: { login: 'antonvdberg-bit' } } },
        head: { sha: SHA },
      }),
    );
  }
  throw new Error(`Unexpected endpoint: ${path}`);
}

describe('Jan bounded GitHub bridge', () => {
  it('collects an exact-identity evidence package with full diff and context', async () => {
    const result = await fetchBoundedJanReviewPackage({
      repo: RARE_EXCLUSIVE_TARGET_REPO,
      prNumber: 34,
      fetchFn: githubFixtureFetch,
      contextPaths: ['a.js'],
    });
    assert.equal(result.manifest.repository, RARE_EXCLUSIVE_TARGET_REPO);
    assert.equal(result.manifest.pr_number, 34);
    assert.equal(result.manifest.base_sha, BASE_SHA);
    assert.equal(result.manifest.head_sha, SHA);
    assert.match(result.evidence.full_diff, /diff --git/);
    assert.equal(result.evidence.changed_files.length, 1);
    assert.equal(result.evidence.selected_file_context[0].path, 'a.js');
    assert.equal(result.evidence.required_checks[0].conclusion, 'success');
  });

  it('allowlists the repository and only exposes read/evidence and decision routes', async () => {
    await assert.rejects(
      fetchBoundedJanReviewPackage({ repo: 'evil/repo', prNumber: 34, fetchFn: githubFixtureFetch }),
      /REPO_NOT_ALLOWLISTED/,
    );
    assert.equal(isAllowedJanBridgeEndpoint('GET', '/api/factory/jan-approval/evidence'), true);
    assert.equal(isAllowedJanBridgeEndpoint('POST', '/api/factory/jan-approval/decision'), true);
    assert.equal(isAllowedJanBridgeEndpoint('POST', '/api/factory/github/comment'), false);
  });

  it('re-reads the exact current bounded PR head', async () => {
    const target = await readBoundedCurrentHead({
      repo: RARE_EXCLUSIVE_TARGET_REPO,
      prNumber: 34,
      fetchFn: githubFixtureFetch,
    });
    assert.equal(target.headSha, SHA);
    assert.equal(target.baseSha, BASE_SHA);
  });

  it('documents the exact bounded OpenAPI decision contract', () => {
    const contract = readFileSync(join(process.cwd(), 'docs/operations/JAN_APPROVAL_BRIDGE_OPENAPI_V1.yaml'), 'utf8');
    assert.match(contract, /\/api\/factory\/jan-approval\/decision/);
    assert.match(contract, /enum: \[APPROVE, CHANGES, HOLD, REVIEW_FURTHER\]/);
    assert.match(contract, /enum: \[review-approval-only, merge-only\]/);
    assert.match(contract, /additionalProperties: false/);
    assert.doesNotMatch(contract, /github\/comment/);
  });
});
