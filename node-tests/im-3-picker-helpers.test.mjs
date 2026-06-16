/**
 * IM-3 (2026-06-16) — Pure-helper tests for the Core-host workspace picker.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-3.
 *
 * This suite exercises every export of `lib/ui/core-tenant-picker-helpers.js`
 * exhaustively. The component (`components/CoreTenantPicker.js`) contains
 * the JSX and is verified by `node-tests/im-3-picker-render.test.mjs` via
 * file-content assertions — so all logic gates that the component branches
 * on must be tested HERE.
 *
 * Guardrails this file enforces:
 *
 *   #1 — UI-only consumer: drift test asserts the two CSRF strings the
 *        UI inlines match the server values without modifying server files.
 *   #5 — Picker only renders on Core: `shouldRenderPicker` truth table.
 *   #6 — Explicit error handling: every parsed `kind` has a non-empty
 *        user-facing message; every documented response status maps to a
 *        stable kind.
 *   #7 — Accessibility: `describeMembershipRow` emits aria-current only
 *        on the currently-acting row; the disabled state is deterministic.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CORPFLOW_CSRF_COOKIE,
  CORPFLOW_CSRF_HEADER,
  PICKER_SECTION_ID,
  PICKER_HEADING_ID,
  PICKER_HEADING_TEXT,
  PICKER_STATUS_ID,
  PICKER_LIST_ID,
  PICKER_DATA_ATTR,
  PICKER_ROW_DATA_ATTR,
  PICKER_CSRF_UNAVAILABLE_DATA_ATTR,
  PICKER_LEAVE_BUTTON_DATA_ATTR,
  PICKER_OPEN_REDIRECT_DATA_ATTR,
  PICKER_LIFECYCLE,
  PICKER_ROW_STATE,
  shouldRenderPicker,
  readCorpflowCsrfCookie,
  buildSwitchRequest,
  buildLeaveRequest,
  buildEffectiveMembershipsRequest,
  parseSwitchResponse,
  parseLeaveResponse,
  parseEffectiveMembershipsResponse,
  formatErrorMessage,
  describeMembershipRow,
  shouldShowLeaveButton,
  describeOpenRedirectLink,
} from '../lib/ui/core-tenant-picker-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/* ------------------------------------------------------------------- *
 * Drift test — guardrail #1.                                          *
 * ------------------------------------------------------------------- */

test('IM-3 — CSRF cookie + header constants match lib/server/csrf.js (case-insensitive header)', () => {
  // HTTP header names are case-insensitive on the wire (RFC 9110 §5.1):
  //   - UI sends mixed-case `X-CorpFlow-CSRF`     (canonical, readable)
  //   - Node lowercases inbound headers, so the server reads `x-corpflow-csrf`
  // Both describe the same header. Drift is detected by comparing
  // case-insensitively — and by checking that the server cookie literal
  // matches the UI cookie literal exactly (cookies ARE case-sensitive).
  const csrfSrc = fs.readFileSync(path.join(ROOT, 'lib/server/csrf.js'), 'utf8');
  const cookieMatch = csrfSrc.match(/CORPFLOW_CSRF_COOKIE\s*=\s*['"]([^'"]+)['"]/);
  const headerMatch = csrfSrc.match(/CORPFLOW_CSRF_HEADER\s*=\s*['"]([^'"]+)['"]/);
  assert.ok(cookieMatch, 'expected CORPFLOW_CSRF_COOKIE in server csrf.js');
  assert.ok(headerMatch, 'expected CORPFLOW_CSRF_HEADER in server csrf.js');
  assert.equal(cookieMatch[1], 'corpflow_csrf');
  assert.equal(cookieMatch[1], CORPFLOW_CSRF_COOKIE, 'UI cookie literal must match server (case-sensitive)');
  assert.equal(
    headerMatch[1].toLowerCase(),
    CORPFLOW_CSRF_HEADER.toLowerCase(),
    'UI + server header constants must agree case-insensitively',
  );
  assert.equal(CORPFLOW_CSRF_COOKIE, 'corpflow_csrf');
  assert.equal(CORPFLOW_CSRF_HEADER, 'X-CorpFlow-CSRF');
});

