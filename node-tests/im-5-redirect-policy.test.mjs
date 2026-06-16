/**
 * IM-5 — unit tests for the redirect-policy helper and the login redirect
 * resolver. Canonical spec:
 *   docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-5.
 *
 * Two helpers, two test groups:
 *
 *   1. validateRedirectTarget(target, allowedHostnames, opts) — pure, no I/O.
 *      Tested as a ~40-row truth table covering:
 *        - same-origin paths (accept / reject)
 *        - absolute https URLs to allowed hosts (accept / reject)
 *        - protocol-relative, UNC, javascript:, data:, http: rejection
 *        - header injection (CR/LF/NUL/tab)
 *        - path traversal (literal `..` + `%2e%2e`)
 *        - hostname shape (port, userinfo, special chars)
 *        - length cap
 *
 *   2. resolveLoginRedirect(sessionPayload, requestedNext, opts) — pure
 *      decision tree. Tested for every reason code:
 *        - requested_next   (validated `next` wins)
 *        - single_membership
 *        - multi_membership
 *        - admin_default    (0 memberships, no `next`)
 *        - anonymous_default (defensive — no user_id)
 *      Plus the unsafe-`next` fallback path (silent drop, never 4xx login).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  safeDefaultRedirect,
  validateRedirectTarget,
} from '../lib/server/redirect-policy.js';
import { resolveLoginRedirect } from '../lib/server/login-redirect.js';

const CORE_HOSTS = ['core.corpflowai.com', 'core.stage.corpflowai.com'];
const TENANT_HOSTS = ['lux.corpflowai.com', 'living-word-mauritius.corpflowai.com'];
const ALL_HOSTS = [...CORE_HOSTS, ...TENANT_HOSTS];

/* --------------------- validateRedirectTarget truth table --------------------- */

const accepts = [
  // Same-origin paths
  { target: '/change', expectShape: 'same_origin_path', expectHost: null },
  { target: '/', expectShape: 'same_origin_path', expectHost: null },
  { target: '/admin/lead-rescue', expectShape: 'same_origin_path', expectHost: null },
  { target: '/path/with/many/segments', expectShape: 'same_origin_path', expectHost: null },
  { target: '/path-with-hyphens_and_underscores.ext', expectShape: 'same_origin_path', expectHost: null },

  // Absolute URLs to allowed hosts (case + whitespace robust)
  { target: 'https://core.corpflowai.com/change', expectShape: 'absolute_url', expectHost: 'core.corpflowai.com' },
  { target: 'https://lux.corpflowai.com/change', expectShape: 'absolute_url', expectHost: 'lux.corpflowai.com' },
  { target: 'https://CORE.CORPFLOWAI.COM/change', expectShape: 'absolute_url', expectHost: 'core.corpflowai.com' },
  { target: 'https://core.corpflowai.com', expectShape: 'absolute_url', expectHost: 'core.corpflowai.com' }, // empty path → /
  { target: 'https://core.corpflowai.com/', expectShape: 'absolute_url', expectHost: 'core.corpflowai.com' },
];

const rejects = [
  // Empty / null / non-string
  { target: '', reason: 'empty' },
  { target: null, reason: 'empty' },
  { target: undefined, reason: 'empty' },

  // Protocol-relative / UNC / backslash
  { target: '//evil.com/path', reason: 'protocol_relative' },
  { target: '//core.corpflowai.com/change', reason: 'protocol_relative' },
  { target: '\\\\evil.com\\share', reason: 'unc_path' },
  { target: '/path\\with\\backslash', reason: 'backslash' },

  // Bad scheme
  { target: 'http://core.corpflowai.com/change', reason: 'bad_scheme' },
  { target: 'ftp://core.corpflowai.com/change', reason: 'bad_scheme' },
  { target: 'javascript:alert(1)', reason: 'bad_scheme' },
  { target: 'data:text/html,<script>alert(1)</script>', reason: 'bad_scheme' },
  { target: 'vbscript:msgbox', reason: 'bad_scheme' },
  { target: 'file:///etc/passwd', reason: 'bad_scheme' },

  // Off-platform hosts
  { target: 'https://evil.com/path', reason: 'host_not_allowed' },
  { target: 'https://attacker.com', reason: 'host_not_allowed' },
  { target: 'https://core.corpflowai.com.evil.com/change', reason: 'host_not_allowed' },
  { target: 'https://evilcore.corpflowai.com/change', reason: 'host_not_allowed' },

  // Header injection
  { target: '/change\r\nLocation: https://evil.com', reason: 'forbidden_chars' },
  { target: '/change\nFoo: bar', reason: 'forbidden_chars' },
  { target: '/change\0', reason: 'forbidden_chars' },
  { target: '/change\t', reason: 'forbidden_chars' },

  // Path traversal
  { target: '/path/../etc', reason: 'path_traversal' },
  { target: '/path/%2e%2e/etc', reason: 'path_traversal_encoded' },
  { target: 'https://core.corpflowai.com/x/../y', reason: 'path_traversal' },

  // Hostname shape
  { target: 'https://core.corpflowai.com:8080/change', reason: 'port_in_host' },
  { target: 'https://user@core.corpflowai.com/change', reason: 'userinfo_in_host' },
  { target: 'https:///change', reason: 'empty_host' },
  { target: 'https://-bad.example.com/x', reason: 'malformed_hostname' },
  { target: 'https://b_ad.example.com/x', reason: 'malformed_hostname' }, // underscore not allowed
  { target: 'https://bad-.example.com/x', reason: 'host_not_allowed' }, // syntactically OK; not in allow-list
  { target: 'https://EVIL.com/x', reason: 'host_not_allowed' }, // lowercased before check; not in list

  // Unsafe path chars (query/hash without opt-in)
  { target: '/change?foo=bar', reason: 'unsafe_path_chars' },
  { target: '/change#hash', reason: 'unsafe_path_chars' },

  // Length cap
  { target: 'https://core.corpflowai.com/' + 'a'.repeat(2100), reason: 'too_long' },
];

