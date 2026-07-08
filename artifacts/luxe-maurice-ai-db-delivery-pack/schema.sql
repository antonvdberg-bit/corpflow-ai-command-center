-- LuxeMaurice AI — portable PostgreSQL schema v1
-- Source: client Drive v1–v14 product-thinking history (spec-derived, not copied runtime)
-- Compatible with plain PostgreSQL and Supabase (no Supabase-only features required)
-- Default tenant slug: luxe-maurice

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tenancy & access
-- ---------------------------------------------------------------------------

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  label         TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'disabled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE user_roles (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- Property catalogue
-- ---------------------------------------------------------------------------

CREATE TABLE properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  title           TEXT NOT NULL,
  summary         TEXT,
  description     TEXT NOT NULL DEFAULT '',
  property_type   TEXT NOT NULL DEFAULT 'private_opportunity',
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'withdrawn', 'archived')),
  region_label    TEXT,
  location_label  TEXT,
  country_code    TEXT DEFAULT 'MU',
  price_label     TEXT,
  currency_code   TEXT DEFAULT 'USD',
  bedrooms        INTEGER,
  bathrooms       NUMERIC(4,1),
  area_sqm        NUMERIC(12,2),
  highlights_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE property_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  media_type      TEXT NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video', 'floorplan', 'brochure')),
  storage_path    TEXT NOT NULL,
  alt_text        TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_hero         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE property_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL DEFAULT 'memorandum'
    CHECK (doc_type IN ('memorandum', 'legal', 'brochure', 'other')),
  title           TEXT NOT NULL,
  storage_path    TEXT,
  visibility      TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'qualified_buyer', 'public')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Buyers & requirements
-- ---------------------------------------------------------------------------

CREATE TABLE buyers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  status          TEXT NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect', 'qualified', 'active', 'inactive')),
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE buyer_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL UNIQUE REFERENCES buyers(id) ON DELETE CASCADE,
  nationality     TEXT,
  residency_status TEXT,
  budget_min      NUMERIC(14,2),
  budget_max      NUMERIC(14,2),
  currency_code   TEXT DEFAULT 'USD',
  timeline        TEXT,
  notes           TEXT,
  wizard_step     TEXT,
  wizard_completed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE buyer_requirements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  requirement_key TEXT NOT NULL,
  requirement_value TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'should_have'
    CHECK (priority IN ('must_have', 'should_have', 'nice_to_have')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, requirement_key)
);

-- ---------------------------------------------------------------------------
-- Enquiries, leads, scoring, matching
-- ---------------------------------------------------------------------------

CREATE TABLE enquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  buyer_id        UUID REFERENCES buyers(id) ON DELETE SET NULL,
  channel         TEXT NOT NULL DEFAULT 'web'
    CHECK (channel IN ('web', 'phone', 'referral', 'event', 'other')),
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'converted', 'closed')),
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  enquiry_id      UUID UNIQUE REFERENCES enquiries(id) ON DELETE SET NULL,
  buyer_id        UUID REFERENCES buyers(id) ON DELETE SET NULL,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'viewing', 'offer', 'won', 'lost', 'nurture')),
  source          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lead_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  score           NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  score_band      TEXT NOT NULL
    CHECK (score_band IN ('cold', 'warm', 'hot', 'priority')),
  rationale       TEXT,
  model_version   TEXT NOT NULL DEFAULT 'rules_v1',
  scored_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE property_matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  match_score     NUMERIC(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reason    TEXT,
  status          TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'shortlisted', 'presented', 'rejected', 'selected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id, property_id)
);

-- ---------------------------------------------------------------------------
-- Viewings, offers, CRM
-- ---------------------------------------------------------------------------

CREATE TABLE viewings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  location_note   TEXT,
  host_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  outcome_note    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  offer_status    TEXT NOT NULL DEFAULT 'draft'
    CHECK (offer_status IN ('draft', 'submitted', 'under_review', 'accepted', 'declined', 'withdrawn')),
  amount_label    TEXT,
  currency_code   TEXT DEFAULT 'USD',
  submitted_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE crm_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  buyer_id        UUID REFERENCES buyers(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  task_type       TEXT NOT NULL DEFAULT 'follow_up'
    CHECK (task_type IN ('follow_up', 'call', 'viewing', 'document', 'review', 'other')),
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Documents & communications
-- ---------------------------------------------------------------------------

CREATE TABLE document_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_key    TEXT NOT NULL,
  name            TEXT NOT NULL,
  body_markdown   TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, template_key, version)
);

CREATE TABLE generated_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  storage_path    TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generated', 'sent', 'archived')),
  generated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE communications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  buyer_id        UUID REFERENCES buyers(id) ON DELETE SET NULL,
  channel         TEXT NOT NULL
    CHECK (channel IN ('email', 'phone', 'whatsapp', 'sms', 'in_app', 'other')),
  direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject         TEXT,
  body_preview    TEXT,
  status          TEXT NOT NULL DEFAULT 'logged'
    CHECK (status IN ('logged', 'queued', 'sent', 'failed')),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  action          TEXT NOT NULL,
  detail_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_properties_tenant_status ON properties (tenant_id, status);
CREATE INDEX idx_properties_tenant_location ON properties (tenant_id, location_label);
CREATE INDEX idx_properties_created_at ON properties (created_at DESC);

CREATE INDEX idx_leads_tenant_status ON leads (tenant_id, status);
CREATE INDEX idx_leads_created_at ON leads (created_at DESC);

CREATE INDEX idx_buyers_tenant_email ON buyers (tenant_id, email);

CREATE INDEX idx_enquiries_tenant_created ON enquiries (tenant_id, created_at DESC);
CREATE INDEX idx_property_matches_lead ON property_matches (lead_id);
CREATE INDEX idx_viewings_scheduled ON viewings (tenant_id, scheduled_at);
CREATE INDEX idx_crm_tasks_tenant_status ON crm_tasks (tenant_id, status);
CREATE INDEX idx_audit_events_tenant_created ON audit_events (tenant_id, created_at DESC);
