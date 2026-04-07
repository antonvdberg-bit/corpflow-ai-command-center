import test from 'node:test';
import assert from 'node:assert/strict';

import handler from '../lib/server/factory-cmp-ticket-set-description.js';

function mkRes() {
  const r = { statusCode: 0, headers: {}, body: null };
  return {
    status(code) {
      r.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      r.headers[k] = v;
    },
    json(obj) {
      r.body = obj;
      return this;
    },
    _raw: r,
  };
}

test('factory/cmp/ticket-set-description rejects unauthenticated', async () => {
  const req = { method: 'POST', headers: {}, body: { ticket_id: 't1', description: 'x' } };
  const res = mkRes();
  await handler(req, res);
  assert.equal(res._raw.statusCode, 403);
});

