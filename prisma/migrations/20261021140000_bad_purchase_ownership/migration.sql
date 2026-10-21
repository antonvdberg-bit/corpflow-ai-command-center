-- BAD authenticated buyer-to-order ownership (#1509).
-- PREPARED ONLY. Do not apply this file to shared or production Postgres
-- until a separate migration-execution approval is recorded.
-- Do not copy these statements into lib/server/postgres-ensure-schema-statements.js
-- until that same approval; Vercel build DDL would otherwise create the tables.
--
-- ROLLBACK (only before any live buyer rows exist):
--   DROP TABLE IF EXISTS "bad_purchase_webhook_events";
--   DROP TABLE IF EXISTS "bad_purchase_unbound_reversals";
--   DROP TABLE IF EXISTS "bad_purchase_ownership";
-- After live rows exist, rollback is: leave the tables in place, keep
-- CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE unset/off, and revoke entitlement
-- rather than deleting ownership/order audit evidence.

CREATE TABLE "bad_purchase_ownership" (
    "id" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "checkout_intent_id" TEXT NOT NULL,
    "order_confirmation_ref" TEXT NOT NULL,
    "paddle_transaction_id" TEXT,
    "erpnext_order_ref" TEXT,
    "status" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ,
    "refunded_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "last_event_id" TEXT,
    "last_event_at" TIMESTAMPTZ,
    "confirmation_ref" TEXT,
    "reversal_history_json" JSONB NOT NULL DEFAULT '[]',
    "fulfilment_entitled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bad_purchase_ownership_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bad_purchase_ownership_auth_user_id_fkey"
      FOREIGN KEY ("auth_user_id") REFERENCES "auth_users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bad_purchase_ownership_brand_check"
      CHECK ("brand" = 'business_admin_desk'),
    CONSTRAINT "bad_purchase_ownership_status_check"
      CHECK ("status" IN ('draft', 'paid', 'issued', 'abandoned', 'refunded', 'revoked'))
);

CREATE UNIQUE INDEX "bad_purchase_ownership_checkout_intent_id_key"
  ON "bad_purchase_ownership"("checkout_intent_id");
CREATE UNIQUE INDEX "bad_purchase_ownership_order_confirmation_ref_key"
  ON "bad_purchase_ownership"("order_confirmation_ref");
CREATE UNIQUE INDEX "bad_purchase_ownership_paddle_transaction_id_key"
  ON "bad_purchase_ownership"("paddle_transaction_id");
CREATE INDEX "bad_purchase_ownership_owner_scope_idx"
  ON "bad_purchase_ownership"("auth_user_id", "tenant_id", "brand");
CREATE INDEX "bad_purchase_ownership_tenant_brand_status_idx"
  ON "bad_purchase_ownership"("tenant_id", "brand", "status");
CREATE INDEX "bad_purchase_ownership_status_idx"
  ON "bad_purchase_ownership"("status");

CREATE TABLE "bad_purchase_unbound_reversals" (
    "id" TEXT NOT NULL,
    "paddle_transaction_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "last_event_id" TEXT,
    "last_event_at" TIMESTAMPTZ,
    "reversal_history_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bad_purchase_unbound_reversals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bad_purchase_unbound_reversals_status_check"
      CHECK ("status" IN ('refunded', 'revoked'))
);

CREATE UNIQUE INDEX "bad_purchase_unbound_reversals_paddle_transaction_id_key"
  ON "bad_purchase_unbound_reversals"("paddle_transaction_id");

CREATE TABLE "bad_purchase_webhook_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "paddle_transaction_id" TEXT,
    "ownership_id" TEXT,
    "outcome" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bad_purchase_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bad_purchase_webhook_events_event_id_key"
  ON "bad_purchase_webhook_events"("event_id");
CREATE INDEX "bad_purchase_webhook_events_paddle_transaction_id_idx"
  ON "bad_purchase_webhook_events"("paddle_transaction_id");
