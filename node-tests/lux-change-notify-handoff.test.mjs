/**
 * Lux Change Console — notify prefs + AI handoff context.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  LUX_CHANGE_NOTIFY_PREFS_KEY,
  LUX_TICKET_NOTIFY_EMAIL_DEFAULT,
  normalizeLuxChangeNotifyPrefs,
  validateLuxChangeNotifyPrefsInput,
} from '../lib/cmp/_lib/lux-change-notify-prefs.js';
import { loadLuxAiHandoffContextForGroq } from '../lib/server/lux-ai-handoff-context.js';

test('normalizeLuxChangeNotifyPrefs — defaults enabled', () => {
  const p = normalizeLuxChangeNotifyPrefs({});
  assert.equal(p.enabled, true);
  assert.equal(p.email, '');
});

test('normalizeLuxChangeNotifyPrefs — explicit off', () => {
  const p = normalizeLuxChangeNotifyPrefs({ enabled: false, email: ' Ops@Luxemaurice.Com ' });
  assert.equal(p.enabled, false);
  assert.equal(p.email, 'ops@luxemaurice.com');
});

test('validateLuxChangeNotifyPrefsInput — rejects bad email', () => {
  const r = validateLuxChangeNotifyPrefsInput({ enabled: true, email: 'not-an-email' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'INVALID_NOTIFY_EMAIL');
});

test('validateLuxChangeNotifyPrefsInput — accepts empty email', () => {
  const r = validateLuxChangeNotifyPrefsInput({ enabled: true, email: '' });
  assert.equal(r.ok, true);
  assert.equal(r.prefs.email, '');
});

test('LUX_CHANGE_NOTIFY_PREFS_KEY is stable', () => {
  assert.equal(LUX_CHANGE_NOTIFY_PREFS_KEY, 'lux_change_notify');
  assert.equal(LUX_TICKET_NOTIFY_EMAIL_DEFAULT, 'jan@luxemaurice.com');
});

test('loadLuxAiHandoffContextForGroq — empty when only README present', () => {
  const r = loadLuxAiHandoffContextForGroq();
  assert.equal(r.loaded, false);
  assert.equal(r.file_count, 0);
});

test('loadLuxAiHandoffContextForGroq — loads synced text files', () => {
  const root = path.join(process.cwd(), 'artifacts', 'luxe-maurice-ai-handoff');
  const fixture = path.join(root, '_test-handoff-fixture.md');
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(fixture, '# Fixture\nLux programme positioning reference.\n', 'utf8');
  try {
    const r = loadLuxAiHandoffContextForGroq();
    assert.equal(r.loaded, true);
    assert.ok(r.char_count > 0);
    assert.match(r.block, /luxemaurice-ai-handoff/);
  } finally {
    fs.unlinkSync(fixture);
  }
});
