/**
 * Static regression tests pinning the LIVE SAVE DIAGNOSTICS contract on
 * `components/AiLeadRescueAdminDetail.js`.
 *
 * The 2026-06-06 P0 (after PR #319 merged) was still:
 *   "Clicking Save produces no visible reaction. No 'Saving…' label, no
 *    error, no 'Saved.' pill, no persistence after refresh."
 *
 * Production verifiably served PR #319 (deployment 3WqXyiL44s8gS4TA3FtU95j3VjfX,
 * commit f15cceba), so the failure is in the runtime, not the deploy. To
 * pinpoint whether (a) the click handler is firing, (b) save() is exiting
 * early, (c) the bundle in the operator's browser is the expected one, or
 * (d) React is failing to hydrate the page at all, the detail page now
 * renders a visible diagnostic panel and exposes a Test click button.
 *
 * The contract we pin here:
 *
 *  1. The bundle version marker `save-wiring-v2` is rendered literally on
 *     the page so the operator can read which build is being served.
 *  2. A `data-testid="ai-lead-rescue-diag"` panel exists.
 *  3. The diagnostic panel includes labels for: Detail bundle, Lead id,
 *     Save handler mounted, Last save click, Save phase, Last patch
 *     response status, Last Test click.
 *  4. A `data-testid="ai-lead-rescue-test-click"` button exists, is
 *     `type="button"`, and its onClick updates `testClickAt` without
 *     touching the API.
 *  5. `save()` writes `phase: 'clicked'` and `lastClickAt` BEFORE the
 *     `preventDefault()` / `if (saving) return` / `if (!leadId)` guards,
 *     so the diagnostic panel cannot remain `idle` after a click.
 *  6. `save()` writes `phase: 'saving'` after entering the try-block and
 *     writes `phase: 'saved'` / `phase: 'error'` before returning.
 *  7. A mount-tracking `useEffect` sets `handlerMounted: true` once the
 *     component is alive in the browser.
 *  8. A `logDiag` helper exists and is invoked for: component mounted,
 *     save clicked, save payload prepared, save response.
 *  9. A `data-testid="ai-lead-rescue-raw-patch"` <details> exposes a copy/
 *     paste fetch snippet that PATCHes only the harmless `next_action`
 *     field. The snippet must NOT include cookies, passwords, payment
 *     details, or message content beyond a timestamped string.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const COMPONENT_PATH = path.join(REPO_ROOT, 'components', 'AiLeadRescueAdminDetail.js');

function readComponentSource() {
  return fs.readFileSync(COMPONENT_PATH, 'utf8');
}

describe('AiLeadRescueAdminDetail — live save diagnostics contract', () => {
  it('declares a DETAIL_BUNDLE_VERSION constant whose value is bumped when the panel schema changes', () => {
    const src = readComponentSource();
    // The constant must exist and currently match the PR #322 schema
    // (which added Commit / Deployment / Env lines). Bump this value when
    // you change the panel labels so the operator can visually verify
    // which build of the panel is being served.
    assert.match(
      src,
      /const\s+DETAIL_BUNDLE_VERSION\s*=\s*['"]v3-with-deploy-info['"]/,
      'DETAIL_BUNDLE_VERSION must equal `v3-with-deploy-info` for the PR #322 panel schema.',
    );
  });

  it('renders Commit / Deployment / Env lines sourced from buildInfo prop', () => {
    const src = readComponentSource();
    assert.match(src, /Commit:\s*\$\{buildInfo\.commitShaShort\}/);
    assert.match(src, /Deployment:\s*\$\{buildInfo\.deploymentId\s*\|\|\s*['"]\(local\)['"]\}/);
    assert.match(src, /Env:\s*\$\{buildInfo\.vercelEnv\}/);
  });

  it('exposes a logDiag helper that gates on console.info', () => {
    const src = readComponentSource();
    assert.match(
      src,
      /function\s+logDiag\s*\(/,
      'logDiag(event, payload) must exist as a module-level helper.',
    );
    assert.match(
      src,
      /typeof\s+console\s*===\s*['"]undefined['"]|typeof\s+console\.info\s*!==\s*['"]function['"]/,
      'logDiag must gate on console.info availability so SSR / tests do not crash.',
    );
  });

  it('renders a visible diagnostic panel with all required labels', () => {
    const src = readComponentSource();
    assert.match(
      src,
      /data-testid="ai-lead-rescue-diag"/,
      'Diagnostic panel must carry data-testid="ai-lead-rescue-diag".',
    );
    assert.match(src, /Detail bundle:\s*\$\{DETAIL_BUNDLE_VERSION\}/);
    assert.match(src, /Lead id:\s*\$\{leadId\s*\|\|\s*['"]\(none\)['"]\}/);
    assert.match(
      src,
      /Save handler mounted:\s*\$\{saveDiagnostics\.handlerMounted\s*\?\s*['"]YES['"]\s*:\s*['"]NO['"]\}/,
    );
    assert.match(
      src,
      /Last save click:\s*\$\{saveDiagnostics\.lastClickAt\s*\|\|\s*['"]\(none\)['"]\}/,
    );
    assert.match(src, /Save phase:\s*\$\{saveDiagnostics\.phase\}/);
    assert.match(
      src,
      /Last patch response status:\s*\$\{saveDiagnostics\.lastResponseStatus\s*\|\|\s*['"]\(none\)['"]\}/,
    );
    assert.match(
      src,
      /Last Test click:\s*\$\{saveDiagnostics\.testClickAt\s*\|\|\s*['"]\(none\)['"]\}/,
    );
  });

  it('renders a Test click button that is type=button and updates only local state', () => {
    const src = readComponentSource();
    const start = src.indexOf('data-testid="ai-lead-rescue-test-click"');
    assert.notEqual(start, -1, 'Test click button must exist with data-testid="ai-lead-rescue-test-click".');
    // Take a window around the Test click button to assert its wiring.
    const windowSlice = src.slice(Math.max(0, start - 200), start + 400);
    assert.match(
      windowSlice,
      /type="button"/,
      'Test click button must be type="button" so it never submits the form.',
    );
    assert.match(
      windowSlice,
      /onClick=\{\s*\(\)\s*=>\s*\{/,
      'Test click button must have an inline onClick handler.',
    );
    assert.match(
      windowSlice,
      /setSaveDiagnostics\(\(d\)\s*=>\s*\(\{\s*\.\.\.d,\s*testClickAt:\s*nowIso\s*\}\)\)/,
      'Test click handler must update testClickAt only.',
    );
    // Negative: the Test click block must not include a fetch / API call.
    assert.doesNotMatch(
      windowSlice,
      /fetch\(/,
      'Test click button must not call the API.',
    );
  });

  it('writes phase=clicked and lastClickAt BEFORE preventDefault / re-entry / id guards in save()', () => {
    const src = readComponentSource();
    const saveStart = src.indexOf('async function save(');
    assert.notEqual(saveStart, -1, 'save() function must exist.');
    const saveEnd = src.indexOf('\n  }', saveStart);
    assert.ok(saveEnd > saveStart, 'save() function must close.');
    const saveBody = src.slice(saveStart, saveEnd);

    const clickIsoIdx = saveBody.indexOf("phase: 'clicked'");
    const preventIdx = saveBody.indexOf('preventDefault');
    const reentryIdx = saveBody.indexOf('if (saving) return');
    const noLeadIdx = saveBody.indexOf('if (!leadId)');

    assert.ok(clickIsoIdx !== -1, 'save() must set phase=clicked.');
    assert.ok(preventIdx !== -1, 'save() must call preventDefault.');
    assert.ok(reentryIdx !== -1, 'save() must guard against re-entry.');
    assert.ok(noLeadIdx !== -1, 'save() must guard against missing leadId.');

    assert.ok(
      clickIsoIdx < preventIdx,
      'phase=clicked must be written BEFORE preventDefault so the diagnostic panel reflects every click.',
    );
    assert.ok(
      clickIsoIdx < reentryIdx,
      'phase=clicked must be written BEFORE the re-entry guard so a double-click still updates the panel.',
    );
    assert.ok(
      clickIsoIdx < noLeadIdx,
      'phase=clicked must be written BEFORE the leadId guard so the panel reflects clicks even when leadId is missing.',
    );
  });

  it("transitions save phase to 'saving', 'saved', and 'error'", () => {
    const src = readComponentSource();
    assert.match(src, /phase:\s*['"]saving['"]/, "save() must set phase='saving' once the fetch starts.");
    assert.match(src, /phase:\s*['"]saved['"]/, "save() must set phase='saved' on success.");
    assert.match(src, /phase:\s*['"]error['"]/, "save() must set phase='error' on any failure path.");
  });

  it('flips handlerMounted to true in a mount useEffect and logs the mount', () => {
    const src = readComponentSource();
    assert.match(
      src,
      /setSaveDiagnostics\(\(d\)\s*=>\s*\(\{\s*\.\.\.d,\s*handlerMounted:\s*true\s*\}\)\)/,
      'A useEffect must flip handlerMounted to true once the component mounts.',
    );
    assert.match(
      src,
      /logDiag\(['"]component mounted['"]/,
      "Mount useEffect must log 'component mounted'.",
    );
  });

  it('emits structured logDiag events for save click, payload, and response', () => {
    const src = readComponentSource();
    assert.match(src, /logDiag\(['"]save clicked['"]/);
    assert.match(src, /logDiag\(['"]save payload prepared['"]/);
    assert.match(src, /logDiag\(['"]save response['"]/);
  });

  it('does not log sensitive payload content via logDiag', () => {
    const src = readComponentSource();
    // The payload-prepared log call must include boolean flags / keys only,
    // not raw field values like notes, payment_notes, invoice_reference.
    const payloadLogIdx = src.indexOf("logDiag('save payload prepared'");
    assert.notEqual(payloadLogIdx, -1);
    const payloadLogBlock = src.slice(payloadLogIdx, payloadLogIdx + 400);
    for (const forbidden of [
      'body.notes',
      'body.payment_notes',
      'body.invoice_reference',
      'body.owner',
      'body.last_contacted',
    ]) {
      assert.ok(
        !payloadLogBlock.includes(forbidden),
        `logDiag('save payload prepared') must not log ${forbidden} — diagnostics must never carry sensitive content.`,
      );
    }
  });

  it('exposes a raw-patch <details> snippet that PATCHes only next_action', () => {
    const src = readComponentSource();
    assert.match(
      src,
      /data-testid="ai-lead-rescue-raw-patch"/,
      'Raw patch <details> must carry data-testid="ai-lead-rescue-raw-patch".',
    );
    const start = src.indexOf('data-testid="ai-lead-rescue-raw-patch"');
    const end = src.indexOf('</details>', start);
    assert.ok(end > start, 'Raw patch details block must close.');
    const block = src.slice(start, end);
    assert.match(
      block,
      /\/api\/factory\/lead-rescue\/patch/,
      'Raw patch snippet must hit /api/factory/lead-rescue/patch.',
    );
    assert.match(block, /next_action:/, 'Raw patch snippet must only patch next_action.');
    // Negative: no cookies, passwords, payment fields, or notes in the snippet.
    for (const forbidden of [
      'document.cookie',
      'password',
      'invoice_reference',
      'payment_notes',
      'setup_price',
      'monthly_monitoring_price',
      'notes:',
    ]) {
      assert.ok(
        !block.includes(forbidden),
        `Raw patch snippet must not reference ${forbidden}.`,
      );
    }
  });
});
