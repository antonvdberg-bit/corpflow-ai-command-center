-- Chat widget retrieval AI v1 — ai_enabled flag + usage audit log.
-- Living Word sandbox first consumer; Groq via existing GROQ_API_KEY env.
--
-- ROLLBACK (destructive):
--   BEGIN;
--   DROP TABLE IF EXISTS "chat_widget_ai_usage_logs";
--   ALTER TABLE "chat_widget_configs" DROP COLUMN IF EXISTS "ai_enabled";
--   ALTER TABLE "chat_widget_configs" DROP COLUMN IF EXISTS "ai_session_message_cap";
--   COMMIT;
--   npx prisma migrate resolve --rolled-back 20260622000000_chat_widget_retrieval_ai_v1

ALTER TABLE "chat_widget_configs"
  ADD COLUMN IF NOT EXISTS "ai_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "chat_widget_configs"
  ADD COLUMN IF NOT EXISTS "ai_session_message_cap" INTEGER NOT NULL DEFAULT 5;

CREATE TABLE IF NOT EXISTS "chat_widget_ai_usage_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "mode" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "context_atom_ids" JSONB,
    "schedule_entry_ids" JSONB,
    "safety_route" TEXT,
    "refusal_reason" TEXT,
    "token_prompt" INTEGER,
    "token_completion" INTEGER,
    "token_total" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_widget_ai_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chat_widget_ai_usage_logs_tenant_id_created_at_idx"
    ON "chat_widget_ai_usage_logs"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "chat_widget_ai_usage_logs_tenant_id_thread_id_idx"
    ON "chat_widget_ai_usage_logs"("tenant_id", "thread_id");

CREATE INDEX IF NOT EXISTS "chat_widget_ai_usage_logs_thread_id_created_at_idx"
    ON "chat_widget_ai_usage_logs"("thread_id", "created_at");