test('validateRedirectTarget: accepts all valid targets', () => {
  for (const row of accepts) {
    const got = validateRedirectTarget(row.target, ALL_HOSTS);
    assert.equal(got.ok, true, `should accept: ${row.target} (got ${JSON.stringify(got)})`);
    assert.equal(got.shape, row.expectShape);
    assert.equal(got.hostname, row.expectHost);
    assert.equal(typeof got.redirect_to, 'string');
    assert.match(got.redirect_to, /^(\/|https:\/\/)/);
  }
});

test('validateRedirectTarget: rejects all unsafe targets with stable reason codes', () => {
  for (const row of rejects) {
    const got = validateRedirectTarget(row.target, ALL_HOSTS);
    assert.equal(got.ok, false, `should reject: ${JSON.stringify(row.target)} (got ${JSON.stringify(got)})`);
    assert.equal(got.reason, row.reason, `reason mismatch for ${JSON.stringify(row.target)}: expected ${row.reason}, got ${got.reason}`);
  }
});

test('validateRedirectTarget: allowQuery opens up `?key=value` but not `#hash`', () => {
  const opts = { allowQuery: true };
  assert.equal(validateRedirectTarget('/change?foo=bar', ALL_HOSTS, opts).ok, true);
  assert.equal(validateRedirectTarget('/change?a=1&b=2', ALL_HOSTS, opts).ok, true);
  // Hash still not allowed
  assert.equal(validateRedirectTarget('/change#x', ALL_HOSTS, opts).ok, false);
});

test('validateRedirectTarget: with empty allow-list, absolute URLs always rejected', () => {
  const got = validateRedirectTarget('https://core.corpflowai.com/change', []);
  assert.equal(got.ok, false);
  assert.equal(got.reason, 'host_not_allowed');
  // Same-origin paths still work (don't consult allow-list)
  assert.equal(validateRedirectTarget('/change', []).ok, true);
});

test('validateRedirectTarget: non-array allow-list treated as empty', () => {
  const got = validateRedirectTarget('https://core.corpflowai.com/change', null);
  assert.equal(got.ok, false);
  assert.equal(got.reason, 'host_not_allowed');
});

test('safeDefaultRedirect: empty env → core.corpflowai.com fallback', () => {
  assert.equal(safeDefaultRedirect(null), 'https://core.corpflowai.com/change');
  assert.equal(safeDefaultRedirect(''), 'https://core.corpflowai.com/change');
  assert.equal(safeDefaultRedirect('   '), 'https://core.corpflowai.com/change');
});

test('safeDefaultRedirect: uses first valid entry, lowercased + port-stripped', () => {
  assert.equal(safeDefaultRedirect('CORE.STAGE.CORPFLOWAI.COM, x'), 'https://core.stage.corpflowai.com/change');
  assert.equal(safeDefaultRedirect('core.corpflowai.com:8443,x'), 'https://core.corpflowai.com/change');
  // Malformed entry → fallback
  assert.equal(safeDefaultRedirect('"evil.com" x'), 'https://core.corpflowai.com/change');
});

