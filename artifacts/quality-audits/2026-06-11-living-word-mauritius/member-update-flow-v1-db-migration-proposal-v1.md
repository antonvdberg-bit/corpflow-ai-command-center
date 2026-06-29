# Member Update Flow v1 — proposed DB migration (approval gate)

**Status:** PROPOSED — **not applied**. Awaiting explicit Anton approval before any Prisma migration is created or run.

**Tenant:** `living-word-mauritius` (Living Word is already the test tenant; no separate sandbox tables.)

**Purpose:** Durable storage for (1) operator/synthetic test member rows used as prefill source, and (2) raw submission evidence + operator-review queue. This build uses **in-memory synthetic seed only** until this migration is approved and wired.

**Hard boundaries unchanged:** no GHL writes, no GHL import, no canonical overwrite, no outbound messaging, operator review required (`review_status = pending_review`, `canonical_write = false`).

---

## Proposed migration SQL

```sql
-- Member Update Flow v1 — Living Word test-tenant pilot persistence.
-- First consumer: living-word-mauritius member_update_v1 (admin-gated, non-public).
--
-- ROLLBACK (destructive — drops pilot evidence; prefer marking submissions rejected in app):
--   BEGIN;
--   DROP TABLE IF EXISTS "tenant_form_submissions";
--   DROP TABLE IF EXISTS "tenant_members";
--   COMMIT;
--   npx prisma migrate resolve --rolled-back <migration_name>
--
-- See: artifacts/quality-audits/2026-06-11-living-word-mauritius/member-update-flow-schema-form-design-v1.md §3.4

-- Staged member lookup (prefill source). Synthetic/operator-seeded test records only in v1.
CREATE TABLE IF NOT EXISTS "tenant_members" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "member_json" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'operator_seed',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_members_tenant_record_id"
    ON "tenant_members"("tenant_id", "record_id");

CREATE INDEX IF NOT EXISTS "tenant_members_tenant_id_status_idx"
    ON "tenant_members"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "tenant_members_tenant_id_email_idx"
    ON "tenant_members"("tenant_id", (lower("member_json"->>'email')))
    WHERE ("member_json"->>'email') IS NOT NULL AND ("member_json"->>'email') <> '';

-- Raw submission evidence + operator review queue. No canonical write in v1.
CREATE TABLE IF NOT EXISTS "tenant_form_submissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "identify_json" JSONB,
    "update_json" JSONB,
    "proposed_json" JSONB,
    "changes_json" JSONB,
    "match_status" TEXT,
    "review_status" TEXT NOT NULL DEFAULT 'pending_review',
    "canonical_write" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_form_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_form_submissions_tenant_idem"
    ON "tenant_form_submissions"("tenant_id", "idempotency_key")
    WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "tenant_form_submissions_tenant_form_review_idx"
    ON "tenant_form_submissions"("tenant_id", "form_id", "review_status");

CREATE INDEX IF NOT EXISTS "tenant_form_submissions_tenant_created_idx"
    ON "tenant_form_submissions"("tenant_id", "created_at");
```

---

## What this does **not** do

- Does not import GHL contacts or call GHL.
- Does not auto-approve or auto-write canonical member data (`canonical_write` stays `false` until a future gated packet).
- Does not expose the flow publicly (admin session gate remains in application code).
- Does not store excluded fields (application allowlist + denylist enforced before insert).

---

## Approval question

**Approve this migration SQL for a follow-up Prisma migration + handler wiring?** (yes / no / revise)

If approved, the next step is: add matching Prisma models, wire `member-update-api.js` submit to persist rows, seed `tenant_members` with the three synthetic test records, and keep `canonical_write = false` + `review_status = pending_review`.
