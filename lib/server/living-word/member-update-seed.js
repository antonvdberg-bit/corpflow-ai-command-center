/**
 * Living Word — Member Update Flow v1 (test-tenant pilot) — synthetic seed.
 *
 * SYNTHETIC test records ONLY. None of these are real Living Word members.
 * No GHL import, no production data. Used so the test-tenant pilot can be
 * exercised (identify -> prefill -> review) without touching real PII or a DB.
 *
 * Durable persistence (real seeded test rows in Postgres) is gated on the
 * Prisma migration approval — see the implementation packet DB schema gate.
 */

export const SYNTHETIC_SEED_NOTICE =
  'SYNTHETIC test records only — not real members, not from GHL, not persisted.';

/**
 * @type {ReadonlyArray<Record<string, unknown>>}
 */
export const SYNTHETIC_MEMBERS = Object.freeze([
  {
    record_id: 'lwm-test-0001',
    first_name: 'Test',
    last_name: 'Alpha',
    email: 'test.alpha@example.test',
    phone: '+23050000001',
    email_secondary: '',
    phone_secondary: '',
    preferred_communication: 'email',
    member_type: 'member',
    gender: 'prefer_not_to_say',
    address_line_1: '1 Test Street',
    city: 'Port Louis',
    emergency_contact_name: 'Test Beta',
    emergency_contact_phone: '+23050000002',
    opt_in_church_comms: true,
    ready_to_serve: false,
    interested_in_serving: false,
  },
  {
    record_id: 'lwm-test-0002',
    first_name: 'Test',
    last_name: 'Bravo',
    email: 'test.bravo@example.test',
    phone: '+23050000003',
    email_secondary: '',
    phone_secondary: '',
    preferred_communication: 'whatsapp',
    member_type: 'regular_attender',
    gender: 'female',
    address_line_1: '',
    city: 'Curepipe',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    opt_in_church_comms: true,
    ready_to_serve: true,
    interested_in_serving: true,
  },
  {
    record_id: 'lwm-test-0003',
    first_name: 'Test',
    last_name: 'Charlie',
    email: 'test.charlie@example.test',
    phone: '+23050000004',
    email_secondary: 'test.charlie.alt@example.test',
    phone_secondary: '',
    preferred_communication: 'phone',
    member_type: 'member',
    gender: 'male',
    address_line_1: '3 Sample Road',
    city: 'Quatre Bornes',
    emergency_contact_name: 'Test Delta',
    emergency_contact_phone: '+23050000005',
    opt_in_church_comms: false,
    ready_to_serve: false,
    interested_in_serving: false,
  },
]);

/**
 * Return a shallow copy of the synthetic seed list.
 * @returns {Array<Record<string, unknown>>}
 */
export function getSyntheticMembers() {
  return SYNTHETIC_MEMBERS.map((m) => ({ ...m }));
}
