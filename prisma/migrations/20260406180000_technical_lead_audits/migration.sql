-- Technical Lead Phase A: append-only audit rows per observer run.
-- If this table was already created via POST /api/factory/postgres/ensure-schema, run once:
--   npx prisma migrate resolve --applied 20260406180000_technical_lead_audits

CREATE TABLE "technical_lead_audits" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "checklist_version" TEXT NOT NULL DEFAULT 'v1',
    "evidence_json" JSONB NOT NULL,
    "gaps_json" JSONB NOT NULL,
    "summary_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_lead_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "technical_lead_audits_ticket_id_idx" ON "technical_lead_audits"("ticket_id");
CREATE INDEX "technical_lead_audits_created_at_idx" ON "technical_lead_audits"("created_at");

ALTER TABLE "technical_lead_audits" ADD CONSTRAINT "technical_lead_audits_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cmp_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
