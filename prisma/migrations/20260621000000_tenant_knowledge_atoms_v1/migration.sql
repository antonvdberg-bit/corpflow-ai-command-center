-- Tenant knowledge atoms v1 — approved church facts for retrieval-assisted AI (future).
-- First tenant: living-word-mauritius (sandbox/demo).
--
-- ROLLBACK (destructive):
--   BEGIN;
--   DROP TABLE IF EXISTS "tenant_knowledge_atoms";
--   COMMIT;
--   npx prisma migrate resolve --rolled-back 20260621000000_tenant_knowledge_atoms_v1
--
-- See: lib/server/tenant-knowledge/README.md

CREATE TABLE IF NOT EXISTS "tenant_knowledge_atoms" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "atom_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "summary" TEXT,
    "source_type" TEXT NOT NULL,
    "source_label" TEXT NOT NULL,
    "source_url" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "last_reviewed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "chatbot_answer_eligible" BOOLEAN NOT NULL DEFAULT false,
    "ai_answer_eligible" BOOLEAN NOT NULL DEFAULT false,
    "sensitivity" TEXT NOT NULL DEFAULT 'public',
    "tags_json" JSONB,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_knowledge_atoms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_knowledge_atoms_tenant_atom_key"
    ON "tenant_knowledge_atoms"("tenant_id", "atom_key");

CREATE INDEX IF NOT EXISTS "tenant_knowledge_atoms_tenant_id_approved_idx"
    ON "tenant_knowledge_atoms"("tenant_id", "approved");

CREATE INDEX IF NOT EXISTS "tenant_knowledge_atoms_tenant_id_category_idx"
    ON "tenant_knowledge_atoms"("tenant_id", "category");

CREATE INDEX IF NOT EXISTS "tenant_knowledge_atoms_tenant_id_expires_at_idx"
    ON "tenant_knowledge_atoms"("tenant_id", "expires_at");

CREATE INDEX IF NOT EXISTS "tenant_knowledge_atoms_tenant_id_chatbot_answer_eligible_idx"
    ON "tenant_knowledge_atoms"("tenant_id", "chatbot_answer_eligible");

CREATE INDEX IF NOT EXISTS "tenant_knowledge_atoms_tenant_id_ai_answer_eligible_idx"
    ON "tenant_knowledge_atoms"("tenant_id", "ai_answer_eligible");