/* ------------------------------------------------------------------- *
 * Stable IDs / strings.                                                *
 * ------------------------------------------------------------------- */

test('IM-3 — picker IDs and data attributes are stable strings', () => {
  assert.equal(PICKER_SECTION_ID, 'cf-core-tenant-picker');
  assert.equal(PICKER_HEADING_ID, 'cf-core-tenant-picker-heading');
  assert.equal(PICKER_HEADING_TEXT, 'Your workspaces');
  assert.equal(PICKER_STATUS_ID, 'cf-core-tenant-picker-status');
  assert.equal(PICKER_LIST_ID, 'cf-core-tenant-picker-list');
  assert.equal(PICKER_DATA_ATTR, 'data-cf-core-tenant-picker');
  assert.equal(PICKER_ROW_DATA_ATTR, 'data-cf-core-tenant-picker-row');
  assert.equal(PICKER_CSRF_UNAVAILABLE_DATA_ATTR, 'data-cf-csrf-unavailable');
  assert.equal(PICKER_LEAVE_BUTTON_DATA_ATTR, 'data-cf-core-tenant-picker-leave');
  assert.equal(PICKER_OPEN_REDIRECT_DATA_ATTR, 'data-cf-core-tenant-picker-open-redirect');
});

test('IM-3 — picker lifecycle + row-state enums are frozen and complete', () => {
  assert.deepEqual(PICKER_LIFECYCLE, {
    INITIAL: 'initial',
    LOADING_MEMBERSHIPS: 'loading_memberships',
    READY: 'ready',
    MEMBERSHIPS_ERROR: 'memberships_error',
  });
  assert.deepEqual(PICKER_ROW_STATE, {
    IDLE: 'idle',
    SUBMITTING: 'submitting',
    SUCCESS: 'success',
    ERROR: 'error',
  });
  assert.ok(Object.isFrozen(PICKER_LIFECYCLE));
  assert.ok(Object.isFrozen(PICKER_ROW_STATE));
});

/* ------------------------------------------------------------------- *
 * shouldRenderPicker — guardrail #5 truth table.                       *
 * ------------------------------------------------------------------- */

const RENDER_GATE_CASES = [
  // [args, expected, label]
  [null, false, 'null args'],
  [undefined, false, 'undefined args'],
  ['core', false, 'non-object args'],
  [{}, false, 'empty object'],
  [{ surface: 'tenant', sessionLogged: true, effectiveMembershipsCount: 5 }, false, 'tenant host'],
  [{ surface: 'CORE', sessionLogged: true, effectiveMembershipsCount: 5 }, false, 'uppercase surface'],
  [{ surface: 'core', sessionLogged: false, effectiveMembershipsCount: 5 }, false, 'anonymous on core'],
  [{ surface: 'core', sessionLogged: 'true', effectiveMembershipsCount: 5 }, false, 'truthy non-bool session'],
  [{ surface: 'core', sessionLogged: true, effectiveMembershipsCount: 0 }, false, 'zero memberships'],
  [{ surface: 'core', sessionLogged: true, effectiveMembershipsCount: -1 }, false, 'negative memberships'],
  [{ surface: 'core', sessionLogged: true, effectiveMembershipsCount: 1.5 }, false, 'non-integer memberships'],
  [{ surface: 'core', sessionLogged: true, effectiveMembershipsCount: null }, false, 'null memberships'],
  [{ surface: 'core', sessionLogged: true, effectiveMembershipsCount: undefined }, false, 'undef memberships'],
  [{ surface: 'core', sessionLogged: true, effectiveMembershipsCount: '5' }, false, 'string memberships'],
  [{ surface: 'core', sessionLogged: true, effectiveMembershipsCount: 1 }, true, 'core + 1 membership renders'],
  [{ surface: 'core', sessionLogged: true, effectiveMembershipsCount: 17 }, true, 'core + many memberships'],
];

