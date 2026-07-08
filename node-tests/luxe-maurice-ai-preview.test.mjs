/**
 * LuxeMaurice AI v1 preview — data layer + route surface audits.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LUXE_MAURICE_AI_PREVIEW_MODE,
  createEnquiry,
  getLeadScore,
  getPropertyById,
  listLeads,
  listProperties,
  luxeMauriceAiCopyAuditGuard,
} from '../lib/client/luxe-maurice-ai-data.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

const PREVIEW_ROUTES = [
  'pages/client/luxe-maurice-ai/index.js',
  'pages/client/luxe-maurice-ai/properties/index.js',
  'pages/client/luxe-maurice-ai/properties/[id].js',
  'pages/client/luxe-maurice-ai/buyer.js',
  'pages/client/luxe-maurice-ai/crm.js',
];

const CLIENT_FACING_SURFACES = [
  ...PREVIEW_ROUTES,
  'components/LuxeMauriceAiPreviewShell.js',
];

const FORBIDDEN_COPY_PATTERNS = [
  /\bGitHub\b/,
  /\bCursor\b/,
  /\bSupabase\b/,
  /\bservice_role\b/i,
  /\bCorpFlowAI\b/,
  /\baudit\b/i,
  /recovery roadmap/i,
];

test('luxe maurice ai preview: seed adapter mode is declared', () => {
  assert.equal(LUXE_MAURICE_AI_PREVIEW_MODE, 'seed');
});

test('luxe maurice ai preview: listProperties returns published catalogue rows', () => {
  const rows = listProperties();
  assert.ok(rows.length >= 1, 'expected at least one published property');
  const coastal = rows.find((r) => r.slug === 'sample-coastal-residence');
  assert.ok(coastal, 'seed property sample-coastal-residence must be listed');
  assert.equal(coastal.status, 'published');
  assert.ok(coastal.region_label);
  assert.ok(coastal.price_label);
  assert.ok(coastal.bedrooms != null);
});

test('luxe maurice ai preview: getPropertyById resolves slug and uuid', () => {
  const bySlug = getPropertyById('sample-coastal-residence');
  assert.ok(bySlug?.property?.title);
  assert.ok(Array.isArray(bySlug.gallery));

  const byId = getPropertyById('44444444-4444-4444-8444-444444444444');
  assert.equal(bySlug.property.id, byId.property.id);
});

test('luxe maurice ai preview: createEnquiry and listLeads workflow', () => {
  const before = listLeads().length;
  const result = createEnquiry({
    full_name: 'Preview Test Buyer',
    email: 'preview.test@example.invalid',
    budget_min: 2000000,
    budget_max: 4000000,
    desired_location: 'North',
    property_type: 'Completed residence',
    buying_intent: '6-12 months',
    notes: 'Preview test enquiry',
    property_id: '44444444-4444-4444-8444-444444444444',
  });
  assert.equal(result.ok, true);
  assert.ok(result.lead_id);
  const after = listLeads();
  assert.ok(after.length >= before);
  const score = getLeadScore(result.lead_id);
  assert.ok(score?.score?.score != null);
});

test('luxe maurice ai preview: all route files exist', () => {
  for (const rel of PREVIEW_ROUTES) {
    assert.ok(fs.existsSync(path.join(repoRoot, rel)), `missing route ${rel}`);
  }
});

test('luxe maurice ai preview: landing route renders catalogue hooks', () => {
  const src = readRepo('pages/client/luxe-maurice-ai/index.js');
  assert.match(src, /listProperties/);
  assert.match(src, /Featured opportunities/i);
  assert.match(src, /v1 preview/i);
  assert.match(src, /getStaticProps/);
});

test('luxe maurice ai preview: properties route renders property cards', () => {
  const src = readRepo('pages/client/luxe-maurice-ai/properties/index.js');
  assert.match(src, /listProperties/);
  assert.match(src, /Property catalogue/i);
  assert.match(src, /price_label/);
  assert.match(src, /getStaticProps/);
});

test('luxe maurice ai preview: property detail route resolves static paths', () => {
  const src = readRepo('pages/client/luxe-maurice-ai/properties/[id].js');
  assert.match(src, /getPropertyById/);
  assert.match(src, /getStaticPaths/);
  assert.match(src, /getStaticProps/);
  assert.match(src, /sample-coastal-residence|listProperties/);
});

test('luxe maurice ai preview: buyer route renders enquiry form fields', () => {
  const src = readRepo('pages/client/luxe-maurice-ai/buyer.js');
  assert.match(src, /createEnquiry/);
  assert.match(src, /full_name/);
  assert.match(src, /budget_min/);
  assert.match(src, /desired_location/);
  assert.match(src, /property_type/);
  assert.match(src, /buying_intent/);
  assert.match(src, /Submit enquiry/i);
});

test('luxe maurice ai preview: CRM route renders lead list', () => {
  const src = readRepo('pages/client/luxe-maurice-ai/crm.js');
  assert.match(src, /listLeads/);
  assert.match(src, /Lead list/i);
  assert.match(src, /score/i);
  assert.match(src, /getStaticProps/);
});

test('luxe maurice ai preview: client-facing copy avoids internal implementation language', () => {
  const combined = CLIENT_FACING_SURFACES.map(readRepo).join('\n');
  const audit = luxeMauriceAiCopyAuditGuard(combined);
  for (const pattern of FORBIDDEN_COPY_PATTERNS) {
    assert.ok(
      !pattern.test(combined),
      `forbidden pattern ${pattern} found in preview surfaces`,
    );
  }
  assert.equal(audit.ok, true, `copy audit hits: ${audit.hits.join(', ')}`);
});
