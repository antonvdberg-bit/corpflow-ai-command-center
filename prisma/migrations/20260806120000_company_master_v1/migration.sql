-- Company Master v1 (#776 / parent #765)
-- Structured company records + artifact metadata/binaries in existing Postgres.
-- Binary store: dedicated BYTEA columns (same approved store class as
-- cmp_ticket_attachments), not ticket attachment rows.
--
-- ROLLBACK (destructive — preview/synthetic only until Anton approves production):
--   BEGIN;
--   DROP TABLE IF EXISTS "company_master_artifacts";
--   DROP TABLE IF EXISTS "company_master_companies";
--   COMMIT;
--   npx prisma migrate resolve --rolled-back 20260806120000_company_master_v1
--
-- See: docs/company-master/COMPANY_MASTER_PRODUCTION_APPROVAL_PACKET.md

CREATE TABLE IF NOT EXISTS "company_master_companies" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "company_type" TEXT NOT NULL DEFAULT 'PRIVATE_COMPANY',
    "jurisdiction" TEXT NOT NULL DEFAULT 'MU',
    "lifecycle_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "verification_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "approval_status" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "legal_name" TEXT NOT NULL,
    "trading_name" TEXT,
    "registration_number" TEXT,
    "tax_number" TEXT,
    "public_email" TEXT,
    "public_phone" TEXT,
    "website" TEXT,
    "physical_address" TEXT,
    "registered_address" TEXT,
    "record_owner" TEXT NOT NULL DEFAULT 'role:company-master-operator',
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "next_review_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "company_master_companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "company_master_companies_company_id_key"
    ON "company_master_companies"("company_id");

CREATE INDEX IF NOT EXISTS "company_master_companies_tenant_id_idx"
    ON "company_master_companies"("tenant_id");

CREATE INDEX IF NOT EXISTS "company_master_companies_lifecycle_status_idx"
    ON "company_master_companies"("lifecycle_status");

CREATE INDEX IF NOT EXISTS "company_master_companies_is_synthetic_idx"
    ON "company_master_companies"("is_synthetic");

CREATE TABLE IF NOT EXISTS "company_master_artifacts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "logical_alias" TEXT NOT NULL,
    "artifact_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "storage_provider" TEXT NOT NULL DEFAULT 'MANAGED_OBJECT_STORAGE',
    "storage_object_id" TEXT NOT NULL,
    "retrieval_reference" TEXT NOT NULL,
    "sensitivity_classification" TEXT NOT NULL,
    "publication_status" TEXT NOT NULL,
    "verification_status" TEXT NOT NULL,
    "approval_status" TEXT NOT NULL,
    "lifecycle_status" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "supersedes_artifact_id" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "expiry_date" DATE,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "record_owner" TEXT NOT NULL DEFAULT 'role:company-master-operator',
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_master_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "company_master_artifacts_company_id_idx"
    ON "company_master_artifacts"("company_id");

CREATE INDEX IF NOT EXISTS "company_master_artifacts_company_id_logical_alias_idx"
    ON "company_master_artifacts"("company_id", "logical_alias");

CREATE INDEX IF NOT EXISTS "company_master_artifacts_company_alias_current_idx"
    ON "company_master_artifacts"("company_id", "logical_alias", "is_current");

CREATE INDEX IF NOT EXISTS "company_master_artifacts_tenant_id_idx"
    ON "company_master_artifacts"("tenant_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_master_artifacts_company_id_fkey'
  ) THEN
    ALTER TABLE "company_master_artifacts"
      ADD CONSTRAINT "company_master_artifacts_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "company_master_companies"("company_id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
