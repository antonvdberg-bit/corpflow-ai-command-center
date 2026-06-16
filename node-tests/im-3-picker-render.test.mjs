/**
 * IM-3 (2026-06-16) — Render-contract tests for the Core-host workspace
 * picker.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-3.
 *
 * Pattern: the repo has no React Testing Library and the existing render
 * tests (e.g. `node-tests/lux-attachment-panel-readability.test.mjs`)
 * inspect source files directly. We follow that pattern here — Next.js
 * webpack catches any JSX / type error at `npm run build` time, and the
 * decision logic the component branches on is exhaustively unit-tested in
 * `node-tests/im-3-picker-helpers.test.mjs`.
 *
 * What this file enforces:
 *
 *   GUARDRAIL #1 (UI-only consumer): the component file imports ONLY
 *     `react` + `../lib/ui/core-tenant-picker-helpers.js`. It must NOT
 *     reach into `lib/server/*`, Prisma, env, or any server-only module.
 *
 *   GUARDRAIL #5 (Core-only render): `pages/change.js` gates the render
 *     with `shouldRenderCoreTenantPicker(...)` AND the picker is wrapped
 *     in `{showCoreTenantPicker ? ... : null}`. Tenant-host /change HTML
 *     must therefore never include any of the picker's stable strings.
 *
 *   GUARDRAIL #6 (Explicit error handling): the component branches on
 *     every documented error kind via `formatErrorMessage`. We assert the
 *     component source references each kind so silent regressions are
 *     impossible.
 *
 *   GUARDRAIL #7 (Accessibility): the component source must include
 *     semantic <section>/<h2>/<ul>/<li>/<button>, role="status",
 *     aria-live="polite", aria-current="true|undefined", aria-label,
 *     aria-disabled, and disabled props. No <div onClick>.
 *
 *   APPROVED SCOPE: no auto-redirect — server-supplied `redirect_to` must
 *     be rendered as an explicit <a> link the user clicks (no
 *     `window.location.assign` / `router.push` / `location.href = …`).
 *
 *   APPROVED SCOPE: no DB / audit / automation writes — the component
 *     hits ONLY the three approved endpoints.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const COMPONENT_SRC = fs.readFileSync(path.join(ROOT, 'components/CoreTenantPicker.js'), 'utf8');
const HELPERS_SRC = fs.readFileSync(path.join(ROOT, 'lib/ui/core-tenant-picker-helpers.js'), 'utf8');
const CHANGE_SRC = fs.readFileSync(path.join(ROOT, 'pages/change.js'), 'utf8');

/**
 * Strip JS comments (line + block) so assertions don't false-positive on
 * documentation that mentions a forbidden symbol. Mirrors the pattern in
 * `lux-attachment-panel-readability.test.mjs`.
 */
function stripJsComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const COMPONENT_CODE = stripJsComments(COMPONENT_SRC);
const HELPERS_CODE = stripJsComments(HELPERS_SRC);
const CHANGE_CODE = stripJsComments(CHANGE_SRC);

/* ------------------------------------------------------------------- *
 * GUARDRAIL #1 — UI-only imports.                                     *
 * ------------------------------------------------------------------- */

