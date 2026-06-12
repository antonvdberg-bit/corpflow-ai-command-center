import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LUX_CONTENT_SPRINT_GENERIC_GUIDANCE,
  getLuxContentSprintGuidance,
  isLuxContentSprintTicket,
  normalizeLuxContentSprintCode,
} from '../lib/client/lux-content-sprint-guidance.js';

test('normalizeLuxContentSprintCode accepts canonical codes', () => {
  for (const c of ['C1', 'C2', 'C3', 'C4']) {
    assert.equal(normalizeLuxContentSprintCode(c), c);
    assert.equal(normalizeLuxContentSprintCode(c.toLowerCase()), c);
    assert.equal(normalizeLuxContentSprintCode(`  ${c}  `), c);
  }
});

test('normalizeLuxContentSprintCode rejects garbage', () => {
  for (const c of ['', null, undefined, 'C0', 'C5', 'CC', 'D1', 42, 'phase4c']) {
    assert.equal(normalizeLuxContentSprintCode(c), null);
  }
});

test('getLuxContentSprintGuidance returns shape for C1–C4', () => {
  for (const c of ['C1', 'C2', 'C3', 'C4']) {
    const g = getLuxContentSprintGuidance(c);
    assert.ok(g, `${c} guidance must exist`);
    assert.equal(g.code, c);
    assert.equal(typeof g.panelTitle, 'string');
    assert.ok(g.panelTitle.startsWith('Add content'), 'panel title leads with Add content');
    assert.ok(g.panelTitle.includes(c), 'panel title includes the C code');
    assert.equal(typeof g.shortLine, 'string');
    assert.ok(g.shortLine.length > 10);
    assert.ok(Array.isArray(g.uploadSteps));
    assert.equal(g.uploadSteps.length, 5);
    assert.ok(g.uploadSteps[0].startsWith('Upload'));
    assert.ok(Array.isArray(g.taskGuidance));
    assert.ok(g.taskGuidance.length >= 4);
    assert.ok(Array.isArray(g.checklist));
    assert.ok(g.checklist.length >= 3);
    for (const item of g.checklist) {
      assert.equal(typeof item.id, 'string');
      assert.ok(item.id.startsWith(`${c.toLowerCase()}-`));
      assert.equal(typeof item.label, 'string');
      assert.ok(item.label.length > 3);
    }
    assert.equal(g.primaryCtaLabel, 'Upload content');
    assert.equal(typeof g.secondaryGuidance, 'string');
    assert.ok(g.secondaryGuidance.length > 10);
  }
});

test('C2 guidance references /properties/admin and minimum 5 images', () => {
  const g = getLuxContentSprintGuidance('C2');
  assert.ok(g);
  assert.ok(g.taskGuidance.some((s) => s.includes('/properties/admin')));
  assert.ok(g.taskGuidance.some((s) => /minimum of five/i.test(s)));
});

test('C4 guidance references all four public surfaces', () => {
  const g = getLuxContentSprintGuidance('C4');
  assert.ok(g);
  const joined = g.taskGuidance.join('\n');
  assert.ok(joined.includes('lux.corpflowai.com/'));
  assert.ok(joined.includes('lux.corpflowai.com/properties'));
  assert.ok(joined.includes('lux.corpflowai.com/property/'));
  assert.ok(joined.includes('lux.corpflowai.com/concierge'));
});

test('getLuxContentSprintGuidance returns null for unknown codes', () => {
  assert.equal(getLuxContentSprintGuidance(null), null);
  assert.equal(getLuxContentSprintGuidance('C9'), null);
  assert.equal(getLuxContentSprintGuidance(''), null);
});

test('isLuxContentSprintTicket recognises ticket.lux_sprint_meta', () => {
  assert.equal(isLuxContentSprintTicket({ sprint_code: 'C1' }), true);
  assert.equal(isLuxContentSprintTicket({ sprint_code: 'c4' }), true);
  assert.equal(isLuxContentSprintTicket({ sprint_code: 'C9' }), false);
  assert.equal(isLuxContentSprintTicket({}), false);
  assert.equal(isLuxContentSprintTicket(null), false);
  assert.equal(isLuxContentSprintTicket(undefined), false);
});

test('LUX_CONTENT_SPRINT_GENERIC_GUIDANCE is frozen with the right shape', () => {
  assert.ok(Object.isFrozen(LUX_CONTENT_SPRINT_GENERIC_GUIDANCE));
  assert.equal(LUX_CONTENT_SPRINT_GENERIC_GUIDANCE.panelTitle, 'Add content');
  assert.equal(LUX_CONTENT_SPRINT_GENERIC_GUIDANCE.primaryCtaLabel, 'Upload content');
});
