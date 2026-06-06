/**
 * Regression test for the deterministic login-mode lock added in
 * `fix(auth): lock login mode for admin redirects`.
 *
 * The /login page must lock to factory-admin mode synchronously when
 * `?next=/admin/...` is present and the host is a factory surface
 * (apex / core / *.vercel.app / localhost). Without this lock the
 * page rendered the apex client login (gold accent) and then
 * `tenant-chrome.js` raced in to re-skin Tailwind sky-500 with the
 * tenant accent, producing the orange/blue oscillation operators
 * reported on 2026-06-06.  A stale tenant session could also bounce
 * the page through `maybeRedirectIfSession()` into a navigation loop.
 *
 * This test extracts the synchronous helper from `public/login.html`
 * and exercises every host / next combination so the lock cannot
 * silently regress.  It also asserts that `tenant-chrome.js`
 * respects the `cfForcedLoginMode` marker.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const LOGIN_HTML = fs.readFileSync(path.join(repoRoot, 'public', 'login.html'), 'utf8');
const TENANT_CHROME_JS = fs.readFileSync(
  path.join(repoRoot, 'public', 'assets', 'corpflow', 'tenant-chrome.js'),
  'utf8',
);

/**
 * Pull the synchronous `shouldForceFactoryAdminMode` helper out of
 * the inline login.html script and instantiate it as a real JS
 * function via `new Function(...)`.  This keeps the test in lockstep
 * with the runtime code without needing a DOM/JSDOM.
 *
 * @returns {(search: string, hostname: string) => boolean}
 */
function loadForceModeFn() {
  const m = LOGIN_HTML.match(
    /function shouldForceFactoryAdminMode\(search, hostname\) \{[\s\S]*?\n\s{8}\}/,
  );
  assert.ok(m, 'shouldForceFactoryAdminMode helper must exist in public/login.html');
  // eslint-disable-next-line no-new-func
  const fn = new Function('search', 'hostname', `${m[0]}\nreturn shouldForceFactoryAdminMode(search, hostname);`);
  return /** @type {(s: string, h: string) => boolean} */ (fn);
}

test('shouldForceFactoryAdminMode locks the apex login when next=/admin/...', () => {
  const force = loadForceModeFn();
  assert.equal(force('?next=%2Fadmin%2Flead-rescue', 'corpflowai.com'), true);
  assert.equal(force('?next=/admin/lead-rescue', 'corpflowai.com'), true);
  assert.equal(force('?next=/admin', 'corpflowai.com'), true);
  assert.equal(force('?next=/admin/anything-else', 'corpflowai.com'), true);
});

test('shouldForceFactoryAdminMode also locks core.* and Vercel preview hosts', () => {
  const force = loadForceModeFn();
  assert.equal(force('?next=/admin/lead-rescue', 'core.corpflowai.com'), true);
  assert.equal(
    force('?next=/admin/lead-rescue', 'corpflow-ai-command-center-abc.vercel.app'),
    true,
  );
  assert.equal(force('?next=/admin/lead-rescue', 'localhost'), true);
  assert.equal(force('?next=/admin/lead-rescue', '127.0.0.1'), true);
});

test('shouldForceFactoryAdminMode does NOT lock tenant subdomains', () => {
  const force = loadForceModeFn();
  // Tenant subdomains keep their tenant/client/PIN login intact.
  // Operators would never legitimately land here with ?next=/admin/...
  // but if they do, we must not silently rewrite their tenant UX.
  assert.equal(force('?next=/admin/lead-rescue', 'lux.corpflowai.com'), false);
  assert.equal(force('?next=/admin/lead-rescue', 'luxe-maurice.corpflowai.com'), false);
  assert.equal(force('?next=/admin/lead-rescue', 'app.example.com'), false);
});

test('shouldForceFactoryAdminMode does NOT lock when next is not /admin/...', () => {
  const force = loadForceModeFn();
  assert.equal(force('', 'corpflowai.com'), false);
  assert.equal(force('?next=/change', 'corpflowai.com'), false);
  assert.equal(force('?next=/properties/admin', 'corpflowai.com'), false);
  assert.equal(force('?next=/admin-not-really', 'corpflowai.com'), false);
  // Open-redirect attempts are rejected here (separately from
  // safeNextPath()'s same-origin check) — they never start with /admin/.
  assert.equal(force('?next=https://evil.com/admin/x', 'corpflowai.com'), false);
  assert.equal(force('?next=//evil.com/admin/x', 'corpflowai.com'), false);
});

test('shouldForceFactoryAdminMode handles bad input without throwing', () => {
  const force = loadForceModeFn();
  // Missing hostname (e.g. file:// or odd embed) — err on the side
  // of factory-admin since /admin/ paths require an admin session.
  assert.equal(force('?next=/admin/x', ''), true);
  assert.equal(force('', ''), false);
});