for (const [args, expected, label] of RENDER_GATE_CASES) {
  test(`IM-3 — shouldRenderPicker: ${label} → ${expected}`, () => {
    assert.equal(shouldRenderPicker(args), expected);
  });
}

/* ------------------------------------------------------------------- *
 * readCorpflowCsrfCookie — SSR-safe + truth table.                     *
 * ------------------------------------------------------------------- */

test('IM-3 — readCorpflowCsrfCookie returns null when documentRef is null (SSR)', () => {
  assert.equal(readCorpflowCsrfCookie({ documentRef: null }), null);
});

test('IM-3 — readCorpflowCsrfCookie returns null when document.cookie is empty', () => {
  assert.equal(readCorpflowCsrfCookie({ documentRef: { cookie: '' } }), null);
});

test('IM-3 — readCorpflowCsrfCookie returns null when cookie absent', () => {
  assert.equal(
    readCorpflowCsrfCookie({ documentRef: { cookie: 'foo=bar; baz=qux' } }),
    null,
  );
});

test('IM-3 — readCorpflowCsrfCookie returns null on malformed pair', () => {
  assert.equal(
    readCorpflowCsrfCookie({ documentRef: { cookie: 'corpflow_csrf' } }),
    null,
  );
});

test('IM-3 — readCorpflowCsrfCookie returns null on empty value', () => {
  assert.equal(
    readCorpflowCsrfCookie({ documentRef: { cookie: 'corpflow_csrf=' } }),
    null,
  );
});

test('IM-3 — readCorpflowCsrfCookie returns the cookie value', () => {
  const v = 'abc123token';
  assert.equal(
    readCorpflowCsrfCookie({ documentRef: { cookie: `other=1; corpflow_csrf=${v}; more=2` } }),
    v,
  );
});

test('IM-3 — readCorpflowCsrfCookie decodes URL-encoded values', () => {
  assert.equal(
    readCorpflowCsrfCookie({ documentRef: { cookie: 'corpflow_csrf=ab%2Bcd%3D' } }),
    'ab+cd=',
  );
});

test('IM-3 — readCorpflowCsrfCookie falls back to raw value on decode error', () => {
  assert.equal(
    readCorpflowCsrfCookie({ documentRef: { cookie: 'corpflow_csrf=ab%E0cd' } }),
    'ab%E0cd',
  );
});

test('IM-3 — readCorpflowCsrfCookie is case-sensitive on cookie name', () => {
  assert.equal(
    readCorpflowCsrfCookie({ documentRef: { cookie: 'CorpFlow_CSRF=upper' } }),
    null,
  );
});

test('IM-3 — readCorpflowCsrfCookie returns last duplicate (last-wins)', () => {
  assert.equal(
    readCorpflowCsrfCookie({
      documentRef: { cookie: 'corpflow_csrf=first; corpflow_csrf=second' },
    }),
    'second',
  );
});

test('IM-3 — readCorpflowCsrfCookie ignores non-string cookie', () => {
  assert.equal(readCorpflowCsrfCookie({ documentRef: { cookie: 123 } }), null);
});

/* ------------------------------------------------------------------- *
 * Request builders.                                                    *
 * ------------------------------------------------------------------- */

test('IM-3 — buildSwitchRequest throws on missing args', () => {
  assert.throws(() => buildSwitchRequest(), TypeError);
  assert.throws(() => buildSwitchRequest(null), TypeError);
  assert.throws(() => buildSwitchRequest({}), TypeError);
  assert.throws(() => buildSwitchRequest({ tenantId: '' }), TypeError);
  assert.throws(() => buildSwitchRequest({ tenantId: 'x' }), TypeError);
  assert.throws(() => buildSwitchRequest({ tenantId: 'x', csrfToken: '' }), TypeError);
  assert.throws(() => buildSwitchRequest({ tenantId: '   ', csrfToken: 'tok' }), TypeError);
});

