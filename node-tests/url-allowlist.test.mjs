import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isPrivateIpLiteral,
  isAllowlistedHostname,
  validateAllowlistedHttpsUrl,
  validateAllowlistedResearchUrl,
} from '../lib/server/url-allowlist.js';

test('isPrivateIpLiteral detects private ranges', () => {
  assert.equal(isPrivateIpLiteral('127.0.0.1'), true);
  assert.equal(isPrivateIpLiteral('10.0.0.5'), true);
  assert.equal(isPrivateIpLiteral('192.168.1.1'), true);
  assert.equal(isPrivateIpLiteral('172.16.0.1'), true);
  assert.equal(isPrivateIpLiteral('172.31.255.254'), true);
  assert.equal(isPrivateIpLiteral('172.32.0.1'), false);
  assert.equal(isPrivateIpLiteral('8.8.8.8'), false);
  assert.equal(isPrivateIpLiteral('::1'), true);
});

test('isAllowlistedHostname matches exact and suffix rules', () => {
  const rules = { exact_hosts: ['example.com'], suffix_hosts: ['github.com', 'docs.github.com'] };
  assert.equal(isAllowlistedHostname('example.com', rules), true);
  assert.equal(isAllowlistedHostname('www.example.com', rules), false);
  assert.equal(isAllowlistedHostname('github.com', rules), true);
  assert.equal(isAllowlistedHostname('api.github.com', rules), true);
  assert.equal(isAllowlistedHostname('evilgithub.com', rules), false);
  assert.equal(isAllowlistedHostname('docs.github.com', rules), true);
  assert.equal(isAllowlistedHostname('foo.docs.github.com', rules), true);
});

test('validateAllowlistedHttpsUrl enforces https and blocks localhost/private IPs', () => {
  const rules = { exact_hosts: ['example.com'], suffix_hosts: ['github.com'] };

  assert.deepEqual(validateAllowlistedHttpsUrl('http://example.com', rules).ok, false);
  assert.deepEqual(validateAllowlistedHttpsUrl('https://localhost/x', rules).ok, false);
  assert.deepEqual(validateAllowlistedHttpsUrl('https://127.0.0.1/x', rules).ok, false);

  assert.deepEqual(validateAllowlistedHttpsUrl('https://example.com/a', rules).ok, true);
  assert.deepEqual(validateAllowlistedHttpsUrl('https://api.github.com/', rules).ok, true);
});

test('validateAllowlistedHttpsUrl blocks userinfo and non-allowlisted hosts', () => {
  const rules = { exact_hosts: ['example.com'], suffix_hosts: ['github.com'] };

  assert.equal(validateAllowlistedHttpsUrl('https://user:pass@example.com/x', rules).ok, false);
  assert.equal(validateAllowlistedHttpsUrl('https://evil.com', rules).ok, false);
  assert.equal(validateAllowlistedHttpsUrl('https://evilgithub.com', rules).ok, false);
});

test('validateAllowlistedResearchUrl is off by default unless env flag enabled', () => {
  // Default in test environment should be disabled (no env flag set).
  const res = validateAllowlistedResearchUrl('https://example.com');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'research_fetch_disabled');
});

