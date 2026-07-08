-- LuxeMaurice AI — verification queries (run after schema.sql + seed.sql)

-- 1) Core tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'tenants', 'users', 'roles', 'user_roles', 'properties', 'property_media', 'buyers',
    'buyer_profiles', 'buyer_requirements', 'enquiries', 'leads', 'lead_scores',
    'property_matches', 'viewings', 'offers', 'crm_tasks', 'document_templates',
    'generated_documents', 'communications', 'audit_events'
  )
ORDER BY 1;

-- 2) Default tenant present
SELECT id, slug, display_name FROM tenants WHERE slug = 'luxe-maurice';

-- 3) Sample property + media
SELECT p.slug, p.title, p.status, pm.storage_path AS hero_media
FROM properties p
LEFT JOIN property_media pm ON pm.property_id = p.id AND pm.is_hero = true
WHERE p.slug = 'sample-coastal-residence';

-- 4) Sample buyer + profile
SELECT b.email, b.full_name, bp.budget_min, bp.budget_max, bp.timeline
FROM buyers b
JOIN buyer_profiles bp ON bp.buyer_id = b.id
WHERE b.email = 'buyer.demo@example.invalid';

-- 5) Enquiry -> lead -> score flow
SELECT
  e.id AS enquiry_id,
  e.status AS enquiry_status,
  l.id AS lead_id,
  l.status AS lead_status,
  ls.score,
  ls.score_band
FROM enquiries e
JOIN leads l ON l.enquiry_id = e.id
LEFT JOIN lead_scores ls ON ls.lead_id = l.id
ORDER BY e.created_at DESC
LIMIT 5;

-- 6) Property match for sample lead
SELECT l.id AS lead_id, p.slug, pm.match_score, pm.status
FROM leads l
JOIN property_matches pm ON pm.lead_id = l.id
JOIN properties p ON p.id = pm.property_id
ORDER BY pm.match_score DESC
LIMIT 5;

-- 7) CRM task linked to lead
SELECT ct.title, ct.status, ct.due_at, l.status AS lead_status
FROM crm_tasks ct
JOIN leads l ON l.id = ct.lead_id
ORDER BY ct.created_at DESC
LIMIT 5;

-- 8) Relationship integrity spot-check (orphan count should be 0)
SELECT COUNT(*) AS orphan_leads
FROM leads l
LEFT JOIN tenants t ON t.id = l.tenant_id
WHERE t.id IS NULL;
