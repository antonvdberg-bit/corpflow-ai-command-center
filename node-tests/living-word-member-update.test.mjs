import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPrefill,
  computeProposedUpdate,
  findExcludedKey,
  PREFILLABLE_KEYS,
  PROVISIONAL_SANDBOX_ENUMS,
  UPDATE_FIELD_KEYS,
  validateIdentifyBody,
  validateUpdateBody,
} from '../lib/server/living-word/member-update-schema.js';
import { matchMember } from '../lib/server/living-word/member-update-match.js';
import { getSyntheticMembers } from '../lib/server/living-word/member-update-seed.js';

const baseUpdate = () => ({
  first_name: 'Test',
  last_name: 'Alpha',
  email: 'test.alpha@example.test',
  phone: '+23050000001',
  consent_acknowledged: true,
});

describe('validateIdentifyBody', () => {
  it('accepts name + email', () => {
    const r = validateIdentifyBody({ first_name: 'Test', last_name: 'Alpha', email: 'A@Example.test' });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.data.email, 'a@example.test');
  });

  it('requires at least one contact key', () => {
    const r = validateIdentifyBody({ first_name: 'Test', last_name: 'Alpha' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'contact_key_required');
  });

  it('rejects an excluded key even at identify', () => {
    const r = validateIdentifyBody({ first_name: 'A', last_name: 'B', email: 'a@b.test', prayer_request: 'x' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'excluded_field');
    assert.equal(r.category, 'prayer_or_counselling');
  });
});

describe('validateUpdateBody — allowlist + exclusions', () => {
  it('accepts a valid allowlisted body with consent', () => {
    const r = validateUpdateBody(baseUpdate());
    assert.equal(r.ok, true);
  });

  it('rejects an unknown field', () => {
    const r = validateUpdateBody({ ...baseUpdate(), favourite_colour: 'blue' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'unknown_field');
    assert.equal(r.field, 'favourite_colour');
  });

  for (const [key, category] of [
    ['trinity_kids_count', 'youth_or_children'],
    ['prayer_request', 'prayer_or_counselling'],
    ['notes', 'free_text_notes'],
    ['medical_conditions', 'medical_legal_financial'],
    ['donation_amount', 'donation_or_payment'],
    ['business_name', 'business_network'],
    ['team_leader', 'team_assignment_or_routing'],
  ]) {
    it(`rejects excluded field ${key} as ${category}`, () => {
      const r = validateUpdateBody({ ...baseUpdate(), [key]: 'x' });
      assert.equal(r.ok, false);
      if (r.ok) return;
      assert.equal(r.error, 'excluded_field');
      assert.equal(r.category, category);
    });
  }

  it('requires consent', () => {
    const body = baseUpdate();
    body.consent_acknowledged = false;
    const r = validateUpdateBody(body);
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'consent_required');
  });

  it('rejects an out-of-enum select', () => {
    const r = validateUpdateBody({ ...baseUpdate(), preferred_communication: 'carrier_pigeon' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'invalid_option');
  });

  it('accepts a provisional enum value', () => {
    assert.ok(PROVISIONAL_SANDBOX_ENUMS.preferred_communication.includes('whatsapp'));
    const r = validateUpdateBody({ ...baseUpdate(), preferred_communication: 'whatsapp' });
    assert.equal(r.ok, true);
  });
});

describe('findExcludedKey', () => {
  it('returns null for clean allowlist keys', () => {
    assert.equal(findExcludedKey(UPDATE_FIELD_KEYS), null);
  });
});

describe('computeProposedUpdate — blank-overwrite protection', () => {
  it('never erases a populated existing field with a blank submission', () => {
    const existing = { email_secondary: 'keep@example.test', city: 'Port Louis' };
    const submitted = { email_secondary: '', city: '   ' };
    const { proposed, changes } = computeProposedUpdate(existing, submitted);
    assert.equal(proposed.email_secondary, 'keep@example.test');
    assert.equal(proposed.city, 'Port Louis');
    assert.equal(changes.length, 0);
  });

  it('records a change when a value actually differs', () => {
    const existing = { city: 'Port Louis' };
    const submitted = { city: 'Curepipe' };
    const { proposed, changes } = computeProposedUpdate(existing, submitted);
    assert.equal(proposed.city, 'Curepipe');
    assert.equal(changes.some((c) => c.field === 'city'), true);
  });

  it('never sets consent_acknowledged into proposed update', () => {
    const { proposed } = computeProposedUpdate({}, { consent_acknowledged: true, city: 'X' });
    assert.equal('consent_acknowledged' in proposed, false);
  });
});

describe('matchMember against synthetic seed', () => {
  const seed = getSyntheticMembers();

  it('matches by email', () => {
    const m = matchMember({ email: 'test.alpha@example.test' }, seed);
    assert.equal(m.status, 'matched');
    assert.equal(m.matched_by, 'email');
    assert.equal(m.record.record_id, 'lwm-test-0001');
  });

  it('matches by phone when email absent', () => {
    const m = matchMember({ phone: '+230 5000 0003' }, seed);
    assert.equal(m.status, 'matched');
    assert.equal(m.matched_by, 'phone');
    assert.equal(m.record.record_id, 'lwm-test-0002');
  });

  it('returns unconfirmed for an unknown contact', () => {
    const m = matchMember({ first_name: 'No', last_name: 'Body', email: 'nobody@example.test' }, seed);
    assert.equal(m.status, 'unconfirmed');
    assert.equal(m.record, null);
  });
});

describe('buildPrefill', () => {
  it('returns only prefillable allowlisted keys and never consent', () => {
    const seed = getSyntheticMembers()[0];
    const prefill = buildPrefill(seed);
    for (const k of Object.keys(prefill)) {
      assert.ok(PREFILLABLE_KEYS.includes(k), `unexpected prefill key ${k}`);
    }
    assert.equal('consent_acknowledged' in prefill, false);
  });
});
