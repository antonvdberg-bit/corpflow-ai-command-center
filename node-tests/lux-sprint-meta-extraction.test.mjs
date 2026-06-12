/**
 * Pure-extraction tests for `extractLuxSprintMetaForApi` (lib/cmp/router.js). The
 * function is the bridge between `console_json` (admin-only) and the tenant-safe
 * `ticket.lux_sprint_meta` block surfaced on `ticket-get`. The /change desk uses
 * the block to identify sprint children and render the Add content panel.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractLuxSprintMetaForApi } from '../lib/cmp/_lib/lux-sprint-meta-extract.js';

test('returns undefined when console_json has no sprint linkage', () => {
  assert.equal(extractLuxSprintMetaForApi(null), undefined);
  assert.equal(extractLuxSprintMetaForApi(undefined), undefined);
  assert.equal(extractLuxSprintMetaForApi({}), undefined);
  assert.equal(
    extractLuxSprintMetaForApi({ lux_request_meta: { description_preview: 'plain text' } }),
    undefined,
  );
});

test('C1 sprint child surfaces parent_sprint_ticket + parent_programme_ticket + sprint_code', () => {
  const cj = {
    parent_sprint_ticket: 'cmqa2y2ga0000l704glnfro1f',
    parent_programme_ticket: 'cmo8mjijk0000jl04l1jz0v6d',
    lux_request_meta: { sprint_code: 'C1', description_preview: 'Homepage imagery package…' },
  };
  const out = extractLuxSprintMetaForApi(cj);
  assert.deepEqual(out, {
    parent_sprint_ticket: 'cmqa2y2ga0000l704glnfro1f',
    parent_programme_ticket: 'cmo8mjijk0000jl04l1jz0v6d',
    sprint_code: 'C1',
  });
});

test('C4 sprint child works the same shape', () => {
  const out = extractLuxSprintMetaForApi({
    parent_sprint_ticket: 'cmqa2y2ga0000l704glnfro1f',
    lux_request_meta: { sprint_code: 'C4' },
  });
  assert.equal(out?.sprint_code, 'C4');
  assert.equal(out?.parent_sprint_ticket, 'cmqa2y2ga0000l704glnfro1f');
});

test('lowercase sprint_code is upper-cased', () => {
  const out = extractLuxSprintMetaForApi({
    parent_sprint_ticket: 'cmqa2y2ga0000l704glnfro1f',
    lux_request_meta: { sprint_code: 'c2' },
  });
  assert.equal(out?.sprint_code, 'C2');
});

test('invalid sprint_code is dropped but parent_sprint_ticket still surfaced', () => {
  const out = extractLuxSprintMetaForApi({
    parent_sprint_ticket: 'cmqa2y2ga0000l704glnfro1f',
    lux_request_meta: { sprint_code: 'X42' },
  });
  assert.equal(out?.parent_sprint_ticket, 'cmqa2y2ga0000l704glnfro1f');
  assert.equal(out?.sprint_code, undefined);
});

test('only sprint_code (no parent linkage) is enough to surface the block', () => {
  // Backstop in case the parent linkage ever gets dropped: the operator desk still
  // needs the sprint_code to render the right panel.
  const out = extractLuxSprintMetaForApi({ lux_request_meta: { sprint_code: 'C3' } });
  assert.deepEqual(out, { sprint_code: 'C3' });
});

test('garbage payload types are tolerated', () => {
  assert.equal(extractLuxSprintMetaForApi('string'), undefined);
  assert.equal(extractLuxSprintMetaForApi(42), undefined);
  assert.equal(extractLuxSprintMetaForApi([]), undefined);
});