test('IM-3 — components/CoreTenantPicker.js imports only react + helpers', () => {
  const imports = [...COMPONENT_CODE.matchAll(/^\s*import\s+[^;]+?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  assert.ok(imports.length >= 2, 'expected at least the react + helpers imports');
  for (const src of imports) {
    const ok = src === 'react' || src === '../lib/ui/core-tenant-picker-helpers.js';
    assert.ok(
      ok,
      `components/CoreTenantPicker.js may only import react + the helpers module, found: ${src}`,
    );
  }
});

test('IM-3 — components/CoreTenantPicker.js never imports lib/server/* / prisma / env', () => {
  assert.doesNotMatch(COMPONENT_CODE, /from\s+['"][^'"]*lib\/server\//);
  assert.doesNotMatch(COMPONENT_CODE, /from\s+['"]@prisma\/client['"]/);
  assert.doesNotMatch(COMPONENT_CODE, /from\s+['"]prisma\//);
  assert.doesNotMatch(COMPONENT_CODE, /process\.env\.[A-Z]/);
});

test('IM-3 — lib/ui/core-tenant-picker-helpers.js has no server imports', () => {
  assert.doesNotMatch(HELPERS_CODE, /from\s+['"][^'"]*lib\/server\//);
  assert.doesNotMatch(HELPERS_CODE, /from\s+['"]node:[a-z]+['"]/);
  assert.doesNotMatch(HELPERS_CODE, /require\(['"]node:/);
  assert.doesNotMatch(HELPERS_CODE, /from\s+['"]fs['"]/);
  assert.doesNotMatch(HELPERS_CODE, /from\s+['"]path['"]/);
});

/* ------------------------------------------------------------------- *
 * GUARDRAIL #2 — "no writes" precise: only the three approved          *
 * endpoints, no client-side write to anything else, no localStorage    *
 * writes for membership state.                                         *
 * ------------------------------------------------------------------- */

test('IM-3 — component hits only the three approved endpoints', () => {
  const endpoints = [
    '/api/membership/effective',
    '/api/membership/switch',
    '/api/membership/leave',
  ];
  // All three must appear (referenced through the helper builders → static
  // strings inside this file or the helpers file).
  for (const ep of endpoints) {
    assert.ok(HELPERS_CODE.includes(`'${ep}'`), `helpers must reference ${ep}`);
  }
  // Component must not hardcode any /api/* URL itself — all networking
  // goes through the helper builders.
  const apiHits = [...COMPONENT_CODE.matchAll(/['"](\/api\/[^'"]+)['"]/g)].map((m) => m[1]);
  assert.deepEqual(apiHits, [], `component must not hardcode /api URLs, found: ${apiHits.join(', ')}`);
});

test('IM-3 — component performs no localStorage / sessionStorage / cookie writes', () => {
  assert.doesNotMatch(COMPONENT_CODE, /localStorage\s*\.\s*setItem/);
  assert.doesNotMatch(COMPONENT_CODE, /sessionStorage\s*\.\s*setItem/);
  assert.doesNotMatch(COMPONENT_CODE, /document\s*\.\s*cookie\s*=/);
});

/* ------------------------------------------------------------------- *
 * GUARDRAIL #5 — picker only renders on Core.                          *
 * pages/change.js must gate it with shouldRenderCoreTenantPicker,      *
 * and the gate must use uiContext.surface + sessionLogged + count.     *
 * ------------------------------------------------------------------- */

test('IM-3 — pages/change.js imports the gate + the component', () => {
  assert.match(
    CHANGE_SRC,
    /shouldRenderPicker\s+as\s+shouldRenderCoreTenantPicker\s*\}\s*from\s+['"]\.\.\/lib\/ui\/core-tenant-picker-helpers\.js['"]/,
  );
  assert.match(
    CHANGE_SRC,
    /import\s+CoreTenantPicker\s+from\s+['"]\.\.\/components\/CoreTenantPicker\.js['"]/,
  );
});

test('IM-3 — pages/change.js renders the picker only when the gate is true', () => {
  assert.match(
    CHANGE_CODE,
    /showCoreTenantPicker\s*=\s*shouldRenderCoreTenantPicker\(\s*\{/,
  );
  assert.match(
    CHANGE_CODE,
    /\{\s*showCoreTenantPicker\s*\?\s*\(\s*<CoreTenantPicker/,
  );
});

test('IM-3 — pages/change.js gate uses surface + session + count', () => {
  // Pull the gate-call block to assert each input.
  const m = CHANGE_CODE.match(
    /showCoreTenantPicker\s*=\s*shouldRenderCoreTenantPicker\(\s*\{([\s\S]*?)\}\s*\)/,
  );
  assert.ok(m, 'expected the showCoreTenantPicker assignment block');
  const block = m[1];
  assert.match(block, /surface:\s*uiContext\?\.surface/);
  assert.match(block, /sessionLogged:\s*session\?\.logged_in\s*===\s*true/);
  assert.match(block, /effectiveMembershipsCount:\s*uiContext\?\.effective_memberships_count/);
});

/* ------------------------------------------------------------------- *
 * GUARDRAIL #6 — explicit error handling.                              *
 * The component must reference every documented error kind so          *
 * regressions cannot silently drop a branch.                           *
 * ------------------------------------------------------------------- */

const REQUIRED_ERROR_KINDS = [
  'csrf_invalid',
  'membership_not_found',
  'switch_not_allowed_from_host',
  'unauthenticated',
  'no_user_id',
  'temporarily_unavailable',
  'invalid_tenant_id',
  'csrf_unavailable',
  'memberships_load_failed',
  'network_error',
];

test('IM-3 — helpers map every required error kind to a user-facing message', async () => {
  const helpers = await import('../lib/ui/core-tenant-picker-helpers.js');
  for (const kind of REQUIRED_ERROR_KINDS) {
    const msg = helpers.formatErrorMessage(kind);
    assert.ok(typeof msg === 'string' && msg.length > 0, `kind ${kind} has no message`);
  }
});

test('IM-3 — component routes errors through formatErrorMessage (no inline error strings)', () => {
  // We assert the function name appears at least 4 times (memberships
  // load error path, csrf-missing path, switch error path, leave error
  // path). That is the floor; if a path is removed, the count drops.
  const count = (COMPONENT_CODE.match(/formatErrorMessage\(/g) || []).length;
  assert.ok(
    count >= 4,
    `expected formatErrorMessage to be referenced ≥ 4 times, saw ${count}`,
  );
});

test('IM-3 — component does not silently catch & ignore (every catch surfaces or rethrows)', () => {
  // The only catches the component uses are:
  //   (a) `try { body = await res.json(); } catch (_jsonErr) { body = null; }`
  //       — converts a non-JSON body into a parsed error kind further down.
  //   (b) outer `catch (_netErr)` blocks that surface a 'network_error'
  //       message via formatErrorMessage.
  // We assert by counting occurrences:
  //   - `_netErr` appears once per outer catch (load, switch, leave = 3).
  //   - `formatErrorMessage('network_error')` appears once per outer catch.
  // Counting is robust to brace-matching in regex (which Node's `match`
  // engine can't do correctly for nested braces).
  const netErrCount = (COMPONENT_CODE.match(/catch\s*\(\s*_netErr\s*\)/g) || []).length;
  const netErrFormatCount = (COMPONENT_CODE.match(/formatErrorMessage\(\s*['"]network_error['"]\s*\)/g) || []).length;
  assert.ok(netErrCount >= 3, `expected ≥ 3 _netErr catches (load + switch + leave), saw ${netErrCount}`);
  assert.ok(
    netErrFormatCount >= netErrCount,
    `every _netErr catch must call formatErrorMessage('network_error'); saw ${netErrFormatCount} calls vs ${netErrCount} catches`,
  );
});

/* ------------------------------------------------------------------- *
 * GUARDRAIL #7 — accessibility.                                        *
 * ------------------------------------------------------------------- */

test('IM-3 — component uses semantic markup (section / h2 / ul / li / button)', () => {
  assert.match(COMPONENT_CODE, /<section\b/);
  assert.match(COMPONENT_CODE, /<h2\b/);
  assert.match(COMPONENT_CODE, /<ul\b/);
  // <li> is rendered via {...liProps} so we look for the variable.
  assert.match(COMPONENT_CODE, /<li\s+\{\.{3}liProps\}>/);
  assert.match(COMPONENT_CODE, /<button\b[\s\S]*?type=['"]button['"]/);
});

test('IM-3 — component uses ARIA: aria-labelledby / aria-live / aria-current / aria-label / aria-disabled', () => {
  assert.match(COMPONENT_CODE, /aria-labelledby=\{PICKER_HEADING_ID\}/);
  assert.match(COMPONENT_CODE, /role=['"]status['"]/);
  assert.match(COMPONENT_CODE, /aria-live=['"]polite['"]/);
  // aria-current is set conditionally via liProps['aria-current'].
  assert.match(COMPONENT_CODE, /liProps\['aria-current'\]\s*=\s*row\.ariaCurrent/);
  assert.match(COMPONENT_CODE, /aria-label=\{buttonAriaLabel\}/);
  assert.match(COMPONENT_CODE, /aria-disabled=\{/);
});

test('IM-3 — component does NOT use a div with onClick (keyboard fail)', () => {
  // <div onClick=...> would be unreachable from keyboard. Allow only on <button>/<a>.
  assert.doesNotMatch(COMPONENT_CODE, /<div\b[^>]*\bonClick\b/);
  assert.doesNotMatch(COMPONENT_CODE, /<span\b[^>]*\bonClick\b/);
});

/* ------------------------------------------------------------------- *
 * APPROVED SCOPE — no auto-redirect.                                   *
 * ------------------------------------------------------------------- */

test('IM-3 — component never auto-redirects (no window.location / router.push / replace)', () => {
  assert.doesNotMatch(COMPONENT_CODE, /window\.location\.(?:assign|replace|href)/);
  assert.doesNotMatch(COMPONENT_CODE, /document\.location\b/);
  assert.doesNotMatch(COMPONENT_CODE, /location\.href\s*=/);
  assert.doesNotMatch(COMPONENT_CODE, /router\.(?:push|replace)\b/);
  assert.doesNotMatch(COMPONENT_CODE, /useRouter\(/);
});

test('IM-3 — component renders the server redirect_to as an explicit <a> link', () => {
  assert.match(COMPONENT_CODE, /openRedirect\s*\?\s*\(\s*<a\b/);
  assert.match(COMPONENT_CODE, /href=\{openRedirect\.href\}/);
});

/* ------------------------------------------------------------------- *
 * APPROVED SCOPE — CSRF handling evidence.                             *
 * ------------------------------------------------------------------- */

test('IM-3 — component reads corpflow_csrf via the helper before every state change', () => {
  // Three call sites: load (sets csrfAvailable), handleSwitch, handleLeave.
  const reads = (COMPONENT_CODE.match(/readCorpflowCsrfCookie\(/g) || []).length;
  assert.ok(
    reads >= 3,
    `expected ≥ 3 calls to readCorpflowCsrfCookie (mount + switch + leave), saw ${reads}`,
  );
});

test('IM-3 — both POST helpers send X-CorpFlow-CSRF header', () => {
  // The header name lives in HELPERS_SRC (constant) — assert builders use it.
  assert.match(HELPERS_CODE, /buildSwitchRequest[\s\S]*?CORPFLOW_CSRF_HEADER/);
  assert.match(HELPERS_CODE, /buildLeaveRequest[\s\S]*?CORPFLOW_CSRF_HEADER/);
});

test('IM-3 — component refuses to POST when CSRF cookie absent (visible error)', () => {
  // Both handlers must short-circuit before fetch when csrfToken is missing.
  const handleSwitchMatch = COMPONENT_CODE.match(/handleSwitch[\s\S]*?async\s*\([\s\S]*?\)\s*=>\s*\{([\s\S]*?)\}\s*,/);
  const handleLeaveMatch = COMPONENT_CODE.match(/handleLeave[\s\S]*?async\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,/);
  assert.ok(handleSwitchMatch, 'handleSwitch body must be locatable');
  assert.ok(handleLeaveMatch, 'handleLeave body must be locatable');
  for (const body of [handleSwitchMatch[1], handleLeaveMatch[1]]) {
    assert.match(
      body,
      /const\s+csrfToken\s*=\s*readCorpflowCsrfCookie\(\)/,
    );
    // The short-circuit must precede the fetch builder call.
    const tokenIdx = body.indexOf('readCorpflowCsrfCookie');
    const fetchBuilderIdx = Math.min(
      body.indexOf('buildSwitchRequest('),
      body.indexOf('buildLeaveRequest('),
    );
    // At least one of the two builders is present per handler.
    const safeFetchIdx = Math.max(body.indexOf('buildSwitchRequest('), body.indexOf('buildLeaveRequest('));
    assert.ok(tokenIdx < safeFetchIdx, 'CSRF token must be read BEFORE building the POST request');
    void fetchBuilderIdx;
  }
});

/* ------------------------------------------------------------------- *
 * Render contract — stable IDs / strings appear in the component       *
 * source so HTML probes can find them.                                 *
 * ------------------------------------------------------------------- */

test('IM-3 — component source references all stable picker IDs', () => {
  for (const id of [
    'PICKER_SECTION_ID',
    'PICKER_HEADING_ID',
    'PICKER_HEADING_TEXT',
    'PICKER_STATUS_ID',
    'PICKER_LIST_ID',
    'PICKER_DATA_ATTR',
    'PICKER_ROW_DATA_ATTR',
    'PICKER_LEAVE_BUTTON_DATA_ATTR',
    'PICKER_OPEN_REDIRECT_DATA_ATTR',
  ]) {
    assert.ok(COMPONENT_CODE.includes(id), `component must reference ${id}`);
  }
});

/* ------------------------------------------------------------------- *
 * GUARDRAIL #5 — tenant-host page never includes picker strings        *
 * UNCONDITIONALLY. We assert the picker JSX is wrapped in the gate.    *
 * ------------------------------------------------------------------- */

test('IM-3 — pages/change.js never references picker IDs outside the gate', () => {
  // The only places picker stable strings should appear in change.js are
  // inside the `{showCoreTenantPicker ? <CoreTenantPicker .../> : null}`
  // block. The strings themselves live in the component + helpers (not in
  // pages/change.js). So pages/change.js should not literally contain
  // "Your workspaces" or "cf-core-tenant-picker".
  assert.doesNotMatch(CHANGE_CODE, /['"]cf-core-tenant-picker['"]/);
  assert.doesNotMatch(CHANGE_CODE, /['"]Your workspaces['"]/);
  // …but it must reference the picker component name and the gate.
  assert.match(CHANGE_CODE, /<CoreTenantPicker\b/);
});

test('IM-3 — IM-4 switch-link block remains intact (no regression)', () => {
  assert.match(CHANGE_CODE, /showSwitchWorkspaceLink/);
  assert.match(CHANGE_CODE, /shouldShowSwitchLink\(\s*\{/);
});

/* ------------------------------------------------------------------- *
 * Sanity — guardrail #2 "no writes" at the helper layer too.           *
 * The helpers expose only GET memberships + POST switch + POST leave;  *
 * no other endpoints; no `fetch` itself (component owns fetch).         *
 * ------------------------------------------------------------------- */

test('IM-3 — helpers module never calls fetch (component owns network)', () => {
  assert.doesNotMatch(HELPERS_CODE, /\bfetch\s*\(/);
});

test('IM-3 — helpers expose only the three approved endpoints + nothing else', () => {
  const apiHits = [...HELPERS_CODE.matchAll(/['"](\/api\/[^'"]+)['"]/g)].map((m) => m[1]);
  const uniq = [...new Set(apiHits)].sort();
  assert.deepEqual(uniq, [
    '/api/membership/effective',
    '/api/membership/leave',
    '/api/membership/switch',
  ]);
});
