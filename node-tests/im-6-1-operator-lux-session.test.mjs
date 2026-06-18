import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCorpflowAuthCookieOpts,
  resolveSessionCookieDomain,
  setCookie,
} from '../lib/server/session.js';
import {
  coreChangePickerUrl,
  firstCoreHostname,
  resolveChangeConsoleSsrGate,
} from '../lib/server/change-console-ssr-gate.js';

describe('resolveSessionCookieDomain', () => {
  it('returns parent domain for corpflowai.com production hosts', () => {
    assert.equal(
      resolveSessionCookieDomain({ headers: { host: 'core.corpflowai.com' } }),
      '.corpflowai.com',
    );
    assert.equal(
      resolveSessionCookieDomain({ headers: { host: 'lux.corpflowai.com' } }),
      '.corpflowai.com',
    );
    assert.equal(
      resolveSessionCookieDomain({ headers: { host: 'corpflowai.com' } }),
      '.corpflowai.com',
    );
  });

  it('skips domain on localhost and vercel preview hosts', () => {
    assert.equal(resolveSessionCookieDomain({ headers: { host: 'localhost:3000' } }), undefined);
    assert.equal(
      resolveSessionCookieDomain({ headers: { host: 'corpflow-ai-command-center.vercel.app' } }),
      undefined,
    );
  });
});

describe('setCookie domain attribute', () => {
  it('includes Domain when opts.domain is set', () => {
    const headers = [];
    const res = {
      getHeader: () => undefined,
      setHeader: (name, value) => {
        if (name === 'Set-Cookie') headers.push(value);
      },
    };
    setCookie(res, 'corpflow_session', 'token', {
      maxAgeSec: 3600,
      domain: '.corpflowai.com',
    });
    assert.match(String(headers[0]), /Domain=\.corpflowai\.com/);
  });
});

describe('buildCorpflowAuthCookieOpts', () => {
  it('threads parent domain from request host', () => {
    const opts = buildCorpflowAuthCookieOpts({ headers: { host: 'core.corpflowai.com' } }, {
      maxAgeSec: 120,
    });
    assert.equal(opts.domain, '.corpflowai.com');
    assert.equal(opts.maxAgeSec, 120);
  });
});

describe('resolveChangeConsoleSsrGate (IM-6.1)', () => {
  it('sends DB-backed admin on tenant host to Core picker', () => {
    const gate = resolveChangeConsoleSsrGate({
      userId: 'user-1',
      sessionTyp: 'admin',
      surface: 'tenant',
      hostTenantId: 'luxe-maurice',
      actingTenantId: null,
      coreHostsEnv: 'core.corpflowai.com',
    });
    assert.equal(gate.kind, 'redirect');
    assert.equal(gate.reason, 'core_picker');
    assert.equal(gate.destination, 'https://core.corpflowai.com/change?mode=switch');
  });

  it('allows aligned admin acting tenant on tenant host', () => {
    const gate = resolveChangeConsoleSsrGate({
      userId: 'user-1',
      sessionTyp: 'admin',
      surface: 'tenant',
      hostTenantId: 'luxe-maurice',
      actingTenantId: 'luxe-maurice',
    });
    assert.deepEqual(gate, { kind: 'ok' });
  });

  it('keeps tenant-session mismatch on tenant login redirect', () => {
    const gate = resolveChangeConsoleSsrGate({
      userId: 'user-2',
      sessionTyp: 'tenant',
      surface: 'tenant',
      hostTenantId: 'luxe-maurice',
      actingTenantId: 'living-word-mauritius',
      nextPath: '/change',
    });
    assert.equal(gate.kind, 'redirect');
    assert.equal(gate.reason, 'tenant_mismatch_login');
    assert.equal(gate.destination, '/login?tenant_mismatch=1&next=%2Fchange');
  });
});

describe('coreChangePickerUrl', () => {
  it('uses first core host from env list', () => {
    assert.equal(firstCoreHostname('core.corpflowai.com, core2.corpflowai.com'), 'core.corpflowai.com');
    assert.equal(
      coreChangePickerUrl('core.corpflowai.com'),
      'https://core.corpflowai.com/change?mode=switch',
    );
  });
});
