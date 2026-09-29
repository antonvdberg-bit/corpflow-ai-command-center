-- Mauritius Lead Rescue prospect import v1 (#1366).
-- This migration only adds structured destinations for the existing growth_* models.
-- Production application and the real workbook import require separate Anton approval.
--
-- ROLLBACK (destructive to these new fields only):
--   ALTER TABLE "growth_companies"
--     DROP COLUMN IF EXISTS "source_url",
--     DROP COLUMN IF EXISTS "sector",
--     DROP COLUMN IF EXISTS "fit_hypothesis",
--     DROP COLUMN IF EXISTS "qualification_score",
--     DROP COLUMN IF EXISTS "lifecycle_state",
--     DROP COLUMN IF EXISTS "next_action",
--     DROP COLUMN IF EXISTS "next_action_due";
--   ALTER TABLE "growth_contacts"
--     DROP COLUMN IF EXISTS "decision_maker_confirmed",
--     DROP COLUMN IF EXISTS "phone",
--     DROP COLUMN IF EXISTS "whatsapp_number",
--     DROP COLUMN IF EXISTS "best_route",
--     DROP COLUMN IF EXISTS "best_route_original";
--   ALTER TABLE "growth_touchpoints"
--     DROP COLUMN IF EXISTS "result",
--     DROP COLUMN IF EXISTS "failure_reason",
--     DROP COLUMN IF EXISTS "next_action",
--     DROP COLUMN IF EXISTS "next_action_due",
--     DROP COLUMN IF EXISTS "source_url";

ALTER TABLE "growth_companies"
  ADD COLUMN IF NOT EXISTS "source_url" TEXT,
  ADD COLUMN IF NOT EXISTS "sector" TEXT,
  ADD COLUMN IF NOT EXISTS "fit_hypothesis" TEXT,
  ADD COLUMN IF NOT EXISTS "qualification_score" INTEGER,
  ADD COLUMN IF NOT EXISTS "lifecycle_state" TEXT NOT NULL DEFAULT 'RESEARCHED',
  ADD COLUMN IF NOT EXISTS "next_action" TEXT,
  ADD COLUMN IF NOT EXISTS "next_action_due" TIMESTAMP(3);

ALTER TABLE "growth_contacts"
  ADD COLUMN IF NOT EXISTS "decision_maker_confirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsapp_number" TEXT,
  ADD COLUMN IF NOT EXISTS "best_route" TEXT,
  ADD COLUMN IF NOT EXISTS "best_route_original" TEXT;

ALTER TABLE "growth_touchpoints"
  ADD COLUMN IF NOT EXISTS "result" TEXT,
  ADD COLUMN IF NOT EXISTS "failure_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "next_action" TEXT,
  ADD COLUMN IF NOT EXISTS "next_action_due" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "source_url" TEXT;

CREATE INDEX IF NOT EXISTS "growth_companies_tenant_id_lifecycle_state_idx"
  ON "growth_companies"("tenant_id", "lifecycle_state");

CREATE INDEX IF NOT EXISTS "growth_companies_tenant_id_qualification_score_idx"
  ON "growth_companies"("tenant_id", "qualification_score");
