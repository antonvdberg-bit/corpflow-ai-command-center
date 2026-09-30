-- Internal operator-only client intelligence context fabric v1.
-- Rollback: drop the five client_context_* tables in reverse dependency order.

CREATE TABLE IF NOT EXISTS "client_context_spaces" (
  "id" TEXT NOT NULL,
  "context_key" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "tenant_id" TEXT,
  "primary_github_issue" INTEGER,
  "external_ref" TEXT,
  "lifecycle" TEXT NOT NULL DEFAULT 'prospect',
  "status" TEXT NOT NULL DEFAULT 'active',
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_context_spaces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "client_context_spaces_context_key_key" ON "client_context_spaces"("context_key");
CREATE INDEX IF NOT EXISTS "client_context_spaces_tenant_id_idx" ON "client_context_spaces"("tenant_id");
CREATE INDEX IF NOT EXISTS "client_context_spaces_status_idx" ON "client_context_spaces"("status");

CREATE TABLE IF NOT EXISTS "client_context_sources" (
  "id" TEXT NOT NULL,
  "space_id" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "location" TEXT,
  "source_date" TIMESTAMP(3),
  "excerpt" TEXT,
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_context_sources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_context_sources_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "client_context_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "client_context_sources_space_id_source_type_idx" ON "client_context_sources"("space_id", "source_type");

CREATE TABLE IF NOT EXISTS "client_context_records" (
  "id" TEXT NOT NULL,
  "space_id" TEXT NOT NULL,
  "record_key" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "tags_json" JSONB,
  "confidence" TEXT NOT NULL DEFAULT 'medium',
  "verification" TEXT NOT NULL DEFAULT 'unverified',
  "state" TEXT NOT NULL DEFAULT 'current',
  "valid_from" TIMESTAMP(3),
  "valid_to" TIMESTAMP(3),
  "superseded_by_id" TEXT,
  "sensitivity" TEXT NOT NULL DEFAULT 'internal',
  "owner_authority" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_context_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_context_records_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "client_context_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "client_context_records_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "client_context_records"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "client_context_records_space_key" ON "client_context_records"("space_id", "record_key");
CREATE INDEX IF NOT EXISTS "client_context_records_space_category_state_idx" ON "client_context_records"("space_id", "category", "state");
CREATE INDEX IF NOT EXISTS "client_context_records_space_verification_idx" ON "client_context_records"("space_id", "verification");

CREATE TABLE IF NOT EXISTS "client_context_record_sources" (
  "record_id" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "claim" TEXT,
  CONSTRAINT "client_context_record_sources_pkey" PRIMARY KEY ("record_id", "source_id"),
  CONSTRAINT "client_context_record_sources_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "client_context_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "client_context_record_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "client_context_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "client_context_relations" (
  "id" TEXT NOT NULL,
  "space_id" TEXT NOT NULL,
  "from_record_id" TEXT,
  "to_record_id" TEXT,
  "relation_type" TEXT NOT NULL,
  "label" TEXT,
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_context_relations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_context_relations_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "client_context_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "client_context_relations_from_record_id_fkey" FOREIGN KEY ("from_record_id") REFERENCES "client_context_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "client_context_relations_to_record_id_fkey" FOREIGN KEY ("to_record_id") REFERENCES "client_context_records"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "client_context_relations_space_type_idx" ON "client_context_relations"("space_id", "relation_type");
CREATE INDEX IF NOT EXISTS "client_context_relations_from_idx" ON "client_context_relations"("from_record_id");
CREATE INDEX IF NOT EXISTS "client_context_relations_to_idx" ON "client_context_relations"("to_record_id");
