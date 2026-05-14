-- LuxeMaurice Phase 2 Slice A — catalogue row provenance (server-set only).
ALTER TABLE "lux_listings" ADD COLUMN IF NOT EXISTS "listing_source" TEXT NOT NULL DEFAULT 'manual_admin';
