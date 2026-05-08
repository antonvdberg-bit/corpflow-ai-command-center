import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANGE_LAYOUT_EXPECTED_COMMIT_PREFIX,
  CHANGE_LAYOUT_INSTRUMENTATION_ID,
  CHANGE_LAYOUT_MARK_VERSION,
  buildElementPath,
} from '../lib/cmp/_lib/change-layout-debug.js';

test('layout mark constants are stable strings', () => {
  assert.equal(CHANGE_LAYOUT_MARK_VERSION, 'pr153');
  assert.match(CHANGE_LAYOUT_EXPECTED_COMMIT_PREFIX, /^[a-f0-9]{8}$/);
  assert.ok(CHANGE_LAYOUT_INSTRUMENTATION_ID.length > 0);
});

test('buildElementPath builds a chain without throwing', () => {
  const root = {
    tagName: 'DIV',
    id: '',
    parentElement: null,
    nodeType: 1,
  };
  const child = {
    tagName: 'SPAN',
    id: 'x',
    parentElement: root,
    nodeType: 1,
  };
  const p = buildElementPath(/** @type {any} */ (child), /** @type {any} */ (root));
  assert.ok(p.includes('span'));
  assert.ok(p.includes('#x'));
});
