import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProductAIntakeIdempotencyKey,
  buildProductAIntakePayload,
  normalizeWebsiteUrl,
  PRODUCT_A_INTAKE_EVENT_TYPE,
  PRODUCT_A_INTAKE_SCHEMA,
  PRODUCT_A_INTAKE_SOURCE,
  validateProductAIntakeBody,
} from '../lib/server/product-a-intake-payload.js';

describe('validateProductAIntakeBody', () => {
  it('accepts a complete valid body', () => {
    const result = validateProductAIntakeBody({
      clinic_name: 'Radiance Medspa',
      website: 'radiance.example.com',
      contact_name: 'Jordan Lee',
      email: 'Jordan@Example.COM',
      phone: '',
      city_state: 'Austin, TX',
      biggest_problem: 'Weekend enquiries wait until Monday.',
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.email, 'jordan@example.com');
    assert.equal(result.data.website, 'https://radiance.example.com');
    assert.equal(result.data.phone, null);
  });

  it('rejects missing clinic name', () => {
    const result = validateProductAIntakeBody({
      website: 'https://x.com',
      contact_name: 'A',
      email: 'a@b.com',
      city_state: 'Austin, TX',
      biggest_problem: 'Problem',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.field, 'clinic_name');
  });

  it('rejects invalid email', () => {
    const result = validateProductAIntakeBody({
      clinic_name: 'Clinic',
      website: 'https://x.com',
      contact_name: 'A',
      email: 'not-an-email',
      city_state: 'Austin, TX',
      biggest_problem: 'Problem',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.field, 'email');
  });
});

describe('buildProductAIntakePayload', () => {
  it('emits the documented flat shape', () => {
    const payload = buildProductAIntakePayload(
      {
        clinic_name: 'Clinic',
        website: 'https://clinic.example',
        contact_name: 'Name',
        email: 'name@clinic.example',
        phone: null,
        city_state: 'Miami, FL',
        biggest_problem: 'Forms go nowhere',
      },
      { received_at: '2026-06-20T12:00:00.000Z', host: 'corpflowai.com' },
    );

    assert.equal(payload.schema, PRODUCT_A_INTAKE_SCHEMA);
    assert.equal(payload.event_type, PRODUCT_A_INTAKE_EVENT_TYPE);
    assert.equal(payload.source, PRODUCT_A_INTAKE_SOURCE);
    assert.equal(payload.status, 'new');
    assert.equal(payload.host, 'corpflowai.com');
    assert.equal(payload.biggest_problem, 'Forms go nowhere');
  });
});

describe('normalizeWebsiteUrl', () => {
  it('prefixes https when scheme missing', () => {
    assert.equal(normalizeWebsiteUrl('clinic.com'), 'https://clinic.com');
  });
});

describe('buildProductAIntakeIdempotencyKey', () => {
  it('includes email clinic slug and day', () => {
    const key = buildProductAIntakeIdempotencyKey(
      'a@b.com',
      'Radiance Medspa',
      '2026-06-20T15:00:00.000Z',
    );
    assert.match(key, /^product-a:intake:a@b\.com:radiance-medspa:2026-06-20$/);
  });
});
