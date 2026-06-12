import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  classifyLuxLeadSystemTest,
  isLuxLeadSystemTest,
} from '../lib/cmp/_lib/lux-lead-system-test-heuristic.js';

// Real LuxeMaurice leads from production (2026-06-12 audit). These MUST pass through
// as system_generated: false — they are the only two non-test leads currently visible.
const REAL_JAN_EMAIL_LEAD = Object.freeze({
  name: 'jan du Plessis',
  contact: 'jam@luxemaurice.com',
  message: 'Interested in beachfront property',
  listing: 'lm-nc-ridge',
  intent: 'lux_property_enquiry',
  qualificationJson: { property_interest: { slug: 'lm-nc-ridge' } },
});

const REAL_JAN_PHONE_LEAD = Object.freeze({
  name: 'Jan',
  contact: '+23055081350',
  message: 'I am writing about "North Coast Ridge Residences"',
  listing: 'lm-nc-ridge',
  intent: 'lux_property_enquiry',
  qualificationJson: {},
});

test('real Jan email lead is not system_generated', () => {
  assert.equal(classifyLuxLeadSystemTest(REAL_JAN_EMAIL_LEAD).system_generated, false);
  assert.equal(isLuxLeadSystemTest(REAL_JAN_EMAIL_LEAD), false);
});

test('real Jan phone lead is not system_generated', () => {
  assert.equal(classifyLuxLeadSystemTest(REAL_JAN_PHONE_LEAD).system_generated, false);
});

test('PHASE2D-VERIFY fixture (example.invalid + Phase pattern name) is system_generated', () => {
  const r = classifyLuxLeadSystemTest({
    name: 'PHASE2D-VERIFY 2026-01-15',
    contact: 'phase2d-verify+1778@example.invalid',
    message: 'Phase 2D end-to-end verification lead — automated',
    listing: 'lm-phase2d-manual-demo',
    intent: 'lux_property_enquiry',
    qualificationJson: {},
  });
  assert.equal(r.system_generated, true);
  // Earliest-matching reason wins (contact regex is evaluated first).
  assert.equal(r.reason, 'placeholder-contact');
});

test('Phase3 CRM verify lead with @placeholder.local is system_generated', () => {
  const r = classifyLuxLeadSystemTest({
    name: 'Phase3 CRM verify',
    contact: 'phase3-crm-verify@placeholder.local',
    message: 'Phase 3 production verification — discard',
    listing: null,
    intent: 'ai_concierge_lite',
    qualificationJson: {},
  });
  assert.equal(r.system_generated, true);
});

test('@corpflowai.invalid TLD is treated as placeholder', () => {
  const r = classifyLuxLeadSystemTest({
    name: 'Phase2B Curated Verify',
    contact: 'phase2b-curated-verify@corpflowai.invalid',
    message: 'Production verify curated lm-pipeline-q4',
    listing: 'lm-pipeline-q4',
  });
  assert.equal(r.system_generated, true);
  assert.equal(r.reason, 'placeholder-contact');
});

test('Notify Test / @example.com is system_generated', () => {
  assert.equal(
    classifyLuxLeadSystemTest({
      name: 'Notify Test',
      contact: 'notify-test@example.com',
      message: 'Operator notification verification',
    }).system_generated,
    true,
  );
});

test('lm-phase2d-manual-demo as listing flags lead as system_generated even without other signals', () => {
  const r = classifyLuxLeadSystemTest({
    name: 'Sample Investor',
    contact: 'sample.investor@some-real-domain.example',
    message: 'Curious about the demonstration property.',
    listing: 'lm-phase2d-manual-demo',
  });
  // Name contains 'sample' → matches name heuristic; demo-listing-reference is also a flag.
  assert.equal(r.system_generated, true);
});

test('qualificationJson.is_test / .smoke / .synthetic flags trip the heuristic', () => {
  assert.equal(
    classifyLuxLeadSystemTest({
      name: 'Anon',
      contact: 'anon@real.example',
      message: 'hello',
      qualificationJson: { is_test: true },
    }).system_generated,
    true,
  );
  assert.equal(
    classifyLuxLeadSystemTest({
      name: 'Anon',
      contact: 'anon@real.example',
      message: 'hello',
      qualificationJson: { smoke: true },
    }).system_generated,
    true,
  );
  assert.equal(
    classifyLuxLeadSystemTest({
      name: 'Anon',
      contact: 'anon@real.example',
      message: 'hello',
      qualificationJson: { synthetic: true },
    }).system_generated,
    true,
  );
});

test('qualificationJson.source containing test/seed/automation trips heuristic', () => {
  assert.equal(
    classifyLuxLeadSystemTest({
      name: 'Anon',
      contact: 'anon@real.example',
      message: 'hello',
      qualificationJson: { source: 'smoke-fixture' },
    }).system_generated,
    true,
  );
});

test('null / non-object lead returns system_generated:false (defensive)', () => {
  assert.equal(classifyLuxLeadSystemTest(null).system_generated, false);
  assert.equal(classifyLuxLeadSystemTest(undefined).system_generated, false);
  assert.equal(classifyLuxLeadSystemTest('string').system_generated, false);
});

test('legitimate-looking lead with real contact and no test keywords passes', () => {
  assert.equal(
    classifyLuxLeadSystemTest({
      name: 'Alexandre Beaumont',
      contact: 'a.beaumont@lex-partners.fr',
      message: 'Could we discuss the Bel Ombre villa enclave? Looking for completed residence.',
      listing: 'lm-villa-belombre',
      intent: 'lux_property_enquiry',
    }).system_generated,
    false,
  );
});

test('contact field with no @ but containing "smoke" trips the heuristic', () => {
  assert.equal(
    classifyLuxLeadSystemTest({
      name: 'Phase2D smoke',
      contact: 'phase2d-smoke@placeholder.local',
      message: 'Automated Phase 2D verification for lm-phase2d-manual-demo',
    }).system_generated,
    true,
  );
});

test('contact ending in .invalid TLD trips placeholder-contact', () => {
  assert.equal(
    classifyLuxLeadSystemTest({
      name: 'Real Name',
      contact: 'someone@plausible.invalid',
      message: 'hi',
    }).system_generated,
    true,
  );
});

test('Schema Ensure Test lead (test-name) is system_generated', () => {
  assert.equal(
    classifyLuxLeadSystemTest({
      name: 'Schema Ensure Test',
      contact: '',
      message: '',
      listing: 'private_internal_listing',
    }).system_generated,
    true,
  );
});
