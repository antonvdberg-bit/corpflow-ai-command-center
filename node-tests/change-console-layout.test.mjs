import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANGE_LAYOUT_FIXTURE_LONG_LINE,
  changeFlexMainChildStyle,
  changePageShellStyle,
  changePanelStyle,
  changePreBlockStyle,
  changeTextContainStyle,
} from '../lib/cmp/_lib/change-console-layout.js';

test('changePageShellStyle clamps viewport width and hides horizontal spill', () => {
  const s = changePageShellStyle({ padding: 24 });
  assert.equal(s.width, '100%');
  assert.equal(s.maxWidth, '100vw');
  assert.equal(s.overflowX, 'hidden');
  assert.equal(s.boxSizing, 'border-box');
  assert.equal(s.padding, 24);
});

test('changePanelStyle constrains cards to parent track', () => {
  const s = changePanelStyle({ borderRadius: 8 });
  assert.equal(s.minWidth, 0);
  assert.equal(s.maxWidth, '100%');
  assert.equal(s.overflowX, 'hidden');
  assert.equal(s.borderRadius, 8);
});

test('changePreBlockStyle enables wrap + local scroll', () => {
  const s = changePreBlockStyle({ fontSize: 12 });
  assert.equal(s.whiteSpace, 'pre-wrap');
  assert.equal(s.overflowX, 'auto');
  assert.equal(s.overflowWrap, 'anywhere');
  assert.equal(s.fontSize, 12);
});

test('CHANGE_LAYOUT_FIXTURE_LONG_LINE is aggressively long', () => {
  assert.ok(CHANGE_LAYOUT_FIXTURE_LONG_LINE.length > 500);
  assert.ok(CHANGE_LAYOUT_FIXTURE_LONG_LINE.includes('https://example.com/'));
});

test('changeFlexMainChildStyle shrinks flex child', () => {
  const s = changeFlexMainChildStyle();
  assert.equal(s.minWidth, 0);
  assert.ok(String(s.flex || '').includes('1'));
});

test('changeTextContainStyle merges extras', () => {
  const s = changeTextContainStyle({ color: 'red' });
  assert.equal(s.color, 'red');
  assert.equal(s.overflowWrap, 'anywhere');
});
