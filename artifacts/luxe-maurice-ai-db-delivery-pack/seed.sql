-- LuxeMaurice AI — SAMPLE / DEMO seed data (non-sensitive, fictional)
-- Run after schema.sql. Safe for local dev and client preview discussions only.

BEGIN;

INSERT INTO tenants (id, slug, display_name, status)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'luxe-maurice',
  'LuxeMaurice',
  'active'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO roles (id, tenant_id, code, label)
VALUES
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'operator', 'Operator'),
  ('22222222-2222-4222-8222-222222222223', '11111111-1111-4111-8111-111111111111', 'advisor', 'Private Advisor')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, tenant_id, email, full_name, status)
VALUES (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'advisor.demo@example.invalid',
  'Demo Advisor',
  'active'
) ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
VALUES (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222223'
) ON CONFLICT DO NOTHING;

INSERT INTO properties (
  id, tenant_id, slug, title, summary, description, property_type, status,
  region_label, location_label, price_label, bedrooms, bathrooms, area_sqm, published_at
) VALUES (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  'sample-coastal-residence',
  'Sample Coastal Residence — Black River',
  'Private opportunity sample for schema preview.',
  'This is demo copy only. It represents a curated private opportunity memorandum, not a live listing.',
  'private_opportunity',
  'published',
  'Black River',
  'West Coast, Mauritius',
  'Price on application',
  4,
  4.5,
  420.00,
  now()
) ON CONFLICT DO NOTHING;

INSERT INTO property_media (id, tenant_id, property_id, media_type, storage_path, alt_text, sort_order, is_hero)
VALUES (
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  'image',
  'demo/sample-coastal-residence/hero.jpg',
  'Sample hero image — demo only',
  0,
  true
) ON CONFLICT DO NOTHING;

INSERT INTO buyers (id, tenant_id, email, full_name, phone, status, source)
VALUES (
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111111',
  'buyer.demo@example.invalid',
  'Sample Buyer',
  '+230-0000-0000',
  'prospect',
  'web_wizard'
) ON CONFLICT DO NOTHING;

INSERT INTO buyer_profiles (tenant_id, buyer_id, nationality, budget_min, budget_max, timeline, wizard_step, wizard_completed_at)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
  'International',
  1500000,
  3500000,
  '6-12 months',
  'complete',
  now()
) ON CONFLICT DO NOTHING;

INSERT INTO buyer_requirements (tenant_id, buyer_id, requirement_key, requirement_value, priority)
VALUES
  ('11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666666', 'region', 'West Coast', 'must_have'),
  ('11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666666', 'property_type', 'Completed residence', 'should_have')
ON CONFLICT DO NOTHING;

INSERT INTO enquiries (id, tenant_id, property_id, buyer_id, channel, message, status, submitted_at)
VALUES (
  '77777777-7777-4777-8777-777777777777',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '66666666-6666-4666-8666-666666666666',
  'web',
  'SAMPLE: I would like a private consultation about this opportunity.',
  'converted',
  now()
) ON CONFLICT DO NOTHING;

INSERT INTO leads (id, tenant_id, enquiry_id, buyer_id, property_id, assigned_user_id, status, source, notes)
VALUES (
  '88888888-8888-4888-8888-888888888888',
  '11111111-1111-4111-8111-111111111111',
  '77777777-7777-4777-8777-777777777777',
  '66666666-6666-4666-8666-666666666666',
  '44444444-4444-4444-8444-444444444444',
  '33333333-3333-4333-8333-333333333333',
  'new',
  'concierge_form',
  'SAMPLE lead created from demo enquiry.'
) ON CONFLICT DO NOTHING;

INSERT INTO lead_scores (tenant_id, lead_id, score, score_band, rationale, model_version)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  '88888888-8888-4888-8888-888888888888',
  72.50,
  'warm',
  'SAMPLE rules_v1: budget fit + region match + completed wizard',
  'rules_v1'
);

INSERT INTO property_matches (tenant_id, lead_id, property_id, match_score, match_reason, status)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  '88888888-8888-4888-8888-888888888888',
  '44444444-4444-4444-8444-444444444444',
  81.00,
  'SAMPLE: region and budget alignment',
  'shortlisted'
) ON CONFLICT DO NOTHING;

INSERT INTO crm_tasks (tenant_id, lead_id, buyer_id, assigned_user_id, task_type, title, status, due_at)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  '88888888-8888-4888-8888-888888888888',
  '66666666-6666-4666-8666-666666666666',
  '33333333-3333-4333-8333-333333333333',
  'follow_up',
  'SAMPLE: Call buyer to confirm consultation window',
  'open',
  now() + interval '2 days'
);

INSERT INTO document_templates (tenant_id, template_key, name, body_markdown, version)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'private_opportunity_intro',
  'Private Opportunity Intro',
  '# Private Opportunity\n\nSAMPLE template placeholder for generated memorandum copy.',
  1
) ON CONFLICT DO NOTHING;

COMMIT;
