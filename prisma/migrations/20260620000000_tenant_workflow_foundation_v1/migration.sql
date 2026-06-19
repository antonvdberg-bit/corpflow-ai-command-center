-- Tenant workflow foundation v1 — reusable workflow definitions, runs, and operator steps.
-- First consumer: Living Word chatbot lead follow-up (living_word_chatbot_lead_followup v1).
--
-- ROLLBACK (destructive — cancels audit evidence; prefer marking runs cancelled in app):
--   BEGIN;
--   DROP TABLE IF EXISTS "workflow_steps";
--   DROP TABLE IF EXISTS "workflow_runs";
--   DROP TABLE IF EXISTS "workflow_definitions";
--   COMMIT;
--   npx prisma migrate resolve --rolled-back 20260620000000_tenant_workflow_foundation_v1
--
-- See: lib/server/tenant-workflow/README.md

CREATE TABLE IF NOT EXISTS "workflow_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workflow_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "trigger_event_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "definition_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workflow_definitions_tenant_key_version"
    ON "workflow_definitions"("tenant_id", "workflow_key", "version");

CREATE INDEX IF NOT EXISTS "workflow_definitions_tenant_id_trigger_event_type_status_idx"
    ON "workflow_definitions"("tenant_id", "trigger_event_type", "status");

CREATE TABLE IF NOT EXISTS "workflow_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workflow_definition_id" TEXT NOT NULL,
    "workflow_key" TEXT NOT NULL,
    "workflow_version" INTEGER NOT NULL,
    "source_event_id" TEXT NOT NULL,
    "source_event_type" TEXT NOT NULL,
    "source_thread_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "current_step_key" TEXT,
    "context_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_runs_workflow_definition_id_fkey"
        FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "workflow_runs_tenant_idem"
    ON "workflow_runs"("tenant_id", "idempotency_key");

CREATE INDEX IF NOT EXISTS "workflow_runs_tenant_id_status_idx"
    ON "workflow_runs"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "workflow_runs_tenant_id_source_event_id_idx"
    ON "workflow_runs"("tenant_id", "source_event_id");

CREATE INDEX IF NOT EXISTS "workflow_runs_tenant_id_source_thread_id_idx"
    ON "workflow_runs"("tenant_id", "source_thread_id");

CREATE TABLE IF NOT EXISTS "workflow_steps" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workflow_run_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "step_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assigned_to" TEXT,
    "due_at" TIMESTAMP(3),
    "data_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_steps_workflow_run_id_fkey"
        FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "workflow_steps_run_step_key"
    ON "workflow_steps"("workflow_run_id", "step_key");

CREATE INDEX IF NOT EXISTS "workflow_steps_tenant_id_status_idx"
    ON "workflow_steps"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "workflow_steps_workflow_run_id_idx"
    ON "workflow_steps"("workflow_run_id");
