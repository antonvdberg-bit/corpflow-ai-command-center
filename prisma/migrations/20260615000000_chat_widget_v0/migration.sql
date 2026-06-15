-- Chat Widget v0 — additive schema for the CorpFlow-native text chatbot.
-- Anonymous-public embeddable widget; per-tenant kill switch; per-tenant flow JSON.
-- All four tables tenant-scoped via tenant_id (string column, no FK to tenants for
-- the same loose-coupling reason cmp_tickets / automation_events use a string column).
--
-- Idempotent DDL: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS so this
-- migration can also be applied via `POST /api/factory/postgres/ensure-schema` or
-- re-run safely. After idempotent application, run once:
--   npx prisma migrate resolve --applied 20260615000000_chat_widget_v0
--
-- ROLLBACK
-- --------
-- This migration is purely additive. No existing table, column, index, or
-- constraint is modified. To roll back (destructive — deletes all chat-widget
-- data), run as a single transaction:
--
--   BEGIN;
--   DROP TABLE IF EXISTS "chat_widget_rate_limits";
--   DROP TABLE IF EXISTS "chat_widget_messages";   -- FK to chat_widget_threads
--   DROP TABLE IF EXISTS "chat_widget_threads";
--   DROP TABLE IF EXISTS "chat_widget_configs";
--   COMMIT;
--
-- Then mark the Prisma migration rolled-back:
--   npx prisma migrate resolve --rolled-back 20260615000000_chat_widget_v0
--
-- Rollback is gated by the same operator-approval rule as `migrate deploy`
-- (see docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md §3).
--
-- See docs at:
--   artifacts/quality-audits/2026-06-11-living-word-mauritius/chatbot-v0-delivery-plan.md
--   artifacts/quality-audits/2026-06-11-living-word-mauritius/chatbot-options-assessment.md

CREATE TABLE IF NOT EXISTS "chat_widget_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "brand_name" TEXT NOT NULL,
    "brand_accent" TEXT,
    "brand_logo_url" TEXT,
    "greeting" TEXT NOT NULL DEFAULT 'Hi! How can we help today?',
    "flow_json" JSONB NOT NULL,
    "flow_version" INTEGER NOT NULL DEFAULT 1,
    "notify_via" TEXT NOT NULL DEFAULT 'automation_event',
    "notify_email" TEXT,
    "allowed_origins_json" JSONB NOT NULL DEFAULT '[]',
    "rate_limit_per_window" INTEGER NOT NULL DEFAULT 30,
    "rate_limit_window_seconds" INTEGER NOT NULL DEFAULT 300,
    "ai_budget_monthly_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ai_budget_spent_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ai_budget_month_yyyymm" TEXT,
    "messages_this_month" INTEGER NOT NULL DEFAULT 0,
    "messages_month_yyyymm" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_widget_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_widget_configs_tenant_id_key" ON "chat_widget_configs"("tenant_id");
CREATE INDEX IF NOT EXISTS "chat_widget_configs_tenant_id_idx" ON "chat_widget_configs"("tenant_id");

CREATE TABLE IF NOT EXISTS "chat_widget_threads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_host" TEXT,
    "source_path" TEXT,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "lead_name" TEXT,
    "lead_email" TEXT,
    "lead_phone" TEXT,
    "request_type" TEXT,
    "lead_message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "ticket_id" TEXT,
    "notified_at" TIMESTAMP(3),
    "notify_error" TEXT,
    "flow_version" INTEGER NOT NULL DEFAULT 1,
    "current_node" TEXT,

    CONSTRAINT "chat_widget_threads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chat_widget_threads_tenant_id_started_at_idx" ON "chat_widget_threads"("tenant_id", "started_at");
CREATE INDEX IF NOT EXISTS "chat_widget_threads_tenant_id_status_idx" ON "chat_widget_threads"("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "chat_widget_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "node_id" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_widget_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chat_widget_messages_thread_id_created_at_idx" ON "chat_widget_messages"("thread_id", "created_at");
CREATE INDEX IF NOT EXISTS "chat_widget_messages_tenant_id_created_at_idx" ON "chat_widget_messages"("tenant_id", "created_at");

DO $$ BEGIN
    ALTER TABLE "chat_widget_messages"
        ADD CONSTRAINT "chat_widget_messages_thread_id_fkey"
        FOREIGN KEY ("thread_id") REFERENCES "chat_widget_threads"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "chat_widget_rate_limits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_widget_rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_widget_rate_limits_t_ip_w_key" ON "chat_widget_rate_limits"("tenant_id", "ip_hash", "window_start");
CREATE INDEX IF NOT EXISTS "chat_widget_rate_limits_tenant_id_ip_hash_idx" ON "chat_widget_rate_limits"("tenant_id", "ip_hash");
CREATE INDEX IF NOT EXISTS "chat_widget_rate_limits_window_start_idx" ON "chat_widget_rate_limits"("window_start");
