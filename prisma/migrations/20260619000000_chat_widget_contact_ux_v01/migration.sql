-- Chat widget contact UX v0.1 — additive lead columns (nullable, backward compatible).
--
-- ROLLBACK:
--   ALTER TABLE chat_widget_threads DROP COLUMN IF EXISTS lead_surname;
--   ALTER TABLE chat_widget_threads DROP COLUMN IF EXISTS preferred_contact_method;
--   npx prisma migrate resolve --rolled-back 20260619000000_chat_widget_contact_ux_v01

ALTER TABLE "chat_widget_threads"
  ADD COLUMN IF NOT EXISTS "lead_surname" TEXT,
  ADD COLUMN IF NOT EXISTS "preferred_contact_method" TEXT;
