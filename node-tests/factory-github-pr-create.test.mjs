import test from 'node:test';
import assert from 'node:assert/strict';

import handler from '../lib/server/factory-github-pr-create.js';

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

