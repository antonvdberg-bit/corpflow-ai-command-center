import test from 'node:test';
import assert from 'node:assert/strict';

import uiConsoleLogHandler, { normalizeUiConsoleLogPayload } from '../lib/server/ui-console-log.js';

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

test('normalizeUiConsoleLogPayload clamps and strips unsafe fields', () => {
  const out = normalizeUiConsoleLogPayload({
    level: 'warn',
    message: 'x'.repeat(5000),
    url: 'https://core.corpflowai.com/change',
    stack: 'y'.repeat(5000),
    meta: {
      password: 'nope',
      token: 'nope',
      authorization: 'Bearer nope',
      headers: { authorization: 'Bearer nope' },
      nested: { api_key: 'nope', ok: true },
    },
  });
  assert.equal(out.ok, true);
  assert.equal(out.payload.level, 'warn');
  assert.equal(typeof out.payload.message, 'string');
  assert.equal(out.payload.message.length <= 1200, true);
  assert.equal(out.payload.stack.length <= 1800, true);
  const metaStr = JSON.stringify(out.payload.meta || {});
  assert.equal(metaStr.includes('nope'), false);
});

test('ui console log requires login', async () => {
  const req = { method: 'POST', headers: {}, body: { level: 'warn', message: 'hi' } };
  const res = mkRes();
  await uiConsoleLogHandler(req, res);
  assert.equal(res._raw.statusCode, 401);
});