test('IM-3 — buildSwitchRequest returns the canonical POST shape', () => {
  const [url, init] = buildSwitchRequest({ tenantId: 'lux-mauritius', csrfToken: 'TOKEN_VAL' });
  assert.equal(url, '/api/membership/switch');
  assert.equal(init.method, 'POST');
  assert.equal(init.credentials, 'same-origin');
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.equal(init.headers.Accept, 'application/json');
  assert.equal(init.headers['X-CorpFlow-CSRF'], 'TOKEN_VAL');
  assert.equal(init.body, JSON.stringify({ tenant_id: 'lux-mauritius' }));
});

test('IM-3 — buildSwitchRequest body has no `next` field (server controls redirect)', () => {
  const [, init] = buildSwitchRequest({ tenantId: 'x', csrfToken: 't' });
  const body = JSON.parse(init.body);
  assert.equal(body.next, undefined);
  assert.deepEqual(Object.keys(body), ['tenant_id']);
});

test('IM-3 — buildLeaveRequest throws on missing csrf', () => {
  assert.throws(() => buildLeaveRequest(), TypeError);
  assert.throws(() => buildLeaveRequest(null), TypeError);
  assert.throws(() => buildLeaveRequest({}), TypeError);
  assert.throws(() => buildLeaveRequest({ csrfToken: '' }), TypeError);
});

test('IM-3 — buildLeaveRequest returns the canonical POST shape with empty body', () => {
  const [url, init] = buildLeaveRequest({ csrfToken: 'TKN' });
  assert.equal(url, '/api/membership/leave');
  assert.equal(init.method, 'POST');
  assert.equal(init.credentials, 'same-origin');
  assert.equal(init.headers['X-CorpFlow-CSRF'], 'TKN');
  assert.equal(init.body, JSON.stringify({}));
});

test('IM-3 — buildEffectiveMembershipsRequest returns GET with same-origin credentials', () => {
  const [url, init] = buildEffectiveMembershipsRequest();
  assert.equal(url, '/api/membership/effective');
  assert.equal(init.method, 'GET');
  assert.equal(init.credentials, 'same-origin');
  assert.equal(init.headers.Accept, 'application/json');
  assert.equal(init.body, undefined);
});

/* ------------------------------------------------------------------- *
 * parseSwitchResponse / parseLeaveResponse — full status × code matrix. *
 * ------------------------------------------------------------------- */

test('IM-3 — parseSwitchResponse: 200 ok → success with all fields', () => {
  const out = parseSwitchResponse({
    status: 200,
    body: {
      ok: true,
      acting_tenant_id: 'lux-mauritius',
      session_version: 2,
      redirect_to: 'https://lux.corpflowai.com/change',
      tenant_name: 'Luxe Maurice',
      csrf_token: 'new_token',
    },
  });
  assert.deepEqual(out, {
    kind: 'success',
    actingTenantId: 'lux-mauritius',
    sessionVersion: 2,
    redirectTo: 'https://lux.corpflowai.com/change',
    tenantName: 'Luxe Maurice',
    csrfToken: 'new_token',
  });
});

test('IM-3 — parseSwitchResponse: 200 success with partial body sets nulls', () => {
  const out = parseSwitchResponse({ status: 200, body: { ok: true } });
  assert.equal(out.kind, 'success');
  assert.equal(out.actingTenantId, null);
  assert.equal(out.sessionVersion, null);
  assert.equal(out.redirectTo, null);
  assert.equal(out.tenantName, null);
  assert.equal(out.csrfToken, null);
});

test('IM-3 — parseSwitchResponse: 200 with ok!==true is NOT success', () => {
  const out = parseSwitchResponse({ status: 200, body: { ok: false, error: 'WEIRD' } });
  assert.equal(out.kind, 'unknown_error');
  assert.equal(out.status, 200);
  assert.equal(out.errorCode, 'WEIRD');
});

test('IM-3 — parseSwitchResponse: 401 → unauthenticated', () => {
  assert.deepEqual(parseSwitchResponse({ status: 401, body: { error: 'UNAUTHENTICATED' } }), {
    kind: 'unauthenticated',
  });
});

test('IM-3 — parseSwitchResponse: 400 NO_USER_ID_IN_SESSION → no_user_id', () => {
  assert.deepEqual(parseSwitchResponse({ status: 400, body: { error: 'NO_USER_ID_IN_SESSION' } }), {
    kind: 'no_user_id',
  });
});

