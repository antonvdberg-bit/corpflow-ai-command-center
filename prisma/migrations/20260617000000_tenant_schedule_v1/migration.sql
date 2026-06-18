-- Tenant schedule entries v1 — additive schema for Living Word schedule-source.
-- Tenant-scoped rows; approved-only consumption in site-preview / future chatbot.
--
-- ROLLBACK (destructive — deletes all schedule data):
--   BEGIN;
--   DROP TABLE IF EXISTS "tenant_schedule_entries";
--   COMMIT;
--   npx prisma migrate resolve --rolled-back 20260617000000_tenant_schedule_v1
--
-- See: artifacts/quality-audits/2026-06-11-living-word-mauritius/ai-dynamic-scheduling-design.md

CREATE TABLE IF NOT EXISTS "tenant_schedule_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "recurrence" TEXT NOT NULL DEFAULT 'once',
    "weekly_day_of_week" INTEGER,
    "weekly_time" TEXT,
    "location_name" TEXT,
    "location_map_url" TEXT,
    "age_band" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'placeholder',
    "last_reviewed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "chatbot_answer_eligible" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_schedule_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tenant_schedule_entries_tenant_id_approved_idx"
    ON "tenant_schedule_entries"("tenant_id", "approved");
CREATE INDEX IF NOT EXISTS "tenant_schedule_entries_tenant_id_category_idx"
    ON "tenant_schedule_entries"("tenant_id", "category");
CREATE INDEX IF NOT EXISTS "tenant_schedule_entries_tenant_id_expires_at_idx"
    ON "tenant_schedule_entries"("tenant_id", "expires_at");
