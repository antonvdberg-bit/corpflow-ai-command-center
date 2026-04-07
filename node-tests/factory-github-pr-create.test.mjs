import test from 'node:test';
import assert from 'node:assert/strict';

import handler from '../lib/server/factory-github-pr-create.js';
import { safeBranchName } from '../lib/server/factory-github-pr-create.js';

function makeRes() {
  const headers = {};
  return {
    _status: 0,
    _json: null,
    setHeader(k, v) {
      headers[k] = v;
    },
    status(code) {
      this._status = code;
      return this;
    },
    json(obj) {
      this._json = obj;
      return this;
    },
    get headers() {
      return headers;
    },
  };
}

test('factory/github/pr-create rejects unauthenticated', async () => {
  const req = { method: 'POST', headers: {}, body: {} };
  const res = makeRes();
  await handler(req, res);
  assert.equal(res._status, 403);
  assert.equal(res._json.error, 'Factory master authentication required.');
});

test('factory/github/pr-create slug sanitization produces safe branch segment', async () => {
  // This mirrors the server-side `safeSlug` normalization (lowercase, collapse dashes).
  const slug = String('Fix pr open + compare noise')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+/, '')
    .replace(/[-/]+$/, '');
  assert.equal(slug, 'fix-pr-open-compare-noise');
  assert.equal(safeBranchName(`factory/cmnju526m0000jm04j34qd5qw/${slug}`), `factory/cmnju526m0000jm04j34qd5qw/${slug}`);
});

