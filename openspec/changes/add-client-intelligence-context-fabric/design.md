## Context
The existing `TenantKnowledgeAtom` model serves public/chatbot knowledge and must not be overloaded with internal relationship intelligence. The factory already has a master-authenticated API router and the `/change` operator control plane.

## Goals / Non-Goals
- Goals: durable relational context, provenance, bounded retrieval, deterministic grounded interrogation, useful OrixHealth corpus.
- Non-goals: embeddings, vector search, graph database, CRM rebuild, public tenant exposure, autonomous AI actions or external messaging.

## Decisions
- Use five ordinary Prisma models: context spaces, records, sources, record-source claims and typed record relations.
- Keep internal records separate from tenant knowledge atoms and require factory master auth for retrieval.
- Store source identity and extracted claims, not source documents.
- Use substring retrieval and deterministic record selection for v1; a later MCP adapter can reuse the service.

## Migration Plan
Apply the additive Prisma migration before seeding. Seed is scoped to the `orixhealth` context key and can be rerun safely; rollback drops only the new `client_context_*` tables.

## Open Questions
- Live Zoho entitlement, MCB direct-feed support, exact WhatsApp integration and final 2 October quotation remain intentionally UNKNOWN until the client session.