test('IM-3 — parseSwitchResponse: 400 MISSING_TENANT_ID → invalid_tenant_id', () => {
  assert.deepEqual(parseSwitchResponse({ status: 400, body: { error: 'MISSING_TENANT_ID' } }), {
    kind: 'invalid_tenant_id',
    errorCode: 'MISSING_TENANT_ID',
  });
});

test('IM-3 — parseSwitchResponse: 400 INVALID_TENANT_ID → invalid_tenant_id', () => {
  assert.deepEqual(parseSwitchResponse({ status: 400, body: { error: 'INVALID_TENANT_ID' } }), {
    kind: 'invalid_tenant_id',
    errorCode: 'INVALID_TENANT_ID',
  });
});

test('IM-3 — parseSwitchResponse: 403 CSRF_TOKEN_INVALID → csrf_invalid', () => {
  assert.deepEqual(parseSwitchResponse({ status: 403, body: { error: 'CSRF_TOKEN_INVALID' } }), {
    kind: 'csrf_invalid',
  });
});

test('IM-3 — parseSwitchResponse: 403 MEMBERSHIP_NOT_FOUND → membership_not_found', () => {
  assert.deepEqual(parseSwitchResponse({ status: 403, body: { error: 'MEMBERSHIP_NOT_FOUND' } }), {
    kind: 'membership_not_found',
  });
});

test('IM-3 — parseSwitchResponse: 403 SWITCH_NOT_ALLOWED_FROM_HOST', () => {
  assert.deepEqual(parseSwitchResponse({ status: 403, body: { error: 'SWITCH_NOT_ALLOWED_FROM_HOST' } }), {
    kind: 'switch_not_allowed_from_host',
  });
});

test('IM-3 — parseSwitchResponse: 405 → method_not_allowed', () => {
  assert.deepEqual(parseSwitchResponse({ status: 405, body: {} }), { kind: 'method_not_allowed' });
});

test('IM-3 — parseSwitchResponse: 503 → temporarily_unavailable', () => {
  assert.deepEqual(parseSwitchResponse({ status: 503, body: { error: 'SWITCH_TEMPORARILY_UNAVAILABLE' } }), {
    kind: 'temporarily_unavailable',
  });
});

test('IM-3 — parseSwitchResponse: 500 → unknown_error', () => {
  assert.deepEqual(parseSwitchResponse({ status: 500, body: { error: 'INTERNAL_ERROR' } }), {
    kind: 'unknown_error',
    status: 500,
    errorCode: 'INTERNAL_ERROR',
  });
});

test('IM-3 — parseSwitchResponse: missing input maps to unknown_error', () => {
  assert.equal(parseSwitchResponse({}).kind, 'unknown_error');
  assert.equal(parseSwitchResponse(null).kind, 'unknown_error');
  assert.equal(parseSwitchResponse({ status: 'abc' }).kind, 'unknown_error');
});

test('IM-3 — parseSwitchResponse: 403 with unknown error → unknown_error (no false positive)', () => {
  assert.deepEqual(parseSwitchResponse({ status: 403, body: { error: 'SOMETHING_ELSE' } }), {
    kind: 'unknown_error',
    status: 403,
    errorCode: 'SOMETHING_ELSE',
  });
});

test('IM-3 — parseLeaveResponse: delegates to parseSwitchResponse', () => {
  assert.deepEqual(parseLeaveResponse({ status: 200, body: { ok: true } }).kind, 'success');
  assert.deepEqual(parseLeaveResponse({ status: 401, body: { error: 'UNAUTHENTICATED' } }).kind, 'unauthenticated');
});

/* ------------------------------------------------------------------- *
 * parseEffectiveMembershipsResponse.                                   *
 * ------------------------------------------------------------------- */

