/**
 * LuxeMaurice AI DB delivery pack — file + DDL shape guard (no live DB).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PACK_DIR = path.join(process.cwd(), 'artifacts', 'luxe-maurice-ai-db-delivery-pack');

const REQUIRED_FILES = [
  'schema.sql',
  'seed.sql',
  'verify.sql',
  'ERD.md',
  'DATA_DICTIONARY.md',
  'API_CONTRACT.md',
  'FRONTEND_INTEGRATION_NOTES.md',
  'README_RUNBOOK.md',
];

const CORE_TABLES = [
  'tenants',
  'roles',
  'users',
  'user_roles',
  'properties',
  'property_media',
  'property_documents',
  'buyers',
  'buyer_profiles',
  'buyer_requirements',
  'enquiries',
  'leads',
  'lead_scores',
  'property_matches',
  'viewings',
  'offers',
  'crm_tasks',
  'document_templates',
  'generated_documents',
  'communications',
  'audit_events',
];

test('lux db pack: all required deliverable files exist', () => {
  for (const name of REQUIRED_FILES) {
    assert.ok(fs.existsSync(path.join(PACK_DIR, name)), `missing ${name}`);
  }
});

test('lux db pack: schema declares core tables with tenant boundary', () => {
  const schema = fs.readFileSync(path.join(PACK_DIR, 'schema.sql'), 'utf8');
  for (const table of CORE_TABLES) {
    assert.match(schema, new RegExp(`CREATE TABLE ${table}\\s*\\(`, 'i'), `missing table ${table}`);
  }
  assert.match(schema, /tenant_id\s+UUID NOT NULL REFERENCES tenants\(id\)/i);
  assert.match(schema, /CREATE EXTENSION IF NOT EXISTS "pgcrypto"/i);
  assert.match(schema, /idx_properties_tenant_status/i);
  assert.match(schema, /idx_leads_tenant_status/i);
  assert.match(schema, /idx_buyers_tenant_email/i);
});

test('lux db pack: seed is marked sample and includes luxe-maurice flow', () => {
  const seed = fs.readFileSync(path.join(PACK_DIR, 'seed.sql'), 'utf8');
  assert.match(seed, /SAMPLE|demo|example\.invalid/i);
  assert.match(seed, /luxe-maurice/);
  assert.match(seed, /sample-coastal-residence/);
  assert.match(seed, /buyer\.demo@example\.invalid/);
  assert.match(seed, /crm_tasks/i);
});

test('lux db pack: verify covers tables, seed rows, and enquiry-lead flow', () => {
  const verify = fs.readFileSync(path.join(PACK_DIR, 'verify.sql'), 'utf8');
  assert.match(verify, /information_schema\.tables/i);
  assert.match(verify, /luxe-maurice/);
  assert.match(verify, /enquiries e[\s\S]+JOIN leads l ON l\.enquiry_id = e\.id/i);
  assert.match(verify, /orphan_leads/i);
});