/* ------------------- resolveLoginRedirect decision tree ----------------------- */

function fakeEffectiveMembershipsFn(memberships) {
  return async () => ({ memberships });
}

test('resolveLoginRedirect: missing opts/fn → safe default with admin_default reason', async () => {
  const got = await resolveLoginRedirect({ user_id: 'u', typ: 'admin' }, '/change');
  assert.equal(got.redirect_to, 'https://core.corpflowai.com/change');
  assert.equal(got.reason, 'admin_default');
});

test('resolveLoginRedirect: no user_id (anonymous defensive path) → anonymous_default', async () => {
  const got = await resolveLoginRedirect(
    { typ: 'admin' },
    null,
    { coreHostsEnv: CORE_HOSTS.join(','), getEffectiveMembershipsFn: fakeEffectiveMembershipsFn([]) },
  );
  assert.equal(got.reason, 'anonymous_default');
  assert.equal(got.redirect_to, 'https://core.corpflowai.com/change');
});

test('resolveLoginRedirect: single membership → tenant host (single_membership)', async () => {
  const memberships = [{ tenant_id: 'lux', primary_hostname: 'lux.corpflowai.com' }];
  const got = await resolveLoginRedirect(
    { typ: 'tenant', user_id: 'u', tenant_id: 'lux' },
    null,
    { coreHostsEnv: CORE_HOSTS.join(','), getEffectiveMembershipsFn: fakeEffectiveMembershipsFn(memberships) },
  );
  assert.equal(got.reason, 'single_membership');
  assert.equal(got.redirect_to, 'https://lux.corpflowai.com/change');
  assert.equal(got.hostname, 'lux.corpflowai.com');
});

test('resolveLoginRedirect: single membership but no hostname → admin_default fallback', async () => {
  const memberships = [{ tenant_id: 'orphan-tenant' }]; // no primary_hostname, no fn
  const got = await resolveLoginRedirect(
    { typ: 'tenant', user_id: 'u', tenant_id: 'orphan-tenant' },
    null,
    { coreHostsEnv: CORE_HOSTS.join(','), getEffectiveMembershipsFn: fakeEffectiveMembershipsFn(memberships) },
  );
  assert.equal(got.reason, 'admin_default');
  assert.equal(got.redirect_to, 'https://core.corpflowai.com/change');
});

test('resolveLoginRedirect: multi-membership → Core (multi_membership)', async () => {
  const memberships = [
    { tenant_id: 'lux', primary_hostname: 'lux.corpflowai.com' },
    { tenant_id: 'living-word-mauritius', primary_hostname: 'living-word-mauritius.corpflowai.com' },
  ];
  const got = await resolveLoginRedirect(
    { typ: 'admin', user_id: 'u' },
    null,
    { coreHostsEnv: CORE_HOSTS.join(','), getEffectiveMembershipsFn: fakeEffectiveMembershipsFn(memberships) },
  );
  assert.equal(got.reason, 'multi_membership');
  assert.equal(got.redirect_to, 'https://core.corpflowai.com/change');
});

test('resolveLoginRedirect: 0 memberships (admin) → admin_default', async () => {
  const got = await resolveLoginRedirect(
    { typ: 'admin', user_id: 'admin-no-tenants' },
    null,
    { coreHostsEnv: CORE_HOSTS.join(','), getEffectiveMembershipsFn: fakeEffectiveMembershipsFn([]) },
  );
  assert.equal(got.reason, 'admin_default');
  assert.equal(got.redirect_to, 'https://core.corpflowai.com/change');
});

test('resolveLoginRedirect: validated requested_next to Core wins over membership', async () => {
  const memberships = [{ tenant_id: 'lux', primary_hostname: 'lux.corpflowai.com' }];
  const got = await resolveLoginRedirect(
    { typ: 'tenant', user_id: 'u', tenant_id: 'lux' },
    'https://core.corpflowai.com/admin/lead-rescue',
    { coreHostsEnv: CORE_HOSTS.join(','), getEffectiveMembershipsFn: fakeEffectiveMembershipsFn(memberships) },
  );
  assert.equal(got.reason, 'requested_next');
  assert.equal(got.redirect_to, 'https://core.corpflowai.com/admin/lead-rescue');
  assert.equal(got.hostname, 'core.corpflowai.com');
});