test('inline script applies the forced mode synchronously before any await', () => {
  // The forced-mode block must run BEFORE the `/api/ui/context`
  // fetch so the first visible paint is correct.  Detect this by
  // verifying that the forcedFactoryAdmin assignment appears before
  // the `await fetch('/api/ui/context'` line in the inline JS.
  const forcedIdx = LOGIN_HTML.indexOf('var forcedFactoryAdmin = shouldForceFactoryAdminMode(');
  const fetchIdx = LOGIN_HTML.indexOf("await fetch('/api/ui/context'");
  assert.ok(forcedIdx > 0, 'forcedFactoryAdmin assignment must exist');
  assert.ok(fetchIdx > 0, "await fetch('/api/ui/context') must exist");
  assert.ok(
    forcedIdx < fetchIdx,
    'forced-mode decision must be made before the /api/ui/context fetch',
  );
});

test('forced mode sets both cfLoginMode=operator and cfForcedLoginMode=admin-next', () => {
  // Both markers are required: cfLoginMode drives the existing UI
  // chrome show/hide, while cfForcedLoginMode is read by
  // tenant-chrome.js to skip tenant theme application.
  assert.match(LOGIN_HTML, /dataset\.cfLoginMode\s*=\s*'operator'/);
  assert.match(LOGIN_HTML, /dataset\.cfForcedLoginMode\s*=\s*'admin-next'/);
});

test('forced mode hides loginTenantColumn and switches loginGrid to single column', () => {
  // The lock removes every visible client/tenant-leaning surface so
  // the operator sees ONLY the Factory Admin form — no ambiguity,
  // no orange tenant skin can take over.
  const block = LOGIN_HTML.match(/if \(forcedFactoryAdmin\) \{[\s\S]*?document\.title = 'Factory admin login';\s*\}/);
  assert.ok(block, 'forced-mode block must exist');
  const body = block[0];
  assert.match(body, /loginTenantColumn[\s\S]*classList\.add\('hidden'\)/);
  assert.match(body, /loginFactoryColumn[\s\S]*classList\.remove\('hidden'\)/);
  assert.match(body, /md:grid-cols-2[\s\S]*md:grid-cols-1/);
  assert.match(body, /classList\.remove\('cf-login-pending'\)/);
});

test('forced mode skips /api/ui/context and maybeRedirectIfSession() to break navigation loops', () => {
  // Skipping /api/ui/context prevents the apex client-mode result
  // from overriding our lock.  Skipping maybeRedirectIfSession()
  // prevents a stale tenant session from bouncing /admin/lead-rescue
  // <-> /login forever.
  assert.match(
    LOGIN_HTML,
    /if \(!forcedFactoryAdmin\) \{\s*try \{\s*const r = await fetch\('\/api\/ui\/context'/,
    'fetch /api/ui/context must be guarded by !forcedFactoryAdmin',
  );
  // maybeRedirectIfSession only runs inside the client branch which
  // we never enter when forced; make sure the client branch is also
  // gated by the same guard or by login_route which stays 'operator'.
  assert.match(LOGIN_HTML, /let login_route = 'operator';/);
  assert.match(
    LOGIN_HTML,
    /if \(login_route === 'client'\) \{[\s\S]*?async function maybeRedirectIfSession/,
  );
});

test('forced mode skips the initial refreshSessionBanner() probe', () => {
  // A stale tenant session would otherwise paint a green
  // "Logged in as tenant (...)" banner on the factory-admin form.
  assert.match(LOGIN_HTML, /if \(!forcedFactoryAdmin\) \{\s*refreshSessionBanner\(\);\s*\}/);
});

test('tenant-chrome.js bails out of /login when admin-next is forced', () => {
  // This is the second half of the lock: even if tenant-chrome.js
  // wins the race for /api/tenant/site, it must not apply any
  // tenant theme or hide the Factory Admin column.  Asserted by
  // searching for the explicit guard.
  assert.match(
    TENANT_CHROME_JS,
    /dataset\.cfForcedLoginMode\s*===\s*'admin-next'/,
    'tenant-chrome.js must check the admin-next marker',
  );
  // The guard must precede the existing onboarding fetch (which is
  // also a kind=login branch) so it cannot fall through to tenant
  // theme application.
  const guardIdx = TENANT_CHROME_JS.indexOf("'admin-next'");
  const skinIdx = TENANT_CHROME_JS.indexOf("classList.add('cf-tenant-skin')");
  assert.ok(guardIdx > 0 && skinIdx > 0);
  assert.ok(guardIdx < skinIdx, 'admin-next guard must run before cf-tenant-skin is applied');
});

test('PR #312 autofill semantics remain intact', () => {
  // Sanity guard against accidental regressions of the prior fix.
  // (The dedicated regression tests live in login-form-autofill.test.mjs;
  //  here we just check the high-impact attributes still exist.)
  assert.match(LOGIN_HTML, /id="adminUser"[\s\S]*name="username"[\s\S]*autocomplete="username"/);
  assert.match(LOGIN_HTML, /id="adminPass"[\s\S]*name="password"[\s\S]*autocomplete="current-password"/);
  assert.match(LOGIN_HTML, /id="simplePin"[\s\S]*name="login_pin"/);
  assert.match(LOGIN_HTML, /id="tenantPin"[\s\S]*name="login_pin"/);
  // Factory admin success redirect honours ?next= (PR #312 behaviour).
  assert.match(
    LOGIN_HTML,
    /level:\s*'admin'[\s\S]{0,800}?rawNextParam\(\)[\s\S]{0,200}?window\.location\.href\s*=\s*safeNextPath\(\)/,
  );
});