test('IM-3 — parseEffectiveMembershipsResponse: 200 ok with memberships', () => {
  const out = parseEffectiveMembershipsResponse({
    status: 200,
    body: {
      ok: true,
      memberships: [
        { tenant_id: 'lux-mauritius', tenant_name: 'Luxe', role: 'admin' },
        { tenant_id: 'lwc-mauritius', tenant_name: 'LWC' },
      ],
    },
  });
  assert.equal(out.kind, 'ok');
  assert.equal(out.memberships.length, 2);
  assert.equal(out.memberships[0].tenant_id, 'lux-mauritius');
});

test('IM-3 — parseEffectiveMembershipsResponse: filters out malformed rows', () => {
  const out = parseEffectiveMembershipsResponse({
    status: 200,
    body: {
      ok: true,
      memberships: [
        { tenant_id: 'lux-mauritius' },
        { tenant_id: '' },
        { tenant_name: 'no id' },
        null,
        'string row',
        { tenant_id: 'lwc-mauritius' },
      ],
    },
  });
  assert.equal(out.memberships.length, 2);
  assert.equal(out.memberships[0].tenant_id, 'lux-mauritius');
  assert.equal(out.memberships[1].tenant_id, 'lwc-mauritius');
});

test('IM-3 — parseEffectiveMembershipsResponse: 200 ok with non-array memberships → []', () => {
  const out = parseEffectiveMembershipsResponse({
    status: 200,
    body: { ok: true, memberships: 'not an array' },
  });
  assert.equal(out.kind, 'ok');
  assert.equal(out.memberships.length, 0);
});

test('IM-3 — parseEffectiveMembershipsResponse: 401 → unauthenticated', () => {
  assert.deepEqual(
    parseEffectiveMembershipsResponse({ status: 401, body: { error: 'UNAUTHENTICATED' } }),
    { kind: 'unauthenticated' },
  );
});

test('IM-3 — parseEffectiveMembershipsResponse: 403 SWITCH_NOT_ALLOWED_FROM_HOST', () => {
  assert.deepEqual(
    parseEffectiveMembershipsResponse({
      status: 403,
      body: { error: 'SWITCH_NOT_ALLOWED_FROM_HOST' },
    }),
    { kind: 'switch_not_allowed_from_host' },
  );
});

test('IM-3 — parseEffectiveMembershipsResponse: 500 → unknown_error', () => {
  const out = parseEffectiveMembershipsResponse({ status: 500, body: { error: 'BOOM' } });
  assert.equal(out.kind, 'unknown_error');
  assert.equal(out.status, 500);
  assert.equal(out.errorCode, 'BOOM');
});

/* ------------------------------------------------------------------- *
 * formatErrorMessage — every documented kind has a stable, non-empty,  *
 * code-free user message.                                              *
 * ------------------------------------------------------------------- */

const ERROR_KINDS = [
  'csrf_invalid',
  'membership_not_found',
  'switch_not_allowed_from_host',
  'unauthenticated',
  'no_user_id',
  'temporarily_unavailable',
  'invalid_tenant_id',
  'method_not_allowed',
  'csrf_unavailable',
  'memberships_load_failed',
  'network_error',
  'unknown_error',
];

for (const kind of ERROR_KINDS) {
  test(`IM-3 — formatErrorMessage: ${kind} returns non-empty user-safe message`, () => {
    const msg = formatErrorMessage(kind);
    assert.equal(typeof msg, 'string');
    assert.ok(msg.length > 0, 'message must be non-empty');
    // No raw machine codes (uppercase + underscore) leak through.
    assert.doesNotMatch(msg, /[A-Z_]{4,}/);
  });
}

test('IM-3 — formatErrorMessage: unknown kind falls back to unknown_error message', () => {
  const unknownMsg = formatErrorMessage('unknown_error');
  assert.equal(formatErrorMessage('foo-bar-not-a-kind'), unknownMsg);
  assert.equal(formatErrorMessage(undefined), unknownMsg);
  assert.equal(formatErrorMessage(null), unknownMsg);
});

/* ------------------------------------------------------------------- *
 * describeMembershipRow + shouldShowLeaveButton + describeOpenRedirectLink. *
 * ------------------------------------------------------------------- */

