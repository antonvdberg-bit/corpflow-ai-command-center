/**
 * LuxeMaurice AI v2 preview — private luxury access platform audits.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LUXE_MAURICE_AI_PREVIEW_MODE,
  LUXE_MAURICE_AI_PREVIEW_VERSION,
  createEnquiry,
  getLeadScore,
  getPropertyById,
  isResidenceCategory,
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
  /property-only/i,
  /\bdatabase\b/i,
  /seed adapter/i,
  /\bmock\b/i,
];

const HERO_IMAGE_PATH = 'public/luxe-maurice-ai/luxury-coastal-private-access-hero.png';

test('luxe maurice ai preview: seed adapter mode is declared', () => {
  assert.equal(LUXE_MAURICE_AI_PREVIEW_MODE, 'seed');
  assert.equal(LUXE_MAURICE_AI_PREVIEW_VERSION, 'v2');
});

test('luxe maurice ai preview: catalogue includes residence and non-property opportunities', () => {
  const rows = listProperties();
  assert.ok(rows.length >= 4, 'expected mixed catalogue');

  const residence = rows.find((r) => r.slug === 'sample-coastal-residence');
  assert.ok(residence, 'residence must be listed');
  assert.equal(residence.opportunity_category, 'residence');
  assert.ok(residence.bedrooms != null);

  const yacht = rows.find((r) => r.slug === 'private-yacht-lagoon-charter');
  assert.ok(yacht, 'yacht opportunity must be listed');
  assert.equal(yacht.opportunity_category, 'yacht_marine');
  assert.equal(yacht.bedrooms, null);

  const aviation = rows.find((r) => r.slug === 'vip-arrival-aviation-service');
  assert.ok(aviation, 'aviation opportunity must be listed');
  assert.equal(aviation.opportunity_category, 'aviation_vip');
});

test('luxe maurice ai preview: getPropertyById resolves residence and non-property detail', () => {
  const residence = getPropertyById('sample-coastal-residence');
  assert.ok(residence?.detail?.bedrooms != null);
  assert.equal(isResidenceCategory(residence.detail.opportunity_category), true);

  const yacht = getPropertyById('private-yacht-lagoon-charter');
  assert.ok(yacht?.property?.title);
  assert.equal(yacht.detail.bedrooms, null);
  assert.equal(yacht.detail.bathrooms, null);
  assert.ok(yacht.detail.access_model);
  assert.ok(yacht.detail.availability);
});

test('luxe maurice ai preview: createEnquiry and listLeads with access category', () => {
  const result = createEnquiry({
    full_name: 'Preview Access Guest',
    email: 'access.preview@example.invalid',
    budget_min: 18000,
    budget_max: 45000,
    desired_location: 'North & West Coast waters',
    access_category: 'yacht_marine',
    access_intent: 'Charter · July window',
    notes: 'Preview yacht access request',
    property_id: '44444444-4444-4444-8444-444444444447',
  });
  assert.equal(result.ok, true);
  const lead = listLeads().find((l) => l.id === result.lead_id);
  assert.equal(lead.access_category, 'yacht_marine');
  assert.ok(lead.next_action);
  const score = getLeadScore(result.lead_id);
  assert.ok(score?.score?.score != null);
});

test('luxe maurice ai preview: all route files exist', () => {
  for (const rel of PREVIEW_ROUTES) {
    assert.ok(fs.existsSync(path.join(repoRoot, rel)), `missing route ${rel}`);
  }
});

test('luxe maurice ai preview: landing hero image asset exists locally', () => {
  assert.ok(fs.existsSync(path.join(repoRoot, HERO_IMAGE_PATH)), 'hero image must be in public/');
  const stat = fs.statSync(path.join(repoRoot, HERO_IMAGE_PATH));
  assert.ok(stat.size > 10000, 'hero image must be a real asset');
});

test('luxe maurice ai preview: landing renders premium hero and private luxury access language', () => {
  const src = readRepo('pages/client/luxe-maurice-ai/index.js');
  const landing = readRepo('lib/client/luxe-maurice-ai-landing.js');
  const layout = readRepo('lib/client/luxe-maurice-ai-layout.js');
  assert.match(landing, /luxury-coastal-private-access-hero\.png/);
  assert.match(src, /LUXE_MAURICE_AI_HERO_IMAGE/);
  assert.match(landing, /Private access to Mauritius/i);
  assert.match(landing, /multi-channel private-access platform/i);
  assert.match(layout, /multi-channel private access/i);
  assert.match(src, /Request Private Access/i);
  assert.match(src, /Explore Access Catalogue/i);
  assert.match(src, /Access channels — equal weight/i);
  assert.match(src, /yacht/i);
  assert.match(src, /aviation/i);
  assert.match(src, /island experience/i);
  assert.match(src, /bespoke-island-experience-collector/);
});

test('luxe maurice ai preview: catalogue route shows multi-channel access with category filters', () => {
  const src = readRepo('pages/client/luxe-maurice-ai/properties/index.js');
  assert.match(src, /Multi-channel access catalogue/i);
  assert.match(src, /Curated private access/i);
  assert.match(src, /categoryFilter/);
  assert.match(src, /category_label/);
  assert.match(src, /getStaticProps/);
});

test('luxe maurice ai preview: detail route supports non-property facts', () => {
  const src = readRepo('pages/client/luxe-maurice-ai/properties/[id].js');
  assert.match(src, /access_model/);
  assert.match(src, /availability/);
  assert.match(src, /isResidenceCategory/);
  assert.match(src, /Advisory introduction/i);
});

test('luxe maurice ai preview: access request form includes category and intent fields', () => {
  const src = readRepo('pages/client/luxe-maurice-ai/buyer.js');
  assert.match(src, /Private access request/i);
  assert.match(src, /access_category/);
  assert.match(src, /access_intent/);
  assert.match(src, /advisor pipeline/i);
  assert.match(src, /Submit access request/i);
  assert.match(src, /router\.query\.category/);
});

test('luxe maurice ai preview: advisor pipeline renders mixed-category enquiries', () => {
  const src = readRepo('pages/client/luxe-maurice-ai/crm.js');
  assert.match(src, /Advisor pipeline/i);
  assert.match(src, /access_category/);
  assert.match(src, /next_action/);
  assert.match(src, /LeadCard/);
  assert.match(src, /New access request/);

  const leads = listLeads();
  assert.ok(leads.some((l) => l.access_category === 'residence'));
  assert.ok(leads.some((l) => l.access_category === 'yacht_marine'));
});

test('luxe maurice ai preview: shell exposes multi-channel nav and category quick links', () => {
  const src = readRepo('components/LuxeMauriceAiPreviewShell.js');
  assert.match(src, /Multi-channel preview/i);
  assert.match(src, /LUXE_MAURICE_AI_MULTI_CHANNEL_TAGLINE/);
  assert.match(src, /All channels/);
  assert.match(src, /Advisor pipeline/);
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
