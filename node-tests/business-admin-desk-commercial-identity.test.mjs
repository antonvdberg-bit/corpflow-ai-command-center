import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(root, file), 'utf8');

const footer = read('components/BusinessAdminDeskLegalFooter.js');
const actions = read('components/BusinessAdminDeskContactActions.js');
const landingFiles = [
  'components/BusinessAdminDeskPublicLanding.js',
  'components/BusinessAdminDeskPartnerLanding.js',
  'components/BusinessAdminDeskServiceLanding.js',
];

test('review footer uses the approved service-brand disclosure and planned identities', () => {
  assert.match(footer, /Business Admin Desk is a service brand operated by CorpFlowAI Ltd\./);
  assert.match(footer, /internalReview \? 'Service brand' : 'Trading name'/);
  assert.match(footer, /Email routing pending verification/);
  for (const address of [
    'info@businessadmindesk.co.za',
    'support@businessadmindesk.co.za',
    'accounts@businessadmindesk.co.za',
    'Serah.Fourie@businessadmindesk.co.za',
  ]) {
    assert.match(footer, new RegExp(address.replace('.', '\\.')));
  }
  assert.match(footer, /internalReview \? REVIEW_EMAIL : EMAIL/);
});

test('contact actions select one review address for both mailto and clipboard while preserving public baseline', () => {
  assert.match(actions, /internalReview = false/);
  assert.match(actions, /const contactEmail = selectContactEmail\(\{ internalReview \}\)/);
  assert.match(actions, /buildMailto\(subject, body, contactEmail\)/);
  assert.match(actions, /navigator\.clipboard\.writeText\(contactEmail\)/);
  assert.match(actions, /const CONTACT_EMAIL = 'swart829@gmail\.com'/);
  assert.match(actions, /const INTERNAL_REVIEW_CONTACT_EMAIL = 'info@businessadmindesk\.co\.za'/);
  assert.match(
    actions,
    /encodeURIComponent\(subject\).*encodeURIComponent\(body\)/s,
  );
});

test('all Business Admin Desk landing callers pass review mode explicitly', () => {
  for (const file of landingFiles) {
    const source = read(file);
    const calls = source.match(/<BusinessAdminDeskContactActions\b[\s\S]*?\/>/g) || [];
    assert.ok(calls.length >= 4, `${file} should retain all contact actions`);
    for (const call of calls) {
      assert.match(call, /internalReview=\{internalReview\}/, `${file} has an unscoped contact action`);
    }
  }
});

test('review routes stay noindex and public canonical links remain conditional', () => {
  for (const file of landingFiles) {
    const source = read(file);
    assert.match(source, /internalReview \? 'noindex,nofollow' : 'index,follow'/);
    assert.match(source, /!internalReview \? <link rel="canonical"/);
  }
});
