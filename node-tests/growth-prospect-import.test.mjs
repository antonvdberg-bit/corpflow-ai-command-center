import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  fieldLossReport,
  extractRoutes,
  mapProgress,
  mapWorksheetRows,
  touchpointBodyForRow,
} from '../scripts/import-growth-prospects.mjs';

const fixture = JSON.parse(
  fs.readFileSync(new URL('../fixtures/growth-prospects/mauritius-lead-rescue-synthetic.json', import.meta.url)),
);

test('maps the complete synthetic Mauritius workbook contract without field loss', () => {
  const rows = mapWorksheetRows([fixture.headers, ...fixture.rows]);
  assert.equal(rows.length, 8);
  assert.deepEqual(
    rows.map((row) => row.lifecycleState),
    [
      'AWAITING_RESPONSE',
      'ENGAGED',
      'NOT_FIT',
      'CONTACT_ROUTE_FAILED',
      'CONTACT_ROUTE_FAILED',
      'RESEARCHED',
      'DIAGNOSIS_PENDING',
      'QUALIFIED',
    ],
  );
  assert.equal(rows[0].routes.whatsappNumber, '+23050000001');
  assert.equal(rows[4].routes.email, 'dario@example.com');
  assert.equal(rows[5].decisionMaker.confirmed, false);
  assert.equal(rows[6].fitHypothesis, 'Strong stated enquiry leak needs diagnosis.');
  assert.ok(fieldLossReport(rows).every((field) => field.durable_destination));
});

test('preserves original Progress text in the imported touchpoint body', () => {
  const rows = mapWorksheetRows([fixture.headers, ...fixture.rows]);
  const body = touchpointBodyForRow(rows[0]);
  assert.match(body, /Progress:/);
  assert.ok(body.includes(rows[0].progress));
  assert.match(body, /Fit hypothesis:/);
  const progressField = fieldLossReport(rows).find((field) => field.field === 'Progress');
  assert.equal(progressField.destination, 'GrowthTouchpoint.bodyMd');
});

test('preserves route text while extracting structured routes', () => {
  const route = extractRoutes('WhatsApp +230 5123 4567; email test@example.com');
  assert.equal(route.original, 'WhatsApp +230 5123 4567; email test@example.com');
  assert.equal(route.phone, '+23051234567');
  assert.equal(route.whatsappNumber, '+23051234567');
  assert.equal(route.email, 'test@example.com');
  assert.deepEqual(route.channels, ['whatsapp', 'email', 'phone']);
});

test('keeps route failure separate from not-fit', () => {
  assert.equal(mapProgress('WhatsApp failed').lifecycleState, 'CONTACT_ROUTE_FAILED');
  assert.equal(mapProgress('Not fit').lifecycleState, 'NOT_FIT');
  assert.notEqual(mapProgress('WhatsApp failed').touchpointResult, 'not_fit');
});

test('rejects a workbook that does not match the eight-column contract', () => {
  assert.throws(() => mapWorksheetRows([['Prospect']]), /Missing required headers/);
});
