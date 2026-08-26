-- Factory-only durable ownership for Agent Relay's bounded GitHub comment write.
-- No tenant or client content is stored here.
CREATE TABLE "agent_relay_claims" (
    "id" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "target_number" INTEGER NOT NULL,
    "replay_identity" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL DEFAULT 'issue.add_comment',
    "write_fingerprint" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'claimed',
    "marker" TEXT NOT NULL,
    "comment_id" TEXT,
    "comment_url" TEXT,
    "bot_login" TEXT,
    "app_slug" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_relay_claims_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_relay_claims_state_check" CHECK ("state" IN ('claimed', 'confirmed', 'ambiguous'))
);

CREATE UNIQUE INDEX "agent_relay_claims_repository_target_number_replay_identity_key"
    ON "agent_relay_claims"("repository", "target_number", "replay_identity");

CREATE INDEX "agent_relay_claims_state_idx" ON "agent_relay_claims"("state");