test('IM-3 — describeMembershipRow: non-acting row has no aria-current and not disabled', () => {
  const row = describeMembershipRow(
    { tenant_id: 'lux-mauritius', tenant_name: 'Luxe' },
    'other-tenant',
  );
  assert.equal(row.isCurrentlyActing, false);
  assert.equal(row.ariaCurrent, undefined);
  assert.equal(row.switchButtonDisabled, false);
  assert.equal(row.switchButtonLabel, 'Switch to Luxe');
  assert.equal(row.switchButtonAriaLabel, 'Switch to Luxe');
});

test('IM-3 — describeMembershipRow: acting row is disabled with aria-current=true', () => {
  const row = describeMembershipRow(
    { tenant_id: 'lux-mauritius', tenant_name: 'Luxe' },
    'lux-mauritius',
  );
  assert.equal(row.isCurrentlyActing, true);
  assert.equal(row.ariaCurrent, 'true');
  assert.equal(row.switchButtonDisabled, true);
  assert.equal(row.switchButtonLabel, 'Currently acting');
  assert.equal(row.switchButtonAriaLabel, 'Currently acting on Luxe');
});

test('IM-3 — describeMembershipRow: null acting → no row is current', () => {
  const row = describeMembershipRow(
    { tenant_id: 'lux-mauritius', tenant_name: 'Luxe' },
    null,
  );
  assert.equal(row.isCurrentlyActing, false);
  assert.equal(row.ariaCurrent, undefined);
});

test('IM-3 — describeMembershipRow: missing tenant_name falls back to tenant_id in label', () => {
  const row = describeMembershipRow({ tenant_id: 'lux-mauritius' }, null);
  assert.equal(row.switchButtonLabel, 'Switch to lux-mauritius');
});

test('IM-3 — describeMembershipRow: empty string acting tenant treats as no-act', () => {
  const row = describeMembershipRow({ tenant_id: 'x', tenant_name: 'X' }, '');
  assert.equal(row.isCurrentlyActing, false);
});

test('IM-3 — shouldShowLeaveButton: only true for non-empty string acting tenant', () => {
  assert.equal(shouldShowLeaveButton(null), false);
  assert.equal(shouldShowLeaveButton(undefined), false);
  assert.equal(shouldShowLeaveButton(''), false);
  assert.equal(shouldShowLeaveButton(0), false);
  assert.equal(shouldShowLeaveButton('lux-mauritius'), true);
});

test('IM-3 — describeOpenRedirectLink: returns null on missing / non-https', () => {
  assert.equal(describeOpenRedirectLink({ redirectTo: null }), null);
  assert.equal(describeOpenRedirectLink({ redirectTo: '' }), null);
  assert.equal(describeOpenRedirectLink({ redirectTo: 'http://lux.corpflowai.com/change' }), null);
  assert.equal(describeOpenRedirectLink({ redirectTo: '/change' }), null);
  assert.equal(describeOpenRedirectLink({ redirectTo: 'javascript:alert(1)' }), null);
});

test('IM-3 — describeOpenRedirectLink: success switch returns labeled link', () => {
  const out = describeOpenRedirectLink({
    redirectTo: 'https://lux.corpflowai.com/change',
    tenantName: 'Luxe Maurice',
    isLeave: false,
  });
  assert.equal(out.href, 'https://lux.corpflowai.com/change');
  assert.equal(out.label, 'Open Luxe Maurice Change Console');
  assert.equal(out.ariaLabel, 'Open the Change Console for Luxe Maurice');
});

test('IM-3 — describeOpenRedirectLink: success switch with no tenant name falls back', () => {
  const out = describeOpenRedirectLink({
    redirectTo: 'https://lux.corpflowai.com/change',
    tenantName: null,
    isLeave: false,
  });
  assert.equal(out.label, 'Open the workspace Change Console');
});

test('IM-3 — describeOpenRedirectLink: leave returns "Open the Core console"', () => {
  const out = describeOpenRedirectLink({
    redirectTo: 'https://core.corpflowai.com/change',
    isLeave: true,
  });
  assert.equal(out.label, 'Open the Core console');
  assert.equal(out.ariaLabel, 'Open the Core console at the new location');
});