test('resolveLoginRedirect: validated requested_next to tenant host wins over multi-membership default', async () => {
  const memberships = [
    { tenant_id: 'lux', primary_hostname: 'lux.corpflowai.com' },
    { tenant_id: 'living-word-mauritius', primary_hostname: 'living-word-mauritius.corpflowai.com' },
  ];
  const got = await resolveLoginRedirect(
    { typ: 'admin', user_id: 'u' },
    'https://lux.corpflowai.com/change',
    { coreHostsEnv: CORE_HOSTS.join(','), getEffectiveMembershipsFn: fakeEffectiveMembershipsFn(memberships) },
  );
  assert.equal(got.reason, 'requested_next');
  assert.equal(got.redirect_to, 'https://lux.corpflowai.com/change');
});

test('resolveLoginRedirect: same-origin path requested_next prefixes with Core host', async () => {
  const memberships = [{ tenant_id: 'lux', primary_hostname: 'lux.corpflowai.com' }];
  const got = await resolveLoginRedirect(
    { typ: 'tenant', user_id: 'u', tenant_id: 'lux' },
    '/admin/lead-rescue',
    { coreHostsEnv: CORE_HOSTS.join(','), getEffectiveMembershipsFn: fakeEffectiveMembershipsFn(memberships) },
  );
  assert.equal(got.reason, 'requested_next');
  assert.equal(got.redirect_to, 'https://core.corpflowai.com/admin/lead-rescue');
});

test('resolveLoginRedirect: unsafe requested_next is silently dropped, falls through to membership routing', async () => {
  const memberships = [{ tenant_id: 'lux', primary_hostname: 'lux.corpflowai.com' }];
  const unsafe = [
    'https://evil.com/login',
    '//evil.com/x',
    'javascript:alert(1)',
    'data:text/html,<script>x</script>',
    '/path/../traversal',
    'https://core.corpflowai.com:8443/change', // port
  ];
  for (const u of unsafe) {
    const got = await resolveLoginRedirect(
      { typ: 'tenant', user_id: 'u', tenant_id: 'lux' },
      u,
      { coreHostsEnv: CORE_HOSTS.join(','), getEffectiveMembershipsFn: fakeEffectiveMembershipsFn(memberships) },
    );
    // Should NOT echo back the unsafe target. Should land on tenant host (single membership).
    assert.notEqual(got.redirect_to, u);
    assert.equal(got.reason, 'single_membership');
    assert.equal(got.redirect_to, 'https://lux.corpflowai.com/change');
  }
});

test('resolveLoginRedirect: getEffectiveMembershipsFn throws → safe default, no rethrow', async () => {
  const got = await resolveLoginRedirect(
    { typ: 'admin', user_id: 'u' },
    null,
    {
      coreHostsEnv: CORE_HOSTS.join(','),
      getEffectiveMembershipsFn: async () => { throw new Error('Prisma down'); },
    },
  );
  assert.equal(got.reason, 'admin_default');
  assert.equal(got.redirect_to, 'https://core.corpflowai.com/change');
});

test('resolveLoginRedirect: tenantHostnameLookupFn used when membership lacks primary_hostname', async () => {
  let lookupCalls = 0;
  const got = await resolveLoginRedirect(
    { typ: 'tenant', user_id: 'u', tenant_id: 'lux' },
    null,
    {
      coreHostsEnv: CORE_HOSTS.join(','),
      getEffectiveMembershipsFn: fakeEffectiveMembershipsFn([{ tenant_id: 'lux' }]),
      tenantHostnameLookupFn: async (tid) => {
        lookupCalls += 1;
        return tid === 'lux' ? 'lux.corpflowai.com' : null;
      },
    },
  );
  // Note: buildAllowedHostnames consults the lookup once, the single-membership
  // branch consults it again (no caching across the two paths). Both calls hit
  // the fake — we only assert it was called at least once and the result is
  // the tenant host.
  assert.ok(lookupCalls >= 1, `lookup should fire at least once (got ${lookupCalls})`);
  assert.equal(got.reason, 'single_membership');
  assert.equal(got.redirect_to, 'https://lux.corpflowai.com/change');
});

test('resolveLoginRedirect: tenantHostnameLookupFn errors are swallowed (not rethrown)', async () => {
  const got = await resolveLoginRedirect(
    { typ: 'tenant', user_id: 'u', tenant_id: 'lux' },
    null,
    {
      coreHostsEnv: CORE_HOSTS.join(','),
      getEffectiveMembershipsFn: fakeEffectiveMembershipsFn([{ tenant_id: 'lux' }]),
      tenantHostnameLookupFn: async () => { throw new Error('Prisma offline'); },
    },
  );
  // Membership exists but lookup fails → no usable tenant host → safe default.
  assert.equal(got.reason, 'admin_default');
  assert.equal(got.redirect_to, 'https://core.corpflowai.com/change');
});
